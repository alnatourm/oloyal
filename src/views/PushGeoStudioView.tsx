import React, { useEffect, useRef, useState } from 'react';
import { authFetch, getAuthToken } from '../utils/auth';
import { sounds } from '../utils/sound';

interface PushGeoStudioViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
}

interface ScopedTenant {
  id: string;
  slug: string;
  name: string;
  brandColor: string;
  archetype: string;
  classId: string;
}

interface ScopedMember {
  id: string;
  name: string;
  points: number;
}

interface GeoCampaign {
  id: string;
  tenantId: string;
  storeName: string;
  storeSlug: string;
  title: string;
  pushTitle: string;
  pushBody: string;
  segment: 'all' | 'vip' | 'silver';
  radiusMeters: number;
  triggerRule: 'entry' | 'dwell' | 'exit';
  cadence: 'proximity' | 'fixed' | 'milestone';
  actionLabel: string;
  venueLabel: string;
  heroSync: boolean;
  status: string;
  tapsToday: number;
  createdAt: string;
}

export const PushGeoStudioView: React.FC<PushGeoStudioViewProps> = ({
  activeSlug = '',
  userRole = 'merchant',
}) => {
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [tenant, setTenant] = useState<ScopedTenant>({
    id: '',
    slug: activeSlug,
    name: activeSlug || 'Store Console',
    brandColor: '#ff5722',
    archetype: 'loyalty',
    classId: '',
  });
  const [members, setMembers] = useState<ScopedMember[]>([]);
  const [campaigns, setCampaigns] = useState<GeoCampaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Studio Composer Form State
  const [campaignTitle, setCampaignTitle] = useState<string>('Weekend Proximity Boost');
  const [segment, setSegment] = useState<'all' | 'vip' | 'silver'>('all');
  const [radiusMeters, setRadiusMeters] = useState<150 | 300 | 750>(300);
  const [triggerRule, setTriggerRule] = useState<'entry' | 'dwell' | 'exit'>('entry');
  const [venueLabel, setVenueLabel] = useState<string>('Primary Storefront • Smart Tap Zone');
  const [isEditingVenue, setIsEditingVenue] = useState<boolean>(false);
  const [pushTitle, setPushTitle] = useState<string>('Double Points Tonight in Store');
  const [pushBody, setPushBody] = useState<string>(
    'Tap your Google Wallet pass at the counter between 5-7 PM for 2x loyalty points!'
  );
  const [heroSync, setHeroSync] = useState<boolean>(true);
  const [actionLabel, setActionLabel] = useState<string>('View Offers');
  const [cadence, setCadence] = useState<'proximity' | 'fixed' | 'milestone'>('proximity');
  const [hasCustomizedCopy, setHasCustomizedCopy] = useState<boolean>(false);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setMembers([]);
    setCampaigns([]);
    setHasCustomizedCopy(false);

    if (!getAuthToken()) {
      setIsLoading(false);
      return;
    }

    if (isSuperAdmin && !activeSlug) {
      setTenant({
        id: '',
        slug: '',
        name: 'Select a Store',
        brandColor: '#ff5722',
        archetype: 'loyalty',
        classId: '',
      });
      setIsLoading(false);
      return;
    }

    const tenantUrl = activeSlug ? `/api/tenants/${encodeURIComponent(activeSlug)}` : '/api/tenants';
    const membersUrl =
      isSuperAdmin && activeSlug
        ? `/api/members?slug=${encodeURIComponent(activeSlug)}`
        : '/api/members';
    const campaignsUrl =
      isSuperAdmin && activeSlug
        ? `/api/geo-campaigns?slug=${encodeURIComponent(activeSlug)}`
        : '/api/geo-campaigns';

    const loadTenant = authFetch(tenantUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const resolved = Array.isArray(data) ? data[0] : data;
        if (!resolved?.name) return;
        setTenant({
          id: resolved.id || '',
          slug: resolved.slug || activeSlug,
          name: resolved.name,
          brandColor: resolved.brandColor || '#ff5722',
          archetype: resolved.archetype || 'loyalty',
          classId: resolved.classId || '',
        });
        setCampaignTitle(`${resolved.name} Smart Tap Boost`);
        setPushTitle(`Double Points Today at ${resolved.name}`.slice(0, 60));
      })
      .catch(() => {});

    const loadMembers = authFetch(membersUrl)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        if (cancelled) return;
        if (Array.isArray(rows)) {
          const mapped: ScopedMember[] = rows.map((m: any) => ({
            id: m.id,
            name: m.customer_name || m.name || 'Member',
            points: Number(m.points || 0),
          }));
          setMembers(mapped);
          if (!hasCustomizedCopy && mapped.length > 0 && mapped[0]?.name) {
            const firstName = mapped[0].name.split(' ')[0];
            setPushBody(
              `${firstName}, tap your Google Wallet pass in-store today to earn 2x loyalty points!`.slice(0, 140)
            );
          } else if (!hasCustomizedCopy) {
            setPushBody(
              'Tap your Google Wallet pass at checkout today to earn bonus loyalty rewards!'
            );
          }
        }
      })
      .catch(() => {});

    const loadCampaigns = authFetch(campaignsUrl)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        if (cancelled) return;
        setCampaigns(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {});

    Promise.all([loadTenant, loadMembers, loadCampaigns]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeSlug, userRole, isSuperAdmin]);

  const vipMembersCount = members.filter((m) => m.points >= 1000).length;
  const silverMembersCount = members.filter((m) => m.points < 1000).length;
  const filteredAudienceCount =
    segment === 'vip'
      ? vipMembersCount
      : segment === 'silver'
      ? silverMembersCount
      : members.length;

  const activeCampaignsCount = campaigns.filter(
    (c) => c.status.toLowerCase() === 'active'
  ).length;

  const storeInitial = (tenant.name || 'S').trim().charAt(0).toUpperCase();
  const formattedClassId = tenant.classId
    ? tenant.classId.length > 24
      ? `...${tenant.classId.slice(-22)}`
      : tenant.classId
    : 'Pending Class Sync';

  const triggerRuleLabel =
    triggerRule === 'entry'
      ? 'On Entry'
      : triggerRule === 'dwell'
      ? 'Dwell Time (>5m)'
      : 'On Exit';

  const radarRingClass =
    radiusMeters === 150
      ? 'w-28 h-28'
      : radiusMeters === 300
      ? 'w-44 h-44'
      : 'w-60 h-60';

  const radarPingClass =
    radiusMeters === 150
      ? 'w-32 h-32'
      : radiusMeters === 300
      ? 'w-52 h-52'
      : 'w-68 h-68';

  const handleTestPush = async () => {
    if (isSuperAdmin && !activeSlug) {
      showNotice('error', 'Select a store from the header switcher before sending a test push.');
      return;
    }
    sounds.click(1000, 0.03);
    setIsTestingPush(true);
    try {
      const res = await authFetch('/api/geo-campaigns/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: isSuperAdmin ? activeSlug : undefined,
          segment,
          pushTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data?.error || 'Test push verification failed');
      } else {
        showNotice(
          'success',
          `Smart Tap test verified for ${data.storeName || tenant.name} (${data.deliveredTo} matching ${segment.toUpperCase()} passes).`
        );
      }
    } catch {
      showNotice('error', 'Network error dispatching test push.');
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleDispatchCampaign = async () => {
    if (isSuperAdmin && !activeSlug) {
      showNotice('error', 'Select a store from the header switcher first.');
      return;
    }
    if (!campaignTitle.trim() || !pushTitle.trim() || !pushBody.trim()) {
      showNotice('error', 'Please fill out the campaign title, notification title, and body.');
      return;
    }

    sounds.click(1200, 0.04);
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/geo-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: isSuperAdmin ? activeSlug : undefined,
          title: campaignTitle.trim(),
          pushTitle: pushTitle.trim(),
          pushBody: pushBody.trim(),
          segment,
          radiusMeters,
          triggerRule,
          cadence,
          actionLabel,
          venueLabel: venueLabel.trim(),
          heroSync,
          status: cadence === 'fixed' ? 'Scheduled' : 'Active',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data?.error || 'Failed to save geo-campaign');
      } else if (data?.campaign) {
        setCampaigns((prev) => [data.campaign, ...prev]);
        showNotice('success', `Dispatched "${data.campaign.title}" for ${tenant.name}.`);
      }
    } catch {
      showNotice('error', 'Network error while dispatching geo-campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (campaign: GeoCampaign) => {
    sounds.click(850, 0.02);
    const nextStatus = campaign.status === 'Paused' ? 'Active' : 'Paused';
    try {
      const res = await authFetch(`/api/geo-campaigns/${encodeURIComponent(campaign.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data?.campaign) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaign.id ? { ...c, status: data.campaign.status } : c))
        );
        showNotice('success', `Campaign "${campaign.title}" marked ${nextStatus}.`);
      } else {
        showNotice('error', data?.error || 'Could not update campaign status.');
      }
    } catch {
      showNotice('error', 'Network error updating campaign.');
    }
  };

  const handleDeleteCampaign = async (campaign: GeoCampaign) => {
    sounds.click(700, 0.02);
    try {
      const res = await authFetch(`/api/geo-campaigns/${encodeURIComponent(campaign.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
        showNotice('success', `Removed campaign "${campaign.title}".`);
      } else {
        const data = await res.json().catch(() => null);
        showNotice('error', data?.error || 'Failed to delete campaign.');
      }
    } catch {
      showNotice('error', 'Network error deleting campaign.');
    }
  };

  return (
    <div className="flex flex-col w-full space-y-8 pb-12">
      {/* Feedback Notice Banner */}
      {notice && (
        <div
          className={`px-5 py-3.5 rounded-xl flex items-center justify-between gap-3 tactile-card border ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="material-symbols-outlined text-[20px]">
              {notice.type === 'success' ? 'verified' : 'error'}
            </span>
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Studio Action Header Bar */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-6 shadow-[-10px_-10px_20px_#FFFFFF,10px_10px_24px_#D1D9E6] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full xl:w-auto">
          <div className="w-14 h-14 rounded-full bg-surface-container-low shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] flex items-center justify-center text-primary-container shrink-0">
            <span className="material-symbols-outlined filled text-[28px]">near_me</span>
          </div>
          <div className="flex flex-col space-y-1.5 w-full max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <input
                ref={titleInputRef}
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                aria-label="Campaign Title"
                className="bg-transparent text-2xl text-on-surface font-semibold tracking-tight outline-none focus:text-primary transition-colors w-full md:w-auto min-w-[260px]"
              />
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF] text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>
                Filtered strictly for {tenant.name}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 flex-wrap">
              <span>Google Wallet Smart Tap Proximity Push</span>
              <span>•</span>
              <span className="text-tertiary font-medium">
                Broadcast Channel 04 (Eddystone &amp; Geofence)
              </span>
            </p>
          </div>
        </div>

        {/* Audience Segment Selector & Primary Actions */}
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-end">
          <div className="p-1 rounded-full bg-surface-container-low shadow-[inset_3px_3px_6px_#D1D9E6,inset_-3px_-3px_6px_#FFFFFF] flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                sounds.click(900, 0.02);
                setSegment('all');
              }}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold tabular-nums transition-all ${
                segment === 'all'
                  ? 'bg-surface-container-lowest text-primary shadow-[-2px_-2px_5px_#FFFFFF,2px_2px_5px_#D1D9E6]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All Active ({members.length})
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.click(900, 0.02);
                setSegment('vip');
              }}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold tabular-nums transition-all ${
                segment === 'vip'
                  ? 'bg-surface-container-lowest text-primary shadow-[-2px_-2px_5px_#FFFFFF,2px_2px_5px_#D1D9E6]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              VIP Tier ({vipMembersCount})
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.click(900, 0.02);
                setSegment('silver');
              }}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold tabular-nums transition-all ${
                segment === 'silver'
                  ? 'bg-surface-container-lowest text-primary shadow-[-2px_-2px_5px_#FFFFFF,2px_2px_5px_#D1D9E6]'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Silver ({silverMembersCount})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isTestingPush}
              onClick={handleTestPush}
              className="px-4 py-2 rounded-full bg-surface-container-lowest text-xs font-semibold text-on-surface shadow-[-4px_-4px_10px_#FFFFFF,4px_4px_10px_#D1D9E6] active:shadow-[inset_3px_3px_6px_#D1D9E6,inset_-3px_-3px_6px_#FFFFFF] hover:text-primary transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">cell_tower</span>
              <span>{isTestingPush ? 'Testing...' : 'Test Push'}</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDispatchCampaign}
              className="px-5 py-2 rounded-full bg-primary-container text-on-primary text-xs font-bold shadow-[-4px_-4px_12px_rgba(255,255,255,0.8),4px_4px_14px_rgba(176,47,0,0.35)] hover:shadow-[-2px_-2px_6px_rgba(255,255,255,0.8),2px_2px_18px_rgba(255,87,34,0.6)] active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Campaign'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3-Column Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Geo-Fencing & Proximity Beacon Setup */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[-8px_-8px_18px_#FFFFFF,8px_8px_18px_#D1D9E6] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[22px]">radar</span>
                <span className="text-base font-semibold text-on-surface">
                  Spatial Radar &amp; Beacons
                </span>
              </div>
              <span className="w-3 h-3 rounded-full bg-secondary-container shadow-[0_0_8px_#fe6f42]"></span>
            </div>

            {/* Venue Pin Debossed Card */}
            <div className="p-3.5 rounded-lg bg-surface-container-low shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 shrink-0 rounded-full bg-surface-container-lowest shadow-[-2px_-2px_4px_#FFFFFF,2px_2px_4px_#D1D9E6] flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs text-on-surface font-semibold truncate">
                    {tenant.name}
                  </span>
                  {isEditingVenue ? (
                    <input
                      type="text"
                      value={venueLabel}
                      onChange={(e) => setVenueLabel(e.target.value)}
                      onBlur={() => setIsEditingVenue(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditingVenue(false);
                      }}
                      autoFocus
                      className="text-xs text-on-surface bg-white/80 rounded px-1.5 py-0.5 outline-none ring-1 ring-primary-container/40 mt-0.5"
                    />
                  ) : (
                    <span className="text-xs text-on-surface-variant truncate">{venueLabel}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingVenue((v) => !v)}
                aria-label="Edit venue location"
                className="w-7 h-7 shrink-0 rounded-full bg-surface-container-lowest shadow-[-2px_-2px_4px_#FFFFFF,2px_2px_4px_#D1D9E6] flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isEditingVenue ? 'check' : 'edit'}
                </span>
              </button>
            </div>

            {/* Stylized Porcelain Radar Screen */}
            <div className="relative w-full aspect-square max-h-[290px] rounded-xl bg-surface-container-low shadow-[inset_6px_6px_14px_#D1D9E6,inset_-6px_-6px_14px_#FFFFFF] overflow-hidden flex items-center justify-center p-4">
              <svg
                className="absolute inset-0 w-full h-full opacity-35 stroke-outline-variant pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line strokeDasharray="4 4" strokeWidth="1" x1="0" x2="100%" y1="50%" y2="50%" />
                <line strokeDasharray="4 4" strokeWidth="1" x1="50%" x2="50%" y1="0" y2="100%" />
                <circle cx="50%" cy="50%" fill="none" r="24%" strokeWidth="1" />
                <circle cx="50%" cy="50%" fill="none" r="46%" strokeWidth="1" />
                <circle cx="50%" cy="50%" fill="none" r="70%" strokeWidth="1" />
              </svg>

              {/* Animated Concentric Pulse Rings */}
              <div
                className={`absolute rounded-full bg-primary-container/10 border-2 border-primary-container/40 animate-ping transition-all duration-500 ${radarPingClass}`}
                style={{ animationDuration: '3.5s' }}
              />
              <div
                className={`absolute rounded-full bg-gradient-to-r from-primary-container/20 to-secondary-container/15 shadow-[0_0_30px_rgba(255,87,34,0.28)] transition-all duration-500 ${radarRingClass}`}
              />

              {/* Active Beacon Nodes */}
              <div className="absolute top-[25%] left-[28%] flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container shadow-[0_0_6px_#007caf]"></span>
                <span className="text-[9px] text-tertiary font-bold mt-0.5">B-01 Entry</span>
              </div>
              <div className="absolute bottom-[26%] right-[26%] flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container shadow-[0_0_6px_#007caf]"></span>
                <span className="text-[9px] text-tertiary font-bold mt-0.5">B-02 Counter</span>
              </div>

              {/* Central Pivot Node */}
              <div className="relative z-10 w-12 h-12 rounded-full bg-surface-container-lowest shadow-[-4px_-4px_10px_#FFFFFF,4px_4px_10px_#D1D9E6] flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[24px]">storefront</span>
                <div className="absolute -bottom-6 px-2.5 py-0.5 rounded-full bg-surface-container-lowest shadow-[-2px_-2px_4px_#FFFFFF,2px_2px_4px_#D1D9E6] whitespace-nowrap">
                  <span className="text-[10px] font-bold text-on-surface">Target Center</span>
                </div>
              </div>

              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-surface-container-lowest shadow-[-2px_-2px_5px_#FFFFFF,2px_2px_5px_#D1D9E6] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                <span className="text-[10px] text-primary font-bold tabular-nums">
                  {radiusMeters}m Active
                </span>
              </div>
            </div>

            {/* Proximity Radius Selector */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface font-semibold">Proximity Radius Range</span>
                <span className="text-xs text-primary font-bold tabular-nums">
                  {radiusMeters} Meters
                </span>
              </div>
              <div className="p-1 rounded-full bg-surface-container-low shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] grid grid-cols-3 gap-1">
                {[
                  { value: 150 as const, label: 'Curbside' },
                  { value: 300 as const, label: 'District' },
                  { value: 750 as const, label: 'Metro Zone' },
                ].map((opt) => {
                  const selected = radiusMeters === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        sounds.click(950, 0.02);
                        setRadiusMeters(opt.value);
                      }}
                      className={`py-1.5 rounded-full text-[11px] transition-all flex flex-col items-center tabular-nums ${
                        selected
                          ? 'bg-surface-container-lowest text-primary shadow-[-2px_-2px_6px_#FFFFFF,2px_2px_6px_#D1D9E6] font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="font-bold">{opt.value}m</span>
                      <span className="text-[9px] opacity-80">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trigger Rule Selector */}
            <div className="flex flex-col space-y-2">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">
                Trigger Rule
              </span>
              <div className="space-y-2">
                {[
                  {
                    value: 'entry' as const,
                    icon: 'login',
                    label: 'On Entry (Crosses Boundary)',
                  },
                  {
                    value: 'dwell' as const,
                    icon: 'timer',
                    label: 'Dwell Time (>5m within radius)',
                  },
                  {
                    value: 'exit' as const,
                    icon: 'logout',
                    label: 'On Exit (Leaving Vicinity)',
                  },
                ].map((rule) => {
                  const active = triggerRule === rule.value;
                  return (
                    <label
                      key={rule.value}
                      className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                        active
                          ? 'bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF]'
                          : 'bg-surface-container-lowest shadow-[-2px_-2px_5px_#FFFFFF,2px_2px_5px_#D1D9E6] hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            active ? 'text-primary-container' : 'text-on-surface-variant'
                          }`}
                        >
                          {rule.icon}
                        </span>
                        <span
                          className={`text-xs text-on-surface ${
                            active ? 'font-semibold' : 'font-normal'
                          }`}
                        >
                          {rule.label}
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="trigger_rule"
                        checked={active}
                        onChange={() => {
                          sounds.click(880, 0.02);
                          setTriggerRule(rule.value);
                        }}
                        className="accent-primary-container w-4 h-4 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Hardware BLE Sync Badge */}
            <div className="p-3.5 rounded-lg bg-surface-container-low shadow-[inset_3px_3px_7px_#D1D9E6,inset_-3px_-3px_7px_#FFFFFF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary-container text-[20px]">
                  bluetooth_searching
                </span>
                <div className="flex flex-col">
                  <span className="text-xs text-on-surface font-semibold">
                    Eddystone / Smart Tap
                  </span>
                  <span className="text-[10px] text-tertiary font-medium">
                    Google Wallet v3.2 Beacon Sync
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest shadow-[-2px_-2px_4px_#FFFFFF,2px_2px_4px_#D1D9E6] text-[10px] text-primary font-bold">
                READY
              </span>
            </div>
          </div>

          {/* Guardrails & Quiet Hours */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[-8px_-8px_18px_#FFFFFF,8px_8px_18px_#D1D9E6] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-on-surface">
                Guardrails &amp; Quiet Hours
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                shield
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF]">
                <span className="text-on-surface-variant">Fatigue Throttle</span>
                <span className="font-semibold text-on-surface tabular-nums">
                  1 Push / 48 hrs / Pass
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF]">
                <span className="text-on-surface-variant">Active Window</span>
                <span className="font-semibold text-on-surface tabular-nums">
                  09:00 AM – 10:00 PM
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Google Wallet Push Notification Composer */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[-8px_-8px_18px_#FFFFFF,8px_8px_18px_#D1D9E6] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[22px]">
                  edit_note
                </span>
                <span className="text-base font-semibold text-on-surface">
                  Wallet Message Composer
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                v3.2 API
              </span>
            </div>

            <div className="space-y-4">
              {/* Target Pass Identifier */}
              <div className="flex flex-col space-y-1">
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  Target Pass Identifier
                </label>
                <div className="p-2.5 rounded-lg bg-surface-container-low shadow-[inset_3px_3px_6px_#D1D9E6,inset_-3px_-3px_6px_#FFFFFF] flex items-center justify-between gap-2">
                  <span className="text-xs text-on-surface font-semibold truncate">
                    {tenant.name} • {tenant.archetype === 'gift' ? 'Gift Pass' : 'Loyalty Pass'}
                  </span>
                  <span
                    title={tenant.classId || 'Pending Class ID'}
                    className="text-[10px] text-primary font-bold font-mono shrink-0"
                  >
                    {formattedClassId}
                  </span>
                </div>
              </div>

              {/* Push Title */}
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-push-title"
                    className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold"
                  >
                    Notification Title
                  </label>
                  <span className="text-[10px] text-on-surface-variant tabular-nums">
                    {pushTitle.length} / 60
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-low shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] focus-within:ring-2 focus-within:ring-primary-container/40 transition-all">
                  <input
                    id="input-push-title"
                    type="text"
                    maxLength={60}
                    value={pushTitle}
                    onChange={(e) => {
                      setHasCustomizedCopy(true);
                      setPushTitle(e.target.value);
                    }}
                    placeholder={`Notification for ${tenant.name}`}
                    className="w-full bg-transparent border-0 outline-none text-sm text-on-surface font-semibold placeholder:text-on-surface-variant/50"
                  />
                </div>
              </div>

              {/* Push Body */}
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="input-push-body"
                    className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold"
                  >
                    Lockscreen Body Snippet
                  </label>
                  <span className="text-[10px] text-on-surface-variant tabular-nums">
                    {pushBody.length} / 140
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-low shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] focus-within:ring-2 focus-within:ring-primary-container/40 transition-all">
                  <textarea
                    id="input-push-body"
                    rows={3}
                    maxLength={140}
                    value={pushBody}
                    onChange={(e) => {
                      setHasCustomizedCopy(true);
                      setPushBody(e.target.value);
                    }}
                    placeholder="Enter proximity notification message..."
                    className="w-full bg-transparent border-0 outline-none text-xs text-on-surface resize-none leading-relaxed placeholder:text-on-surface-variant/50"
                  />
                </div>
              </div>

              {/* Dynamic Pass Hero Banner Toggle */}
              <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-[-4px_-4px_10px_#FFFFFF,4px_4px_10px_#D1D9E6] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[20px]">panorama</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-on-surface font-semibold">
                      Update Pass Hero Art
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Syncs campaign visual with {tenant.name} pass
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={heroSync}
                    onChange={(e) => {
                      sounds.click(920, 0.02);
                      setHeroSync(e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-surface-container-low rounded-full shadow-[inset_3px_3px_6px_#D1D9E6,inset_-3px_-3px_6px_#FFFFFF] peer-checked:bg-primary-container peer-checked:shadow-[0_0_12px_rgba(255,87,34,0.4)] transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:shadow-[-2px_-2px_4px_#FFFFFF,2px_2px_4px_#D1D9E6] after:transition-all peer-checked:after:translate-x-6"></div>
                </label>
              </div>

              {/* Lockscreen Action Button Link Selector */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  Lockscreen Action Button Link
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'View Offers', icon: 'local_offer' },
                    { label: 'Open Rewards', icon: 'loyalty' },
                  ].map((item) => {
                    const selected = actionLabel === item.label;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          sounds.click(900, 0.02);
                          setActionLabel(item.label);
                        }}
                        className={`p-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          selected
                            ? 'bg-surface-container-lowest text-primary shadow-[-3px_-3px_7px_#FFFFFF,3px_3px_7px_#D1D9E6]'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Delivery Cadence Selector */}
            <div className="flex flex-col space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface font-semibold">Delivery Cadence</span>
                <span className="text-[10px] text-primary font-bold">
                  Autonomous Smart Trigger
                </span>
              </div>
              <div className="p-2 rounded-xl bg-surface-container-low shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] grid grid-cols-3 gap-2">
                {[
                  { id: 'proximity' as const, top: 'Live Proximity', bottom: 'Auto-Ping' },
                  { id: 'fixed' as const, top: 'Fixed Slot', bottom: '5:00 PM' },
                  { id: 'milestone' as const, top: 'Point Milestone', bottom: 'Tier Near' },
                ].map((opt) => {
                  const selected = cadence === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        sounds.click(900, 0.02);
                        setCadence(opt.id);
                      }}
                      className={`p-2 rounded-lg text-center transition-all ${
                        selected
                          ? 'bg-surface-container-lowest shadow-[-2px_-2px_5px_#FFFFFF,2px_2px_5px_#D1D9E6]'
                          : 'bg-transparent hover:bg-surface-container-high'
                      }`}
                    >
                      <span
                        className={`text-[10px] uppercase font-bold block ${
                          selected ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {opt.top}
                      </span>
                      <span className="text-[11px] font-semibold text-on-surface">{opt.bottom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Info Tip Card */}
          <div className="p-4 rounded-xl bg-surface-container-low shadow-[inset_4px_4px_8px_#D1D9E6,inset_-4px_-4px_8px_#FFFFFF] flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
              info
            </span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Google Wallet passes bypass standard junk filters. Proximity notifications stay visible
              on Android ambient lockscreens while an enrolled pass holder is within the{' '}
              <strong className="text-on-surface tabular-nums">{radiusMeters}m beacon umbrella</strong>
              .
            </p>
          </div>
        </div>

        {/* Column 3: Live Pixel Lockscreen Simulator & Audience Summary */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[-10px_-10px_24px_#FFFFFF,10px_10px_24px_#D1D9E6] flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">
                  phone_android
                </span>
                <span className="text-base font-semibold text-on-surface">
                  Pixel Lockscreen Feed
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF] text-on-surface-variant">
                Live Preview
              </span>
            </div>

            {/* Android Outer Chassis */}
            <div className="w-full max-w-[320px] rounded-2xl p-3 bg-surface-container-low shadow-[inset_6px_6px_14px_#D1D9E6,inset_-6px_-6px_14px_#FFFFFF] flex flex-col items-center">
              <div className="w-full rounded-xl bg-gradient-to-b from-surface to-surface-container-high p-4 shadow-[-4px_-4px_10px_#FFFFFF,4px_4px_10px_#D1D9E6] flex flex-col justify-between min-h-[450px] relative overflow-hidden">
                {/* Status Bar */}
                <div className="w-full flex items-center justify-between text-on-surface-variant">
                  <span className="text-[11px] font-semibold">5G</span>
                  <div className="w-3.5 h-3.5 rounded-full bg-surface-dim shadow-[inset_1px_1px_2px_#D1D9E6]"></div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">wifi</span>
                    <span className="material-symbols-outlined text-[13px]">battery_full</span>
                  </div>
                </div>

                {/* Android Clock */}
                <div className="flex flex-col items-center my-4 text-center">
                  <span className="text-5xl font-light text-on-surface tracking-tighter leading-none tabular-nums">
                    05:15
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium mt-1.5">
                    Smart Tap Ambient Lockscreen
                  </span>
                </div>

                {/* Google Wallet Push Card */}
                <div
                  className="w-full rounded-xl bg-surface-container-lowest shadow-[-3px_-3px_8px_#FFFFFF,3px_3px_8px_#D1D9E6] p-3 space-y-2 border-l-4 transition-all"
                  style={{ borderLeftColor: tenant.brandColor || '#ff5722' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-5 h-5 shrink-0 rounded-full text-on-primary flex items-center justify-center font-bold text-[10px]"
                        style={{ backgroundColor: tenant.brandColor || '#ff5722' }}
                      >
                        {storeInitial}
                      </div>
                      <span className="text-[11px] font-bold text-on-surface truncate">
                        {tenant.name}
                      </span>
                      <span className="text-on-surface-variant text-[10px] shrink-0">• Just now</span>
                    </div>
                    <span className="material-symbols-outlined text-primary-container text-[14px]">
                      wallet
                    </span>
                  </div>

                  <div className="flex flex-col space-y-0.5">
                    <span className="text-xs font-bold text-on-surface line-clamp-1 leading-snug">
                      {pushTitle || `${tenant.name} Notification`}
                    </span>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-tight">
                      {pushBody || `Tap your pass at ${tenant.name}.`}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-low shadow-[-2px_-2px_4px_#FFFFFF,2px_2px_4px_#D1D9E6] text-[10px] text-primary font-bold flex items-center gap-1">
                      <span>Open Pass</span>
                      <span className="material-symbols-outlined text-[12px]">contactless</span>
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      {actionLabel}
                    </span>
                  </div>
                </div>

                {/* Bottom Lockscreen Shortcuts */}
                <div className="w-full flex items-center justify-between pt-4 mt-auto">
                  <div className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-[-3px_-3px_6px_#FFFFFF,3px_3px_6px_#D1D9E6] flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">flashlight_on</span>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF]">
                    <span className="material-symbols-outlined text-primary text-[14px]">nfc</span>
                    <span className="text-[9px] font-bold text-on-surface">Hold Near Reader</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-surface-container-lowest shadow-[-3px_-3px_6px_#FFFFFF,3px_3px_6px_#D1D9E6] flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real Tenant Reach & Delivery Summary */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[-8px_-8px_18px_#FFFFFF,8px_8px_18px_#D1D9E6] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-on-surface">
                Campaign Audience Scope
              </span>
              <span className="material-symbols-outlined text-primary-container text-[20px]">
                query_stats
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-container-low shadow-[inset_3px_3px_7px_#D1D9E6,inset_-3px_-3px_7px_#FFFFFF] flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">
                  Target Passes
                </span>
                <span className="text-3xl font-bold text-on-surface mt-1 tabular-nums">
                  {isLoading ? '—' : filteredAudienceCount.toLocaleString()}
                </span>
                <span className="text-[11px] text-primary mt-0.5 font-medium tabular-nums">
                  of {members.length} enrolled in {tenant.name}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low shadow-[inset_3px_3px_7px_#D1D9E6,inset_-3px_-3px_7px_#FFFFFF] flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">
                  Active Triggers
                </span>
                <span className="text-3xl font-bold text-secondary mt-1 tabular-nums">
                  {isLoading ? '—' : activeCampaignsCount}
                </span>
                <span className="text-[11px] text-on-surface-variant mt-0.5 font-medium tabular-nums">
                  {radiusMeters}m • {triggerRuleLabel}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-[-4px_-4px_10px_#FFFFFF,4px_4px_10px_#D1D9E6] flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-on-surface font-semibold">Tenant Isolation Active</span>
                <span className="text-xs text-on-surface-variant">
                  Scoped exclusively to {tenant.name} wallet holders
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-[10px] font-bold text-primary uppercase shrink-0">
                Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Live Autonomous Geo-Campaigns */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-6 shadow-[-10px_-10px_20px_#FFFFFF,10px_10px_24px_#D1D9E6] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[18px]">stream</span>
            </div>
            <div>
              <span className="text-base font-semibold text-on-surface block">
                Live Autonomous Geo-Campaigns
              </span>
              <span className="text-xs text-on-surface-variant block">
                Smart Tap beacon triggers persisted for {tenant.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-medium">Total Campaigns:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-low shadow-[inset_2px_2px_4px_#D1D9E6,inset_-2px_-2px_4px_#FFFFFF] text-xs text-primary font-bold tabular-nums">
              {campaigns.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-32 rounded-xl bg-surface-container-low animate-pulse"
              />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-container-low shadow-[inset_3px_3px_7px_#D1D9E6,inset_-3px_-3px_7px_#FFFFFF] flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined text-primary-container text-[32px]">
              location_searching
            </span>
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                No active geo-campaigns for {tenant.name}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-md">
                Configure your proximity radius and lockscreen notification above, then dispatch your
                first Smart Tap campaign.
              </p>
            </div>
            <button
              type="button"
              onClick={() => titleInputRef.current?.focus()}
              className="px-4 py-2 rounded-full bg-primary-container text-on-primary text-xs font-bold tactile-glow"
            >
              Configure First Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {campaigns.map((camp) => {
              const isPaused = camp.status.toLowerCase() === 'paused';
              const isScheduled = camp.status.toLowerCase() === 'scheduled';
              return (
                <div
                  key={camp.id}
                  className="p-4 rounded-xl bg-surface-container-lowest shadow-[-4px_-4px_10px_#FFFFFF,4px_4px_10px_#D1D9E6] flex flex-col justify-between space-y-3 hover:shadow-[-6px_-6px_14px_#FFFFFF,6px_6px_14px_#D1D9E6] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 shrink-0 rounded-full ${
                          isPaused
                            ? 'bg-neutral-400'
                            : isScheduled
                            ? 'bg-amber-500'
                            : 'bg-primary-container shadow-[0_0_8px_#ff5722]'
                        }`}
                      />
                      <span className="text-xs text-on-surface font-semibold truncate">
                        {camp.title}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold shrink-0 ${
                        isPaused
                          ? 'text-on-surface-variant'
                          : isScheduled
                          ? 'text-amber-700'
                          : 'text-primary'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    {camp.pushTitle}
                  </p>

                  <div className="flex items-center justify-between text-on-surface-variant text-xs tabular-nums">
                    <span>Boundary: {camp.radiusMeters}m</span>
                    <span className="font-semibold text-on-surface uppercase text-[10px]">
                      {camp.segment} • {camp.triggerRule}
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-between border-t border-surface-container-high">
                    <span className="text-[10px] text-on-surface-variant tabular-nums">
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(camp)}
                        title={isPaused ? 'Resume campaign' : 'Pause campaign'}
                        className="w-7 h-7 rounded-full bg-surface-container-low shadow-[-2px_-2px_4px_#FFFFFF,2px_2px_4px_#D1D9E6] flex items-center justify-center text-on-surface-variant hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isPaused ? 'play_arrow' : 'pause'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCampaign(camp)}
                        title="Delete campaign"
                        className="w-7 h-7 rounded-full bg-surface-container-low shadow-[-2px_-2px_4px_#FFFFFF,2px_2px_4px_#D1D9E6] flex items-center justify-center text-on-surface-variant hover:text-red-600"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
