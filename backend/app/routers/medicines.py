from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from backend.app.database import get_db
from backend.app.models import Medicine, User
from backend.app.schemas import MedicineCreate, MedicineUpdate, MedicineResponse
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/medicines", tags=["Medicines (Inventory)"])

@router.get("", response_model=List[MedicineResponse], summary="List all medicines with optional search/filter")
async def get_medicines(
    search: Optional[str] = Query(None, description="Search by name or batch number"),
    low_stock: Optional[bool] = Query(None, description="Filter items with stock <= 15"),
    expiring_soon: Optional[bool] = Query(None, description="Filter items expiring in next 60 days"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Medicine).order_by(Medicine.name.asc())
    
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.where(
            (Medicine.name.ilike(search_fmt)) |
            (Medicine.batch_number.ilike(search_fmt)) |
            (Medicine.location.ilike(search_fmt))
        )
        
    if low_stock:
        query = query.where(Medicine.stock_quantity <= 15)
        
    if expiring_soon:
        today = date.today()
        sixty_days_out = today + timedelta(days=60)
        query = query.where(Medicine.expiry_date <= sixty_days_out)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED, summary="Create a new medicine item")
async def create_medicine(
    medicine_in: MedicineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    medicine = Medicine(
        name=medicine_in.name.strip(),
        batch_number=medicine_in.batch_number.strip(),
        expiry_date=medicine_in.expiry_date,
        stock_quantity=medicine_in.stock_quantity,
        price=medicine_in.price,
        location=medicine_in.location.strip()
    )
    db.add(medicine)
    await db.commit()
    await db.refresh(medicine)
    return medicine

@router.get("/{medicine_id}", response_model=MedicineResponse, summary="Get medicine by ID")
async def get_medicine(
    medicine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Medicine).where(Medicine.id == medicine_id))
    medicine = result.scalars().first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine

@router.patch("/{medicine_id}", response_model=MedicineResponse, summary="Inline update medicine record (stock, price, etc.)")
async def update_medicine(
    medicine_id: int,
    medicine_update: MedicineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Medicine).where(Medicine.id == medicine_id))
    medicine = result.scalars().first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    update_data = medicine_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None and isinstance(val, str):
            setattr(medicine, field, val.strip())
        else:
            setattr(medicine, field, val)

    await db.commit()
    await db.refresh(medicine)
    return medicine

@router.delete("/{medicine_id}", summary="Delete a medicine item")
async def delete_medicine(
    medicine_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Medicine).where(Medicine.id == medicine_id))
    medicine = result.scalars().first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    await db.delete(medicine)
    await db.commit()
    return {"status": "success", "message": f"Medicine {medicine.name} deleted successfully"}
