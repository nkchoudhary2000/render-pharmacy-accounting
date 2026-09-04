from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.models import (
    User, Patient, Doctor, Medicine, Appointment, Billing, PaymentStatus
)
from backend.app.schemas import (
    DashboardSummaryResponse, FinancialStats,
    MedicineResponse, AppointmentResponse, BillingResponse, PatientResponse
)
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Operations"])

@router.get("/summary", response_model=DashboardSummaryResponse, summary="Get full dashboard summary in a single high-performance payload")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Consolidated financial KPI statistics in one SQL query
    stats_stmt = select(
        func.coalesce(func.sum(case((Billing.payment_status == PaymentStatus.PAID, Billing.total_amount), else_=0.0)), 0.0),
        func.count(case((Billing.payment_status == PaymentStatus.PAID, Billing.id))),
        func.coalesce(func.sum(case((Billing.payment_status == PaymentStatus.PENDING, Billing.total_amount), else_=0.0)), 0.0),
        func.count(case((Billing.payment_status == PaymentStatus.PENDING, Billing.id))),
        func.count(Billing.id)
    )
    stats_res = await db.execute(stats_stmt)
    paid_rev, paid_cnt, pend_amt, pend_cnt, total_inv = stats_res.one()

    stats = FinancialStats(
        total_revenue=float(paid_rev),
        paid_invoices_count=int(paid_cnt),
        pending_amount=float(pend_amt),
        pending_invoices_count=int(pend_cnt),
        total_invoices_count=int(total_inv)
    )

    # 2. Low stock medicines (stock <= 15, limit 15)
    meds_stmt = (
        select(Medicine)
        .where(Medicine.stock_quantity <= 15)
        .order_by(Medicine.stock_quantity.asc())
        .limit(15)
    )
    low_stock_res = await db.execute(meds_stmt)
    low_stock_medicines = low_stock_res.scalars().all()

    # 3. Recent appointments with eager-loaded relations (limit 15)
    appts_stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor)
        )
        .order_by(Appointment.appointment_date.desc())
        .limit(15)
    )
    appts_res = await db.execute(appts_stmt)
    recent_appointments = appts_res.scalars().all()

    # 4. Recent billing records with eager-loaded relations (limit 15)
    bills_stmt = (
        select(Billing)
        .options(selectinload(Billing.patient))
        .order_by(Billing.id.desc())
        .limit(15)
    )
    bills_res = await db.execute(bills_stmt)
    recent_bills = bills_res.scalars().all()

    # 5. Patients directory
    patients_stmt = select(Patient).order_by(Patient.name.asc())
    patients_res = await db.execute(patients_stmt)
    patients = patients_res.scalars().all()

    return DashboardSummaryResponse(
        stats=stats,
        low_stock_medicines=low_stock_medicines,
        recent_appointments=recent_appointments,
        recent_bills=recent_bills,
        patients=patients
    )
