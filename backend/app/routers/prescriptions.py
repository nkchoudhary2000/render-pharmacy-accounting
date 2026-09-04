from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import Prescription, Patient, Doctor, User
from backend.app.schemas import PrescriptionCreate, PrescriptionResponse
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])

@router.get("", response_model=List[PrescriptionResponse], summary="List all prescriptions with patient & doctor info")
async def get_prescriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Prescription).options(
        selectinload(Prescription.patient),
        selectinload(Prescription.doctor)
    ).order_by(Prescription.id.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED, summary="Create a new prescription")
async def create_prescription(
    rx_in: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify patient
    p_check = await db.execute(select(Patient).where(Patient.id == rx_in.patient_id))
    if not p_check.scalars().first():
        raise HTTPException(status_code=400, detail="Patient not found")

    # Verify doctor
    d_check = await db.execute(select(Doctor).where(Doctor.id == rx_in.doctor_id))
    if not d_check.scalars().first():
        raise HTTPException(status_code=400, detail="Doctor not found")

    prescription = Prescription(
        patient_id=rx_in.patient_id,
        doctor_id=rx_in.doctor_id,
        details=rx_in.details,
        date=rx_in.date
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)

    result = await db.execute(
        select(Prescription).options(
            selectinload(Prescription.patient),
            selectinload(Prescription.doctor)
        ).where(Prescription.id == prescription.id)
    )
    return result.scalars().first()

@router.get("/{prescription_id}", response_model=PrescriptionResponse, summary="Get single prescription details for PDF printing")
async def get_prescription(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Prescription).options(
            selectinload(Prescription.patient),
            selectinload(Prescription.doctor)
        ).where(Prescription.id == prescription_id)
    )
    prescription = result.scalars().first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription

@router.delete("/{prescription_id}", summary="Delete prescription")
async def delete_prescription(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Prescription).where(Prescription.id == prescription_id))
    prescription = result.scalars().first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    await db.delete(prescription)
    await db.commit()
    return {"status": "success", "message": "Prescription deleted successfully"}
