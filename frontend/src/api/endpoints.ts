import { apiClient } from './client';
import {
  AuthResponse, User, UserProfileUpdatePayload, UserPasswordChangePayload,
  Patient, PatientProfile, Doctor, DoctorProfile,
  Medicine, Appointment, Prescription, Billing, FinancialStats, RestoreResponse,
  DatabaseTablesSummaryResponse, WipeDatabaseResponse, DashboardSummaryResponse
} from '../types';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
    return res.data;
  },
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/register', { email, password });
    return res.data;
  },
  googleLogin: async (credential: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/google', { credential });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/api/auth/me');
    return res.data;
  },
  updateProfile: async (data: UserProfileUpdatePayload): Promise<User> => {
    const res = await apiClient.patch<User>('/api/auth/profile', data);
    return res.data;
  },
  changePassword: async (data: UserPasswordChangePayload): Promise<{ status: string; message: string }> => {
    const res = await apiClient.post<{ status: string; message: string }>('/api/auth/change-password', data);
    return res.data;
  },
  getConfig: async (): Promise<{ google_client_id: string }> => {
    const res = await apiClient.get<{ google_client_id: string }>('/api/auth/config');
    return res.data;
  },
};

export const patientsApi = {
  getAll: async (search?: string): Promise<Patient[]> => {
    const res = await apiClient.get<Patient[]>('/api/patients', { params: { search } });
    return res.data;
  },
  getById: async (id: number): Promise<PatientProfile> => {
    const res = await apiClient.get<PatientProfile>(`/api/patients/${id}`);
    return res.data;
  },
  create: async (data: Omit<Patient, 'id' | 'created_at'>): Promise<Patient> => {
    const res = await apiClient.post<Patient>('/api/patients', data);
    return res.data;
  },
  patch: async (id: number, data: Partial<Patient>): Promise<Patient> => {
    const res = await apiClient.patch<Patient>(`/api/patients/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/api/patients/${id}`);
    return res.data;
  },
};

export const doctorsApi = {
  getAll: async (search?: string): Promise<Doctor[]> => {
    const res = await apiClient.get<Doctor[]>('/api/doctors', { params: { search } });
    return res.data;
  },
  getById: async (id: number): Promise<DoctorProfile> => {
    const res = await apiClient.get<DoctorProfile>(`/api/doctors/${id}`);
    return res.data;
  },
  create: async (data: Omit<Doctor, 'id'>): Promise<Doctor> => {
    const res = await apiClient.post<Doctor>('/api/doctors', data);
    return res.data;
  },
  patch: async (id: number, data: Partial<Doctor>): Promise<Doctor> => {
    const res = await apiClient.patch<Doctor>(`/api/doctors/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/api/doctors/${id}`);
    return res.data;
  },
};

export const medicinesApi = {
  getAll: async (params?: { search?: string; low_stock?: boolean; expiring_soon?: boolean }): Promise<Medicine[]> => {
    const res = await apiClient.get<Medicine[]>('/api/medicines', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Medicine> => {
    const res = await apiClient.get<Medicine>(`/api/medicines/${id}`);
    return res.data;
  },
  create: async (data: Omit<Medicine, 'id'>): Promise<Medicine> => {
    const res = await apiClient.post<Medicine>('/api/medicines', data);
    return res.data;
  },
  patch: async (id: number, data: Partial<Medicine>): Promise<Medicine> => {
    const res = await apiClient.patch<Medicine>(`/api/medicines/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/api/medicines/${id}`);
    return res.data;
  },
};

export const appointmentsApi = {
  getAll: async (status_filter?: string): Promise<Appointment[]> => {
    const res = await apiClient.get<Appointment[]>('/api/appointments', { params: { status_filter } });
    return res.data;
  },
  create: async (data: { patient_id: number; doctor_id: number; appointment_date: string; status?: string; notes?: string }): Promise<Appointment> => {
    const res = await apiClient.post<Appointment>('/api/appointments', data);
    return res.data;
  },
  patch: async (id: number, data: Partial<Appointment>): Promise<Appointment> => {
    const res = await apiClient.patch<Appointment>(`/api/appointments/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/api/appointments/${id}`);
    return res.data;
  },
};

export const prescriptionsApi = {
  getAll: async (): Promise<Prescription[]> => {
    const res = await apiClient.get<Prescription[]>('/api/prescriptions');
    return res.data;
  },
  getById: async (id: number): Promise<Prescription> => {
    const res = await apiClient.get<Prescription>(`/api/prescriptions/${id}`);
    return res.data;
  },
  create: async (data: { patient_id: number; doctor_id: number; details: string; date: string }): Promise<Prescription> => {
    const res = await apiClient.post<Prescription>('/api/prescriptions', data);
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/api/prescriptions/${id}`);
    return res.data;
  },
};

export const billingApi = {
  getAll: async (status_filter?: string): Promise<Billing[]> => {
    const res = await apiClient.get<Billing[]>('/api/billing', { params: { status_filter } });
    return res.data;
  },
  getById: async (id: number): Promise<Billing> => {
    const res = await apiClient.get<Billing>(`/api/billing/${id}`);
    return res.data;
  },
  getStats: async (): Promise<FinancialStats> => {
    const res = await apiClient.get<FinancialStats>('/api/billing/stats');
    return res.data;
  },
  create: async (data: { patient_id: number; total_amount: number; payment_status: string; date: string }): Promise<Billing> => {
    const res = await apiClient.post<Billing>('/api/billing', data);
    return res.data;
  },
  patch: async (id: number, data: Partial<Billing>): Promise<Billing> => {
    const res = await apiClient.patch<Billing>(`/api/billing/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/api/billing/${id}`);
    return res.data;
  },
};

export const adminApi = {
  getUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/api/admin/users');
    return res.data;
  },
  updateRole: async (userId: number, role: 'ADMIN' | 'STAFF'): Promise<User> => {
    const res = await apiClient.patch<User>(`/api/admin/users/${userId}/role`, { role });
    return res.data;
  },
  deleteUser: async (userId: number): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/api/admin/users/${userId}`);
    return res.data;
  },
  downloadBackup: async (): Promise<void> => {
    const res = await apiClient.get('/api/admin/backup', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('download', `pharmacy_backup_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },
  restoreBackup: async (file: File): Promise<RestoreResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<RestoreResponse>('/api/admin/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getTablesSummary: async (): Promise<DatabaseTablesSummaryResponse> => {
    const res = await apiClient.get<DatabaseTablesSummaryResponse>('/api/admin/tables-summary');
    return res.data;
  },
  wipeDatabase: async (tables: string[], confirmPhrase: string = 'WIPE'): Promise<WipeDatabaseResponse> => {
    const res = await apiClient.post<WipeDatabaseResponse>('/api/admin/wipe-database', {
      tables,
      confirm_phrase: confirmPhrase,
    });
    return res.data;
  },
  seedDemoData: async (): Promise<any> => {
    const res = await apiClient.post('/api/seed');
    return res.data;
  }
};

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummaryResponse> => {
    const res = await apiClient.get<DashboardSummaryResponse>('/api/dashboard/summary');
    return res.data;
  }
};
