import React, { useEffect, useState } from 'react';
import { authFetch, getAuthToken } from '../utils/auth';
import { sounds } from '../utils/sound';

interface OnboardingViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
  onCompleteStep?: () => void;
}

interface TierRule {
  id: string;
  name: string;
  multiplier: number;
  minPoints: number;
  label: string;
}

interface CouponItem {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  pointsCost: number;
  discountAmount: number;
  icon: string;
  active: boolean;
}

interface IssuedCard {
  id: string;
  name: string;
  memberId: string;
  points: number;
  saveUrl?: string;
}

const DEFAULT_TIERS: TierRule[] = [
  { id: 'tier-silver', name: 'Silver', multiplier: 1.0, minPoints: 0, label: 'Base Rate' },
  { id: 'tier-gold', name: 'Gold (Mid)', multiplier: 1.25, minPoints: 1500, label: '1,500 Pts' },
  { id: 'tier-vip', name: 'VIP Plat', multiplier: 1.5, minPoints: 4000, label: '4,000 Pts' },
];

const COUPON_ICONS = [
  { id: 'redeem', label: 'Gift' },
  { id: 'percent', label: 'Discount' },
  { id: 'local_cafe', label: 'Drink' },
  { id: 'restaurant', label: 'Dining' },
  { id: 'confirmation_number', label: 'Voucher' },
  { id: 'star', label: 'VIP' },
];

const BRAND_SWATCHES = [
  { name: 'Terracotta', color: '#ff5722' },
  { name: 'Obsidian', color: '#1e2530' },
  { name: 'Emerald', color: '#107c41' },
  { name: 'Cobalt', color: '#1a73e8' },
  { name: 'Champagne', color: '#d4af37' },
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  activeSlug = '',
  userRole = 'merchant',
  onCompleteStep,
}) => {
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const [activeStep, setActiveStep] = useState<number>(3);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Store & Card Program Identity
  const [storeName, setStoreName] = useState<string>(activeSlug || 'Store Console');
  const [brandColor, setBrandColor] = useState<string>('#ff5722');
  const [archetype, setArchetype] = useState<'loyalty' | 'gift' | 'ticket'>('loyalty');
  const [classId, setClassId] = useState<string>('');
  const [programName, setProgramName] = useState<string>('Rewards Club');
  const [cardTitle, setCardTitle] = useState<string>('Membership Card');
  const [barcodeMode, setBarcodeMode] = useState<'barcode' | 'qr'>('barcode');

  // Rules State
  const [welcomeActive, setWelcomeActive] = useState<boolean>(true);
  const [welcomeGrant, setWelcomeGrant] = useState<number>(100);
  const [earnVelocity, setEarnVelocity] = useState<number>(10);
  const [minFloor, setMinFloor] = useState<number>(500);
  const [simulatedCheck, setSimulatedCheck] = useState<number>(35);
  const [tiers, setTiers] = useState<TierRule[]>(DEFAULT_TIERS);
  const [selectedTierIdx, setSelectedTierIdx] = useState<number>(1);

  // Coupons / Vouchers State
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [showCouponForm, setShowCouponForm] = useState<boolean>(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState({
    title: '',
    subtitle: '',
    code: '',
    pointsCost: 500,
    discountAmount: 5,
    icon: 'redeem',
    active: true,
  });
  const [isSavingCoupon, setIsSavingCoupon] = useState<boolean>(false);

  // Issued Cards / Quick Card Creator State
  const [issuedCards, setIssuedCards] = useState<IssuedCard[]>([]);
  const [newCardName, setNewCardName] = useState<string>('');
  const [newCardEmail, setNewCardEmail] = useState<string>('');
  const [newCardPhone, setNewCardPhone] = useState<string>('');
  const [newCardPoints, setNewCardPoints] = useState<string>('');
  const [isCreatingCard, setIsCreatingCard] = useState<boolean>(false);
  const [latestCreatedCard, setLatestCreatedCard] = useState<IssuedCard | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setCoupons([]);
    setIssuedCards([]);
    setLatestCreatedCard(null);
    setShowCouponForm(false);
    setEditingCouponId(null);

    if (!getAuthToken()) {
      setIsLoading(false);
      return;
    }

    if (isSuperAdmin && !activeSlug) {
      setStoreName('Select a Store');
      setIsLoading(false);
      return;
    }

    const cfgUrl =
      isSuperAdmin && activeSlug
        ? `/api/program-config?slug=${encodeURIComponent(activeSlug)}`
        : '/api/program-config';
    const membersUrl =
      isSuperAdmin && activeSlug
        ? `/api/members?slug=${encodeURIComponent(activeSlug)}`
        : '/api/members';

    const loadCfg = authFetch(cfgUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.tenant) {
          setStoreName(data.tenant.name || activeSlug || 'Store Console');
          setBrandColor(data.tenant.brandColor || '#ff5722');
          setClassId(data.tenant.classId || '');
          if (
            data.tenant.archetype === 'loyalty' ||
            data.tenant.archetype === 'gift' ||
            data.tenant.archetype === 'ticket'
          ) {
            setArchetype(data.tenant.archetype);
          }
        }
        if (data.config) {
          setProgramName(data.config.programName || `${data.tenant?.name || 'Store'} Club`);
          setCardTitle(data.config.cardTitle || `${data.tenant?.name || 'Store'} Membership Card`);
          setBarcodeMode(data.config.barcodeMode === 'qr' ? 'qr' : 'barcode');
          setWelcomeActive(Boolean(data.config.welcomeActive));
          setWelcomeGrant(Number(data.config.welcomeGrant ?? 100));
          setEarnVelocity(Number(data.config.earnVelocity ?? 10));
          setMinFloor(Number(data.config.minFloor ?? 500));
          if (Array.isArray(data.config.tiers) && data.config.tiers.length > 0) {
            setTiers(data.config.tiers);
          }
        }
        if (Array.isArray(data.coupons)) {
          setCoupons(data.coupons);
        }
      })
      .catch(() => {});

    const loadMembers = authFetch(membersUrl)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        setIssuedCards(
          rows.map((m: any) => ({
            id: m.id,
            name: m.customer_name || m.name || 'Member',
            memberId: m.member_id || m.id,
            points: Number(m.points || 0),
          }))
        );
      })
      .catch(() => {});

    Promise.all([loadCfg, loadMembers]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeSlug, userRole, isSuperAdmin]);

  const handleSaveConfig = async (silentSuccess = false): Promise<boolean> => {
    if (isSuperAdmin && !activeSlug) {
      showNotice('error', 'Select a store from the header dropdown first.');
      return false;
    }
    sounds.click(1000, 0.03);
    setIsSaving(true);
    try {
      const res = await authFetch('/api/program-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: isSuperAdmin ? activeSlug : undefined,
          storeName: storeName.trim(),
          brandColor,
          archetype,
          programName: programName.trim(),
          cardTitle: cardTitle.trim(),
          barcodeMode,
          welcomeActive,
          welcomeGrant,
          earnVelocity,
          minFloor,
          tiers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data?.error || 'Failed to save program rules');
        return false;
      }
      if (!silentSuccess) {
        showNotice('success', `Saved card design & loyalty rules for ${storeName}.`);
      }
      return true;
    } catch {
      showNotice('error', 'Network error while saving program rules.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleProceed = async () => {
    const ok = await handleSaveConfig(true);
    if (!ok) return;
    sounds.chime();
    if (activeStep < 4) {
      setActiveStep((prev) => prev + 1);
      showNotice('success', `Saved rules for ${storeName}.`);
    } else if (onCompleteStep) {
      onCompleteStep();
    }
  };

  const openCreateCoupon = () => {
    sounds.click(950, 0.02);
    setEditingCouponId(null);
    setCouponForm({
      title: '',
      subtitle: `Redeemable at ${storeName}`,
      code: `SAVE${Math.floor(10 + Math.random() * 89)}`,
      pointsCost: minFloor,
      discountAmount: Number((minFloor / 100).toFixed(2)),
      icon: 'redeem',
      active: true,
    });
    setShowCouponForm(true);
  };

  const openEditCoupon = (c: CouponItem) => {
    sounds.click(900, 0.02);
    setEditingCouponId(c.id);
    setCouponForm({
      title: c.title,
      subtitle: c.subtitle,
      code: c.code,
      pointsCost: c.pointsCost,
      discountAmount: c.discountAmount,
      icon: c.icon || 'redeem',
      active: c.active,
    });
    setShowCouponForm(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.title.trim()) {
      showNotice('error', 'Enter a coupon title before saving.');
      return;
    }
    if (isSuperAdmin && !activeSlug) {
      showNotice('error', 'Select a store first.');
      return;
    }

    setIsSavingCoupon(true);
    sounds.click(1100, 0.03);
    try {
      const url = editingCouponId
        ? `/api/coupons/${encodeURIComponent(editingCouponId)}`
        : '/api/coupons';
      const method = editingCouponId ? 'PATCH' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: isSuperAdmin ? activeSlug : undefined,
          ...couponForm,
          title: couponForm.title.trim(),
          subtitle: couponForm.subtitle.trim(),
          code: couponForm.code.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data?.error || 'Failed to save coupon');
      } else if (data?.coupon) {
        if (editingCouponId) {
          setCoupons((prev) =>
            prev.map((item) => (item.id === editingCouponId ? data.coupon : item))
          );
          showNotice('success', `Updated coupon "${data.coupon.title}".`);
        } else {
          setCoupons((prev) => [data.coupon, ...prev]);
          showNotice('success', `Created coupon "${data.coupon.title}".`);
        }
        setShowCouponForm(false);
        setEditingCouponId(null);
      }
    } catch {
      showNotice('error', 'Network error saving coupon.');
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const handleToggleCouponActive = async (c: CouponItem) => {
    sounds.click(850, 0.02);
    try {
      const res = await authFetch(`/api/coupons/${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active }),
      });
      const data = await res.json();
      if (res.ok && data?.coupon) {
        setCoupons((prev) => prev.map((item) => (item.id === c.id ? data.coupon : item)));
      }
    } catch {
      showNotice('error', 'Failed to toggle coupon state.');
    }
  };

  const handleDeleteCoupon = async (c: CouponItem) => {
    sounds.click(700, 0.02);
    try {
      const res = await authFetch(`/api/coupons/${encodeURIComponent(c.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((item) => item.id !== c.id));
        if (editingCouponId === c.id) {
          setShowCouponForm(false);
          setEditingCouponId(null);
        }
        showNotice('success', `Deleted coupon "${c.title}".`);
      } else {
        const data = await res.json().catch(() => null);
        showNotice('error', data?.error || 'Failed to delete coupon.');
      }
    } catch {
      showNotice('error', 'Network error deleting coupon.');
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName.trim()) {
      showNotice('error', 'Enter a customer or cardholder name to issue a card.');
      return;
    }
    const targetSlug = activeSlug || 'store';
    setIsCreatingCard(true);
    sounds.chime();
    try {
      // Save latest rules first so welcomeGrant & programName take effect on enrollment
      await handleSaveConfig(true);

      const res = await authFetch(`/api/tenants/${encodeURIComponent(targetSlug)}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCardName.trim(),
          email: newCardEmail.trim(),
          phone: newCardPhone.trim(),
          initialPoints:
            newCardPoints.trim() !== '' && !isNaN(Number(newCardPoints))
              ? Number(newCardPoints)
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data?.error || 'Could not issue pass card');
      } else if (data?.member) {
        const created: IssuedCard = {
          id: data.member.id,
          name: data.member.name,
          memberId: data.member.member_id || data.qr,
          points: Number(data.member.points ?? (welcomeActive ? welcomeGrant : 0)),
          saveUrl: data.saveToWalletUrl,
        };
        setIssuedCards((prev) => [created, ...prev]);
        setLatestCreatedCard(created);
        setNewCardName('');
        setNewCardEmail('');
        setNewCardPhone('');
        setNewCardPoints('');
        showNotice(
          'success',
          `Issued pass ${created.memberId} for ${created.name} with ${created.points} pts.`
        );
      }
    } catch {
      showNotice('error', 'Network error issuing pass card.');
    } finally {
      setIsCreatingCard(false);
    }
  };

  const updateTier = (idx: number, patch: Partial<TierRule>) => {
    setTiers((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        const next = { ...t, ...patch };
        if (patch.minPoints !== undefined) {
          next.label =
            patch.minPoints === 0
              ? 'Base Rate'
              : `${Number(patch.minPoints).toLocaleString()} Pts`;
        }
        return next;
      })
    );
  };

  const storeInitial = (storeName || 'S').trim().charAt(0).toUpperCase();
  const sampleMember = issuedCards[0];
  const activeTier = tiers[selectedTierIdx] || tiers[0];

  return (
    <div className="flex flex-col w-full gap-6 select-none">
      {/* Feedback Banner */}
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

      {/* TOP WIZARD PROGRESSION & CONTROLS STRIP */}
      <header className="w-full bg-surface-container-low rounded-xl tactile-convex p-4 lg:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          {[
            { num: 1, title: 'Store Profile' },
            { num: 2, title: 'Card Builder' },
            { num: 3, title: 'Rules & Coupons' },
            { num: 4, title: 'Issue Cards & Live' },
          ].map((step, idx) => {
            const isCurrent = activeStep === step.num;
            const isDone = activeStep > step.num;
            return (
              <React.Fragment key={step.num}>
                {idx > 0 && (
                  <div
                    className={`w-4 h-0.5 rounded-full ${
                      isDone || isCurrent ? 'bg-primary-container' : 'bg-surface-container-highest'
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    sounds.click(900, 0.02);
                    setActiveStep(step.num);
                  }}
                  className={`cursor-pointer flex items-center gap-2 px-3.5 py-2 rounded-full transition-all ${
                    isCurrent
                      ? 'bg-surface-container-lowest tactile-convex tactile-active-glow'
                      : 'bg-surface-container-lowest tactile-convex-sm hover:scale-[1.02]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isCurrent
                        ? 'bg-primary-container text-on-primary'
                        : isDone
                        ? 'bg-tertiary text-on-tertiary'
                        : 'bg-surface-variant text-on-surface-variant'
                    }`}
                  >
                    {isDone ? (
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    ) : (
                      step.num
                    )}
                  </span>
                  <div className="flex flex-col text-left">
                    {isCurrent && (
                      <span className="text-[9px] uppercase tracking-wider text-primary font-bold leading-none">
                        Step {step.num} Active
                      </span>
                    )}
                    <span
                      className={`text-xs font-semibold leading-tight ${
                        isCurrent ? 'text-on-surface' : 'text-on-surface-variant'
                      }`}
                    >
                      {step.num}. {step.title}
                    </span>
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Real Tenant Meta + Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface tactile-deboss">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-active-glow" />
            <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
              Filtered strictly for
            </span>
            <span className="text-xs font-bold text-on-surface">{storeName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold tabular-nums">
              {coupons.length} Coupons
            </span>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveConfig(false)}
            className="px-4 py-2 rounded-full bg-surface-container-lowest text-on-surface text-xs font-semibold tactile-convex-sm active:translate-y-0.5 transition-transform flex items-center gap-1.5 hover:text-primary disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{isSaving ? 'Saving...' : 'Save Rules'}</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleProceed}
            className="px-5 py-2 rounded-full bg-primary-container text-on-primary text-xs font-semibold tactile-convex-sm tactile-active-glow hover:bg-secondary-container active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
          >
            <span>{activeStep === 4 ? 'Save & Activate' : `Continue to Step ${activeStep + 1}`}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN WORKSPACE (Shared Wallet Simulator on Right Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT + CENTER AREA (9 cols) */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* STEP 1: STORE PROFILE */}
          {activeStep === 1 && (
            <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    Step 1 • Merchant Identity
                  </span>
                  <h2 className="text-xl font-bold text-on-surface mt-0.5">
                    Store Profile &amp; Card Branding
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-surface text-xs font-mono text-on-surface-variant tactile-deboss">
                  {classId || 'Class ID Auto-Provisioned'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Store / Merchant Display Name
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="h-11 px-4 rounded-xl bg-surface tactile-deboss text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Default Program Header
                  </label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="h-11 px-4 rounded-xl bg-surface tactile-deboss text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">
                    Brand Color Theme
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {BRAND_SWATCHES.map((sw) => {
                      const active = brandColor.toLowerCase() === sw.color.toLowerCase();
                      return (
                        <button
                          key={sw.name}
                          type="button"
                          onClick={() => {
                            sounds.click(950, 0.02);
                            setBrandColor(sw.color);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                            active
                              ? 'bg-surface-container-lowest ring-2 ring-primary-container text-on-surface'
                              : 'bg-surface text-on-surface-variant tactile-convex-sm'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: sw.color }}
                          />
                          <span>{sw.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">
                    Card Program Archetype
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'loyalty' as const, label: 'Loyalty Card', icon: 'loyalty' },
                      { key: 'gift' as const, label: 'Gift Card', icon: 'card_giftcard' },
                      { key: 'ticket' as const, label: 'VIP Pass', icon: 'confirmation_number' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          sounds.click(900, 0.02);
                          setArchetype(opt.key);
                        }}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 text-xs font-semibold transition-all ${
                          archetype === opt.key
                            ? 'bg-surface-container-lowest text-primary ring-2 ring-primary-container'
                            : 'bg-surface text-on-surface-variant tactile-convex-sm'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* STEP 2: CARD BUILDER & WALLET IDENTITY */}
          {activeStep === 2 && (
            <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    Step 2 • Card Template Builder
                  </span>
                  <h2 className="text-xl font-bold text-on-surface mt-0.5">
                    Create Card Template &amp; Wallet Identity
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="px-4 py-2 rounded-full bg-primary-container text-on-primary text-xs font-bold tactile-active-glow flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add_card</span>
                  <span>Issue Customer Card</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Card Name / Wallet Pass Title
                  </label>
                  <input
                    type="text"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    placeholder={`${storeName} Membership Card`}
                    className="h-11 px-4 rounded-xl bg-surface tactile-deboss text-sm font-semibold text-on-surface outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Pass Subtitle / Program Club Name
                  </label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    className="h-11 px-4 rounded-xl bg-surface tactile-deboss text-sm font-semibold text-on-surface outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 rounded-xl bg-surface tactile-deboss flex flex-col gap-3">
                  <span className="text-xs font-bold text-on-surface">
                    Scan / Barcode Rendering Format
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'barcode' as const, label: 'Code 128 Barcode', icon: 'barcode' },
                      { id: 'qr' as const, label: '2D QR Matrix', icon: 'qr_code_2' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          sounds.click(900, 0.02);
                          setBarcodeMode(b.id);
                        }}
                        className={`p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                          barcodeMode === b.id
                            ? 'bg-surface-container-lowest text-primary tactile-convex-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{b.icon}</span>
                        <span>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface tactile-deboss flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">Issued Cards in Fleet</span>
                    <span className="text-lg font-bold text-primary tabular-nums">
                      {issuedCards.length}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    All newly issued wallet cards inherit your {earnVelocity} pts/$1 earn rule,{' '}
                    {welcomeActive ? `${welcomeGrant} pts` : '0 pts'} welcome bonus, and{' '}
                    {coupons.filter((c) => c.active).length} active coupon(s).
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: LOYALTY RULES, TIERS & COUPONS COCKPIT */}
          {activeStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-9 gap-6">
              {/* COLUMN 1: PROGRAM CORE RULES (4 cols of 9) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-surface-container-lowest tactile-convex-sm flex items-center justify-center text-primary-container">
                        <span className="material-symbols-outlined text-[18px]">tune</span>
                      </span>
                      <span className="text-base font-semibold text-on-surface">Program Core</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-primary font-bold px-2.5 py-0.5 bg-primary-fixed rounded-full">
                      v3.2 Spec
                    </span>
                  </div>

                  {/* Display Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-on-surface-variant flex items-center justify-between">
                      <span>Pass Program Display Name</span>
                      <span className="text-[10px] text-outline">Wallet Header</span>
                    </label>
                    <div className="w-full h-11 px-3.5 rounded-full bg-surface tactile-deboss flex items-center gap-2">
                      <span className="material-symbols-outlined text-outline text-[18px]">
                        badge
                      </span>
                      <input
                        className="bg-transparent w-full text-sm text-on-surface focus:outline-none font-medium"
                        type="text"
                        value={programName}
                        onChange={(e) => setProgramName(e.target.value)}
                      />
                      <span className="material-symbols-outlined text-tertiary text-[18px]">
                        verified
                      </span>
                    </div>
                  </div>

                  {/* Welcome Grant Switch */}
                  <div className="p-3.5 rounded-lg bg-surface-container tactile-deboss flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-on-surface font-semibold">
                        Welcome Grant Upon Tap
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Instant bonus on Google Wallet save
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Toggle welcome bonus"
                      onClick={() => {
                        sounds.click();
                        setWelcomeActive(!welcomeActive);
                      }}
                      className={`w-14 h-8 rounded-full bg-surface tactile-deboss p-1 flex items-center cursor-pointer transition-colors ${
                        welcomeActive
                          ? 'justify-end bg-gradient-to-r from-primary-fixed to-primary-container/30'
                          : 'justify-start'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-container tactile-convex-sm tactile-active-glow flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-on-primary"></span>
                      </div>
                    </button>
                  </div>

                  {/* Grant Magnitude */}
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-full bg-surface-container-lowest tactile-convex-sm">
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">
                      Grant Magnitude
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.dialTick();
                          setWelcomeGrant((prev) => Math.max(0, prev - 25));
                        }}
                        className="w-7 h-7 rounded-full bg-surface tactile-deboss flex items-center justify-center text-on-surface hover:text-primary active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="text-lg text-primary font-bold min-w-16 text-center tabular-nums">
                        {welcomeGrant}{' '}
                        <span className="text-xs font-normal text-on-surface-variant">PTS</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.dialTick();
                          setWelcomeGrant((prev) => prev + 25);
                        }}
                        className="w-7 h-7 rounded-full bg-surface tactile-deboss flex items-center justify-center text-on-surface hover:text-primary active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Base Earn Velocity */}
                  <div className="flex flex-col gap-2 pt-1">
                    <label className="text-xs text-on-surface-variant flex items-center justify-between">
                      <span>Base Earn Velocity</span>
                      <span className="text-[11px] text-primary font-semibold tabular-nums">
                        {earnVelocity} Pts/$1 Active
                      </span>
                    </label>
                    <div className="grid grid-cols-4 gap-2 p-1.5 rounded-full bg-surface tactile-deboss">
                      {[1, 10, 15, 25].map((pts) => {
                        const isSelected = earnVelocity === pts;
                        return (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => {
                              sounds.click();
                              setEarnVelocity(pts);
                            }}
                            className={`py-2 rounded-full text-xs text-center transition-all tabular-nums ${
                              isSelected
                                ? 'font-bold bg-primary-container text-on-primary tactile-convex-sm tactile-active-glow'
                                : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            {pts} {pts === 1 ? 'pt' : 'pts'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Check Yield Calculator */}
                  <div className="p-3.5 rounded-lg bg-surface tactile-deboss flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">
                          calculate
                        </span>
                        Simulated Check Yield
                      </span>
                      <span className="font-mono text-tertiary font-medium truncate max-w-[120px]">
                        {storeName} POS
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-light text-on-surface-variant">$</span>
                        <input
                          type="number"
                          min={1}
                          max={9999}
                          value={simulatedCheck}
                          onChange={(e) =>
                            setSimulatedCheck(Math.max(1, Number(e.target.value) || 1))
                          }
                          aria-label="Simulated check amount"
                          className="w-20 bg-transparent text-2xl text-on-surface font-light outline-none tabular-nums border-b border-surface-container-highest focus:border-primary-container"
                        />
                      </div>
                      <span className="material-symbols-outlined text-outline text-[20px]">
                        arrow_forward
                      </span>
                      <div className="flex items-baseline gap-1 text-primary tabular-nums">
                        <span className="text-2xl font-bold">
                          +{(simulatedCheck * earnVelocity).toLocaleString()}
                        </span>
                        <span className="text-xs uppercase font-semibold">Pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Min. Redemption Floor Stepper */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-on-surface font-semibold">
                        Min. Redemption Floor
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        Min points to redeem (${(minFloor / 100).toFixed(2)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-surface-container-lowest tactile-convex-sm">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.dialTick();
                          setMinFloor((prev) => Math.max(50, prev - 50));
                        }}
                        className="w-6 h-6 rounded-full bg-surface tactile-deboss flex items-center justify-center text-on-surface hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-[14px]">remove</span>
                      </button>
                      <span className="text-xs font-bold text-on-surface tabular-nums min-w-[60px] text-center">
                        {minFloor} PTS
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.dialTick();
                          setMinFloor((prev) => Math.min(25000, prev + 50));
                        }}
                        className="w-6 h-6 rounded-full bg-surface tactile-deboss flex items-center justify-center text-on-surface hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Security / NFC Telemetry */}
                <div className="bg-surface-container-low rounded-xl tactile-convex p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface tactile-deboss flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-[22px]">contactless</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-on-surface">
                        Google Smart Tap v3.2
                      </span>
                      <span className="text-[11px] text-on-surface-variant truncate max-w-[180px]">
                        {classId || 'AES-128 NFC Payload Ready'}
                      </span>
                    </div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-tertiary tactile-active-glow animate-pulse"></div>
                </div>
              </div>

              {/* COLUMN 2: TIER MATRIX & COUPONS MANAGER (5 cols of 9) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Tier Architecture Matrix */}
                <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col items-center justify-between gap-4 relative overflow-hidden">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-surface-container-lowest tactile-convex-sm flex items-center justify-center text-primary-container">
                        <span className="material-symbols-outlined text-[18px]">donut_large</span>
                      </span>
                      <span className="text-base font-semibold text-on-surface">
                        Tier Architecture Matrix
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
                      Click Tier to Edit Rule
                    </span>
                  </div>

                  {/* Concentric Rotary Gauge */}
                  <div className="relative w-56 h-56 my-1 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-surface tactile-deboss flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                        <circle
                          cx="80"
                          cy="80"
                          r="68"
                          fill="none"
                          stroke="#d1d9e6"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="68"
                          fill="none"
                          stroke={brandColor}
                          strokeWidth="8"
                          strokeDasharray="427"
                          strokeDashoffset={selectedTierIdx === 0 ? 280 : selectedTierIdx === 1 ? 150 : 40}
                          strokeLinecap="round"
                          style={{
                            filter: `drop-shadow(0 0 8px ${brandColor}88)`,
                            transition: 'stroke-dashoffset 0.35s ease',
                          }}
                        />
                      </svg>
                    </div>

                    <div className="w-36 h-36 rounded-full bg-surface-container-lowest tactile-convex flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-[10px] uppercase text-outline tracking-wider font-semibold">
                        {activeTier?.name || 'Tier'}
                      </span>
                      <span className="text-3xl text-primary leading-tight font-bold tabular-nums">
                        {activeTier?.multiplier.toFixed(2)}x
                      </span>
                      <span className="text-[11px] text-on-surface-variant font-semibold tabular-nums">
                        {activeTier?.minPoints === 0
                          ? 'Base Rate'
                          : `${activeTier?.minPoints.toLocaleString()} Pts`}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Tier Cards */}
                  <div className="w-full grid grid-cols-3 gap-2">
                    {tiers.map((tier, idx) => {
                      const selected = selectedTierIdx === idx;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            sounds.click(920, 0.02);
                            setSelectedTierIdx(idx);
                          }}
                          className={`p-2.5 rounded-lg flex flex-col items-center text-center transition-all ${
                            selected
                              ? 'bg-primary-fixed tactile-convex-sm ring-1 ring-primary-container/40'
                              : 'bg-surface tactile-deboss hover:bg-surface-container-high'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold truncate max-w-full ${
                              selected ? 'text-primary' : 'text-on-surface-variant'
                            }`}
                          >
                            {tier.name}
                          </span>
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              selected ? 'text-primary' : 'text-on-surface'
                            }`}
                          >
                            {tier.multiplier.toFixed(2)}x
                          </span>
                          <span className="text-[10px] text-on-surface-variant tabular-nums">
                            {tier.minPoints === 0 ? 'Base Rate' : `${tier.minPoints.toLocaleString()} Pts`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Inline Editor for Selected Tier Rule */}
                  {activeTier && (
                    <div className="w-full p-3 rounded-xl bg-surface tactile-deboss grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-on-surface-variant">
                          Tier Name
                        </label>
                        <input
                          type="text"
                          value={activeTier.name}
                          onChange={(e) => updateTier(selectedTierIdx, { name: e.target.value })}
                          className="h-8 px-2 rounded-lg bg-surface-container-lowest text-xs font-semibold text-on-surface outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-on-surface-variant">
                          Multiplier (x)
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="1"
                          max="5"
                          value={activeTier.multiplier}
                          onChange={(e) =>
                            updateTier(selectedTierIdx, {
                              multiplier: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="h-8 px-2 rounded-lg bg-surface-container-lowest text-xs font-semibold text-on-surface outline-none tabular-nums"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase font-bold text-on-surface-variant">
                          Min Points
                        </label>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={activeTier.minPoints}
                          onChange={(e) =>
                            updateTier(selectedTierIdx, {
                              minPoints: Math.max(0, Math.round(Number(e.target.value) || 0)),
                            })
                          }
                          className="h-8 px-2 rounded-lg bg-surface-container-lowest text-xs font-semibold text-on-surface outline-none tabular-nums"
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* COUPONS & REDEEMABLE REWARDS PLATE (CRUD Persisted to Postgres) */}
                <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-surface-container-lowest tactile-convex-sm flex items-center justify-center text-primary-container">
                        <span className="material-symbols-outlined text-[18px]">redeem</span>
                      </span>
                      <div>
                        <span className="text-base font-semibold text-on-surface block leading-tight">
                          Coupons &amp; Rewards
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          Redeemable vouchers synced to POS Terminal
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openCreateCoupon}
                      className="px-3.5 py-1.5 rounded-full bg-surface-container-lowest text-primary text-xs font-semibold tactile-convex-sm hover:bg-primary-container hover:text-on-primary active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Create Coupon</span>
                    </button>
                  </div>

                  {/* Inline Create / Edit Coupon Form */}
                  {showCouponForm && (
                    <form
                      onSubmit={handleSaveCoupon}
                      className="p-4 rounded-xl bg-surface tactile-deboss space-y-3 border border-primary-container/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          {editingCouponId ? 'Edit Coupon / Voucher' : 'New Coupon / Voucher'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCouponForm(false);
                            setEditingCouponId(null);
                          }}
                          className="text-xs text-on-surface-variant hover:text-on-surface"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Coupon Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={couponForm.title}
                            onChange={(e) =>
                              setCouponForm((f) => ({ ...f, title: e.target.value }))
                            }
                            placeholder="e.g. $5 Instant Discount"
                            className="h-9 px-3 rounded-lg bg-surface-container-lowest text-xs font-semibold text-on-surface outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Coupon Code
                          </label>
                          <input
                            type="text"
                            value={couponForm.code}
                            onChange={(e) =>
                              setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                            }
                            placeholder="SAVE5"
                            className="h-9 px-3 rounded-lg bg-surface-container-lowest text-xs font-mono font-bold text-primary outline-none uppercase"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                          Subtitle / Redemption Rule
                        </label>
                        <input
                          type="text"
                          value={couponForm.subtitle}
                          onChange={(e) =>
                            setCouponForm((f) => ({ ...f, subtitle: e.target.value }))
                          }
                          placeholder={`Valid in-store at ${storeName}`}
                          className="h-9 px-3 rounded-lg bg-surface-container-lowest text-xs text-on-surface outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Points Cost
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={25}
                            value={couponForm.pointsCost}
                            onChange={(e) =>
                              setCouponForm((f) => ({
                                ...f,
                                pointsCost: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="h-9 px-3 rounded-lg bg-surface-container-lowest text-xs font-bold text-on-surface outline-none tabular-nums"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Discount Value ($)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={couponForm.discountAmount}
                            onChange={(e) =>
                              setCouponForm((f) => ({
                                ...f,
                                discountAmount: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="h-9 px-3 rounded-lg bg-surface-container-lowest text-xs font-bold text-on-surface outline-none tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {COUPON_ICONS.map((ic) => (
                            <button
                              key={ic.id}
                              type="button"
                              title={ic.label}
                              onClick={() => setCouponForm((f) => ({ ...f, icon: ic.id }))}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                couponForm.icon === ic.id
                                  ? 'bg-primary-container text-on-primary'
                                  : 'bg-surface-container-lowest text-on-surface-variant'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {ic.id}
                              </span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingCoupon}
                          className="px-4 py-2 rounded-full bg-primary-container text-on-primary text-xs font-bold tactile-glow disabled:opacity-60"
                        >
                          {isSavingCoupon
                            ? 'Saving...'
                            : editingCouponId
                            ? 'Update Coupon'
                            : 'Save Coupon'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Coupons List */}
                  {isLoading ? (
                    <div className="space-y-2.5">
                      {[1, 2].map((n) => (
                        <div
                          key={n}
                          className="h-16 rounded-lg bg-surface-container animate-pulse"
                        />
                      ))}
                    </div>
                  ) : coupons.length === 0 ? (
                    <div className="p-6 rounded-xl bg-surface tactile-deboss flex flex-col items-center text-center gap-2">
                      <span className="material-symbols-outlined text-primary-container text-[28px]">
                        confirmation_number
                      </span>
                      <p className="text-xs font-bold text-on-surface">
                        No coupons created for {storeName} yet
                      </p>
                      <p className="text-[11px] text-on-surface-variant max-w-xs">
                        Create redeemable discount coupons or item rewards that cashiers and wallet
                        holders can redeem.
                      </p>
                      <button
                        type="button"
                        onClick={openCreateCoupon}
                        className="mt-1 px-4 py-1.5 rounded-full bg-primary-container text-on-primary text-xs font-bold tactile-glow"
                      >
                        + Create First Coupon
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {coupons.map((c) => (
                        <div
                          key={c.id}
                          className={`p-3 rounded-lg bg-surface-container-lowest tactile-convex-sm flex items-center justify-between gap-2 transition-all ${
                            c.active ? '' : 'opacity-65'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-secondary-fixed text-secondary">
                              <span className="material-symbols-outlined text-[20px]">
                                {c.icon || 'redeem'}
                              </span>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-on-surface font-semibold truncate">
                                  {c.title}
                                </span>
                                {c.code && (
                                  <span className="px-1.5 py-0.5 rounded bg-surface font-mono text-[9px] font-bold text-primary">
                                    {c.code}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-on-surface-variant truncate">
                                {c.subtitle} • ${Number(c.discountAmount || 0).toFixed(2)} value
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2.5 py-1 rounded-full bg-surface tactile-deboss text-[11px] font-bold text-primary tabular-nums">
                              {c.pointsCost} PTS
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleCouponActive(c)}
                              title={c.active ? 'Disable coupon' : 'Enable coupon'}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                c.active
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  : 'text-on-surface-variant bg-surface hover:bg-surface-container-high'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                {c.active ? 'check_circle' : 'pause_circle'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditCoupon(c)}
                              title="Edit coupon"
                              className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-outline hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(c)}
                              title="Delete coupon"
                              className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-outline hover:text-red-600"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* STEP 4: PROVISIONING & CREATE LIVE CARDS */}
          {activeStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create / Issue New Customer Card */}
              <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    Step 4 • Issue Wallet Card
                  </span>
                  <h2 className="text-lg font-bold text-on-surface mt-0.5">
                    Create Customer Loyalty Card
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Creates a live member card for {storeName} using your saved welcome bonus (
                    {welcomeActive ? `${welcomeGrant} PTS` : '0 PTS'}) and program rules.
                  </p>
                </div>

                <form onSubmit={handleCreateCard} className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                      Cardholder Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                      placeholder="Enter customer full name"
                      className="h-10 px-3.5 rounded-xl bg-surface tactile-deboss text-xs font-semibold text-on-surface outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newCardEmail}
                        onChange={(e) => setNewCardEmail(e.target.value)}
                        placeholder="customer@email.com"
                        className="h-10 px-3 rounded-xl bg-surface tactile-deboss text-xs text-on-surface outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={newCardPhone}
                        onChange={(e) => setNewCardPhone(e.target.value)}
                        placeholder="+1 555-0100"
                        className="h-10 px-3 rounded-xl bg-surface tactile-deboss text-xs text-on-surface outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">
                      Starting Points Override (optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newCardPoints}
                      onChange={(e) => setNewCardPoints(e.target.value)}
                      placeholder={`Default from rule: ${welcomeActive ? welcomeGrant : 0} pts`}
                      className="h-10 px-3 rounded-xl bg-surface tactile-deboss text-xs text-on-surface outline-none tabular-nums"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingCard}
                    className="w-full py-2.5 rounded-full bg-primary-container text-on-primary text-xs font-bold tactile-glow disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_card</span>
                    <span>{isCreatingCard ? 'Issuing Wallet Card...' : 'Create & Issue Card'}</span>
                  </button>
                </form>

                {latestCreatedCard && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span>Card Issued: {latestCreatedCard.name}</span>
                      <span className="font-mono">{latestCreatedCard.memberId}</span>
                    </div>
                    <span className="text-xs text-emerald-800 tabular-nums">
                      Starting Balance: {latestCreatedCard.points} PTS
                    </span>
                    {latestCreatedCard.saveUrl && (
                      <a
                        href={latestCreatedCard.saveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-xs font-semibold"
                      >
                        <span className="material-symbols-outlined text-[15px]">wallet</span>
                        <span>Open Google Wallet Pass</span>
                      </a>
                    )}
                  </div>
                )}
              </section>

              {/* Active Program Rules & Coupons Summary */}
              <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-on-surface">
                    Program Rules &amp; Fleet Status
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-[10px] font-bold uppercase">
                    Ready
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-surface tactile-deboss flex justify-between">
                    <span className="text-on-surface-variant">Program Name</span>
                    <span className="font-bold text-on-surface">{programName}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface tactile-deboss flex justify-between tabular-nums">
                    <span className="text-on-surface-variant">Earn Velocity</span>
                    <span className="font-bold text-primary">{earnVelocity} Pts / $1</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface tactile-deboss flex justify-between tabular-nums">
                    <span className="text-on-surface-variant">Welcome Grant</span>
                    <span className="font-bold text-on-surface">
                      {welcomeActive ? `${welcomeGrant} PTS` : 'Disabled'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface tactile-deboss flex justify-between tabular-nums">
                    <span className="text-on-surface-variant">Min. Redemption Floor</span>
                    <span className="font-bold text-on-surface">{minFloor} PTS</span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface tactile-deboss flex justify-between tabular-nums">
                    <span className="text-on-surface-variant">Active Coupons</span>
                    <span className="font-bold text-on-surface">
                      {coupons.filter((c) => c.active).length} / {coupons.length}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface tactile-deboss flex justify-between tabular-nums">
                    <span className="text-on-surface-variant">Enrolled Cards ({storeName})</span>
                    <span className="font-bold text-on-surface">{issuedCards.length}</span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (3 cols): LIVE GOOGLE WALLET SIMULATOR */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <section className="bg-surface-container-low rounded-xl tactile-convex p-4 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full tactile-active-glow"
                  style={{ backgroundColor: brandColor }}
                />
                <span className="text-base font-semibold text-on-surface">Wallet Simulator</span>
              </div>
              <span className="text-[10px] text-outline uppercase tracking-wider font-semibold">
                Live Card
              </span>
            </div>

            {/* Smartphone Chassis */}
            <div className="w-full max-w-[280px] bg-surface-container-high rounded-xl tactile-convex p-3 flex flex-col items-center relative">
              <div className="w-16 h-1 rounded-full bg-surface-variant mb-2"></div>
              <div className="w-full bg-[#111315] rounded-lg p-3.5 text-white flex flex-col gap-3 shadow-inner relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-30"
                  style={{ backgroundColor: brandColor }}
                />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: brandColor }}
                    >
                      {storeInitial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12px] font-bold tracking-tight text-white leading-tight truncate">
                        {storeName}
                      </span>
                      <span className="text-[9px] text-[#A6AFBF] truncate">{programName}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-white text-[16px]">
                    contactless
                  </span>
                </div>

                <div className="p-2.5 rounded-md bg-white/10 backdrop-blur-md flex flex-col gap-1 relative z-10 border border-white/5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] uppercase tracking-wider text-[#A6AFBF]">
                      {archetype === 'gift' ? 'Recipient' : 'Member'}
                    </span>
                    <span
                      className="text-[9px] uppercase tracking-widest font-bold"
                      style={{ color: brandColor }}
                    >
                      {activeTier?.name || 'Member'} ({activeTier?.multiplier.toFixed(2)}x)
                    </span>
                  </div>
                  <span className="text-[13px] font-semibold text-white truncate">
                    {sampleMember ? sampleMember.name : 'New Cardholder'}
                  </span>
                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <div className="text-[8px] uppercase tracking-wider text-[#A6AFBF]">
                        Points Balance
                      </div>
                      <div className="text-[20px] font-light text-white leading-none tabular-nums">
                        {welcomeActive ? welcomeGrant : 0}{' '}
                        <span className="text-[10px] font-semibold" style={{ color: brandColor }}>
                          PTS
                        </span>
                      </div>
                    </div>
                    {welcomeActive && (
                      <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded text-white tabular-nums">
                        +{welcomeGrant} Grant
                      </span>
                    )}
                  </div>
                </div>

                {/* Barcode or QR Preview */}
                <div className="bg-white rounded-md p-2 flex flex-col items-center justify-center gap-1">
                  {barcodeMode === 'qr' ? (
                    <svg className="w-12 h-12" viewBox="0 0 29 29" fill="#191c1e">
                      <path d="M0 0h7v7H0zM2 2v3h3V2zM9 0h2v1H9zM12 0h1v3h-1zM14 0h3v1h-3zM22 0h7v7h-7zM24 2v3h3V2zM0 22h7v7H0zM2 24v3h3v-3zM10 12h2v2h-2zM13 13h3v3h-3zM17 12h2v2h-2zM12 16h2v2h-2zM15 16h3v2h-3zM22 22h7v7h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-full h-9" preserveAspectRatio="none" viewBox="0 0 120 30">
                      {Array.from({ length: 22 }).map((_, i) => (
                        <rect
                          key={i}
                          x={i * 5.5}
                          y="0"
                          width={(i % 2) + 1.5}
                          height="30"
                          fill="#000"
                        />
                      ))}
                    </svg>
                  )}
                  <span className="text-[8px] tracking-widest text-[#191c1e] font-mono font-medium">
                    {sampleMember ? sampleMember.memberId : 'PL-PREVIEW'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="w-full py-1.5 px-3 rounded-full bg-black border border-white/20 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px] text-white">add_card</span>
                  <span className="text-[10px] font-medium text-white tracking-wide">
                    Issue New Customer Card
                  </span>
                </button>
              </div>
            </div>

            <div className="w-full p-3 rounded-lg bg-surface tactile-deboss flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
                  Active Coupons
                </span>
                <span className="text-xs text-tertiary font-bold tabular-nums">
                  {coupons.filter((c) => c.active).length} Ready
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">Earn Velocity</span>
                <span className="text-on-surface font-semibold font-mono tabular-nums">
                  {earnVelocity} pts / $1
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* FOOTER NAVIGATION */}
      <footer className="w-full bg-surface-container-low rounded-xl tactile-convex p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface tactile-deboss">
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
              Neon Postgres Sync
            </span>
            <span className="text-xs text-on-surface font-mono font-semibold">{storeName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
            className="px-5 py-2.5 rounded-full bg-surface-container-lowest text-on-surface text-xs font-semibold tactile-convex-sm active:translate-y-0.5 transition-transform flex items-center gap-2 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleProceed}
            className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary text-xs font-bold tactile-convex-sm tactile-active-glow hover:bg-secondary-container active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <span>
              {activeStep === 4
                ? 'Complete & Return to Dashboard'
                : `Save & Proceed to Step ${activeStep + 1}`}
            </span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
