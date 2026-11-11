import React, { useState } from 'react';
import { CustomerMember } from '../types';
import { sounds } from '../utils/sound';

interface CustomersCRMViewProps {
  onProvisionNewMember?: () => void;
}

export const CustomersCRMView: React.FC<CustomersCRMViewProps> = ({ onProvisionNewMember }) => {
  const [members, setMembers] = useState<CustomerMember[]>([]);

  React.useEffect(() => {
    fetch('/api/passes')
      .then((res) => res.json())
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
        }
      })
      .catch((err) => console.log('Error fetching members from DB:', err));
  }, []);

  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [filterSegment, setFilterSegment] = useState<'vip' | 'all' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const defaultMember: CustomerMember = {
    id: 'demo-0',
    uid: '#PL-000000',
    name: 'No Enrolled Member',
    avatarUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&auto=format&fit=crop',
    tier: 'SILVER',
    tierColor: 'text-on-surface',
    tierBg: 'bg-surface-container-high text-on-surface-variant',
    points: 0,
    tierCap: 2000,
    entryPoints: 0,
    thresholdPoints: 1000,
    status: 'NFC Ready Node',
    joinedDate: '2026',
    syncedTime: 'Just now',
    visitCount: 0,
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0] || defaultMember;

  const handleSelectMember = (id: string) => {
    sounds.click();
    setSelectedMemberId(id);
  };

  const handleAdjustPoints = (delta: number) => {
    sounds.dialTick();
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === selectedMember.id) {
          const newPts = Math.max(0, m.points + delta);
          return { ...m, points: newPts };
        }
        return m;
      })
    );
  };

  const triggerNotice = (msg: string) => {
    sounds.chime();
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 2500);
  };

  const filteredMembers = members.filter((m) => {
    if (searchQuery) {
      return (
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.uid.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterSegment === 'vip') return m.tier === 'GOLD VIP' || m.tier === 'PLATINUM';
    return true;
  });

  const entryPts = selectedMember.entryPoints || 0;
  const threshPts = selectedMember.thresholdPoints || 1000;
  const denom = Math.max(1, threshPts - entryPts);
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(((selectedMember.points - entryPts) / denom) * 100))
  );

  return (
    <div className="flex flex-col w-full select-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary-container">
            <span className="material-symbols-outlined text-[20px]">groups</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline-md text-headline-md text-on-surface tracking-tight">
                Member Registry
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold shadow-inner">
                VIP Cohort
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Active digital credential cards &amp; real-time NFC token stream
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
            VIP Tier
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
            All Members (4,821)
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
            Pending Claims
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
              {filteredMembers.map((member) => {
                const isSelected = member.id === selectedMemberId;
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
              })}
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
                  {selectedMember.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container tactile-deboss text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  contactless
                </span>
                <span>Tap Ready</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                {selectedMember.name}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Primary Member • Pass {selectedMember.uid}-US
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
                    {selectedMember.points.toLocaleString()}
                  </span>
                  <span className="font-label-md text-label-md text-primary font-semibold mt-1">
                    PTS
                  </span>
                  <div className="mt-1 flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                    <span>Tier Cap:</span>
                    <span className="font-semibold text-on-surface">
                      {selectedMember.tierCap.toLocaleString()}
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
                  <span className={`px-2 py-0.5 rounded-full font-bold ${selectedMember.tierBg}`}>
                    {selectedMember.tier}
                  </span>
                  <span className="text-on-surface-variant">Upgrade Progress</span>
                </div>
                <span className="font-bold text-primary">
                  {Math.max(0, selectedMember.thresholdPoints - selectedMember.points)} pts remaining
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container tactile-deboss overflow-hidden">
                <div
                  className="h-full bg-primary-container rounded-full tactile-glow transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                <span>Entry: {selectedMember.entryPoints} pts</span>
                <span>Threshold: {selectedMember.thresholdPoints} pts</span>
              </div>
            </div>

            {/* Quick Incremental Adjust Buttons */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => handleAdjustPoints(-50)}
                className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface hover:text-primary transition-transform active:scale-95"
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
                className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface hover:text-primary transition-transform active:scale-95"
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
                      PassLoyal VIP Core
                    </span>
                    <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-white">
                      {selectedMember.name}
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
                      {selectedMember.tier}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-white/70 block">
                      Balance
                    </span>
                    <span className="font-headline-sm text-headline-sm font-bold text-white">
                      {selectedMember.points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant px-1">
              <span>Synced: {selectedMember.syncedTime}</span>
              <span className="text-primary font-medium">Auto-Refresh On</span>
            </div>
          </div>

          {/* Pass Controls */}
          <div className="bg-surface-container-low rounded-xl p-5 tactile-card flex flex-col gap-3">
            <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-bold">
              Pass Controls
            </span>
            <button
              onClick={() => handleAdjustPoints(100)}
              className="w-full py-3 px-4 rounded-full bg-primary-container text-on-primary tactile-glow flex items-center justify-between font-label-lg text-label-lg font-semibold hover:opacity-95 transition-all"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Credit Custom Points
              </span>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
            <button
              onClick={() => triggerNotice(`Push lockscreen alert sent to ${selectedMember.name}`)}
              className="w-full py-3 px-4 rounded-full bg-surface-container text-on-surface tactile-btn flex items-center justify-between font-label-lg text-label-lg font-semibold hover:text-primary transition-all"
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
              onClick={() => triggerNotice(`Wallet pass link re-sent to ${selectedMember.name}`)}
              className="w-full py-3 px-4 rounded-full bg-surface-container text-on-surface tactile-btn flex items-center justify-between font-label-lg text-label-lg font-semibold hover:text-primary transition-all"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                Resend Wallet Invite
              </span>
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Visit Frequency Spline Chart */}
          <div className="bg-surface-container-low rounded-xl p-5 tactile-card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-bold">
                Visit Frequency
              </span>
              <span className="font-label-sm text-label-sm font-semibold text-primary">
                +28% MoM
              </span>
            </div>
            <div className="w-full h-20 rounded-lg bg-surface-container tactile-deboss p-2 flex items-center justify-center">
              <svg className="w-full h-full" fill="none" viewBox="0 0 240 60">
                <path
                  d="M 10 45 C 40 45, 60 20, 90 28 C 120 36, 140 12, 170 15 C 200 18, 220 5, 230 4"
                  stroke="#ff5722"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 45 C 40 45, 60 20, 90 28 C 120 36, 140 12, 170 15 C 200 18, 220 5, 230 4 L 230 55 L 10 55 Z"
                  fill="rgba(255, 87, 34, 0.08)"
                />
                <circle cx="170" cy="15" r="5" fill="#ff5722" className="tactile-glow" />
                <circle cx="170" cy="15" r="2.5" fill="#ffffff" />
              </svg>
            </div>
            <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant px-1 mt-1">
              <span>Wk 1</span>
              <span>Wk 2</span>
              <span>Wk 3</span>
              <span className="text-primary font-bold">Wk 4 (Peak)</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Fleet Metrics Bar */}
      <div className="mt-6 bg-surface-container-low rounded-xl p-5 tactile-card flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary">
            <span className="material-symbols-outlined text-[24px]">analytics</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Program Fleet Health
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Real-time pass retention across 18 regional POS nodes
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
                3,842
              </span>
            </div>
          </div>
          <div className="px-5 py-2.5 rounded-full bg-surface-container tactile-deboss flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[18px]">
              verified_user
            </span>
            <div>
              <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block">
                Retained Cohort
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary">
                98.4%
              </span>
            </div>
          </div>
          <div className="px-5 py-2.5 rounded-full bg-surface-container tactile-deboss flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[18px]">
              bolt
            </span>
            <div>
              <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant block">
                Avg Redemption
              </span>
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                4.2d
              </span>
            </div>
          </div>
          <button
            onClick={() => triggerNotice('Ledger CSV Exported')}
            className="px-5 py-3 rounded-full bg-surface-container text-on-surface hover:text-primary tactile-btn flex items-center gap-2 font-label-lg text-label-lg font-semibold"
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
