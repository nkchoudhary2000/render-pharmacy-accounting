import React from 'react';
import { Link } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC<{ pageTitle?: string }> = ({ pageTitle }) => {
  const { user } = useAuth();
  const initialMonogram = (user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">
          {pageTitle || 'Pharmacy Accounting & Management'}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Link to My Profile */}
        <Link
          to="/profile"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-pharmacy-teal-300 transition-all text-xs font-semibold text-slate-700 shadow-2xs group"
          title="Open Profile Settings"
        >
          <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-tr from-pharmacy-teal-600 to-pharmacy-mint-500 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 ring-1 ring-slate-200">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user.name || user.email}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initialMonogram}</span>
            )}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="font-bold text-slate-800 truncate max-w-[140px]">
              {user?.name || user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {user?.username ? `@${user.username}` : `${user?.role || 'Staff'}`}
            </p>
          </div>
          <UserCog className="w-3.5 h-3.5 text-slate-400 group-hover:text-pharmacy-teal-600 ml-1 transition-colors" />
        </Link>
      </div>
    </header>
  );
};
