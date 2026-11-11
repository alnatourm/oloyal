import React, { useState, useEffect } from 'react';
import { CustomerMember } from '../types';
import { sounds } from '../utils/sound';

interface DashboardViewProps {
  activeSlug?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ activeSlug = 'banlis' }) => {
  const [tenant, setTenant] = useState<{
    id: string;
    slug: string;
    name: string;
    brandColor: string;
    logoUrl: string;
    archetype: string;
    passCount: number;
    totalPoints: number;
  }>({
    id: 't-banlis',
    slug: activeSlug,
    name: 'Banlis Bistro & Dining',
    brandColor: '#ff5722',
    logoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
    archetype: 'loyalty',
    passCount: 0,
    totalPoints: 0,
  });

  const [members, setMembers] = useState<CustomerMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Form states for Card Customization Panel
  const [editName, setEditName] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('#ff5722');
  const [editLogo, setEditLogo] = useState<string>('');
  const [editArchetype, setEditArchetype] = useState<string>('loyalty');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const triggerNotice = (msg: string) => {
    sounds.chime();
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 2500);
  };

  // Fetch Tenant Data & Member List for activeSlug
  useEffect(() => {
    setIsLoading(true);

    // Fetch tenant details
    fetch(`/api/tenants/${activeSlug}`)
      .then((res) => {
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data && data.name) {
          setTenant({
            id: data.id || 't-banlis',
            slug: data.slug || activeSlug,
            name: data.name,
            brandColor: data.brandColor || '#ff5722',
            logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
            archetype: data.archetype || 'loyalty',
            passCount: Number(data.passCount || 0),
            totalPoints: Number(data.totalPoints || 0),
          });
          setEditName(data.name);
          setEditColor(data.brandColor || '#ff5722');
          setEditLogo(data.logoUrl || '');
          setEditArchetype(data.archetype || 'loyalty');
        }
      })
      .catch((err) => console.error('Error fetching tenant:', err));

    // Fetch tenant-filtered members
    fetch(`/api/tenants/${activeSlug}/members`)
      .then((res) => {
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          return res.json();
        }
        return [];
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped: CustomerMember[] = data.map((m: any) => {
            const pts = Number(m.points || 0);
            const tierStr = pts >= 2000 ? 'PLATINUM' : pts >= 1000 ? 'GOLD VIP' : 'SILVER';
            return {
              id: m.id,
              uid: `#PL-${m.member_id || m.id}`,
              name: m.customer_name || 'Member',
              avatarUrl: m.logo_url || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&auto=format&fit=crop',
              tier: tierStr,
              tierColor: tierStr === 'PLATINUM' ? 'text-purple-500' : tierStr === 'GOLD VIP' ? 'text-primary' : 'text-on-surface',
              tierBg: tierStr === 'PLATINUM' ? 'bg-purple-100 text-purple-800' : tierStr === 'GOLD VIP' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant',
              points: pts,
              tierCap: 2000,
              entryPoints: 1000,
              thresholdPoints: 2000,
              status: 'NFC Active Node',
              joinedDate: '2026',
              syncedTime: 'Just now',
              visitCount: 1,
            };
          });
          setMembers(mapped);
        } else {
          setMembers([]);
        }
      })
      .catch((err) => console.error('Error fetching tenant members:', err))
      .finally(() => setIsLoading(false));
  }, [activeSlug]);

  // Save Card Customization to Neon tenants table
  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.chime();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tenants/${activeSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          brandColor: editColor,
          logoUrl: editLogo,
          archetype: editArchetype,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTenant((prev) => ({
          ...prev,
          name: editName,
          brandColor: editColor,
          logoUrl: editLogo,
          archetype: editArchetype,
        }));
        triggerNotice(`Saved customization for ${editName} in Neon Postgres!`);
      } else {
        triggerNotice(data.error || 'Failed to save customization.');
      }
    } catch (err: any) {
      triggerNotice(`Error: ${err?.message || 'Save failed'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const memberCount = members.length;
  const totalPointsSum = members.reduce((acc, m) => acc + m.points, 0);

  return (
    <div className="flex flex-col w-full gap-6 select-none">
      {/* Top Tenant Context Banner Header */}
      <div className="p-6 rounded-2xl bg-surface-container-low border border-primary-container/20 tactile-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-lg shrink-0 overflow-hidden"
            style={{ backgroundColor: tenant.brandColor || '#ff5722' }}
          >
            {tenant.logoUrl ? (
              <img className="w-full h-full object-cover" src={tenant.logoUrl} alt={tenant.name} />
            ) : (
              tenant.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
                {tenant.name}
              </h1>
              <span
                className="px-3 py-0.5 rounded-full text-white font-label-sm text-label-sm font-bold uppercase tracking-wider shadow-sm"
                style={{ backgroundColor: tenant.brandColor || '#ff5722' }}
              >
                {tenant.archetype} Mode
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Tenant Context: <span className="font-mono text-on-surface font-semibold">/dashboard/{tenant.slug}</span> • Class ID: {tenant.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/tenants/${tenant.slug}/members`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-md text-label-md font-semibold tactile-btn hover:text-primary flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">api</span>
            <span>API JSON Stream</span>
          </a>
        </div>
      </div>

      {/* 4 Tenant-Specific KPI Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Members in this store */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Enrolled Members
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold">
              <span className="material-symbols-outlined text-[18px]">groups</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              {memberCount}
            </span>
            <span className="font-label-md text-label-md uppercase text-on-surface-variant">
              members
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-primary font-semibold">
            Filtered strictly for {tenant.name}
          </span>
        </div>

        {/* KPI 2: Active Google Wallet Passes */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Active Wallet Passes
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold">
              <span className="material-symbols-outlined text-[18px]">wallet</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              {tenant.passCount || memberCount}
            </span>
            <span className="font-label-md text-label-md uppercase text-on-surface-variant">
              minted
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-emerald-600 font-semibold">
            Google Wallet API Synchronized
          </span>
        </div>

        {/* KPI 3: Store Points Liability */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Points Liability
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              {(tenant.totalPoints || totalPointsSum).toLocaleString()}
            </span>
            <span className="font-label-md text-label-md uppercase text-on-surface-variant">
              pts
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
            Reserve value: ${( (tenant.totalPoints || totalPointsSum) * 0.01 ).toFixed(2)}
          </span>
        </div>

        {/* KPI 4: Card Archetype */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Card Program Type
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold">
              <span className="material-symbols-outlined text-[18px]">badge</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold capitalize text-on-surface">
              {tenant.archetype}
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-primary font-semibold">
            Google Wallet Class Configured
          </span>
        </div>
      </div>

      {/* Main 2-Column Cockpit: Left = Members Table, Right = Card Customization Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 7-Cols: Enrolled Members Table for activeSlug */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-6 rounded-2xl bg-surface-container-low tactile-card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5722]">groups</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {tenant.name} Members ({memberCount})
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm font-semibold text-on-surface-variant">
                Filtered by Tenant ID
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-on-surface-variant font-label-md text-label-md flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[24px] animate-spin text-primary">refresh</span>
                <span>Loading tenant members from Neon Postgres...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant rounded-xl bg-surface-container/40 border border-dashed border-outline-variant/40 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-outline">person_off</span>
                <p className="font-bold text-on-surface">No members enrolled for {tenant.name} yet.</p>
                <p className="font-body-sm text-body-sm text-outline">
                  Enroll members using <span className="font-mono text-primary font-bold">/api/tenants/{tenant.slug}/enroll</span>
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body-sm text-body-sm">
                  <thead>
                    <tr className="border-b border-surface-container-highest text-outline font-label-sm text-label-sm uppercase tracking-wider">
                      <th className="py-3 px-3">Member</th>
                      <th className="py-3 px-3">Member ID</th>
                      <th className="py-3 px-3">Tier</th>
                      <th className="py-3 px-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-highest/60">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-surface-container/50 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs shrink-0">
                              {m.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-on-surface">{m.name}</div>
                              <div className="text-[11px] text-on-surface-variant">{m.phone || 'No Phone'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[12px] text-outline font-semibold">
                          {m.uid}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${m.tierBg}`}>
                            {m.tier}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-primary font-mono text-[13px]">
                          {m.points.toLocaleString()} PTS
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 5-Cols: Card Customization Panel for activeSlug */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-6 rounded-2xl bg-surface-container-low tactile-card flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-surface-container-highest/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff5722]">palette</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Card Customization
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">
                Neon DB Sync
              </span>
            </div>

            {/* Live Wallet Preview Card */}
            <div
              className="w-full aspect-[1.58/1] rounded-2xl p-5 text-white shadow-xl flex flex-col justify-between relative overflow-hidden transition-all"
              style={{ backgroundColor: editColor }}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold overflow-hidden shadow-md">
                    {editLogo ? (
                      <img className="w-full h-full object-cover" src={editLogo} alt="Logo" />
                    ) : (
                      editName.slice(0, 1).toUpperCase() || 'T'
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] leading-tight text-white">{editName || tenant.name}</h4>
                    <span className="text-[11px] text-white/80 font-medium">Google Wallet Class</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-black/20 text-white font-bold text-[11px] tracking-wider uppercase border border-white/20">
                  {editArchetype}
                </span>
              </div>

              <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/20">
                <div>
                  <span className="text-[10px] text-white/70 uppercase block">Sample Pass</span>
                  <span className="font-bold text-sm">John Doe</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/70 uppercase block">Points</span>
                  <span className="font-bold text-sm text-amber-200">100 PTS</span>
                </div>
              </div>
            </div>

            {/* Customization Form */}
            <form onSubmit={handleSaveCustomization} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Store / Program Title
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Artisan Bakery"
                  className="h-11 px-4 rounded-xl bg-surface border border-surface-container-highest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-11 px-3 rounded-xl bg-surface border border-surface-container-highest font-mono text-sm text-on-surface w-full uppercase"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Archetype
                  </label>
                  <select
                    value={editArchetype}
                    onChange={(e) => setEditArchetype(e.target.value)}
                    className="h-11 px-3 rounded-xl bg-surface border border-surface-container-highest font-body-md text-body-md text-on-surface focus:outline-none"
                  >
                    <option value="loyalty">Loyalty</option>
                    <option value="stamp">Stamp Card</option>
                    <option value="vip">VIP Tier</option>
                    <option value="membership">Membership</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                  Program Logo URL (Public HTTPS)
                </label>
                <input
                  type="url"
                  value={editLogo}
                  onChange={(e) => setEditLogo(e.target.value)}
                  placeholder="https://your-domain.com/logo.png"
                  className="h-11 px-4 rounded-xl bg-surface border border-surface-container-highest font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-full bg-[#ff5722] text-white font-headline-sm text-headline-sm font-bold tactile-glow flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg mt-2"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                    <span>Saving to Neon DB...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    <span>Save Customization for {tenant.name}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notice */}
      {noticeMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-surface-container-lowest text-on-surface rounded-full px-6 py-4 tactile-card flex items-center gap-3 ring-1 ring-primary-container/20 shadow-2xl">
          <span className="material-symbols-outlined text-primary">verified</span>
          <span className="font-label-md text-label-md font-bold">{noticeMessage}</span>
        </div>
      )}
    </div>
  );
};
