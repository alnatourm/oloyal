import React, { useState } from 'react';
import { sounds } from '../utils/sound';

interface TenantItem {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  brandColor?: string;
}

interface HeaderProps {
  onSearch?: (query: string) => void;
  openScannerModal: () => void;
  onQuickNotice?: () => void;
  activeTenantSlug?: string;
  tenants?: TenantItem[];
  onSelectTenant?: (slug: string) => void;
  onNavigateToAuth?: () => void;
  onNavigateToAdmin?: () => void;
  onLogout?: () => void;
  userRole?: 'admin' | 'merchant';
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  openScannerModal,
  onQuickNotice,
  activeTenantSlug,
  tenants = [],
  onSelectTenant,
  onNavigateToAuth,
  onNavigateToAdmin,
  onLogout,
  userRole = 'merchant',
}) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const activeTenant = tenants.find((t) => t.slug === activeTenantSlug) || tenants[0];
  const activeTenantName = activeTenant?.name || activeTenantSlug || 'Banlis Bistro';

  return (
    <header className="fixed top-6 left-28 lg:left-32 right-6 h-16 bg-surface-container-low/90 backdrop-blur-xl rounded-xl tactile-convex z-40 px-6 flex items-center justify-between transition-all">
      {/* Left: Brand OS Pill, Tenant Switcher & Search Input */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-container-lowest tactile-convex-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-active-glow animate-pulse"></div>
          <span className="font-label-md text-label-md tracking-wider uppercase text-on-surface font-semibold">
            Pass<span className="text-primary-container">Loyal</span> OS
          </span>
        </div>

        {/* Tenant Switcher Dropdown */}
        {tenants.length > 0 && onSelectTenant && (
          <div className="relative">
            <button
              onClick={() => {
                sounds.click();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-bold tactile-btn border border-primary-container/20 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-[#ff5722] tactile-glow"></span>
              <span className="max-w-[140px] truncate">Viewing: {activeTenantName}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">arrow_drop_down</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-60 rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-container-highest p-2 z-50 animate-in fade-in zoom-in duration-150">
                <div className="px-3 py-1.5 font-label-sm text-label-sm uppercase font-bold text-outline border-b border-surface-container mb-1">
                  Select Tenant Context
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {tenants.map((t) => (
                    <button
                      key={t.id || t.slug}
                      onClick={() => {
                        sounds.click();
                        onSelectTenant(t.slug);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-between transition-all ${
                        t.slug === activeTenantSlug
                          ? 'bg-primary-container text-on-primary font-bold'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      {t.slug === activeTenantSlug && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="hidden md:flex w-52 lg:w-72 h-10 px-4 rounded-full bg-surface tactile-deboss items-center gap-2.5">
          <span className="material-symbols-outlined text-outline text-[18px]">search</span>
          <input
            className="bg-transparent w-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
            placeholder="Search store, passes, members..."
            type="text"
            value={query}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Right: Core Telemetry & User Controls */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface tactile-deboss">
          <span className="w-2 h-2 rounded-full bg-tertiary"></span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Core Online
          </span>
          <span className="font-label-sm text-label-sm text-tertiary font-semibold">
            48ms
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Scan button */}
          <button
            onClick={() => {
              sounds.click();
              openScannerModal();
            }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold tactile-active-glow hover:brightness-105 active:scale-95 transition-all"
            title="Scan Pass"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            <span>Scan Pass</span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => {
              sounds.click();
              if (onQuickNotice) onQuickNotice();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface tactile-convex-sm transition-all relative"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-container tactile-active-glow"></span>
          </button>

          {/* Power / Logout Button (kept original look and shape as requested) */}
          <button
            onClick={() => {
              sounds.click(1200, 0.03);
              if (onLogout) onLogout();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface tactile-convex-sm transition-all"
            title="Log Out Session"
          >
            <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
          </button>

          {/* Admin Console Badge Button (Visible only to authenticated Admin) */}
          {userRole === 'admin' && onNavigateToAdmin && (
            <button
              onClick={() => {
                sounds.click();
                onNavigateToAdmin();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#191c1e] text-white font-label-sm text-label-sm font-bold shadow-md hover:bg-black transition-all shrink-0"
              title="Super Admin Master Issuer Console"
            >
              <span className="material-symbols-outlined text-[16px] text-[#ff5722]">admin_panel_settings</span>
              <span>Admin Console</span>
            </button>
          )}

          {/* Account Icon (For merchant access) */}
          {userRole !== 'admin' && onNavigateToAuth && (
            <button
              onClick={() => {
                sounds.click();
                onNavigateToAuth();
              }}
              className="w-9 h-9 rounded-full bg-[#ff5722] text-white flex items-center justify-center ring-2 ring-white shadow-sm hover:scale-105 active:scale-95 transition-transform shrink-0"
              title="Account / Sign In"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
