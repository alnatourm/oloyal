import React, { useEffect, useState } from 'react';
import { sounds } from '../utils/sound';
import { authFetch } from '../utils/auth';

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
  onNavigateToProfile?: () => void;
  onNavigateToAdmin?: () => void;
  onSelectMemberForPos?: (memberId: string) => void;
  onNavigateView?: (view: any) => void;
  onLogout?: () => void;
  userRole?: 'super_admin' | 'admin' | 'merchant';
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  openScannerModal,
  activeTenantSlug,
  tenants = [],
  onSelectTenant,
  onNavigateToAuth,
  onNavigateToProfile,
  onNavigateToAdmin,
  onSelectMemberForPos,
  onNavigateView,
  onLogout,
  userRole = 'merchant',
}) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [membersCache, setMembersCache] = useState<any[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<Array<{ id: string; title: string; detail: string; time: string }>>([]);

  const isAdmin = userRole === 'super_admin' || userRole === 'admin';
  const activeTenant = tenants.find((t) => t.slug === activeTenantSlug) || tenants[0];
  const activeTenantName = activeTenant?.name || activeTenantSlug || 'Store Console';

  useEffect(() => {
    const slugQuery = isAdmin && activeTenantSlug ? `?slug=${encodeURIComponent(activeTenantSlug)}` : '';
    authFetch(`/api/members${slugQuery}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        if (Array.isArray(rows)) setMembersCache(rows);
      })
      .catch(() => {});
  }, [activeTenantSlug, isAdmin]);

  const loadAlerts = async () => {
    const items: Array<{ id: string; title: string; detail: string; time: string }> = [];
    if (isAdmin) {
      const res = await authFetch('/api/tenants?status=Pending').catch(() => null);
      if (res?.ok) {
        const pending = await res.json().catch(() => []);
        if (Array.isArray(pending)) {
          pending.slice(0, 4).forEach((t: any) => {
            items.push({
              id: `pend-${t.id}`,
              title: `Approval Needed: ${t.name}`,
              detail: `${(t.plan || 'growth').toUpperCase()} package • ${t.ownerEmail}`,
              time: 'Pending',
            });
          });
        }
      }
    }
    const slugParam = isAdmin && activeTenantSlug ? `?slug=${encodeURIComponent(activeTenantSlug)}` : '';
    const anRes = await authFetch(`/api/analytics${slugParam}`).catch(() => null);
    if (anRes?.ok) {
      const an = await anRes.json().catch(() => null);
      if (an?.recentTransactions && Array.isArray(an.recentTransactions)) {
        an.recentTransactions.slice(0, 5).forEach((tx: any) => {
          const amt = Number(tx.change_amount || 0);
          items.push({
            id: tx.id,
            title: `${tx.member_name || 'Member'} (${amt >= 0 ? `+${amt}` : amt} PTS)`,
            detail: tx.reason || 'Points transaction',
            time: tx.created_at ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          });
        });
      }
    }
    setRecentAlerts(items);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const q = query.trim().toLowerCase();
  const matchedMembers = q
    ? membersCache
        .filter(
          (m) =>
            (m.customer_name || '').toLowerCase().includes(q) ||
            (m.member_id || '').toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q)
        )
        .slice(0, 5)
    : [];

  const matchedStores =
    q && isAdmin
      ? tenants
          .filter(
            (t) =>
              (t.name || '').toLowerCase().includes(q) ||
              (t.slug || '').toLowerCase().includes(q)
          )
          .slice(0, 4)
      : [];

  return (
    <header className="fixed top-6 left-28 lg:left-32 right-6 h-16 bg-surface-container-low/90 backdrop-blur-xl rounded-xl tactile-convex z-40 px-6 flex items-center justify-between transition-all">
      {/* Left: Brand OS, Tenant Switcher & Global Search */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-container-lowest tactile-convex-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-container"></div>
          <span className="font-label-md text-label-md tracking-wider uppercase text-on-surface font-semibold">
            Pass<span className="text-primary-container">Loyal</span> OS
          </span>
        </div>

        {/* Tenant Switcher Dropdown (Super Admin only) */}
        {isAdmin && tenants.length > 0 && onSelectTenant && (
          <div className="relative">
            <button
              onClick={() => {
                sounds.click();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-bold tactile-btn border border-primary-container/20 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-[#ff5722]"></span>
              <span className="max-w-[140px] truncate">Viewing: {activeTenantName}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">arrow_drop_down</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-60 rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-container-highest p-2 z-50">
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

        <div className="relative hidden md:block">
          <div className="w-52 lg:w-72 h-10 px-4 rounded-full bg-surface tactile-deboss flex items-center gap-2.5">
            <span className="material-symbols-outlined text-outline text-[18px]">search</span>
            <input
              className="bg-transparent w-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
              placeholder="Search members, IDs, stores..."
              type="text"
              value={query}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onChange={handleSearchChange}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            )}
          </div>

          {searchFocused && q && (
            <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-container-highest p-2 z-50">
              {matchedMembers.length === 0 && matchedStores.length === 0 ? (
                <div className="px-3 py-3 text-xs text-outline text-center">No matching members or stores</div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {matchedMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={() => {
                        sounds.click();
                        setQuery('');
                        if (onSelectMemberForPos) onSelectMemberForPos(m.id);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-container flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-on-surface truncate">{m.customer_name}</div>
                        <div className="text-[11px] text-outline font-mono">{m.member_id}</div>
                      </div>
                      <span className="text-xs font-bold text-primary shrink-0 tabular-nums">
                        {Number(m.points || 0).toLocaleString()} PTS
                      </span>
                    </button>
                  ))}
                  {matchedStores.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={() => {
                        sounds.click();
                        setQuery('');
                        if (onSelectTenant) onSelectTenant(t.slug);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-surface-container flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-bold text-on-surface truncate">Store: {t.name}</span>
                      <span className="text-[10px] text-outline font-mono">{t.slug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex items-center gap-2">
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

          {/* Activity & Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => {
                sounds.click();
                const next = !alertsOpen;
                setAlertsOpen(next);
                if (next) loadAlerts();
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface tactile-convex-sm transition-all relative"
              title="Activity & Notifications"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </button>

            {alertsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-surface-container-lowest shadow-2xl border border-surface-container-highest p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-container">
                  <span className="font-bold text-xs uppercase tracking-wider text-on-surface">
                    Store Activity &amp; Alerts
                  </span>
                  <button
                    type="button"
                    onClick={() => setAlertsOpen(false)}
                    className="text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                {recentAlerts.length === 0 ? (
                  <p className="text-xs text-outline py-4 text-center">No recent alerts or transactions yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentAlerts.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setAlertsOpen(false);
                          if (item.id.startsWith('pend-') && onNavigateToAdmin) onNavigateToAdmin();
                          else if (onNavigateView) onNavigateView('reports');
                        }}
                        className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-on-surface truncate">{item.title}</span>
                          <span className="text-[10px] font-mono text-outline shrink-0">{item.time}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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

          {isAdmin && onNavigateToAdmin && (
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

          {(onNavigateToProfile || onNavigateToAuth) && (
            <button
              onClick={() => {
                sounds.click();
                if (onNavigateToProfile) onNavigateToProfile();
                else if (onNavigateToAuth) onNavigateToAuth();
              }}
              className="w-9 h-9 rounded-full bg-[#ff5722] text-white flex items-center justify-center ring-2 ring-white shadow-sm hover:scale-105 active:scale-95 transition-transform shrink-0"
              title="My Profile & Account Settings"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
