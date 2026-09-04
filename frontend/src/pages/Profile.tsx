import React, { useState } from 'react';
import {
  User, AtSign, Shield, KeyRound, CheckCircle2, AlertCircle,
  Camera, Sparkles, DollarSign, RefreshCw, Eye, EyeOff, Save, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80', // Female Doctor
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80', // Male Doctor
  'https://images.unsplash.com/photo-1594824813686-7497d392576b?w=150&auto=format&fit=crop&q=80', // Pharmacist
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80', // Clinical Specialist
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80', // Young Doctor
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', // Executive Director
];

const CURRENCY_OPTIONS = [
  { symbol: '$', label: 'USD ($) - US Dollar' },
  { symbol: '€', label: 'EUR (€) - Euro' },
  { symbol: '£', label: 'GBP (£) - British Pound' },
  { symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { symbol: 'CA$', label: 'CAD (CA$) - Canadian Dollar' },
  { symbol: 'A$', label: 'AUD (A$) - Australian Dollar' },
  { symbol: '¥', label: 'JPY (¥) - Japanese Yen' },
  { symbol: 'AED', label: 'AED - UAE Dirham' },
];

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile Form State
  const [name, setName] = useState<string>(user?.name || '');
  const [username, setUsername] = useState<string>(user?.username || '');
  const [profilePicture, setProfilePicture] = useState<string>(user?.profile_picture || '');
  const [currency, setCurrency] = useState<string>(user?.currency || '$');
  const [customCurrency, setCustomCurrency] = useState<string>('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // Status & Feedback State
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Handle Image File Upload (converted to Base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileErrorMsg('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    // Limit to 2MB to keep payload reasonable
    if (file.size > 2 * 1024 * 1024) {
      setProfileErrorMsg('Image is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setProfilePicture(base64String);
      setProfileErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile Information
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const selectedCurrency = customCurrency.trim() ? customCurrency.trim() : currency;
      const updated = await authApi.updateProfile({
        name: name.trim() || null,
        username: username.trim() || null,
        profile_picture: profilePicture || null,
        currency: selectedCurrency,
      });

      updateUser(updated);
      setProfileSuccessMsg('Profile updated successfully!');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update profile. Please try again.';
      setProfileErrorMsg(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const needsCurrentPassword = user?.has_password ?? (user?.auth_provider !== 'GOOGLE');

  // Submit Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (needsCurrentPassword && !currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match. Please verify.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await authApi.changePassword({
        current_password: needsCurrentPassword ? currentPassword : undefined,
        new_password: newPassword,
      });

      setPasswordSuccessMsg(res.message || 'Password saved successfully!');
      if (user) {
        updateUser({ ...user, has_password: true });
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update password. Check your details.';
      setPasswordErrorMsg(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initialMonogram = (name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner & Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 md:p-8 text-white shadow-xl border border-slate-700/50">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-pharmacy-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-48 h-48 bg-pharmacy-mint-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Preview in Hero */}
          <div className="relative group">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden ring-4 ring-pharmacy-teal-400/40 bg-slate-800 flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="bg-gradient-to-tr from-pharmacy-teal-500 to-pharmacy-mint-400 w-full h-full flex items-center justify-center">
                  {initialMonogram}
                </span>
              )}
            </div>
            <label
              htmlFor="hero-avatar-upload"
              className="absolute -bottom-2 -right-2 bg-pharmacy-teal-500 hover:bg-pharmacy-teal-400 text-white p-2 rounded-xl shadow-lg cursor-pointer transition-transform group-hover:scale-110 flex items-center justify-center"
              title="Change Photo"
            >
              <Camera className="w-4 h-4" />
              <input
                id="hero-avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* User Bio & Badges */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {name || 'Pharmacist Profile'}
              </h1>
              {username && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pharmacy-teal-500/20 text-pharmacy-teal-300 border border-pharmacy-teal-500/30">
                  @{username}
                </span>
              )}
            </div>
            <p className="text-slate-300 text-sm font-medium">{user?.email}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  user?.role === 'ADMIN'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {user?.role || 'STAFF'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Auth: {user?.auth_provider || 'LOCAL'}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                <DollarSign className="w-3.5 h-3.5" />
                Currency: <span className="font-mono font-bold text-white">{user?.currency || '$'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Information & Avatar (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Personal Details */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-pharmacy-teal-600" />
                Personal Profile Details
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage your public persona, display name, unique username handle, and avatar photo.
              </p>
            </div>

            {profileSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Photo Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Profile Picture
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-slate-200 bg-white flex items-center justify-center shrink-0 shadow-xs">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-lg text-slate-400">
                        {initialMonogram}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="file-upload-input"
                        className="px-3.5 py-1.5 bg-white border border-slate-300 hover:border-pharmacy-teal-500 hover:text-pharmacy-teal-700 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Upload Image
                        <input
                          id="file-upload-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>

                      {profilePicture && (
                        <button
                          type="button"
                          onClick={() => setProfilePicture('')}
                          className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Supports JPG, PNG, or WEBP up to 2MB. Or paste an image URL below.
                    </p>
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div className="mt-3">
                  <input
                    type="url"
                    value={profilePicture.startsWith('data:') ? '' : profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    placeholder="Or paste external image URL (https://...)"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500 bg-white"
                  />
                </div>

                {/* Preset Avatar Pickers */}
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
                    Or select from medical avatars:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProfilePicture(url)}
                        className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 transition-transform hover:scale-105 ${
                          profilePicture === url
                            ? 'border-pharmacy-teal-600 ring-2 ring-pharmacy-teal-300'
                            : 'border-slate-200 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Name & Username Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Alex Morgan"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500 font-medium text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Displayed on invoices and prescription stamps.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="alex_morgan"
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500 font-mono text-slate-800"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Unique handle for your account.</p>
                </div>
              </div>

              {/* Email (Read-Only) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] font-bold uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
              </div>

              {/* Currency Preference */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  System Currency Preference
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Select the currency symbol used across your inventory prices, patient invoices, and financial reports.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {CURRENCY_OPTIONS.map((c) => (
                    <button
                      key={c.symbol}
                      type="button"
                      onClick={() => {
                        setCurrency(c.symbol);
                        setCustomCurrency('');
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${
                        currency === c.symbol && !customCurrency
                          ? 'bg-teal-50 border-pharmacy-teal-600 text-pharmacy-teal-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{c.label}</span>
                      <span className="font-mono text-sm">{c.symbol}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">Or enter custom currency:</span>
                  <input
                    type="text"
                    maxLength={10}
                    value={customCurrency}
                    onChange={(e) => setCustomCurrency(e.target.value)}
                    placeholder="e.g. CHF or NZ$"
                    className="w-28 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500"
                  />
                  <span className="text-xs text-slate-400">
                    Active: <strong className="text-slate-800 font-mono">{customCurrency || currency}</strong>
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-gradient-to-r from-pharmacy-teal-600 to-pharmacy-teal-700 hover:from-pharmacy-teal-700 hover:to-pharmacy-teal-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Security & Password Change */}
        <div className="space-y-6">
          {/* Card: Change Password */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-pharmacy-coral-500" />
                Security & Password
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Update your login password to maintain high clinical data security.
              </p>
            </div>

            {passwordSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {!needsCurrentPassword && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Google Account Connected</p>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      You signed in via Google OAuth. Setting a password allows you to log in with your email & password too.
                    </p>
                  </div>
                </div>
              )}

              {/* Current Password - rendered ONLY when the user already has a password set */}
              {needsCurrentPassword && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-500"
                />
              </div>

              {/* Submit Password Button */}
              <button
                type="submit"
                disabled={isChangingPassword || !newPassword}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {needsCurrentPassword ? 'Updating Password...' : 'Setting Password...'}
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    {needsCurrentPassword ? 'Update Password' : 'Set Password'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card: Account Summary Meta */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Account Overview
            </h3>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span>Account ID</span>
                <span className="font-mono font-bold text-slate-900">#{user?.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span>Assigned Role</span>
                <span className="font-bold text-pharmacy-teal-700">{user?.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span>Sign-in Provider</span>
                <span className="font-medium text-slate-800">{user?.auth_provider}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Registered On</span>
                <span className="text-slate-800">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
