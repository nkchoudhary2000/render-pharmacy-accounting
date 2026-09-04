from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import Doctor, User
from backend.app.schemas import DoctorCreate, DoctorUpdate, DoctorResponse
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.get("", response_model=List[DoctorResponse], summary="List all doctors")
async def get_doctors(
    search: Optional[str] = Query(None, description="Search by doctor name, specialization, or license"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Doctor).order_by(Doctor.name.asc())
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.where(
            (Doctor.name.ilike(search_fmt)) |
            (Doctor.specialization.ilike(search_fmt)) |
            (Doctor.license_number.ilike(search_fmt))
        )
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED, summary="Create a new doctor")
async def create_doctor(
    doctor_in: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check duplicate license number
    existing = await db.execute(select(Doctor).where(Doctor.license_number == doctor_in.license_number.strip()))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Doctor with this license number already exists")

    doctor = Doctor(
        name=doctor_in.name.strip(),
        specialization=doctor_in.specialization.strip(),
        contact=doctor_in.contact.strip(),
        license_number=doctor_in.license_number.strip()
    )
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    return doctor

@router.get("/{doctor_id}", summary="Get doctor profile with appointments")
async def get_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Doctor).options(
        selectinload(Doctor.appointments)
    ).where(Doctor.id == doctor_id)
    
    result = await db.execute(query)
    doctor = result.scalars().first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return {
        "id": doctor.id,
        "name": doctor.name,
        "specialization": doctor.specialization,
        "contact": doctor.contact,
        "license_number": doctor.license_number,
        "appointments": [
            {
                "id": a.id,
                "appointment_date": a.appointment_date,
                "status": a.status.value,
                "notes": a.notes
            } for a in doctor.appointments
        ]
    }

@router.patch("/{doctor_id}", response_model=DoctorResponse, summary="Inline update doctor record")
async def update_doctor(
    doctor_id: int,
    doctor_update: DoctorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalars().first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    update_data = doctor_update.model_dump(exclude_unset=True)
    if "license_number" in update_data and update_data["license_number"]:
        lic = update_data["license_number"].strip()
        existing = await db.execute(
            select(Doctor).where(Doctor.license_number == lic, Doctor.id != doctor_id)
        )
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Another doctor already has this license number")
        doctor.license_number = lic

    for field, val in update_data.items():
        if field == "license_number":
            continue
        if val is not None and isinstance(val, str):
            setattr(doctor, field, val.strip())
        else:
            setattr(doctor, field, val)

    await db.commit()
    await db.refresh(doctor)
    return doctor

@router.delete("/{doctor_id}", summary="Delete a doctor")
async def delete_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalars().first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    await db.delete(doctor)
    await db.commit()
    return {"status": "success", "message": f"Doctor {doctor.name} deleted successfully"}
