from datetime import datetime, date
from typing import Dict, Any, List
import json
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from backend.app.database import get_db
from backend.app.models import (
    User, Patient, Doctor, Medicine, Appointment, Prescription, Billing,
    UserRole, AuthProvider, AppointmentStatus, PaymentStatus
)
from backend.app.schemas import (
    DatabaseTablesSummaryResponse, TableSummaryItem, WipeDatabaseRequest, WipeDatabaseResponse
)
from backend.app.auth import get_current_admin, invalidate_user_cache

router = APIRouter(prefix="/api/admin", tags=["Admin Backup & Restore"])

def serialize_model(instance: Any) -> Dict[str, Any]:
    """Helper to serialize SQLAlchemy model instance to dict with JSON-friendly dates."""
    data = {}
    for column in instance.__table__.columns:
        val = getattr(instance, column.name)
        if isinstance(val, (datetime, date)):
            data[column.name] = val.isoformat()
        elif hasattr(val, "value"):  # Enum
            data[column.name] = val.value
        else:
            data[column.name] = val
    return data

@router.get("/backup", summary="Dump entire database to a downloadable JSON backup file (Admin only)")
async def backup_database(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Fetch all records
    users_q = await db.execute(select(User))
    patients_q = await db.execute(select(Patient))
    doctors_q = await db.execute(select(Doctor))
    medicines_q = await db.execute(select(Medicine))
    appointments_q = await db.execute(select(Appointment))
    prescriptions_q = await db.execute(select(Prescription))
    billing_q = await db.execute(select(Billing))

    backup_data = {
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "exported_by": admin.email,
        "users": [serialize_model(u) for u in users_q.scalars().all()],
        "patients": [serialize_model(p) for p in patients_q.scalars().all()],
        "doctors": [serialize_model(d) for d in doctors_q.scalars().all()],
        "medicines": [serialize_model(m) for m in medicines_q.scalars().all()],
        "appointments": [serialize_model(a) for a in appointments_q.scalars().all()],
        "prescriptions": [serialize_model(rx) for rx in prescriptions_q.scalars().all()],
        "billing": [serialize_model(b) for b in billing_q.scalars().all()],
    }

    json_str = json.dumps(backup_data, indent=2)
    timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"pharmacy_backup_{timestamp_str}.json"

    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/restore", summary="Restore database from an uploaded JSON backup file (Admin only)")
async def restore_database(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    try:
        contents = await file.read()
        payload = json.loads(contents.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON file format: {str(e)}"
        )

    required_keys = ["patients", "doctors", "medicines", "appointments", "prescriptions", "billing"]
    for key in required_keys:
        if key not in payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required backup section: '{key}'"
            )

    counts = {}

    try:
        # Delete dependent tables first to maintain foreign key integrity
        await db.execute(delete(Appointment))
        await db.execute(delete(Prescription))
        await db.execute(delete(Billing))
        await db.execute(delete(Patient))
        await db.execute(delete(Doctor))
        await db.execute(delete(Medicine))

        # 1. Restore Patients
        for p in payload["patients"]:
            new_p = Patient(
                id=p.get("id"),
                name=p["name"],
                age=int(p["age"]),
                gender=p["gender"],
                contact=p["contact"],
                medical_history=p.get("medical_history"),
                created_at=datetime.fromisoformat(p["created_at"]) if "created_at" in p and p["created_at"] else datetime.utcnow()
            )
            db.add(new_p)
        counts["patients"] = len(payload["patients"])

        # 2. Restore Doctors
        for d in payload["doctors"]:
            new_d = Doctor(
                id=d.get("id"),
                name=d["name"],
                specialization=d["specialization"],
                contact=d["contact"],
                license_number=d["license_number"]
            )
            db.add(new_d)
        counts["doctors"] = len(payload["doctors"])

        # 3. Restore Medicines
        for m in payload["medicines"]:
            new_m = Medicine(
                id=m.get("id"),
                name=m["name"],
                batch_number=m["batch_number"],
                expiry_date=date.fromisoformat(m["expiry_date"]),
                stock_quantity=int(m["stock_quantity"]),
                price=float(m["price"]),
                location=m.get("location", "Aisle 1")
            )
            db.add(new_m)
        counts["medicines"] = len(payload["medicines"])

        await db.flush()

        # 4. Restore Appointments
        for a in payload["appointments"]:
            new_a = Appointment(
                id=a.get("id"),
                patient_id=int(a["patient_id"]),
                doctor_id=int(a["doctor_id"]),
                appointment_date=datetime.fromisoformat(a["appointment_date"]),
                status=AppointmentStatus(a.get("status", "SCHEDULED")),
                notes=a.get("notes")
            )
            db.add(new_a)
        counts["appointments"] = len(payload["appointments"])

        # 5. Restore Prescriptions
        for rx in payload["prescriptions"]:
            new_rx = Prescription(
                id=rx.get("id"),
                patient_id=int(rx["patient_id"]),
                doctor_id=int(rx["doctor_id"]),
                details=rx["details"],
                date=date.fromisoformat(rx["date"]) if "date" in rx and rx["date"] else date.today()
            )
            db.add(new_rx)
        counts["prescriptions"] = len(payload["prescriptions"])

        # 6. Restore Billing
        for b in payload["billing"]:
            new_b = Billing(
                id=b.get("id"),
                patient_id=int(b["patient_id"]),
                total_amount=float(b["total_amount"]),
                payment_status=PaymentStatus(b.get("payment_status", "PENDING")),
                date=date.fromisoformat(b["date"]) if "date" in b and b["date"] else date.today()
            )
            db.add(new_b)
        counts["billing"] = len(payload["billing"])

        await db.commit()
        invalidate_user_cache()

        return {
            "status": "success",
            "message": "Database successfully restored from backup file.",
            "restored_counts": counts
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database restoration failed: {str(e)}"
        )

@router.get("/tables-summary", response_model=DatabaseTablesSummaryResponse, summary="Get summary of tables and their record counts (Admin only)")
async def get_tables_summary(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Consolidate 7 count queries into a single database roundtrip
    stmt = select(
        select(func.count()).select_from(Patient).scalar_subquery(),
        select(func.count()).select_from(Doctor).scalar_subquery(),
        select(func.count()).select_from(Medicine).scalar_subquery(),
        select(func.count()).select_from(Appointment).scalar_subquery(),
        select(func.count()).select_from(Prescription).scalar_subquery(),
        select(func.count()).select_from(Billing).scalar_subquery(),
        select(func.count()).select_from(User).where(User.role != UserRole.ADMIN).scalar_subquery()
    )
    result = await db.execute(stmt)
    patients_cnt, doctors_cnt, medicines_cnt, appointments_cnt, prescriptions_cnt, billing_cnt, staff_cnt = result.one()

    tables = [
        TableSummaryItem(
            key="patients",
            label="Patients & Medical Records",
            description="Patient demographic cards, clinical notes, and medical histories",
            count=patients_cnt
        ),
        TableSummaryItem(
            key="doctors",
            label="Doctors & Specialists",
            description="Medical doctor directory, specialties, and licensing records",
            count=doctors_cnt
        ),
        TableSummaryItem(
            key="medicines",
            label="Medicines Inventory",
            description="Drug inventory stock, batch numbers, expiry dates, and pricing",
            count=medicines_cnt
        ),
        TableSummaryItem(
            key="appointments",
            label="Appointments",
            description="Consultation bookings, time slots, and scheduling records",
            count=appointments_cnt
        ),
        TableSummaryItem(
            key="prescriptions",
            label="Prescriptions (Rx)",
            description="Clinical prescriptions, medication lines, and doctor orders",
            count=prescriptions_cnt
        ),
        TableSummaryItem(
            key="billing",
            label="Billing & Accounting Invoices",
            description="Pharmacy invoices, payment statuses, and revenue records",
            count=billing_cnt
        ),
        TableSummaryItem(
            key="staff_users",
            label="Staff Accounts",
            description="Staff user accounts (Administrators are protected and never wiped)",
            count=staff_cnt
        ),
    ]

    total_records = sum(t.count for t in tables)
    return DatabaseTablesSummaryResponse(tables=tables, total_records=total_records)

@router.post("/wipe-database", response_model=WipeDatabaseResponse, summary="Selectively wipe chosen database tables (Admin only)")
async def wipe_database(
    payload: WipeDatabaseRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    if not payload.tables:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tables were selected for wiping. Please select at least one table."
        )

    if payload.confirm_phrase and payload.confirm_phrase.strip().upper() != "WIPE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation phrase. Please type 'WIPE' to confirm."
        )

    selected = set(payload.tables)
    deleted_counts = {}

    try:
        # Relational dependency order to avoid foreign key violations:
        # 1. Billing (FK: patient_id)
        if "billing" in selected or "patients" in selected:
            res = await db.execute(delete(Billing))
            deleted_counts["billing"] = res.rowcount

        # 2. Prescriptions (FK: patient_id, doctor_id)
        if "prescriptions" in selected or "patients" in selected or "doctors" in selected:
            res = await db.execute(delete(Prescription))
            deleted_counts["prescriptions"] = res.rowcount

        # 3. Appointments (FK: patient_id, doctor_id)
        if "appointments" in selected or "patients" in selected or "doctors" in selected:
            res = await db.execute(delete(Appointment))
            deleted_counts["appointments"] = res.rowcount

        # 4. Patients
        if "patients" in selected:
            res = await db.execute(delete(Patient))
            deleted_counts["patients"] = res.rowcount

        # 5. Doctors
        if "doctors" in selected:
            res = await db.execute(delete(Doctor))
            deleted_counts["doctors"] = res.rowcount

        # 6. Medicines
        if "medicines" in selected:
            res = await db.execute(delete(Medicine))
            deleted_counts["medicines"] = res.rowcount

        # 7. Staff Users (Never delete ADMIN users or current user!)
        if "staff_users" in selected:
            res = await db.execute(delete(User).where(User.role != UserRole.ADMIN, User.id != admin.id))
            deleted_counts["staff_users"] = res.rowcount

        await db.commit()
        invalidate_user_cache()

        total_deleted = sum(deleted_counts.values())
        return WipeDatabaseResponse(
            status="success",
            message=f"Successfully wiped {len(selected)} table(s) ({total_deleted} records permanently deleted).",
            deleted_counts=deleted_counts,
            total_deleted=total_deleted
        )

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to wipe selected tables: {str(e)}"
        )
