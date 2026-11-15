import React, { useState, useEffect } from 'react';
import { LoyaltyPerk, OrderItem } from '../types';
import { sounds } from '../utils/sound';
import { authFetch, getAuthToken } from '../utils/auth';

interface CashierMember {
  id: string;
  uid: string;
  name: string;
  tier: string;
  points: number;
}

interface CashierTier {
  id: string;
  name: string;
  minPoints: number;
  multiplier: number;
}

interface CashierViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
  selectedMemberId?: string;
  openScannerModal: () => void;
}

const DEFAULT_TIERS: CashierTier[] = [
  { id: 'silver', name: 'SILVER', minPoints: 0, multiplier: 1.0 },
  { id: 'gold', name: 'GOLD VIP', minPoints: 1000, multiplier: 1.25 },
  { id: 'platinum', name: 'PLATINUM', minPoints: 2000, multiplier: 1.5 },
];

function resolveTier(pts: number, tiers: CashierTier[]): CashierTier {
  const sorted = [...tiers].sort((a, b) => Number(a.minPoints) - Number(b.minPoints));
  let matched = sorted[0] || DEFAULT_TIERS[0];
  for (const t of sorted) {
    if (pts >= Number(t.minPoints)) matched = t;
  }
  return matched;
}

export const CashierView: React.FC<CashierViewProps> = ({
  activeSlug = '',
  userRole = 'merchant',
  selectedMemberId,
  openScannerModal,
}) => {
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const [currentTotal, setCurrentTotal] = useState<number>(55.0);
  const [inputBuffer, setInputBuffer] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [isErrorToast, setIsErrorToast] = useState<boolean>(false);
  const [toastSummary, setToastSummary] = useState<string>('Order synced to ledger');
  const [tenderMethod, setTenderMethod] = useState<'nfc' | 'emv' | 'cash'>('nfc');
  const [storeName, setStoreName] = useState<string>(activeSlug || 'Store Terminal');
  const [members, setMembers] = useState<CashierMember[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [tiers, setTiers] = useState<CashierTier[]>(DEFAULT_TIERS);
  const [minFloor, setMinFloor] = useState<number>(500);
  const [earnVelocity, setEarnVelocity] = useState<number>(10);
  const [perks, setPerks] = useState<LoyaltyPerk[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      id: '1',
      name: 'Standard Order Item',
      subtitle: 'Counter Checkout',
      qty: 1,
      price: 35.0,
    },
    {
      id: '2',
      name: 'Featured Add-On',
      subtitle: 'Storefront Item',
      qty: 1,
      price: 20.0,
    },
  ]);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setMembers([]);
    setSelectedIdx(0);
    setStoreName(activeSlug || 'Store Terminal');

    if (!getAuthToken()) return;

    const membersUrl =
      isSuperAdmin && activeSlug
        ? `/api/members?slug=${encodeURIComponent(activeSlug)}`
        : '/api/members';

    const cfgUrl =
      isSuperAdmin && activeSlug
        ? `/api/program-config?slug=${encodeURIComponent(activeSlug)}`
        : '/api/program-config';

    Promise.all([
      authFetch(cfgUrl).then((res) => (res.ok ? res.json() : null)).catch(() => null),
      authFetch(membersUrl).then((res) => (res.ok ? res.json() : [])).catch(() => []),
    ]).then(([cfgData, membersData]) => {
      if (cancelled) return;
      let loadedTiers = DEFAULT_TIERS;
      if (cfgData) {
        if (cfgData.config?.earnVelocity) {
          setEarnVelocity(Number(cfgData.config.earnVelocity));
        }
        if (cfgData.config?.minFloor !== undefined) {
          setMinFloor(Number(cfgData.config.minFloor));
        }
        if (Array.isArray(cfgData.config?.tiers) && cfgData.config.tiers.length > 0) {
          loadedTiers = cfgData.config.tiers;
          setTiers(loadedTiers);
        }
        if (Array.isArray(cfgData.coupons)) {
          const activeCoupons: LoyaltyPerk[] = cfgData.coupons
            .filter((c: any) => c.active !== false)
            .map((c: any) => ({
              id: c.id,
              title: c.title,
              pointsCost: Number(c.pointsCost || 0),
              discountAmount: Number(c.discountAmount || 0),
              icon: c.icon || 'redeem',
              category: c.code || 'coupon',
              active: false,
            }));
          setPerks(activeCoupons);
        }
      }

      if (Array.isArray(membersData)) {
        const mapped: CashierMember[] = membersData.map((m: any) => {
          const pts = Number(m.points || 0);
          return {
            id: m.id,
            uid: `#${m.member_id || m.id}`,
            name: m.customer_name || m.name || 'Member',
            tier: resolveTier(pts, loadedTiers).name,
            points: pts,
          };
        });
        setMembers(mapped);
        if (selectedMemberId) {
          const idx = mapped.findIndex((m) => m.id === selectedMemberId || m.uid === `#${selectedMemberId}`);
          if (idx >= 0) setSelectedIdx(idx);
        }
        if (membersData[0]?.store_name) setStoreName(membersData[0].store_name);
      }
    });

    if (activeSlug) {
      authFetch(`/api/tenants/${encodeURIComponent(activeSlug)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((t) => {
          if (!cancelled && t?.name) setStoreName(t.name);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [activeSlug, userRole, isSuperAdmin]);

  useEffect(() => {
    if (!selectedMemberId || members.length === 0) return;
    const idx = members.findIndex((m) => m.id === selectedMemberId || m.uid === `#${selectedMemberId}`);
    if (idx >= 0) {
      setSelectedIdx(idx);
      setPerks((prev) => prev.map((p) => ({ ...p, active: false })));
    }
  }, [selectedMemberId, members]);

  const activeMember = members.length > 0 ? members[selectedIdx % members.length] : null;
  const activeTierObj = activeMember ? resolveTier(activeMember.points, tiers) : tiers[0] || DEFAULT_TIERS[0];

  const grossTotal = orderItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalDiscount = perks.filter((p) => p.active).reduce((acc, p) => acc + p.discountAmount, 0);
  const netDue = Math.max(0, grossTotal - totalDiscount);

  useEffect(() => {
    setCurrentTotal(netDue);
    setInputBuffer('');
  }, [netDue]);

  const handleUpdateQty = (id: string, delta: number) => {
    sounds.click(900, 0.015);
    setOrderItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const handleAddOrderItem = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(newItemPrice);
    if (!newItemName.trim() || isNaN(parsedPrice) || parsedPrice <= 0) return;
    sounds.click(1050, 0.02);
    setOrderItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: newItemName.trim(),
        subtitle: 'Custom POS Item',
        qty: 1,
        price: parsedPrice,
      },
    ]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const togglePerk = (id: string) => {
    if (!activeMember) return;
    const target = perks.find((p) => p.id === id);
    if (!target) return;
    const activeCostWithoutTarget = perks
      .filter((p) => p.active && p.id !== id)
      .reduce((acc, p) => acc + p.pointsCost, 0);
    if (!target.active) {
      if (activeMember.points < minFloor) {
        setIsErrorToast(true);
        setToastSummary(`Minimum redemption floor is ${minFloor} PTS (member has ${activeMember.points} PTS)`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3200);
        return;
      }
      if (activeMember.points < activeCostWithoutTarget + target.pointsCost) {
        setIsErrorToast(true);
        setToastSummary(`Insufficient balance: needs ${activeCostWithoutTarget + target.pointsCost} PTS`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3200);
        return;
      }
    }
    sounds.click(850, 0.02);
    setPerks((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handleSetTender = (amount: number) => {
    sounds.click(1100, 0.02);
    setCurrentTotal(amount);
    setInputBuffer('');
  };

  const handleAdjustAmount = (delta: number) => {
    sounds.click(950, 0.02);
    setCurrentTotal((prev) => Math.max(0, prev + delta));
    setInputBuffer('');
  };

  const handlePressKey = (key: string) => {
    sounds.keyPress();
    if (key === 'C') {
      setCurrentTotal(0);
      setInputBuffer('');
    } else if (key === 'DEL') {
      const nextBuf = inputBuffer.slice(0, -1);
      setInputBuffer(nextBuf);
      setCurrentTotal(nextBuf ? parseFloat(nextBuf) : 0);
    } else if (key === '+10') {
      setCurrentTotal((prev) => prev + 10);
      setInputBuffer('');
    } else if (key === '+20') {
      setCurrentTotal((prev) => prev + 20);
      setInputBuffer('');
    } else {
      if (inputBuffer.length < 7) {
        const nextBuf = inputBuffer + key;
        setInputBuffer(nextBuf);
        const parsed = parseFloat(nextBuf);
        if (!isNaN(parsed)) {
          setCurrentTotal(parsed);
        }
      }
    }
  };

  const handleCheckout = async () => {
    sounds.chime();
    if (!activeMember) {
      setIsErrorToast(true);
      setToastSummary(`No enrolled member selected for ${storeName}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3800);
      return;
    }

    const earnedPts = currentTotal > 0 ? Math.max(1, Math.round(currentTotal * earnVelocity * (activeTierObj.multiplier || 1))) : 0;
    const redeemedCost = perks.filter((p) => p.active).reduce((acc, p) => acc + p.pointsCost, 0);
    const netDelta = earnedPts - redeemedCost;
    try {
      const res = await authFetch(`/api/members/${encodeURIComponent(activeMember.id)}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: netDelta,
          redeemingCoupon: redeemedCost > 0,
          redeemPoints: redeemedCost,
          reason:
            redeemedCost > 0
              ? `POS Checkout ($${currentTotal.toFixed(2)}, +${earnedPts} / -${redeemedCost} coupon pts)`
              : `POS Checkout ($${currentTotal.toFixed(2)} @ ${earnVelocity}x${activeTierObj.multiplier || 1})`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.newPoints === 'number') {
        const nextPts = data.newPoints;
        const nextTier = data.tier || resolveTier(nextPts, tiers).name;
        setMembers((prev) =>
          prev.map((m) => (m.id === activeMember.id ? { ...m, points: nextPts, tier: nextTier } : m))
        );
        setPerks((prev) => prev.map((p) => ({ ...p, active: false })));
        setIsErrorToast(false);
        setToastSummary(`Pass updated for ${activeMember.name} (${netDelta >= 0 ? `+${netDelta}` : netDelta} pts • Balance ${nextPts.toLocaleString()} pts)`);
      } else {
        setIsErrorToast(true);
        setToastSummary(data.error || `Failed to process checkout for ${activeMember.name}`);
      }
    } catch {
      setIsErrorToast(true);
      setToastSummary(`Network error reaching server for ${activeMember.name}`);
    }

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3800);
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto space-y-6 select-none">
      {/* Sub-header Breadcrumb & Operational Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary-container">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              point_of_sale
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {storeName} • Express Terminal
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                Filtered strictly for {storeName}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Tenant-isolated POS Register • {members.length} enrolled member(s)
            </p>
          </div>
        </div>

        {/* Live NFC & Sync Telemetry Pill */}
        <div className="flex items-center gap-4 bg-surface-container-low rounded-full px-5 py-2 tactile-card">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-container"></span>
            </span>
            <span className="font-label-md text-label-md text-on-surface uppercase tracking-wide">
              Google Smart Tap v3.2
            </span>
          </div>
          <div className="w-1 h-3 rounded-full bg-surface-variant"></div>
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md">
            <span className="material-symbols-outlined text-[16px] text-primary-container">
              contactless
            </span>
            <span>NFC Ready</span>
          </div>
          <div className="w-1 h-3 rounded-full bg-surface-variant"></div>
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md">
            <span className="material-symbols-outlined text-[16px] text-tertiary">
              lock_reset
            </span>
            <span>AES-256</span>
          </div>
        </div>

        <button
          onClick={() => {
            sounds.click();
            openScannerModal();
          }}
          className="tactile-btn flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest text-primary hover:text-primary-container font-label-md text-label-md font-bold transition-all ring-1 ring-primary-container/20 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px] text-primary-container">
            qr_code_scanner
          </span>
          <span>Scan Pass</span>
        </button>
      </div>

      {/* Main POS Sculpted Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT PANEL: Guest Credentials, Perks & Cart Bill (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Member Profile Tile */}
          <div className="bg-surface-container-low rounded-xl p-6 tactile-card relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* 3D Member Badge */}
                <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center tactile-btn relative">
                  <span
                    className="material-symbols-outlined text-primary-container text-[34px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    workspace_premium
                  </span>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[10px] font-bold shadow-sm">
                    ★
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                      {activeMember ? activeMember.name : 'No Enrolled Member'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm uppercase font-bold">
                      {activeMember ? activeMember.tier : 'IDLE'}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {activeMember
                      ? `UID: ${activeMember.uid} • ${storeName}`
                      : `No members enrolled for ${storeName} yet`}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-primary-container font-headline-sm text-headline-sm font-bold">
                      <span className="material-symbols-outlined text-[18px]">toll</span>
                      <span>{activeMember ? activeMember.points.toLocaleString() : '0'}</span>
                      <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                        pts
                      </span>
                    </div>
                    <span className="text-on-surface-variant/40">•</span>
                    <span className="font-label-md text-label-md text-on-surface-variant">
                      {activeMember ? 'Tier Reward Active' : '0 enrolled cards'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  sounds.click();
                  if (members.length > 1) {
                    setSelectedIdx((prev) => (prev + 1) % members.length);
                  }
                }}
                disabled={members.length <= 1}
                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface-variant hover:text-on-surface disabled:opacity-40"
                title="Switch Member Account"
              >
                <span className="material-symbols-outlined text-[18px]">switch_account</span>
              </button>
            </div>

            {/* 1-Tap Redemption Trays */}
            <div className="mt-6 pt-5 bg-surface-container-high/40 rounded-lg p-4 tactile-deboss">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider font-semibold">
                  Available Loyalty Perks
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  Min Floor: {minFloor} pts
                </span>
              </div>
              {perks.length === 0 ? (
                <div className="p-4 rounded-lg bg-surface-container text-center">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    No active coupons configured for {storeName} yet. Create coupons in Loyalty Program Rules.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {perks.map((perk) => {
                    const memberPts = activeMember?.points || 0;
                    const disabled = !perk.active && (!activeMember || memberPts < minFloor || memberPts < perk.pointsCost);
                    return (
                      <button
                        key={perk.id}
                        type="button"
                        onClick={() => togglePerk(perk.id)}
                        disabled={disabled}
                        title={disabled ? `Requires ${Math.max(minFloor, perk.pointsCost)} PTS` : `Apply -$${perk.discountAmount}`}
                        className={`flex items-center gap-3 p-3 rounded-2xl text-left group transition-all ${
                          perk.active
                            ? 'bg-surface-container tactile-deboss border border-primary-container/40'
                            : disabled
                            ? 'bg-surface-container opacity-45 cursor-not-allowed'
                            : 'bg-surface-container tactile-btn opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                            perk.active
                              ? 'bg-primary-container text-on-primary tactile-glow'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {perk.icon}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-label-md text-label-md text-on-surface font-bold truncate">
                            {perk.title}
                          </p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant tabular-nums">
                            {perk.pointsCost} pts • -${perk.discountAmount}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Order Items Recessed Well */}
          <div className="bg-surface-container-low rounded-xl p-6 tactile-card flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">
                    receipt_long
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Order Breakdown
                  </span>
                </div>
                <span className="font-label-md text-label-md text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-full tabular-nums">
                  {orderItems.reduce((s, i) => s + i.qty, 0)} Items
                </span>
              </div>
              <div className="space-y-2.5 font-body-md text-body-md">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-container/60 hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center gap-1 bg-surface-container-high rounded-full px-1.5 py-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-5 h-5 rounded-full hover:bg-surface text-on-surface-variant font-bold text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-label-md text-xs font-bold tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-5 h-5 rounded-full hover:bg-surface text-on-surface-variant font-bold text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <div className="min-w-0">
                        <p className="text-on-surface font-medium truncate">{item.name}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          ${item.price.toFixed(2)} ea
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-on-surface tabular-nums shrink-0">
                      ${(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add Line Item Form */}
              <form onSubmit={handleAddOrderItem} className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Add item name..."
                  className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-surface tactile-deboss text-xs text-on-surface focus:outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="$ Price"
                  className="w-20 h-9 px-2.5 rounded-lg bg-surface tactile-deboss text-xs text-on-surface font-mono focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-9 px-3 rounded-lg bg-surface-container text-primary font-label-sm text-xs font-bold tactile-btn hover:brightness-95 shrink-0"
                >
                  + Add
                </button>
              </form>
            </div>

            {/* Price Ledger Footnotes */}
            <div className="mt-5 pt-4 border-t-0 bg-surface-container-high/30 rounded-lg p-4 tactile-deboss space-y-2">
              <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                <span>Gross Total</span>
                <span className="tabular-nums">${grossTotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between font-body-sm text-body-sm text-primary font-medium">
                  <span>Loyalty Perk Discount</span>
                  <span className="tabular-nums">-${totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                <span>Earn Rate ({activeTierObj.name})</span>
                <span className="tabular-nums">{earnVelocity} pts/$1 × {activeTierObj.multiplier}x</span>
              </div>
              <div className="flex justify-between font-headline-sm text-headline-sm text-on-surface font-bold pt-2">
                <span>Net Balance Due</span>
                <span className="text-primary-container tabular-nums">${netDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT & CENTER PANEL: Concentric 3D Dial & Debossed Keypad (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Focal Radial Dial Unit */}
          <div className="bg-surface-container-low rounded-xl p-8 tactile-card flex flex-col items-center justify-center relative">
            {/* Concentric Outer Halo Gauge */}
            <div className="relative w-80 h-80 flex items-center justify-center">
              {/* Recessed Circular Foundation Track */}
              <div className="absolute inset-0 rounded-full bg-surface-container tactile-deboss flex items-center justify-center"></div>

              {/* SVG Radiant Orange Arc */}
              <svg
                className="absolute inset-2 w-[304px] h-[304px] -rotate-90 pointer-events-none"
                viewBox="0 0 100 100"
              >
                <circle
                  className="text-surface-variant/70"
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                />
                <circle
                  className="text-primary-container"
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5.5"
                  strokeDasharray="264"
                  strokeDashoffset="66"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(255, 87, 34, 0.45))' }}
                />
              </svg>

              {/* Center Convex Extruded Wheel */}
              <div className="relative z-10 w-56 h-56 rounded-full bg-surface-container-lowest tactile-card flex flex-col items-center justify-center text-center p-4">
                <div className="w-1.5 h-3 bg-primary-container rounded-full mb-1 tactile-glow"></div>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest font-bold">
                  Guest Total Due
                </span>
                <div className="flex items-baseline justify-center text-primary-container my-1">
                  <span className="font-headline-lg text-headline-lg font-light">$</span>
                  <span className="font-display-xl text-display-xl font-bold tracking-tight text-on-surface">
                    {currentTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container tactile-deboss text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                  <span className="font-label-sm text-label-sm font-semibold tracking-wider uppercase">
                    Auto Balance
                  </span>
                </div>
              </div>

              {/* Orbital Preset Pills */}
              <button
                onClick={() => handleSetTender(15)}
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-surface-container tactile-btn font-label-md text-label-md font-bold text-on-surface hover:text-primary-container transition-all"
              >
                $15
              </button>
              <button
                onClick={() => handleSetTender(35)}
                className="absolute top-1/2 -left-4 -translate-y-1/2 px-4 py-1.5 rounded-full bg-surface-container tactile-btn font-label-md text-label-md font-bold text-on-surface hover:text-primary-container transition-all"
              >
                $35
              </button>
              <button
                onClick={() => handleSetTender(netDue)}
                className="absolute top-1/2 -right-4 -translate-y-1/2 px-4 py-1.5 rounded-full bg-primary-container text-on-primary tactile-glow font-label-md text-label-md font-bold transition-all"
              >
                ${netDue.toFixed(0)} (Exact)
              </button>
              <button
                onClick={() => handleSetTender(100)}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-surface-container tactile-btn font-label-md text-label-md font-bold text-on-surface hover:text-primary-container transition-all"
              >
                $100
              </button>
            </div>

            {/* Secondary Dial Adjustment Controls */}
            <div className="flex items-center gap-6 mt-6">
              <button
                onClick={() => handleAdjustAmount(-5)}
                className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <span className="font-label-md text-label-md text-on-surface-variant tracking-wider uppercase">
                Adjust Tender Value
              </span>
              <button
                onClick={() => handleAdjustAmount(5)}
                className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary-container hover:text-primary tactile-glow"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
          </div>

          {/* Sculpted Debossed Keypad Receptacle */}
          <div className="bg-surface-container-low rounded-xl p-6 tactile-card">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                Tactile Cash / Custom Input
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary-container"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Direct Ledger Feed
                </span>
              </div>
            </div>

            {/* Keypad Well */}
            <div className="bg-surface-container-high/50 p-4 rounded-xl tactile-deboss">
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => handlePressKey('1')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  1
                </button>
                <button
                  onClick={() => handlePressKey('2')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  2
                </button>
                <button
                  onClick={() => handlePressKey('3')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  3
                </button>
                <button
                  onClick={() => handlePressKey('+10')}
                  className="h-14 rounded-full bg-surface-container font-label-md text-label-md font-bold text-primary tactile-btn"
                >
                  +10
                </button>

                <button
                  onClick={() => handlePressKey('4')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  4
                </button>
                <button
                  onClick={() => handlePressKey('5')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  5
                </button>
                <button
                  onClick={() => handlePressKey('6')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  6
                </button>
                <button
                  onClick={() => handlePressKey('+20')}
                  className="h-14 rounded-full bg-surface-container font-label-md text-label-md font-bold text-primary tactile-btn"
                >
                  +20
                </button>

                <button
                  onClick={() => handlePressKey('7')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  7
                </button>
                <button
                  onClick={() => handlePressKey('8')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  8
                </button>
                <button
                  onClick={() => handlePressKey('9')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary transition-all"
                >
                  9
                </button>
                <button
                  onClick={() => handlePressKey('C')}
                  className="h-14 rounded-full bg-surface-container text-error font-label-md text-label-md font-bold tactile-btn"
                >
                  Clear
                </button>

                <button
                  onClick={() => handlePressKey('.')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-bold text-on-surface"
                >
                  .
                </button>
                <button
                  onClick={() => handlePressKey('0')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface"
                >
                  0
                </button>
                <button
                  onClick={() => handlePressKey('00')}
                  className="h-14 rounded-full bg-surface-container-lowest tactile-btn font-headline-sm text-headline-sm font-semibold text-on-surface"
                >
                  00
                </button>
                <button
                  onClick={() => handlePressKey('DEL')}
                  className="h-14 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md font-semibold tactile-btn flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">backspace</span>
                </button>
              </div>
            </div>

            {/* Tender Method Selectors */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-surface-container-high/60 p-1.5 rounded-full tactile-deboss">
                <button
                  onClick={() => {
                    sounds.click();
                    setTenderMethod('nfc');
                  }}
                  className={`px-4 py-1.5 rounded-full font-label-md text-label-md font-bold flex items-center gap-1.5 transition-all ${
                    tenderMethod === 'nfc'
                      ? 'bg-surface-container-lowest text-on-surface tactile-btn'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-primary-container">
                    contactless
                  </span>
                  <span>NFC Pass</span>
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setTenderMethod('emv');
                  }}
                  className={`px-4 py-1.5 rounded-full font-label-md text-label-md font-medium flex items-center gap-1.5 transition-all ${
                    tenderMethod === 'emv'
                      ? 'bg-surface-container-lowest text-on-surface tactile-btn font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">credit_card</span>
                  <span>EMV Chip</span>
                </button>
                <button
                  onClick={() => {
                    sounds.click();
                    setTenderMethod('cash');
                  }}
                  className={`px-4 py-1.5 rounded-full font-label-md text-label-md font-medium flex items-center gap-1.5 transition-all ${
                    tenderMethod === 'cash'
                      ? 'bg-surface-container-lowest text-on-surface tactile-btn font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">payments</span>
                  <span>Cash Drawer</span>
                </button>

                <button
                  onClick={() => {
                    sounds.click();
                    openScannerModal();
                  }}
                  className="px-4 py-1.5 rounded-full bg-primary-container/10 text-primary hover:bg-primary-container hover:text-on-primary font-label-md text-label-md font-bold flex items-center gap-1.5 transition-all tactile-btn"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                  <span>Optical Scan</span>
                </button>
              </div>

              <button
                onClick={() => sounds.click()}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface-variant hover:text-on-surface"
                title="Split Bill"
              >
                <span className="material-symbols-outlined text-[18px]">call_split</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Oversized Sculpted 3D Convex Action Capsule (Bottom) */}
      <div className="w-full pt-4">
        <button
          onClick={handleCheckout}
          className="w-full h-20 rounded-full bg-primary-container text-on-primary tactile-glow flex items-center justify-between px-8 transition-transform active:scale-[0.99] group shadow-[0_10px_25px_rgba(255,87,34,0.4)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-on-primary/20 backdrop-blur-sm flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[26px] animate-pulse">
                bolt
              </span>
            </div>
            <div className="text-left">
              <div className="font-headline-md text-headline-md font-bold tracking-tight text-on-primary">
                Complete Order &amp; Tap to Sync
              </div>
              <div className="font-body-sm text-body-sm text-on-primary/80">
                Issue Digital Receipt to Google Wallet • Transmit Proof to Host
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-label-sm text-label-sm uppercase tracking-wider text-on-primary/80">
                Amount Authorized
              </div>
              <div className="font-headline-lg text-headline-lg font-bold text-on-primary">
                ${currentTotal.toFixed(2)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-on-primary text-primary-container flex items-center justify-center shadow-md group-hover:translate-x-1 transition-transform">
              <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
            </div>
          </div>
        </button>
      </div>

      {/* Feedback Toast Overlay */}
      <div
        className={`fixed bottom-8 right-8 z-50 transform transition-all duration-300 pointer-events-none ${
          showToast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
        }`}
      >
        <div
          className={`bg-surface-container-lowest text-on-surface rounded-full px-6 py-4 tactile-card flex items-center gap-4 ring-1 ${
            isErrorToast ? 'ring-red-500/40' : 'ring-primary-container/20'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              isErrorToast ? 'bg-red-600' : 'bg-primary-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isErrorToast ? 'error' : 'verified'}
            </span>
          </div>
          <div>
            <p className="font-label-md text-label-md font-bold text-on-surface">
              {isErrorToast ? 'Checkout Blocked' : 'Payment & Loyalty Sync Successful'}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {toastSummary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
