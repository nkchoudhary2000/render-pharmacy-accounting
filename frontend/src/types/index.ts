export type UserRole = 'ADMIN' | 'STAFF';
export type AuthProvider = 'LOCAL' | 'GOOGLE';

export interface User {
  id: number;
  email: string;
  name?: string | null;
  username?: string | null;
  profile_picture?: string | null;
  currency: string;
  role: UserRole;
  auth_provider: AuthProvider;
  has_password?: boolean;
  created_at: string;
}

export interface UserProfileUpdatePayload {
  name?: string | null;
  username?: string | null;
  profile_picture?: string | null;
  currency?: string | null;
}

export interface UserPasswordChangePayload {
  current_password?: string;
  new_password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  requires_password_setup?: boolean;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  contact: string;
  medical_history?: string | null;
  created_at: string;
}

export interface PatientProfile extends Patient {
  appointments: Array<{
    id: number;
    appointment_date: string;
    status: string;
    notes?: string | null;
  }>;
  prescriptions: Array<{
    id: number;
    date: string;
    details: string;
  }>;
  bills: Array<{
    id: number;
    total_amount: number;
    payment_status: string;
    date: string;
  }>;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  contact: string;
  license_number: string;
}

export interface DoctorProfile extends Doctor {
  appointments: Array<{
    id: number;
    appointment_date: string;
    status: string;
    notes?: string | null;
  }>;
}

export interface Medicine {
  id: number;
  name: string;
  batch_number: string;
  expiry_date: string;
  stock_quantity: number;
  price: number;
  location: string;
}

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  status: AppointmentStatus;
  notes?: string | null;
  patient?: Patient;
  doctor?: Doctor;
}

export interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: number;
  patient_id: number;
  doctor_id: number;
  details: string;
  date: string;
  patient?: Patient;
  doctor?: Doctor;
}

export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED';

export interface Billing {
  id: number;
  patient_id: number;
  total_amount: number;
  payment_status: PaymentStatus;
  date: string;
  patient?: Patient;
}

export interface FinancialStats {
  total_revenue: number;
  paid_invoices_count: number;
  pending_amount: number;
  pending_invoices_count: number;
  total_invoices_count: number;
}

export interface RestoreResponse {
  status: string;
  message: string;
  restored_counts: Record<string, number>;
}

export interface TableSummaryItem {
  key: string;
  label: string;
  description: string;
  count: number;
}

export interface DatabaseTablesSummaryResponse {
  tables: TableSummaryItem[];
  total_records: number;
}

export interface WipeDatabaseResponse {
  status: string;
  message: string;
  deleted_counts: Record<string, number>;
  total_deleted: number;
}

export interface DashboardSummaryResponse {
  stats: FinancialStats;
  low_stock_medicines: Medicine[];
  recent_appointments: Appointment[];
  recent_bills: Billing[];
  patients: Patient[];
}
