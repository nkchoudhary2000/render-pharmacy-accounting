import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types';
import { authApi } from '../api/endpoints';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  currency: string;
  requiresPasswordSetup: boolean;
  setRequiresPasswordSetup: (req: boolean) => void;
  updateUser: (updatedUser: User) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string, source?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState<boolean>(false);

  const handleAuthSuccess = (data: AuthResponse) => {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    if (data.requires_password_setup || !data.user.has_password) {
      setRequiresPasswordSetup(true);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const incomingToken = urlParams.get('token') || urlParams.get('access_token');
        const incomingCredential = urlParams.get('credential') || urlParams.get('google_credential');
        const forcePasswordSetup =
          urlParams.get('setup_password') === 'true' ||
          urlParams.get('source') === 'firebase';

        if (incomingCredential) {
          const data = await authApi.googleLogin(incomingCredential, 'firebase');
          handleAuthSuccess(data);
          if (forcePasswordSetup || data.requires_password_setup || !data.user.has_password) {
            setRequiresPasswordSetup(true);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (incomingToken) {
          localStorage.setItem('token', incomingToken);
          setToken(incomingToken);
          const currentUser = await authApi.getMe();
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
          if (forcePasswordSetup || !currentUser.has_password) {
            setRequiresPasswordSetup(true);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          const storedToken = localStorage.getItem('token');
          if (storedToken) {
            const currentUser = await authApi.getMe();
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
            if (forcePasswordSetup || !currentUser.has_password) {
              setRequiresPasswordSetup(true);
            }
            if (forcePasswordSetup) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }
      } catch (err) {
        console.error('Failed to verify token or process external login', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    handleAuthSuccess(data);
  };

  const register = async (email: string, password: string) => {
    const data = await authApi.register(email, password);
    handleAuthSuccess(data);
  };

  const googleLogin = async (credential: string, source: string = 'web') => {
    const data = await authApi.googleLogin(credential, source);
    handleAuthSuccess(data);
    if (source === 'firebase' || data.requires_password_setup || !data.user.has_password) {
      setRequiresPasswordSetup(true);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'ADMIN';
  const currency = user?.currency || '$';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        currency,
        requiresPasswordSetup,
        setRequiresPasswordSetup,
        updateUser,
        login,
        register,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
