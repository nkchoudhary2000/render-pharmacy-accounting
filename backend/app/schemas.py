import datetime as dt
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field
from backend.app.models import UserRole, AuthProvider, AppointmentStatus, PaymentStatus

# ==========================================
# AUTH & USER SCHEMAS
# ==========================================

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserLogin(UserBase):
    password: str

class GoogleLoginRequest(BaseModel):
    credential: str = Field(..., description="Google ID Token (JWT) from Google Identity Services")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(UserBase):
    id: int
    name: Optional[str] = None
    username: Optional[str] = None
    profile_picture: Optional[str] = None
    currency: str = "$"
    role: UserRole
    auth_provider: AuthProvider
    has_password: bool = False
    created_at: dt.datetime

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    username: Optional[str] = Field(None, min_length=2, max_length=100)
    profile_picture: Optional[str] = None
    currency: Optional[str] = Field(None, max_length=10)

class UserPasswordChange(BaseModel):
    current_password: Optional[str] = None
    new_password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserRoleUpdate(BaseModel):
    role: UserRole

# ==========================================
# PATIENT SCHEMAS
# ==========================================

class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    age: int = Field(..., ge=0, le=150)
    gender: str = Field(..., max_length=20)
    contact: str = Field(..., max_length=50)
    medical_history: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    contact: Optional[str] = None
    medical_history: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    created_at: dt.datetime

    class Config:
        from_attributes = True

# ==========================================
# DOCTOR SCHEMAS
# ==========================================

class DoctorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    specialization: str = Field(..., max_length=150)
    contact: str = Field(..., max_length=50)
    license_number: str = Field(..., max_length=100)

class DoctorCreate(DoctorBase):
    pass

class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    specialization: Optional[str] = None
    contact: Optional[str] = None
    license_number: Optional[str] = None

class DoctorResponse(DoctorBase):
    id: int

    class Config:
        from_attributes = True

# ==========================================
# MEDICINE (INVENTORY) SCHEMAS
# ==========================================

class MedicineBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    batch_number: str = Field(..., max_length=100)
    expiry_date: dt.date
    stock_quantity: int = Field(..., ge=0)
    price: float = Field(..., ge=0.0)
    location: str = Field(default="Aisle 1", max_length=100)

class MedicineCreate(MedicineBase):
    pass

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[dt.date] = None
    stock_quantity: Optional[int] = None
    price: Optional[float] = None
    location: Optional[str] = None

class MedicineResponse(MedicineBase):
    id: int

    class Config:
        from_attributes = True

# ==========================================
# APPOINTMENT SCHEMAS
# ==========================================

class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: dt.datetime
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    appointment_date: Optional[dt.datetime] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None

class AppointmentResponse(AppointmentBase):
    id: int
    patient: Optional[PatientResponse] = None
    doctor: Optional[DoctorResponse] = None

    class Config:
        from_attributes = True

# ==========================================
# PRESCRIPTION SCHEMAS
# ==========================================

class PrescriptionItem(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None

class PrescriptionBase(BaseModel):
    patient_id: int
    doctor_id: int
    details: str  # JSON string or text notes
    date: dt.date = Field(default_factory=dt.date.today)

class PrescriptionCreate(PrescriptionBase):
    pass

class PrescriptionResponse(PrescriptionBase):
    id: int
    patient: Optional[PatientResponse] = None
    doctor: Optional[DoctorResponse] = None

    class Config:
        from_attributes = True

# ==========================================
# BILLING (ACCOUNTING) SCHEMAS
# ==========================================

class BillingBase(BaseModel):
    patient_id: int
    total_amount: float = Field(..., ge=0.0)
    payment_status: PaymentStatus = PaymentStatus.PENDING
    date: dt.date = Field(default_factory=dt.date.today)

class BillingCreate(BillingBase):
    pass

class BillingUpdate(BaseModel):
    patient_id: Optional[int] = None
    total_amount: Optional[float] = None
    payment_status: Optional[PaymentStatus] = None
    date: Optional[dt.date] = None

class BillingResponse(BillingBase):
    id: int
    patient: Optional[PatientResponse] = None

    class Config:
        from_attributes = True

class FinancialStats(BaseModel):
    total_revenue: float
    paid_invoices_count: int
    pending_amount: float
    pending_invoices_count: int
    total_invoices_count: int

# ==========================================
# BACKUP & RESTORE SCHEMAS
# ==========================================

class BackupPayload(BaseModel):
    version: str
    timestamp: dt.datetime
    users: List[Dict[str, Any]]
    patients: List[Dict[str, Any]]
    doctors: List[Dict[str, Any]]
    medicines: List[Dict[str, Any]]
    appointments: List[Dict[str, Any]]
    prescriptions: List[Dict[str, Any]]
    billing: List[Dict[str, Any]]

class RestoreResponse(BaseModel):
    status: str
    message: str
    restored_counts: Dict[str, int]

class TableSummaryItem(BaseModel):
    key: str
    label: str
    description: str
    count: int

class DatabaseTablesSummaryResponse(BaseModel):
    tables: List[TableSummaryItem]
    total_records: int

class WipeDatabaseRequest(BaseModel):
    tables: List[str]
    confirm_phrase: Optional[str] = "WIPE"

class WipeDatabaseResponse(BaseModel):
    status: str
    message: str
    deleted_counts: Dict[str, int]
    total_deleted: int

class DashboardSummaryResponse(BaseModel):
    stats: FinancialStats
    low_stock_medicines: List[MedicineResponse]
    recent_appointments: List[AppointmentResponse]
    recent_bills: List[BillingResponse]
    patients: List[PatientResponse]
