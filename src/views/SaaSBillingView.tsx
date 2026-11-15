import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/sound';
import { authFetch, getAuthToken } from '../utils/auth';

interface SaaSBillingViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
}

export const SaaSBillingView: React.FC<SaaSBillingViewProps> = ({
  activeSlug = '',
  userRole = 'merchant',
}) => {
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth' | 'scale'>('growth');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [notice, setNotice] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>(activeSlug || 'Store Console');
  const [passUsage, setPassUsage] = useState<{ current: number; limit: number; percentage: number }>({
    current: 0,
    limit: 5000,
    percentage: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setStoreName(activeSlug || 'Store Console');
    setPassUsage({ current: 0, limit: 5000, percentage: 0 });

    if (!activeSlug || !getAuthToken()) return;

    authFetch(`/api/tenants/${encodeURIComponent(activeSlug)}/billing`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.storeName) setStoreName(data.storeName);
        if (data.plan === 'starter' || data.plan === 'growth' || data.plan === 'scale') {
          setSelectedPlan(data.plan);
        }
        if (data.passUsage) {
          setPassUsage({
            current: Number(data.passUsage.current || 0),
            limit: Number(data.passUsage.limit || 5000),
            percentage: Number(data.passUsage.percentage || 0),
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  const plans = [
    {
      id: 'starter',
      name: 'Starter Retailer',
      priceMonthly: 49,
      priceAnnual: 39,
      passLimit: '500 Passes',
      features: [
        'Master Issuer Provisioning',
        '1 Location / Store',
        'Google Wallet "Add to Wallet" Button',
        'Standard QR Barcode Scans',
        'Email Support',
      ],
      badge: 'Single Location',
    },
    {
      id: 'growth',
      name: 'Growth Chain (Popular)',
      priceMonthly: 149,
      priceAnnual: 119,
      passLimit: '5,000 Passes',
      features: [
        'Automated LoyaltyClass Creation',
        'Up to 5 Locations',
        'Google Smart Tap v3.2 NFC Encrypted',
        'Real-time POS Webhook Sync (PATCH)',
        'Lock-screen Proximity Beacons',
        'Priority 24/7 Support',
      ],
      badge: 'Most Popular',
      highlight: true,
    },
    {
      id: 'scale',
      name: 'Enterprise Franchise',
      priceMonthly: 399,
      priceAnnual: 319,
      passLimit: '50,000 Passes',
      features: [
        'Dedicated Master Issuer Sub-account',
        'Unlimited Store Locations',
        'Custom Domain for Customer Enrollment',
        'Dedicated Account Manager',
        'Custom POS Integration Engineering',
        'SLA 99.99% Uptime Guarantee',
      ],
      badge: 'Unrestricted',
    },
  ];

  const handleSelectPlan = async (planId: 'starter' | 'growth' | 'scale') => {
    sounds.chime();
    if (!isSuperAdmin) {
      if (activeSlug && getAuthToken()) {
        try {
          const res = await authFetch(`/api/tenants/${encodeURIComponent(activeSlug)}/upgrade-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: planId, billingCycle }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setNotice(data.message || `Upgrade request for ${planId.toUpperCase()} (${billingCycle}) sent to Super Admin.`);
            setTimeout(() => setNotice(null), 3500);
            return;
          }
        } catch {}
      }
      setNotice(`Upgrade request for ${planId.toUpperCase()} noted — contact Super Admin to activate.`);
      setTimeout(() => setNotice(null), 3500);
      return;
    }

    if (activeSlug && getAuthToken()) {
      try {
        const res = await authFetch(`/api/tenants/${encodeURIComponent(activeSlug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setSelectedPlan(planId);
          const nextLimit = Number(data?.tenant?.passLimit || (planId === 'scale' ? 50000 : planId === 'starter' ? 500 : 5000));
          setPassUsage((prev) => ({
            ...prev,
            limit: nextLimit,
            percentage: nextLimit > 0 ? Math.min(100, Math.round((prev.current / nextLimit) * 1000) / 10) : 0,
          }));
          setNotice(`Updated ${storeName} to ${planId.toUpperCase()} Plan in Neon DB.`);
          setTimeout(() => setNotice(null), 3000);
          return;
        }
      } catch {}
    }

    setSelectedPlan(planId);
    setNotice(`Plan updated to ${planId.toUpperCase()}.`);
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="flex flex-col w-full gap-6 select-none max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-xl bg-surface-container-low tactile-card">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-3 h-3 rounded-full bg-primary-container tactile-glow animate-pulse"></span>
            <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold">
              Master Issuer SaaS Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">
              Filtered strictly for {storeName}
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight mt-1">
            Subscription Plans &amp; Tenant Limits
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Store: {storeName} • Issuer ID: 3388000000022258509
          </p>
        </div>

        {/* Current Usage Meter */}
        <div className="p-4 rounded-xl bg-surface-container tactile-deboss flex items-center gap-6">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Tenant Pass Meter
            </span>
            <span className="font-headline-md text-headline-md font-bold text-on-surface">
              {passUsage.current.toLocaleString()}{' '}
              <span className="text-body-sm font-normal text-on-surface-variant">
                / {passUsage.limit.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="w-32 flex flex-col gap-1.5">
            <div className="flex justify-between font-label-sm text-label-sm font-bold text-primary">
              <span>{passUsage.percentage}% Used</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full tactile-glow transition-all"
                style={{ width: `${Math.min(100, passUsage.percentage)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Monthly / Annual */}
      <div className="flex items-center justify-center gap-3 my-2">
        <span className={`font-label-md text-label-md font-semibold ${billingCycle === 'monthly' ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          Monthly Billing
        </span>
        <button
          onClick={() => {
            sounds.click();
            setBillingCycle((prev) => (prev === 'monthly' ? 'annual' : 'monthly'));
          }}
          className={`w-14 h-8 rounded-full tactile-glow flex items-center p-1 cursor-pointer transition-colors ${
            billingCycle === 'annual' ? 'bg-primary-container justify-end' : 'bg-surface-container-high justify-start'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-surface-container-lowest tactile-card shadow-sm"></div>
        </button>
        <span className={`font-label-md text-label-md font-semibold ${billingCycle === 'annual' ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          Annual Billing <span className="text-primary font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-label-sm">(Save 20%)</span>
        </span>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = selectedPlan === plan.id;
          const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

          return (
            <div
              key={plan.id}
              className={`p-6 rounded-2xl flex flex-col justify-between transition-all ${
                plan.highlight
                  ? 'bg-surface-container-low ring-2 ring-primary-container tactile-card shadow-2xl relative'
                  : 'bg-surface-container-low tactile-card hover:-translate-y-1'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-full bg-surface-container font-label-sm text-label-sm font-bold text-primary">
                    {plan.badge}
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    {plan.passLimit}
                  </span>
                </div>

                <h3 className="font-headline-md text-headline-md font-bold text-on-surface mt-2">
                  {plan.name}
                </h3>

                <div className="flex items-baseline gap-1 my-4">
                  <span className="font-display-xl text-display-xl font-bold text-on-surface">
                    ${price}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">/ month</span>
                </div>

                <div className="w-full h-px bg-surface-container-highest my-4"></div>

                <ul className="space-y-3 font-body-sm text-body-sm text-on-surface mb-6">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-primary-container">
                        check_circle
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id as 'starter' | 'growth' | 'scale')}
                className={`w-full py-3.5 rounded-full font-label-md text-label-md font-bold transition-all ${
                  isCurrent
                    ? 'bg-primary-container text-on-primary tactile-glow hover:brightness-105'
                    : 'bg-surface-container text-on-surface tactile-btn hover:text-primary'
                }`}
              >
                {isCurrent ? 'Current Plan Active' : 'Upgrade Plan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Notice Toast */}
      {notice && (
        <div className="fixed bottom-8 right-8 z-50 bg-surface-container-lowest text-on-surface rounded-full px-6 py-4 tactile-card flex items-center gap-3 ring-1 ring-primary-container/20">
          <span className="material-symbols-outlined text-primary-container">verified</span>
          <span className="font-label-md text-label-md font-bold">{notice}</span>
        </div>
      )}
    </div>
  );
};
