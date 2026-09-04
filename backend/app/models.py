from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, Text, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
import enum
from backend.app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"

class AuthProvider(str, enum.Enum):
    LOCAL = "LOCAL"
    GOOGLE = "GOOGLE"

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class PaymentStatus(str, enum.Enum):
    PAID = "PAID"
    PENDING = "PENDING"
    REFUNDED = "REFUNDED"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    profile_picture: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="$", nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, native_enum=False), default=UserRole.STAFF, nullable=False)
    auth_provider: Mapped[AuthProvider] = mapped_column(SQLEnum(AuthProvider, native_enum=False), default=AuthProvider.LOCAL, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def has_password(self) -> bool:
        return bool(self.password_hash)

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)  # Male, Female, Other
    contact: Mapped[str] = mapped_column(String(50), nullable=False)
    medical_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    bills = relationship("Billing", back_populates="patient", cascade="all, delete-orphan")

class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    specialization: Mapped[str] = mapped_column(String(150), nullable=False)
    contact: Mapped[str] = mapped_column(String(50), nullable=False)
    license_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)

    # Relationships
    appointments = relationship("Appointment", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")

class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, index=True, nullable=False)
    price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    location: Mapped[str] = mapped_column(String(100), default="Aisle 1", nullable=False)

class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), index=True, nullable=False)
    appointment_date: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(SQLEnum(AppointmentStatus, native_enum=False), default=AppointmentStatus.SCHEDULED, index=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    patient = relationship("Patient", back_populates="appointments", lazy="joined")
    doctor = relationship("Doctor", back_populates="appointments", lazy="joined")

class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), index=True, nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)  # JSON formatted medications or clinical text
    date: Mapped[date] = mapped_column(Date, default=date.today, index=True, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="prescriptions", lazy="joined")
    doctor = relationship("Doctor", back_populates="prescriptions", lazy="joined")

class Billing(Base):
    __tablename__ = "billing"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_status: Mapped[PaymentStatus] = mapped_column(SQLEnum(PaymentStatus, native_enum=False), default=PaymentStatus.PENDING, index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, default=date.today, index=True, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="bills", lazy="joined")
