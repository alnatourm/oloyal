import React, { useState, useEffect } from 'react';
import { CustomerMember } from '../types';
import { sounds } from '../utils/sound';
import { authFetch, getAuthToken } from '../utils/auth';

interface CustomersCRMViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
  onProvisionNewMember?: () => void;
}

export const CustomersCRMView: React.FC<CustomersCRMViewProps> = ({
  activeSlug = '',
  userRole = 'merchant',
  onProvisionNewMember,
}) => {
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const [members, setMembers] = useState<CustomerMember[]>([]);
  const [storeName, setStoreName] = useState<string>(activeSlug || 'Store');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [filterSegment, setFilterSegment] = useState<'vip' | 'all' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMembers([]);
    setSelectedMemberId('');
    setIsLoading(true);
    setStoreName(activeSlug || 'Store');

    if (!getAuthToken()) {
      setIsLoading(false);
      return;
    }

    const membersUrl =
      isSuperAdmin && activeSlug
        ? `/api/members?slug=${encodeURIComponent(activeSlug)}`
        : '/api/members';

    const loadMembers = authFetch(membersUrl)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          const mapped: CustomerMember[] = data.map((m: any) => {
            const pts = Number(m.points || 0);
            const tierStr = pts >= 2000 ? 'PLATINUM' : pts >= 1000 ? 'GOLD VIP' : 'SILVER';
            return {
              id: m.id,
              uid: `#${m.member_id || m.id}`,
              name: m.customer_name || m.name || 'Member',
              phone: m.phone || '',
              avatarUrl: m.logo_url || '',
              initials: String(m.customer_name || m.name || 'M').slice(0, 2).toUpperCase(),
              tier: tierStr,
              tierColor:
                tierStr === 'PLATINUM'
                  ? 'text-purple-500'
                  : tierStr === 'GOLD VIP'
                  ? 'text-primary'
                  : 'text-on-surface',
              tierBg:
                tierStr === 'PLATINUM'
                  ? 'bg-purple-100 text-purple-800'
                  : tierStr === 'GOLD VIP'
                  ? 'bg-primary-fixed text-on-primary-fixed'
                  : 'bg-surface-container-high text-on-surface-variant',
              points: pts,
              tierCap: 2000,
              entryPoints: pts >= 2000 ? 2000 : pts >= 1000 ? 1000 : 0,
              thresholdPoints: pts >= 2000 ? 5000 : pts >= 1000 ? 2000 : 1000,
              status: 'NFC Active Node',
              joinedDate: '2026',
              syncedTime: 'Synced',
              visitCount: 1,
            };
          });
          setMembers(mapped);
          if (mapped.length > 0) {
            setSelectedMemberId(mapped[0].id);
          }
          if (data[0]?.store_name) {
            setStoreName(data[0].store_name);
          }
        } else {
          setMembers([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching tenant-scoped members:', err);
        if (!cancelled) setMembers([]);
      });

    const loadTenant = activeSlug
      ? authFetch(`/api/tenants/${encodeURIComponent(activeSlug)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((t) => {
            if (!cancelled && t?.name) {
              setStoreName(t.name);
            }
          })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([loadMembers, loadTenant]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeSlug, userRole, isSuperAdmin]);

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0] || null;
  const vipCount = members.filter((m) => m.tier === 'GOLD VIP' || m.tier === 'PLATINUM').length;
  const totalPointsPool = members.reduce((sum, m) => sum + m.points, 0);

  const handleSelectMember = (id: string) => {
    sounds.click();
    setSelectedMemberId(id);
  };

  const triggerNotice = (msg: string) => {
    sounds.chime();
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 2500);
  };

  const handleAdjustPoints = async (delta: number) => {
    sounds.dialTick();
    if (!selectedMember) {
      triggerNotice('No active member selected');
      return;
    }
    const targetMemberId = selectedMember.id;
    const prevPoints = selectedMember.points;

    // Optimistically update UI
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === targetMemberId) {
          const newPts = Math.max(0, m.points + delta);
          const tierStr = newPts >= 2000 ? 'PLATINUM' : newPts >= 1000 ? 'GOLD VIP' : 'SILVER';
          return {
            ...m,
            points: newPts,
            tier: tierStr,
            tierColor:
              tierStr === 'PLATINUM'
                ? 'text-purple-500'
                : tierStr === 'GOLD VIP'
                ? 'text-primary'
                : 'text-on-surface',
            tierBg:
              tierStr === 'PLATINUM'
                ? 'bg-purple-100 text-purple-800'
                : tierStr === 'GOLD VIP'
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'bg-surface-container-high text-on-surface-variant',
          };
        }
        return m;
      })
    );

    try {
      const res = await authFetch(`/api/members/${encodeURIComponent(targetMemberId)}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: delta, reason: delta >= 0 ? 'Manual Credit' : 'Manual Redemption' }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.newPoints === 'number') {
        const pts = data.newPoints;
        const tierStr = pts >= 2000 ? 'PLATINUM' : pts >= 1000 ? 'GOLD VIP' : 'SILVER';
        setMembers((prev) =>
          prev.map((m) => {
            if (m.id === targetMemberId) {
              return {
                ...m,
                points: pts,
                tier: tierStr,
                tierColor:
                  tierStr === 'PLATINUM'
                    ? 'text-purple-500'
                    : tierStr === 'GOLD VIP'
                    ? 'text-primary'
                    : 'text-on-surface',
                tierBg:
                  tierStr === 'PLATINUM'
                    ? 'bg-purple-100 text-purple-800'
                    : tierStr === 'GOLD VIP'
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-surface-container-high text-on-surface-variant',
              };
            }
            return m;
          })
        );
        triggerNotice(`Points updated: ${pts.toLocaleString()} PTS (Synced to DB)`);
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === targetMemberId ? { ...m, points: prevPoints } : m))
        );
        triggerNotice(data.error || 'Failed to update points');
      }
    } catch (err) {
      console.error('Failed to sync points with backend:', err);
      setMembers((prev) =>
        prev.map((m) => (m.id === targetMemberId ? { ...m, points: prevPoints } : m))
      );
      triggerNotice('Error connecting to database');
    }
  };

  const handleExportCsv = () => {
    const header = 'Member ID,Name,Phone,Tier,Points,Store\n';
    const rows = members
      .map((m) =>
        [m.uid, m.name, m.phone || '', m.tier, m.points, storeName]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSlug || 'store'}-members-ledger.csv`;
    link.click();
    URL.revokeObjectURL(url);
    triggerNotice(`Exported ${members.length} members for ${storeName}`);
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.uid.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterSegment === 'vip') return m.tier === 'GOLD VIP' || m.tier === 'PLATINUM';
    if (filterSegment === 'pending') return false;
    return true;
  });

  const activeMember = selectedMember;
  const entryPts = activeMember ? activeMember.entryPoints : 0;
  const threshPts = activeMember ? activeMember.thresholdPoints : 1000;
  const denom = Math.max(1, threshPts - entryPts);
  const progressPct = activeMember
    ? Math.min(100, Math.max(0, Math.round(((activeMember.points - entryPts) / denom) * 100)))
    : 0;

  return (
    <div className="flex flex-col w-full select-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary-container">
            <span className="material-symbols-outlined text-[20px]">groups</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline-md text-headline-md text-on-surface tracking-tight">
                Member Registry
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">
                Filtered strictly for {storeName}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Tenant-isolated digital credential cards for {storeName}
            </p>
          </div>
        </div>

        {/* Segmented porcelain toggle */}
        <div className="flex items-center p-1 rounded-full bg-surface-container tactile-deboss">
          <button
            onClick={() => {
              sounds.click();
              setFilterSegment('vip');
            }}
            className={`px-5 py-2 rounded-full font-label-lg text-label-lg transition-all flex items-center gap-2 ${
              filterSegment === 'vip'
                ? 'bg-surface-container-lowest text-primary tactile-btn font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-primary-container tactile-glow"></span>
            VIP Tier ({vipCount})
          </button>
          <button
            onClick={() => {
              sounds.click();
              setFilterSegment('all');
            }}
            className={`px-5 py-2 rounded-full font-label-lg text-label-lg transition-all ${
              filterSegment === 'all'
                ? 'bg-surface-container-lowest text-primary tactile-btn font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            onClick={() => {
              sounds.click();
              setFilterSegment('pending');
            }}
            className={`px-5 py-2 rounded-full font-label-lg text-label-lg transition-all ${
              filterSegment === 'pending'
                ? 'bg-surface-container-lowest text-primary tactile-btn font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Pending Claims (0)
          </button>
        </div>
      </div>

      {/* Primary 3-Column Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Sculpted Customer Directory (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface-container-low rounded-xl p-5 tactile-card flex flex-col gap-4">
            {/* Search Well */}
            <div className="flex items-center gap-2">
              <div className="h-11 flex-1 rounded-full bg-surface-container-high/70 tactile-deboss px-4 flex items-center gap-2.5">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  className="w-full bg-transparent border-0 outline-none font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/70"
                  placeholder="Filter by name, card UID..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="w-11 h-11 shrink-0 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </button>
            </div>

            {/* Directory List */}
            <div className="flex flex-col gap-2.5 max-h-[570px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[28px] animate-spin text-primary">refresh</span>
                  <span className="font-body-sm text-body-sm">Loading members for {storeName}...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-10 px-4 rounded-xl bg-surface-container/40 border border-dashed border-outline-variant/40 text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-outline">person_off</span>
                  <p className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {searchQuery || filterSegment !== 'all'
                      ? 'No matching members'
                      : `No members enrolled for ${storeName} yet`}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {searchQuery || filterSegment !== 'all'
                      ? 'Try clearing your search or switching back to All Members.'
                      : 'Provision a new member pass to begin tracking loyalty balances.'}
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = activeMember?.id === member.id;
                  return (
                    <div
                      key={member.id}
                      onClick={() => handleSelectMember(member.id)}
                      className={`p-3.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-surface-container-lowest tactile-card border-l-4 border-l-primary-container'
                          : 'bg-surface-container/60 hover:bg-surface-container-lowest'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-full bg-surface-container flex items-center justify-center shrink-0 tactile-deboss">
                          {member.avatarUrl ? (
                            <img
                              className="w-11 h-11 rounded-full object-cover"
                              src={member.avatarUrl}
                              alt={member.name}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-on-surface-variant font-medium">
                              {member.initials}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-primary-container ring-2 ring-surface-container-lowest tactile-glow"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">
                              {member.name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${member.tierBg}`}>
                              {member.tier}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              UID: {member.uid}
                            </span>
                            <span className={`font-label-md text-label-md font-semibold ${member.tierColor}`}>
                              {member.points.toLocaleString()} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Member Button */}
            <button
              onClick={() => {
                sounds.chime();
                if (onProvisionNewMember) onProvisionNewMember();
                else triggerNotice('Member Pass Provisioning Triggered');
              }}
              className="w-full py-3 rounded-full bg-surface-container text-on-surface hover:text-primary tactile-btn flex items-center justify-center gap-2 font-label-lg text-label-lg font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Provision Member Pass
            </button>
          </div>
        </div>

        {/* CENTER STAGE: Majestic 3D Porcelain Dial with Radial Orange Gauge (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full bg-surface-container-low rounded-xl p-8 tactile-card flex flex-col items-center relative overflow-hidden">
            {/* Ambient Light */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>

            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-glow animate-pulse"></span>
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-bold">
                  {activeMember ? activeMember.status : 'No Active Member'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container tactile-deboss text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  contactless
                </span>
                <span>{activeMember ? 'Tap Ready' : 'Idle'}</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                {activeMember ? activeMember.name : `No Enrolled Member`}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {activeMember
                  ? `${storeName} • Pass ${activeMember.uid}`
                  : `0 enrolled passes in ${storeName}`}
              </p>
            </div>

            {/* Concentric Ceramic Dial Structure */}
            <div className="relative w-72 h-72 my-2 flex items-center justify-center">
              {/* Outer Debossed Ring Track */}
              <div className="absolute inset-0 rounded-full bg-surface-container tactile-deboss"></div>

              {/* SVG Arc Gauge */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 288 288">
                <circle
                  className="text-surface-variant"
                  cx="144"
                  cy="144"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray="754"
                  strokeDashoffset="188"
                  strokeLinecap="round"
                />
                <circle
                  className="text-primary-container"
                  cx="144"
                  cy="144"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray="754"
                  strokeDashoffset={754 - (progressPct / 100) * 566}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255, 87, 34, 0.6))' }}
                />
              </svg>

              <div className="absolute inset-4 rounded-full border-2 border-dashed border-outline-variant/30 pointer-events-none"></div>

              {/* Middle Porcelain Concave Tier */}
              <div className="absolute w-52 h-52 rounded-full bg-surface-container-high/60 tactile-deboss flex items-center justify-center">
                <div className="w-40 h-40 rounded-full bg-surface-container-lowest tactile-card flex flex-col items-center justify-center text-center select-none relative group cursor-pointer transition-transform duration-300 hover:scale-[1.02]">
                  <div className="absolute top-2.5 w-1.5 h-3 rounded-full bg-primary-container tactile-glow"></div>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant font-bold mt-2">
                    Accrued Balance
                  </span>
                  <span className="font-display-xl text-display-xl font-bold text-on-surface tracking-tighter leading-none mt-1">
                    {activeMember ? activeMember.points.toLocaleString() : '0'}
                  </span>
                  <span className="font-label-md text-label-md text-primary font-semibold mt-1">
                    PTS
                  </span>
                  <div className="mt-1 flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                    <span>Tier Cap:</span>
                    <span className="font-semibold text-on-surface">
                      {activeMember ? activeMember.tierCap.toLocaleString() : '2,000'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Satellite Orbital Pills */}
              <div className="absolute -top-1 right-2 w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center tactile-glow shadow-md">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <div className="absolute bottom-2 left-3 w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface-variant flex items-center justify-center tactile-btn">
                <span className="material-symbols-outlined text-[18px]">wallet</span>
              </div>
            </div>

            {/* Tier Progression Bar */}
            <div className="w-full mt-6 bg-surface-container-lowest/80 p-4 rounded-lg tactile-card flex flex-col gap-2">
              <div className="flex items-center justify-between font-label-md text-label-md">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold ${
                      activeMember
                        ? activeMember.tierBg
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {activeMember ? activeMember.tier : 'NONE'}
                  </span>
                  <span className="text-on-surface-variant">Upgrade Progress</span>
                </div>
                <span className="font-bold text-primary">
                  {activeMember
                    ? `${Math.max(0, activeMember.thresholdPoints - activeMember.points)} pts remaining`
                    : '—'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container tactile-deboss overflow-hidden">
                <div
                  className="h-full bg-primary-container rounded-full tactile-glow transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                <span>Entry: {entryPts} pts</span>
                <span>Threshold: {threshPts} pts</span>
              </div>
            </div>

            {/* Quick Incremental Adjust Buttons */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => handleAdjustPoints(-50)}
                disabled={!activeMember}
                className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface hover:text-primary transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                title="Subtract 50 Points"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <div className="px-6 py-2.5 rounded-full bg-surface-container tactile-deboss flex items-center gap-2">
                <span className="font-label-md text-label-md uppercase font-bold text-on-surface-variant">
                  Step
                </span>
                <span className="font-headline-sm text-headline-sm font-semibold text-primary">
                  +50
                </span>
              </div>
              <button
                onClick={() => handleAdjustPoints(50)}
                disabled={!activeMember}
                className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface hover:text-primary transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                title="Add 50 Points"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Live Wallet Pass & Actions (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Wallet Pass Bezel */}
          <div className="bg-surface-container-low rounded-xl p-5 tactile-card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-bold">
                Active Wallet Pass
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-primary font-semibold">
                Google Pay / NFC
              </span>
            </div>

            {/* Bezel Framing the Digital Card */}
            <div className="p-2.5 rounded-xl bg-surface-container tactile-deboss">
              <div className="relative w-full aspect-[1.58/1] rounded-lg bg-gradient-to-br from-primary via-primary-container to-secondary p-4 text-on-primary shadow-lg flex flex-col justify-between overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full border-4 border-white/20"></div>
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-white/80 font-semibold block">
                      {storeName}
                    </span>
                    <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-white">
                      {activeMember ? activeMember.name : 'No Active Pass'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[24px] text-white/90">
                    contactless
                  </span>
                </div>
                <div className="flex items-end justify-between relative z-10">
                  <div>
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-white/70 block">
                      Tier Status
                    </span>
                    <span className="font-headline-sm text-headline-sm font-bold text-white">
                      {activeMember ? activeMember.tier : '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-white/70 block">
                      Balance
                    </span>
                    <span className="font-headline-sm text-headline-sm font-bold text-white">
                      {activeMember ? `${activeMember.points.toLocaleString()} pts` : '0 pts'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant px-1">
              <span>{activeMember ? `Synced: ${activeMember.syncedTime}` : 'No enrolled card'}</span>
              <span className="text-primary font-medium">{activeMember ? 'Auto-Refresh On' : 'Idle'}</span>
            </div>
          </div>

          {/* Pass Controls */}
          <div className="bg-surface-container-low rounded-xl p-5 tactile-card flex flex-col gap-3">
            <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-bold">
              Pass Controls
            </span>
            <button
              onClick={() => handleAdjustPoints(100)}
              disabled={!activeMember}
              className="w-full py-3 px-4 rounded-full bg-primary-container text-on-primary tactile-glow flex items-center justify-between font-label-lg text-label-lg font-semibold hover:opacity-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Credit 100 Points
              </span>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
            <button
              onClick={() =>
                activeMember && triggerNotice(`Push lockscreen alert sent to ${activeMember.name}`)
              }
              disabled={!activeMember}
              className="w-full py-3 px-4 rounded-full bg-surface-container text-on-surface tactile-btn flex items-center justify-between font-label-lg text-label-lg font-semibold hover:text-primary transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  notification_important
                </span>
                Push Lock-Screen Alert
              </span>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
            <button
              onClick={() =>
                activeMember && triggerNotice(`Wallet pass link re-sent to ${activeMember.name}`)
              }
              disabled={!activeMember}
              className="w-full py-3 px-4 rounded-full bg-surface-container text-on-surface tactile-btn flex items-center justify-between font-label-lg text-label-lg font-semibold hover:text-primary transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                Resend Wallet Invite
              </span>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Tenant Fleet Metrics Bar */}
      <div className="mt-6 bg-surface-container-low rounded-xl p-5 tactile-card flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary">
            <span className="material-symbols-outlined text-[24px]">analytics</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              {storeName} Pass Summary
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Strict tenant isolation • Filtered strictly for {storeName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="px-5 py-2.5 rounded-full bg-surface-container tactile-deboss flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[18px]">
              credit_card_heart
            </span>
            <div>
              <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block">
                Active Passes
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {members.length}
              </span>
            </div>
          </div>
          <div className="px-5 py-2.5 rounded-full bg-surface-container tactile-deboss flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[18px]">
              verified_user
            </span>
            <div>
              <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block">
                VIP Cohort
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary">
                {vipCount}
              </span>
            </div>
          </div>
          <div className="px-5 py-2.5 rounded-full bg-surface-container tactile-deboss flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[18px]">
              bolt
            </span>
            <div>
              <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block">
                Total Points
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {totalPointsPool.toLocaleString()}
              </span>
            </div>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={members.length === 0}
            className="px-5 py-3 rounded-full bg-surface-container text-on-surface hover:text-primary tactile-btn flex items-center gap-2 font-label-lg text-label-lg font-semibold disabled:opacity-40 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Ledger
          </button>
        </div>
      </div>

      {/* Notice Toast */}
      {noticeMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-surface-container-lowest text-on-surface rounded-full px-6 py-4 tactile-card flex items-center gap-3 ring-1 ring-primary-container/20">
          <span className="material-symbols-outlined text-primary-container">check_circle</span>
          <span className="font-label-md text-label-md font-bold">{noticeMessage}</span>
        </div>
      )}
    </div>
  );
};
