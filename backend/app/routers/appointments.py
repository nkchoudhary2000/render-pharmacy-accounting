from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import Appointment, Patient, Doctor, User, AppointmentStatus
from backend.app.schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

@router.get("", response_model=List[AppointmentResponse], summary="List all appointments with patient & doctor details")
async def get_appointments(
    status_filter: Optional[AppointmentStatus] = Query(None, description="Filter by appointment status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Appointment).options(
        selectinload(Appointment.patient),
        selectinload(Appointment.doctor)
    ).order_by(Appointment.appointment_date.desc())

    if status_filter:
        query = query.where(Appointment.status == status_filter)

    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED, summary="Create a new appointment")
async def create_appointment(
    app_in: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify patient exists
    p_check = await db.execute(select(Patient).where(Patient.id == app_in.patient_id))
    if not p_check.scalars().first():
        raise HTTPException(status_code=400, detail="Patient does not exist")

    # Verify doctor exists
    d_check = await db.execute(select(Doctor).where(Doctor.id == app_in.doctor_id))
    if not d_check.scalars().first():
        raise HTTPException(status_code=400, detail="Doctor does not exist")

    appointment = Appointment(
        patient_id=app_in.patient_id,
        doctor_id=app_in.doctor_id,
        appointment_date=app_in.appointment_date,
        status=app_in.status,
        notes=app_in.notes.strip() if app_in.notes else None
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    # Reload with relationships
    result = await db.execute(
        select(Appointment).options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor)
        ).where(Appointment.id == appointment.id)
    )
    return result.scalars().first()

@router.get("/{appointment_id}", response_model=AppointmentResponse, summary="Get appointment by ID")
async def get_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Appointment).options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor)
        ).where(Appointment.id == appointment_id)
    )
    appointment = result.scalars().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.patch("/{appointment_id}", response_model=AppointmentResponse, summary="Inline update appointment record (status, notes, date)")
async def update_appointment(
    appointment_id: int,
    appointment_update: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Appointment).options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor)
        ).where(Appointment.id == appointment_id)
    )
    appointment = result.scalars().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = appointment_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None and isinstance(val, str):
            setattr(appointment, field, val.strip())
        else:
            setattr(appointment, field, val)

    await db.commit()
    await db.refresh(appointment)
    return appointment

@router.delete("/{appointment_id}", summary="Delete an appointment")
async def delete_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appointment = result.scalars().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    await db.delete(appointment)
    await db.commit()
    return {"status": "success", "message": "Appointment deleted successfully"}
