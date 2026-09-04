from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import Patient, User
from backend.app.schemas import PatientCreate, PatientUpdate, PatientResponse
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("", response_model=List[PatientResponse], summary="List all patients")
async def get_patients(
    search: Optional[str] = Query(None, description="Search by patient name or contact"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Patient).order_by(Patient.id.desc())
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.where((Patient.name.ilike(search_fmt)) | (Patient.contact.ilike(search_fmt)))
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED, summary="Create a new patient")
async def create_patient(
    patient_in: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = Patient(
        name=patient_in.name.strip(),
        age=patient_in.age,
        gender=patient_in.gender.strip(),
        contact=patient_in.contact.strip(),
        medical_history=patient_in.medical_history.strip() if patient_in.medical_history else None
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient

@router.get("/{patient_id}", summary="Get patient profile by ID")
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Patient).options(
        selectinload(Patient.appointments),
        selectinload(Patient.prescriptions),
        selectinload(Patient.bills)
    ).where(Patient.id == patient_id)
    
    result = await db.execute(query)
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "contact": patient.contact,
        "medical_history": patient.medical_history,
        "created_at": patient.created_at,
        "appointments": [
            {
                "id": a.id,
                "appointment_date": a.appointment_date,
                "status": a.status.value,
                "notes": a.notes
            } for a in patient.appointments
        ],
        "prescriptions": [
            {
                "id": p.id,
                "date": p.date,
                "details": p.details
            } for p in patient.prescriptions
        ],
        "bills": [
            {
                "id": b.id,
                "total_amount": b.total_amount,
                "payment_status": b.payment_status.value,
                "date": b.date
            } for b in patient.bills
        ]
    }

@router.patch("/{patient_id}", response_model=PatientResponse, summary="Inline update patient record")
async def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = patient_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None and isinstance(val, str):
            setattr(patient, field, val.strip())
        else:
            setattr(patient, field, val)

    await db.commit()
    await db.refresh(patient)
    return patient

@router.delete("/{patient_id}", summary="Delete a patient")
async def delete_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    await db.delete(patient)
    await db.commit()
    return {"status": "success", "message": f"Patient {patient.name} deleted successfully"}
