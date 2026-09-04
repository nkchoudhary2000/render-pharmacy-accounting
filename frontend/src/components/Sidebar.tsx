import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Pill, Calendar,
  FileSpreadsheet, Receipt, ShieldAlert, LogOut, HeartPulse, UserCog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/doctors', label: 'Doctors', icon: UserCheck },
    { to: '/inventory', label: 'Medicines Inventory', icon: Pill },
    { to: '/appointments', label: 'Appointments', icon: Calendar },
    { to: '/prescriptions', label: 'Prescriptions (Rx)', icon: FileSpreadsheet },
    { to: '/billing', label: 'Billing & Accounting', icon: Receipt },
    { to: '/profile', label: 'My Profile', icon: UserCog },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin & Backup', icon: ShieldAlert });
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800 z-30">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pharmacy-teal-600 to-pharmacy-mint-500 flex items-center justify-center text-white shadow-md shadow-pharmacy-teal-900/30">
          <HeartPulse className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
            PharmaLedger
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Accounting & Clinical</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-pharmacy-teal-600/20 text-pharmacy-teal-300 border border-pharmacy-teal-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User profile & Logout footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800 mb-2">
          <NavLink
            to="/profile"
            className="flex items-center gap-2.5 min-w-0 flex-1 mr-2 hover:opacity-90 transition-opacity"
            title="Go to My Profile"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-pharmacy-teal-600 to-pharmacy-mint-500 text-white font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-slate-700">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user.name || user.email}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || user?.email}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                    user?.role === 'ADMIN'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}
                >
                  {user?.role || 'STAFF'}
                </span>
                <span className="text-[10px] text-slate-500">• {user?.currency || '$'}</span>
              </div>
            </div>
          </NavLink>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
