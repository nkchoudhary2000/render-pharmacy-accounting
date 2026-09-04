import axios from 'axios';

// When deployed on Render or elsewhere, use VITE_API_BASE_URL.
// In local dev, Vite proxy handles requests prefixed with /api.
const baseURL = import.meta.env.VITE_API_BASE_URL ? `https://${import.meta.env.VITE_API_BASE_URL.replace(/^https?:\/\//, '')}` : '';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle unauthenticated 401s
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't loop if already on login page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
