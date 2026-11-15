import React, { useState, useEffect } from 'react';
import { authFetch, getAuthToken } from '../utils/auth';
import { sounds } from '../utils/sound';

interface AnalyticsViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
}

interface AnalyticsData {
  tenant: { id: string; slug: string; name: string };
  summary: {
    memberCount: number;
    totalPoints: number;
    totalEarned: number;
    totalRedeemed: number;
    activeCoupons: number;
    totalCoupons: number;
    activeCampaigns: number;
  };
  tierBreakdown: Array<{ name: string; count: number }>;
  recentTransactions: Array<{
    id: string;
    member_id: string;
    change_amount: number;
    reason: string;
    created_at: string;
    member_name: string;
    card_uid: string;
  }>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  activeSlug = '',
  userRole = 'merchant',
}) => {
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAnalytics = async () => {
    if (!getAuthToken()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    const url =
      isSuperAdmin && activeSlug
        ? `/api/analytics?slug=${encodeURIComponent(activeSlug)}`
        : '/api/analytics';
    try {
      const res = await authFetch(url);
      const body = await res.json().catch(() => null);
      if (res.ok && body?.summary) {
        setData(body);
      } else {
        setErrorMsg(body?.error || 'Unable to load store analytics');
      }
    } catch {
      setErrorMsg('Network error loading analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [activeSlug, isSuperAdmin]);

  const handleExportLedgerCsv = () => {
    if (!data) return;
    sounds.click();
    const header = 'Transaction ID,Member,Card UID,Points Delta,Reason,Timestamp\n';
    const rows = data.recentTransactions
      .map((tx) =>
        [
          tx.id,
          tx.member_name || 'Member',
          tx.card_uid || '',
          tx.change_amount,
          tx.reason || '',
          tx.created_at || '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.tenant.slug || 'store'}-analytics-ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin">refresh</span>
        <span className="font-label-md text-label-md font-semibold">Aggregating live loyalty metrics...</span>
      </div>
    );
  }

  const storeLabel = data?.tenant?.name || activeSlug || 'Store';
  const summary = data?.summary || {
    memberCount: 0,
    totalPoints: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    activeCoupons: 0,
    totalCoupons: 0,
    activeCampaigns: 0,
  };
  const tierBreakdown = data?.tierBreakdown || [];
  const totalInTiers = Math.max(1, tierBreakdown.reduce((s, t) => s + Number(t.count || 0), 0));
  const recentTx = data?.recentTransactions || [];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface-container-low tactile-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-surface-container flex items-center justify-center text-primary-container tactile-btn">
            <span className="material-symbols-outlined text-[24px]">analytics</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
                Analytics &amp; Telemetry Ledger
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">
                Filtered strictly for {storeLabel}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Real-time accrual, redemption velocity, and member tier distribution from Neon Postgres
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              sounds.click();
              loadAnalytics();
            }}
            className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-md text-label-md font-semibold tactile-btn hover:text-primary flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            disabled={recentTx.length === 0}
            onClick={handleExportLedgerCsv}
            className="px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold tactile-glow hover:brightness-105 disabled:opacity-40 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Ledger CSV</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-700">
          {errorMsg}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
            Enrolled Members
          </span>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-2 tabular-nums">
            {summary.memberCount.toLocaleString()}
          </div>
          <span className="text-xs text-primary font-semibold">Active store passes</span>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low tactile-card">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
            Points Liability
          </span>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-2 tabular-nums">
            {summary.totalPoints.toLocaleString()}
          </div>
          <span className="text-xs text-on-surface-variant tabular-nums">
            Reserve ~${(summary.totalPoints * 0.01).toFixed(2)}
          </span>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low tactile-card">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
            Points Issued
          </span>
          <div className="font-headline-lg text-headline-lg font-bold text-emerald-600 mt-2 tabular-nums">
            +{summary.totalEarned.toLocaleString()}
          </div>
          <span className="text-xs text-on-surface-variant">Recent 40 events</span>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low tactile-card">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
            Points Redeemed
          </span>
          <div className="font-headline-lg text-headline-lg font-bold text-primary-container mt-2 tabular-nums">
            {summary.totalRedeemed.toLocaleString()}
          </div>
          <span className="text-xs text-on-surface-variant">
            {summary.activeCoupons} / {summary.totalCoupons} coupons active
          </span>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low tactile-card">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-bold">
            Geo-Push Active
          </span>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface mt-2 tabular-nums">
            {summary.activeCampaigns}
          </div>
          <span className="text-xs text-on-surface-variant">Proximity triggers live</span>
        </div>
      </div>

      {/* Tier Distribution & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-surface-container-low rounded-2xl p-6 tactile-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Tier Cohort Breakdown
            </h2>
            <span className="text-xs font-mono text-outline tabular-nums">
              {summary.memberCount} total
            </span>
          </div>

          {tierBreakdown.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-6 text-center">
              No tier rules loaded.
            </p>
          ) : (
            <div className="space-y-3.5">
              {tierBreakdown.map((tier) => {
                const pct = summary.memberCount > 0 ? Math.round((tier.count / totalInTiers) * 100) : 0;
                return (
                  <div key={tier.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-on-surface uppercase tracking-wider">{tier.name}</span>
                      <span className="font-mono text-primary tabular-nums">
                        {tier.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-surface-container tactile-deboss overflow-hidden">
                      <div
                        className="h-full bg-primary-container rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 bg-surface-container-low rounded-2xl p-6 tactile-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Recent Point Ledger Events
            </h2>
            <span className="text-xs font-mono text-outline">Live POS &amp; Enrollment Feed</span>
          </div>

          {recentTx.length === 0 ? (
            <div className="p-12 rounded-xl bg-surface-container/40 border border-dashed border-outline-variant/40 text-center text-sm text-on-surface-variant">
              No point transactions recorded for {storeLabel} yet. Enroll a member or complete a POS checkout to see events here.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container-highest/60">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-container/50 border-b border-surface-container-highest text-outline font-label-sm text-label-sm uppercase tracking-wider">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Pass ID</th>
                    <th className="py-3 px-4">Event / Reason</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Points Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-highest/60 bg-surface-container-lowest">
                  {recentTx.map((tx) => {
                    const amt = Number(tx.change_amount || 0);
                    return (
                      <tr key={tx.id} className="hover:bg-surface-container/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-on-surface">
                          {tx.member_name || 'Member'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-outline">
                          {tx.card_uid || tx.member_id}
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">
                          {tx.reason || 'Points update'}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-outline">
                          {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                            amt >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {amt >= 0 ? `+${amt.toLocaleString()}` : amt.toLocaleString()} PTS
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
