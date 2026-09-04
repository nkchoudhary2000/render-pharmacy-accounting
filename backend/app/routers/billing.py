from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import Billing, Patient, User, PaymentStatus
from backend.app.schemas import BillingCreate, BillingUpdate, BillingResponse, FinancialStats
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/billing", tags=["Billing & Accounting"])

@router.get("", response_model=List[BillingResponse], summary="List all billing records with patient details")
async def get_bills(
    status_filter: Optional[PaymentStatus] = Query(None, description="Filter by payment status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Billing).options(
        selectinload(Billing.patient)
    ).order_by(Billing.id.desc())

    if status_filter:
        query = query.where(Billing.payment_status == status_filter)

    result = await db.execute(query)
    return result.scalars().all()

@router.get("/stats", response_model=FinancialStats, summary="Get accounting financial KPI statistics")
async def get_financial_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Single consolidated aggregation query using case()
    stmt = select(
        func.coalesce(func.sum(case((Billing.payment_status == PaymentStatus.PAID, Billing.total_amount), else_=0.0)), 0.0),
        func.count(case((Billing.payment_status == PaymentStatus.PAID, Billing.id))),
        func.coalesce(func.sum(case((Billing.payment_status == PaymentStatus.PENDING, Billing.total_amount), else_=0.0)), 0.0),
        func.count(case((Billing.payment_status == PaymentStatus.PENDING, Billing.id))),
        func.count(Billing.id)
    )
    result = await db.execute(stmt)
    paid_revenue, paid_count, pending_amount, pending_count, total_invoices = result.one()

    return FinancialStats(
        total_revenue=float(paid_revenue),
        paid_invoices_count=int(paid_count),
        pending_amount=float(pending_amount),
        pending_invoices_count=int(pending_count),
        total_invoices_count=int(total_invoices)
    )

@router.post("", response_model=BillingResponse, status_code=status.HTTP_201_CREATED, summary="Create a new bill/invoice")
async def create_bill(
    bill_in: BillingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    p_check = await db.execute(select(Patient).where(Patient.id == bill_in.patient_id))
    if not p_check.scalars().first():
        raise HTTPException(status_code=400, detail="Patient not found")

    bill = Billing(
        patient_id=bill_in.patient_id,
        total_amount=bill_in.total_amount,
        payment_status=bill_in.payment_status,
        date=bill_in.date
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)

    result = await db.execute(
        select(Billing).options(selectinload(Billing.patient)).where(Billing.id == bill.id)
    )
    return result.scalars().first()

@router.get("/{bill_id}", response_model=BillingResponse, summary="Get bill by ID for invoice PDF generation")
async def get_bill(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Billing).options(selectinload(Billing.patient)).where(Billing.id == bill_id)
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Billing record not found")
    return bill

@router.patch("/{bill_id}", response_model=BillingResponse, summary="Inline update bill record (payment status, amount, date)")
async def update_bill(
    bill_id: int,
    bill_update: BillingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Billing).options(selectinload(Billing.patient)).where(Billing.id == bill_id)
    )
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Billing record not found")

    update_data = bill_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(bill, field, val)

    await db.commit()
    await db.refresh(bill)
    return bill

@router.delete("/{bill_id}", summary="Delete bill record")
async def delete_bill(
    bill_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Billing).where(Billing.id == bill_id))
    bill = result.scalars().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Billing record not found")

    await db.delete(bill)
    await db.commit()
    return {"status": "success", "message": "Bill record deleted successfully"}
