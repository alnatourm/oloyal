import React, { useState, useEffect } from 'react';
import { CustomerMember } from '../types';

interface DashboardViewProps {
  activeSlug?: string;
  onNavigateToPassStudio?: () => void;
  onEnrollMember?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeSlug = 'banlis',
  onNavigateToPassStudio,
  onEnrollMember,
}) => {
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  const memberCount = members.length;
  const totalPointsSum = members.reduce((acc, m) => acc + m.points, 0);

  // Filter members by search and tier
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.uid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = selectedTier === 'ALL' || m.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

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
          {onNavigateToPassStudio && (
            <button
              onClick={onNavigateToPassStudio}
              className="px-4 py-2 rounded-full bg-[#ff5722]/10 hover:bg-[#ff5722] hover:text-white text-[#ff5722] font-label-md text-label-md font-bold tactile-btn flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">palette</span>
              <span>Pass Studio Designer</span>
            </button>
          )}

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

      {/* Full-Width Enrolled Members Table for activeSlug */}
      <div className="p-6 rounded-2xl bg-surface-container-low tactile-card flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">groups</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {tenant.name} Members Directory
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Enrolled pass holders with live Google Wallet tokens and balance synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEnrollMember && (
              <button
                onClick={onEnrollMember}
                className="px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold tactile-glow hover:brightness-105 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Enroll Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-surface-container-highest/60">
          <div className="flex items-center gap-2 w-full sm:w-80 h-10 px-3.5 rounded-full bg-surface tactile-deboss">
            <span className="material-symbols-outlined text-outline text-[18px]">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member name or ID..."
              className="bg-transparent w-full font-body-sm text-body-sm text-on-surface focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto p-1 bg-surface-container rounded-full">
            {['ALL', 'SILVER', 'GOLD VIP', 'PLATINUM'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  selectedTier === tier
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="p-16 text-center text-on-surface-variant font-label-md text-label-md flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[28px] animate-spin text-primary">refresh</span>
            <span>Loading members from database...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-16 text-center text-on-surface-variant rounded-2xl bg-surface-container/30 border border-dashed border-outline-variant/40 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-[32px]">person_off</span>
            </div>
            <div>
              <p className="font-bold text-on-surface text-base">
                {searchTerm || selectedTier !== 'ALL'
                  ? 'No matching members found.'
                  : `No members enrolled for ${tenant.name} yet.`}
              </p>
              <p className="font-body-sm text-body-sm text-outline mt-1">
                {searchTerm || selectedTier !== 'ALL'
                  ? 'Try adjusting your search query or tier filter.'
                  : 'Share the Customer Join link to start issuing passes to Google Wallet.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-container-highest/60">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="bg-surface-container/50 border-b border-surface-container-highest text-outline font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Pass / Member ID</th>
                  <th className="py-3 px-4">Loyalty Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Points Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/60 bg-surface-container-lowest">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0"
                          style={{ backgroundColor: tenant.brandColor || '#ff5722' }}
                        >
                          {m.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-on-surface">{m.name}</div>
                          <div className="text-[12px] text-on-surface-variant font-mono">{m.phone || 'NFC Card Member'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-[13px] text-outline font-semibold">
                      {m.uid}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold ${m.tierBg}`}>
                        {m.tier}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Google Wallet Active</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-[#ff5722] font-mono text-[15px]">
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
  );
};
