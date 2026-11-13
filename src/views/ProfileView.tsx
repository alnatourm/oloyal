import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/sound';

interface ProfileViewProps {
  userRole: 'super_admin' | 'admin' | 'merchant';
  activeTenantSlug: string;
  userEmail?: string;
  onProfileUpdated?: (updatedName?: string, updatedEmail?: string) => void;
  onBack?: () => void;
}

interface MerchantProfileData {
  id: string;
  slug: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  brandColor: string;
  logoUrl?: string;
  archetype: 'loyalty' | 'gift' | 'ticket';
  classId?: string;
  plan: string;
  passLimit: number;
  passCount: number;
  totalPoints: number;
  status: string;
  createdAt?: string;
}

interface AdminProfileData {
  email: string;
  displayName: string;
  organization: string;
  phone: string;
  contactEmail: string;
  issuerId: string;
  serviceAccountEmail: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userRole,
  activeTenantSlug,
  userEmail,
  onProfileUpdated,
  onBack,
}) => {
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Merchant editable fields
  const [merchantMeta, setMerchantMeta] = useState<MerchantProfileData | null>(null);
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [brandColor, setBrandColor] = useState('#ff5722');
  const [logoUrl, setLogoUrl] = useState('');
  const [archetype, setArchetype] = useState<'loyalty' | 'gift' | 'ticket'>('loyalty');

  // Admin editable fields
  const [adminMeta, setAdminMeta] = useState<AdminProfileData | null>(null);
  const [displayName, setDisplayName] = useState('Super Admin Master Issuer');
  const [organization, setOrganization] = useState('PassLoyal OS Master Issuer');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState(userEmail || '');
  const [issuerId, setIssuerId] = useState('');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');

  // Shared Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedHash, setGeneratedHash] = useState<string | null>(null);
  const [hashCopied, setHashCopied] = useState(false);

  const loadProfile = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (isSuperAdmin) {
        const res = await fetch('/api/admin/profile');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load admin profile.');
        }
        setAdminMeta(data);
        setDisplayName(data.displayName || 'Super Admin Master Issuer');
        setOrganization(data.organization || 'PassLoyal OS Master Issuer');
        setPhone(data.phone || '');
        setContactEmail(data.contactEmail || data.email || userEmail || '');
        setIssuerId(data.issuerId || '');
        setServiceAccountEmail(data.serviceAccountEmail || '');
      } else {
        const res = await fetch(`/api/tenants/${encodeURIComponent(activeTenantSlug)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load store profile.');
        }
        setMerchantMeta(data);
        setStoreName(data.name || '');
        setOwnerName(data.ownerName || '');
        setOwnerEmail(data.ownerEmail || userEmail || '');
        setBrandColor(data.brandColor || '#ff5722');
        setLogoUrl(data.logoUrl || '');
        setArchetype((data.archetype as 'loyalty' | 'gift' | 'ticket') || 'loyalty');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [isSuperAdmin, activeTenantSlug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setGeneratedHash(null);
    setHashCopied(false);
    sounds.click();

    // Validate password change if provided
    if (newPassword || confirmPassword) {
      if (newPassword.trim().length < 8) {
        setErrorMsg('New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirmation do not match.');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (isSuperAdmin) {
        const payload: Record<string, any> = {
          displayName: displayName.trim(),
          organization: organization.trim(),
          phone: phone.trim(),
          contactEmail: contactEmail.trim().toLowerCase(),
          issuerId: issuerId.trim(),
          serviceAccountEmail: serviceAccountEmail.trim(),
        };
        if (newPassword.trim()) {
          payload.currentPassword = currentPassword;
          payload.newPassword = newPassword.trim();
        }

        const res = await fetch('/api/admin/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update admin profile.');
        }

        sounds.chime();
        setAdminMeta(data.profile || null);
        if (data.generatedPasswordHash) {
          setGeneratedHash(data.generatedPasswordHash);
        }
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg(data.message || 'Admin profile updated successfully.');
        onProfileUpdated?.(displayName.trim(), contactEmail.trim().toLowerCase());
      } else {
        if (!storeName.trim()) {
          throw new Error('Store name cannot be empty.');
        }
        if (!ownerEmail.trim()) {
          throw new Error('Owner email cannot be empty.');
        }

        const payload: Record<string, any> = {
          name: storeName.trim(),
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          brandColor,
          logoUrl: logoUrl.trim() || null,
          archetype,
        };
        if (newPassword.trim()) {
          payload.password = newPassword.trim();
        }

        const res = await fetch(`/api/tenants/${encodeURIComponent(activeTenantSlug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update store profile.');
        }

        sounds.chime();
        if (data.tenant) {
          setMerchantMeta((prev) => (prev ? { ...prev, ...data.tenant } : data.tenant));
        }
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg(
          newPassword.trim()
            ? 'Store profile & new password saved in Neon database.'
            : 'Store profile updated in Neon database.'
        );
        onProfileUpdated?.(storeName.trim(), ownerEmail.trim().toLowerCase());
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyHash = async () => {
    if (!generatedHash) return;
    try {
      await navigator.clipboard.writeText(generatedHash);
      sounds.click();
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2500);
    } catch {
      setErrorMsg('Clipboard copy unavailable; please select and copy the hash manually.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <span className="material-symbols-outlined text-[40px] text-[#ff5722] animate-spin">refresh</span>
        <p className="font-label-md text-label-md font-semibold">Loading account profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 select-none space-y-6">
      {/* Header Card */}
      <div className="bg-surface-container-low rounded-3xl p-6 sm:p-8 tactile-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
            style={{ backgroundColor: isSuperAdmin ? '#191c1e' : brandColor || '#ff5722' }}
          >
            {!isSuperAdmin && logoUrl ? (
              <img src={logoUrl} alt={storeName} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="material-symbols-outlined text-[32px]">
                {isSuperAdmin ? 'admin_panel_settings' : 'storefront'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ff5722]/15 text-[#ff5722] font-label-sm text-label-sm font-bold uppercase tracking-wider">
                {isSuperAdmin ? 'Super Admin Account' : 'Merchant Store Profile'}
              </span>
              {!isSuperAdmin && merchantMeta?.status && (
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-bold shadow-sm">
                  {merchantMeta.status}
                </span>
              )}
            </div>
            <h1 className="font-headline-md text-2xl sm:text-3xl font-extrabold text-on-surface mt-1">
              {isSuperAdmin ? displayName || 'Super Admin Master Issuer' : storeName || activeTenantSlug}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {isSuperAdmin
                ? adminMeta?.email || contactEmail || 'Platform Master Issuer Administrator'
                : ownerEmail || `${activeTenantSlug}@oloyal.com`}
            </p>
          </div>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={() => {
              sounds.click();
              onBack();
            }}
            className="px-4 py-2.5 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md font-bold tactile-btn hover:text-[#ff5722] flex items-center gap-1.5 self-start sm:self-center"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>{isSuperAdmin ? 'Admin Console' : 'Dashboard'}</span>
          </button>
        )}
      </div>

      {/* Feedback Banners */}
      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3.5 text-sm text-red-700 font-semibold flex items-center gap-2.5"
        >
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3.5 text-sm text-emerald-800 font-semibold flex items-center gap-2.5"
        >
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {generatedHash && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <span className="material-symbols-outlined text-[20px]">vpn_key</span>
              <span>New Vercel ADMIN_PASSWORD_HASH Generated</span>
            </div>
            <button
              type="button"
              onClick={copyHash}
              className="px-3 py-1.5 rounded-full bg-[#ff5722] text-white text-xs font-bold flex items-center gap-1 hover:brightness-105"
            >
              <span className="material-symbols-outlined text-[15px]">
                {hashCopied ? 'check' : 'content_copy'}
              </span>
              <span>{hashCopied ? 'Copied!' : 'Copy Hash'}</span>
            </button>
          </div>
          <p className="text-xs text-amber-900/80">
            Update the <code className="font-mono font-bold">ADMIN_PASSWORD_HASH</code> environment variable in Vercel with this hash so your new password persists across serverless restarts:
          </p>
          <div className="p-2.5 rounded-xl bg-surface-container-lowest font-mono text-xs text-on-surface break-all select-all">
            {generatedHash}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Primary Account & Store/Admin Info */}
        <div className="lg:col-span-7 bg-surface-container-low rounded-3xl p-6 sm:p-8 tactile-card space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container-highest">
            <span className="material-symbols-outlined text-[#ff5722] text-[22px]">
              {isSuperAdmin ? 'badge' : 'edit_square'}
            </span>
            <h2 className="font-headline-sm text-lg font-bold text-on-surface">
              {isSuperAdmin ? 'Administrator Identity & Issuer Config' : 'Store & Owner Information'}
            </h2>
          </div>

          {isSuperAdmin ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Display Name
                </label>
                <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">person</span>
                  <input
                    required
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Super Admin Master Issuer"
                    className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Organization Name
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">business</span>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="PassLoyal OS Master Issuer"
                      className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Admin Contact Phone
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">call</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Contact / Notification Email
                </label>
                <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">mail</span>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="alnatour.m@gmail.com"
                    className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Google Wallet Master Issuer ID
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">verified_user</span>
                    <input
                      type="text"
                      value={issuerId}
                      onChange={(e) => setIssuerId(e.target.value)}
                      placeholder="3388000000022258509"
                      className="bg-transparent w-full font-mono text-sm text-on-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Service Account Email
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">key</span>
                    <input
                      type="email"
                      value={serviceAccountEmail}
                      onChange={(e) => setServiceAccountEmail(e.target.value)}
                      placeholder="wallet-sa@project.iam.gserviceaccount.com"
                      className="bg-transparent w-full font-mono text-xs text-on-surface focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Store / Brand Name
                </label>
                <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">store</span>
                  <input
                    required
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Banlis Bistro"
                    className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Owner Full Name
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">person</span>
                    <input
                      required
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Store Owner Name"
                      className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Owner Login Email
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">mail</span>
                    <input
                      required
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@yourstore.com"
                      className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Brand Accent Color
                  </label>
                  <div className="h-11 px-3 rounded-xl bg-surface tactile-deboss flex items-center gap-3">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <span className="font-mono text-sm uppercase text-on-surface">{brandColor}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Pass Card Archetype
                  </label>
                  <select
                    value={archetype}
                    onChange={(e) => setArchetype(e.target.value as 'loyalty' | 'gift' | 'ticket')}
                    className="h-11 px-3 rounded-xl bg-surface tactile-deboss text-on-surface font-label-md text-label-md focus:outline-none"
                  >
                    <option value="loyalty">Loyalty Club</option>
                    <option value="gift">Gift Card</option>
                    <option value="ticket">Event Pass</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Store Logo URL (Optional)
                </label>
                <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">image</span>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Security / Password & Read-only Account Summary */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Security & Password Card */}
          <div className="bg-surface-container-low rounded-3xl p-6 sm:p-8 tactile-card space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container-highest">
              <span className="material-symbols-outlined text-[#ff5722] text-[22px]">lock_reset</span>
              <h2 className="font-headline-sm text-lg font-bold text-on-surface">
                Security & Password
              </h2>
            </div>

            {isSuperAdmin && (
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Current Password (required to change)
                </label>
                <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-2">lock</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current admin password"
                    className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                New Password (min 8 characters)
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <span className="material-symbols-outlined text-outline text-[18px] mr-2">key</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Confirm New Password
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <span className="material-symbols-outlined text-outline text-[18px] mr-2">check_circle</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Account Metadata Summary Card */}
          <div className="bg-surface-container-low rounded-3xl p-6 tactile-card space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container-highest">
              <span className="material-symbols-outlined text-[#ff5722] text-[20px]">info</span>
              <h3 className="font-label-md text-label-md uppercase font-bold text-on-surface">
                {isSuperAdmin ? 'Platform Authentication' : 'Subscription & Wallet Metadata'}
              </h3>
            </div>

            {isSuperAdmin ? (
              <div className="space-y-2 text-xs text-on-surface-variant">
                <div className="flex justify-between gap-2">
                  <span>Login Email (Env):</span>
                  <span className="font-mono font-bold text-on-surface truncate">
                    {adminMeta?.email || userEmail || 'Configured via SUPER_ADMIN_EMAIL'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Auth Scope:</span>
                  <span className="font-mono font-bold text-[#ff5722]">SUPER_ADMIN</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Master Issuer ID:</span>
                  <span className="font-mono font-bold text-on-surface">{issuerId || 'Unset'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-on-surface-variant">
                <div className="flex justify-between gap-2">
                  <span>Store Slug:</span>
                  <span className="font-mono font-bold text-on-surface">{merchantMeta?.slug || activeTenantSlug}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Subscription Plan:</span>
                  <span className="font-bold uppercase text-[#ff5722]">{merchantMeta?.plan || 'growth'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Issued Passes:</span>
                  <span className="font-mono font-bold text-on-surface">
                    {merchantMeta?.passCount ?? 0} / {(merchantMeta?.passLimit ?? 5000).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Google Class ID:</span>
                  <span className="font-mono text-[11px] text-on-surface truncate max-w-[180px]">
                    {merchantMeta?.classId || 'Auto-provisioned'}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="mt-3 w-full py-3.5 rounded-full bg-[#ff5722] text-white font-headline-sm text-headline-sm font-bold tactile-glow flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-lg hover:brightness-105 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
