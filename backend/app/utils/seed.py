from datetime import datetime, date, timedelta
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.app.models import (
    User, Patient, Doctor, Medicine, Appointment, Prescription, Billing,
    UserRole, AuthProvider, AppointmentStatus, PaymentStatus
)
from backend.app.auth import get_password_hash

async def seed_initial_data(db: AsyncSession) -> dict:
    """Seeds sample clinical and accounting data if tables are empty."""
    # Check if data already exists
    user_count_q = await db.execute(select(func.count()).select_from(User))
    user_count = user_count_q.scalar_one()

    if user_count > 0:
        return {"status": "skipped", "message": "Database already contains users/records"}

    # 1. Create Initial Admin and Staff Users
    admin_user = User(
        email="admin@pharmacy.com",
        name="System Administrator",
        username="admin",
        currency="$",
        password_hash=get_password_hash("Admin123!"),
        role=UserRole.ADMIN,
        auth_provider=AuthProvider.LOCAL
    )
    staff_user = User(
        email="pharmacist@pharmacy.com",
        name="Clinical Pharmacist",
        username="pharmacist",
        currency="$",
        password_hash=get_password_hash("Staff123!"),
        role=UserRole.STAFF,
        auth_provider=AuthProvider.LOCAL
    )
    db.add_all([admin_user, staff_user])
    await db.flush()

    # 2. Create Doctors
    doctors = [
        Doctor(
            name="Dr. Sarah Jenkins, MD",
            specialization="Cardiology & Internal Medicine",
            contact="+1 (555) 234-5678",
            license_number="MD-NY-84920"
        ),
        Doctor(
            name="Dr. Marcus Vance, MD",
            specialization="Endocrinology & Diabetes Care",
            contact="+1 (555) 345-6789",
            license_number="MD-NY-91244"
        ),
        Doctor(
            name="Dr. Elena Rostova, MD",
            specialization="Pulmonology & Critical Care",
            contact="+1 (555) 456-7890",
            license_number="MD-NY-77312"
        ),
        Doctor(
            name="Dr. David K. Chen, MD",
            specialization="General Practice & Pediatrics",
            contact="+1 (555) 567-8901",
            license_number="MD-NY-63219"
        ),
    ]
    db.add_all(doctors)
    await db.flush()

    # 3. Create Patients
    patients = [
        Patient(
            name="Eleanor Vance",
            age=58,
            gender="Female",
            contact="+1 (555) 911-2001",
            medical_history="Type 2 Diabetes Mellitus, Stage 1 Hypertension. Allergic to Sulfa drugs."
        ),
        Patient(
            name="Robert MacIntyre",
            age=44,
            gender="Male",
            contact="+1 (555) 911-2002",
            medical_history="Mild Bronchial Asthma, seasonal allergic rhinitis. No drug allergies."
        ),
        Patient(
            name="Sophia Sterling",
            age=31,
            gender="Female",
            contact="+1 (555) 911-2003",
            medical_history="Post-operative recovery following appendectomy. Penicillin sensitive."
        ),
        Patient(
            name="Arthur Pendelton",
            age=72,
            gender="Male",
            contact="+1 (555) 911-2004",
            medical_history="Atrial fibrillation, chronic kidney disease stage 2. On Warfarin monitoring."
        ),
        Patient(
            name="Maya Lin",
            age=26,
            gender="Female",
            contact="+1 (555) 911-2005",
            medical_history="Migraines with aura, Iron deficiency anemia."
        )
    ]
    db.add_all(patients)
    await db.flush()

    # 4. Create Medicines (Inventory)
    today = date.today()
    medicines = [
        Medicine(
            name="Amoxicillin 500mg Capsules",
            batch_number="AMX-2025-01",
            expiry_date=today + timedelta(days=420),
            stock_quantity=180,
            price=14.50,
            location="Aisle 1 - Shelf A"
        ),
        Medicine(
            name="Metformin HCl 850mg Tablets",
            batch_number="MET-2025-09",
            expiry_date=today + timedelta(days=600),
            stock_quantity=9,  # Low stock alert!
            price=18.75,
            location="Aisle 2 - Shelf C"
        ),
        Medicine(
            name="Lisinopril 10mg Tablets",
            batch_number="LIS-2024-44",
            expiry_date=today + timedelta(days=25),  # Expiring soon alert!
            stock_quantity=24,
            price=12.00,
            location="Aisle 1 - Shelf D"
        ),
        Medicine(
            name="Atorvastatin 20mg Tablets",
            batch_number="ATO-2025-11",
            expiry_date=today + timedelta(days=365),
            stock_quantity=150,
            price=24.90,
            location="Aisle 2 - Shelf B"
        ),
        Medicine(
            name="Albuterol Sulfate Inhaler 90mcg",
            batch_number="ALB-2025-03",
            expiry_date=today + timedelta(days=500),
            stock_quantity=8,  # Low stock alert!
            price=45.00,
            location="Aisle 3 - Shelf A"
        ),
        Medicine(
            name="Omeprazole 20mg Delayed-Release",
            batch_number="OME-2025-88",
            expiry_date=today + timedelta(days=450),
            stock_quantity=120,
            price=16.20,
            location="Aisle 1 - Shelf B"
        ),
        Medicine(
            name="Warfarin Sodium 2mg Tablets",
            batch_number="WAR-2025-02",
            expiry_date=today + timedelta(days=280),
            stock_quantity=60,
            price=21.50,
            location="Aisle 4 - Vault 1"
        ),
        Medicine(
            name="Sumatriptan 50mg Tablets",
            batch_number="SUM-2025-77",
            expiry_date=today + timedelta(days=320),
            stock_quantity=45,
            price=32.00,
            location="Aisle 2 - Shelf A"
        )
    ]
    db.add_all(medicines)
    await db.flush()

    # 5. Create Appointments
    now = datetime.utcnow()
    appointments = [
        Appointment(
            patient_id=patients[0].id,
            doctor_id=doctors[1].id,
            appointment_date=now + timedelta(days=1, hours=2),
            status=AppointmentStatus.SCHEDULED,
            notes="Quarterly HbA1c review and insulin resistance evaluation."
        ),
        Appointment(
            patient_id=patients[1].id,
            doctor_id=doctors[2].id,
            appointment_date=now - timedelta(days=2),
            status=AppointmentStatus.COMPLETED,
            notes="Spirometry assessment completed. Inhaler dosage modified."
        ),
        Appointment(
            patient_id=patients[3].id,
            doctor_id=doctors[0].id,
            appointment_date=now + timedelta(hours=4),
            status=AppointmentStatus.SCHEDULED,
            notes="INR blood test check and cardiac rhythm consultation."
        ),
        Appointment(
            patient_id=patients[4].id,
            doctor_id=doctors[3].id,
            appointment_date=now - timedelta(days=5),
            status=AppointmentStatus.COMPLETED,
            notes="Complete blood count review; prescribed iron therapy."
        )
    ]
    db.add_all(appointments)
    await db.flush()

    # 6. Create Prescriptions
    rx_details_1 = [
        {"medicine_name": "Metformin HCl 850mg", "dosage": "1 tablet", "frequency": "Twice daily with meals", "duration": "90 days", "instructions": "Take with breakfast and dinner"},
        {"medicine_name": "Lisinopril 10mg", "dosage": "1 tablet", "frequency": "Once daily in the morning", "duration": "90 days", "instructions": "Monitor BP daily"}
    ]
    rx_details_2 = [
        {"medicine_name": "Albuterol Sulfate Inhaler 90mcg", "dosage": "2 puffs", "frequency": "Every 4-6 hours PRN", "duration": "30 days", "instructions": "Use spacer device if needed"}
    ]
    rx_details_3 = [
        {"medicine_name": "Warfarin Sodium 2mg", "dosage": "1 tablet", "frequency": "Once daily at 6:00 PM", "duration": "30 days", "instructions": "Consistent vitamin K diet required"}
    ]

    prescriptions = [
        Prescription(
            patient_id=patients[0].id,
            doctor_id=doctors[1].id,
            details=json.dumps(rx_details_1),
            date=today - timedelta(days=3)
        ),
        Prescription(
            patient_id=patients[1].id,
            doctor_id=doctors[2].id,
            details=json.dumps(rx_details_2),
            date=today - timedelta(days=2)
        ),
        Prescription(
            patient_id=patients[3].id,
            doctor_id=doctors[0].id,
            details=json.dumps(rx_details_3),
            date=today - timedelta(days=1)
        )
    ]
    db.add_all(prescriptions)
    await db.flush()

    # 7. Create Billing Records
    bills = [
        Billing(
            patient_id=patients[0].id,
            total_amount=165.50,
            payment_status=PaymentStatus.PAID,
            date=today - timedelta(days=3)
        ),
        Billing(
            patient_id=patients[1].id,
            total_amount=95.00,
            payment_status=PaymentStatus.PAID,
            date=today - timedelta(days=2)
        ),
        Billing(
            patient_id=patients[2].id,
            total_amount=240.00,
            payment_status=PaymentStatus.PENDING,
            date=today - timedelta(days=1)
        ),
        Billing(
            patient_id=patients[3].id,
            total_amount=180.75,
            payment_status=PaymentStatus.PENDING,
            date=today
        ),
        Billing(
            patient_id=patients[4].id,
            total_amount=85.00,
            payment_status=PaymentStatus.PAID,
            date=today - timedelta(days=5)
        )
    ]
    db.add_all(bills)
    await db.commit()

    return {
        "status": "seeded",
        "message": "Sample pharmacy and accounting records successfully populated.",
        "admin_email": "admin@pharmacy.com",
        "admin_password": "Admin123!",
        "staff_email": "pharmacist@pharmacy.com",
        "staff_password": "Staff123!"
    }
