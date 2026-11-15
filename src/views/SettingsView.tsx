import React, { useState, useEffect } from 'react';
import { authFetch, getAuthToken } from '../utils/auth';
import { sounds } from '../utils/sound';

interface SettingsViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeSlug = '',
  userRole = 'merchant',
}) => {
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const [storeName, setStoreName] = useState<string>(activeSlug || 'Store Console');
  const [resolvedSlug, setResolvedSlug] = useState<string>(activeSlug);
  const [brandColor, setBrandColor] = useState<string>('#ff5722');
  const [barcodeMode, setBarcodeMode] = useState<'barcode' | 'qr'>('barcode');
  const [welcomeActive, setWelcomeActive] = useState<boolean>(true);
  const [welcomeGrant, setWelcomeGrant] = useState<number>(100);
  const [apiKey, setApiKey] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3200);
  };

  useEffect(() => {
    let cancelled = false;
    if (!getAuthToken()) {
      setIsLoading(false);
      return;
    }
    if (isSuperAdmin && !activeSlug) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const cfgUrl =
      isSuperAdmin && activeSlug
        ? `/api/program-config?slug=${encodeURIComponent(activeSlug)}`
        : '/api/program-config';
    const tenantUrl = activeSlug ? `/api/tenants/${encodeURIComponent(activeSlug)}` : '';

    Promise.all([
      authFetch(cfgUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      tenantUrl ? authFetch(tenantUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null),
    ])
      .then(([cfgData, tData]) => {
        if (cancelled) return;
        const t = tData || cfgData?.tenant;
        if (t) {
          if (t.name) setStoreName(t.name);
          if (t.slug) setResolvedSlug(t.slug);
          if (t.brandColor) setBrandColor(t.brandColor);
          if (t.apiKey) setApiKey(t.apiKey);
          if (t.classId) setClassId(t.classId);
        }
        if (cfgData?.config) {
          setBarcodeMode(cfgData.config.barcodeMode === 'qr' ? 'qr' : 'barcode');
          setWelcomeActive(Boolean(cfgData.config.welcomeActive));
          setWelcomeGrant(Number(cfgData.config.welcomeGrant ?? 100));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSlug, isSuperAdmin]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.chime();
    setIsSaving(true);
    try {
      const res = await authFetch('/api/program-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: resolvedSlug || activeSlug || undefined,
          storeName: storeName.trim(),
          brandColor,
          barcodeMode,
          welcomeActive,
          welcomeGrant: Math.max(0, Number(welcomeGrant) || 0),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showNotice('Store operational settings saved to Neon Postgres.');
      } else {
        showNotice(data.error || 'Failed to save settings.');
      }
    } catch {
      showNotice('Network error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateKey = async () => {
    const slugTarget = resolvedSlug || activeSlug;
    if (!slugTarget) return;
    sounds.click(1200, 0.03);
    setIsRegenerating(true);
    try {
      const res = await authFetch(`/api/tenants/${encodeURIComponent(slugTarget)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateKey: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.tenant?.apiKey) {
        setApiKey(data.tenant.apiKey);
        showNotice('New secret POS API key generated and persisted.');
      } else {
        showNotice(data?.error || 'Failed to regenerate API key.');
      }
    } catch {
      showNotice('Network error regenerating API key.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const enrollmentUrl =
    typeof window !== 'undefined' && (resolvedSlug || activeSlug)
      ? `${window.location.origin}/?view=enroll&store=${encodeURIComponent(resolvedSlug || activeSlug)}`
      : '';

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined text-[36px] text-primary animate-spin">refresh</span>
        <span className="font-label-md text-label-md font-semibold">Loading store operational settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-surface-container-low tactile-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-surface-container flex items-center justify-center text-primary-container tactile-btn">
            <span className="material-symbols-outlined text-[24px]">settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
                Store Terminal &amp; Program Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">
                Filtered strictly for {storeName}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Configure barcode transmission, welcome grants, enrollment link, and POS API credentials
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Store & Program Operations */}
        <div className="lg:col-span-7 bg-surface-container-low rounded-2xl p-6 tactile-card space-y-5">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Operational Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Store Display Name
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="h-11 px-3.5 rounded-xl bg-surface tactile-deboss text-sm text-on-surface font-medium focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Brand Accent Color
              </label>
              <div className="h-11 px-3 rounded-xl bg-surface tactile-deboss flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-xs uppercase font-bold text-on-surface">{brandColor}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Default Wallet Barcode Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setBarcodeMode('barcode');
                }}
                className={`p-3.5 rounded-xl flex items-center gap-3 text-left transition-all ${
                  barcodeMode === 'barcode'
                    ? 'bg-primary-container/15 ring-1 ring-primary-container text-on-surface'
                    : 'bg-surface tactile-deboss text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[22px] text-primary">barcode</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Code 128 Linear</div>
                  <div className="text-[11px] text-outline">Laser POS scanners</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setBarcodeMode('qr');
                }}
                className={`p-3.5 rounded-xl flex items-center gap-3 text-left transition-all ${
                  barcodeMode === 'qr'
                    ? 'bg-primary-container/15 ring-1 ring-primary-container text-on-surface'
                    : 'bg-surface tactile-deboss text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[22px] text-primary">qr_code_2</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">2D QR Code</div>
                  <div className="text-[11px] text-outline">Optical camera lookup</div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container tactile-deboss flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-on-surface">Welcome Bonus on Join</div>
              <div className="text-xs text-on-surface-variant">
                Award initial points automatically when customers enroll
              </div>
            </div>
            <div className="flex items-center gap-3">
              {welcomeActive && (
                <input
                  type="number"
                  min={0}
                  max={50000}
                  value={welcomeGrant}
                  onChange={(e) => setWelcomeGrant(Number(e.target.value))}
                  className="w-24 h-9 px-3 rounded-lg bg-surface text-xs font-mono font-bold text-on-surface text-center focus:outline-none"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setWelcomeActive((prev) => !prev);
                }}
                className={`w-12 h-6 rounded-full p-0.5 flex items-center transition-colors ${
                  welcomeActive ? 'bg-primary-container justify-end' : 'bg-surface-container-highest justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white shadow"></span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold tactile-glow hover:brightness-105 disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>{isSaving ? 'Saving Settings...' : 'Save Operational Settings'}</span>
            </button>
          </div>
        </div>

        {/* Enrollment Link & POS API Credentials */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-2xl p-6 tactile-card space-y-3">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Customer Self-Enrollment Link
            </h2>
            <p className="text-xs text-on-surface-variant">
              Share this direct store URL or generate a counter QR code so customers can join without logging into the merchant portal.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={enrollmentUrl || 'Select a store context to view link'}
                className="flex-1 h-10 px-3 rounded-xl bg-surface tactile-deboss font-mono text-xs text-on-surface select-all"
              />
              <button
                type="button"
                disabled={!enrollmentUrl}
                onClick={() => {
                  if (!enrollmentUrl) return;
                  navigator.clipboard.writeText(enrollmentUrl);
                  sounds.click();
                  showNotice('Customer enrollment URL copied to clipboard.');
                }}
                className="h-10 px-4 rounded-xl bg-primary-container text-on-primary font-bold text-xs tactile-glow disabled:opacity-40"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 tactile-card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  POS API Key
                </h2>
                <p className="text-xs text-on-surface-variant font-mono truncate max-w-[240px]">
                  Class: {classId || 'Auto-provisioned'}
                </p>
              </div>
              <button
                type="button"
                disabled={isRegenerating || !(resolvedSlug || activeSlug)}
                onClick={handleRegenerateKey}
                className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-xs font-bold tactile-btn hover:text-primary disabled:opacity-40 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                <span>{isRegenerating ? 'Rotating...' : 'Regenerate'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={apiKey || `pk_live_${resolvedSlug || activeSlug || 'store'}`}
                className="flex-1 h-10 px-3 rounded-xl bg-surface tactile-deboss font-mono text-xs text-on-surface select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(apiKey || `pk_live_${resolvedSlug || activeSlug || 'store'}`);
                  sounds.click();
                  showNotice('API key copied to clipboard.');
                }}
                className="h-10 px-4 rounded-xl bg-surface-container text-on-surface font-bold text-xs tactile-btn hover:text-primary"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </form>

      {notice && (
        <div className="fixed bottom-8 right-8 z-50 bg-surface-container-lowest text-on-surface rounded-full px-6 py-4 tactile-card flex items-center gap-3 ring-1 ring-primary-container/20">
          <span className="material-symbols-outlined text-primary-container">verified</span>
          <span className="font-label-md text-label-md font-bold">{notice}</span>
        </div>
      )}
    </div>
  );
};
