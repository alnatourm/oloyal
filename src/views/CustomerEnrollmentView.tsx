import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/sound';
import { authFetch, getAuthToken } from '../utils/auth';

interface CustomerEnrollmentViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
}

export const CustomerEnrollmentView: React.FC<CustomerEnrollmentViewProps> = ({
  activeSlug = '',
}) => {
  const [customerName, setCustomerName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [jwtLink, setJwtLink] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [lookupSlugInput, setLookupSlugInput] = useState<string>('');
  const [isLookingUpStore, setIsLookingUpStore] = useState<boolean>(false);

  const [storeInfo, setStoreInfo] = useState<{
    slug: string;
    name: string;
    programName?: string;
    brandColor: string;
    logoUrl?: string;
    welcomeActive?: boolean;
    welcomeGrant?: number;
    tiers?: Array<{ name: string; minPoints: number }>;
  }>({
    slug: activeSlug,
    name: activeSlug || 'Store Loyalty Club',
    brandColor: '#ff5722',
    welcomeActive: true,
    welcomeGrant: 100,
  });

  const [enrolledMember, setEnrolledMember] = useState<{
    uid: string;
    points: number;
    tier: string;
  }>({
    uid: '#PL-NEW',
    points: 100,
    tier: 'SILVER',
  });

  const fetchStoreProfile = async (slugToLoad: string) => {
    if (!slugToLoad) return;
    setIsLookingUpStore(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/public/tenants/${encodeURIComponent(slugToLoad)}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.name) {
        setStoreInfo({
          slug: data.slug || slugToLoad,
          name: data.name,
          programName: data.programName,
          brandColor: data.brandColor || '#ff5722',
          logoUrl: data.logoUrl,
          welcomeActive: data.welcomeActive !== false,
          welcomeGrant: Number(data.welcomeGrant ?? 100),
          tiers: Array.isArray(data.tiers) ? data.tiers : undefined,
        });
        return;
      }
      if (getAuthToken()) {
        const authRes = await authFetch(`/api/tenants/${encodeURIComponent(slugToLoad)}`);
        const td = await authRes.json().catch(() => null);
        if (authRes.ok && td?.name) {
          setStoreInfo((prev) => ({
            ...prev,
            slug: td.slug || slugToLoad,
            name: td.name,
            brandColor: td.brandColor || '#ff5722',
            logoUrl: td.logoUrl,
          }));
          return;
        }
      }
      setErrorMessage(data?.error || `Store "${slugToLoad}" was not found or is not active yet.`);
    } catch {
      setErrorMessage('Unable to look up store profile right now.');
    } finally {
      setIsLookingUpStore(false);
    }
  };

  useEffect(() => {
    const querySlug =
      new URLSearchParams(window.location.search).get('store') ||
      new URLSearchParams(window.location.search).get('slug') ||
      '';
    const targetSlug = activeSlug || querySlug;
    setStoreInfo((prev) => ({
      ...prev,
      slug: targetSlug,
      name: targetSlug || 'Store Loyalty Club',
    }));

    if (targetSlug) {
      fetchStoreProfile(targetSlug);
    }
  }, [activeSlug]);

  const generatePass = async (name: string, userEmail: string, userPhone: string) => {
    setIsLoading(true);
    setErrorMessage('');
    const targetSlug = storeInfo.slug || activeSlug;
    const hasToken = Boolean(getAuthToken());

    if (!hasToken && !targetSlug) {
      const msg = 'No active store selected. Sign in or open a valid store join link (?store=your-slug).';
      setErrorMessage(msg);
      setIsLoading(false);
      throw new Error(msg);
    }

    try {
      const endpoint = hasToken
        ? '/api/members'
        : `/api/tenants/${encodeURIComponent(targetSlug)}/enroll`;

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: userEmail,
          phone: userPhone,
          tenantSlug: targetSlug,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.member) {
        throw new Error(data.error || 'Failed to save member enrollment in database.');
      }

      const pts = Number(data.member.points ?? data.pass?.points ?? 0);
      const tier = data.pass?.tier || (pts >= 4000 ? 'VIP Plat' : pts >= 1500 ? 'Gold (Mid)' : 'Silver');
      setEnrolledMember({
        uid: `#${data.member.member_id || data.member.id}`,
        points: pts,
        tier,
      });
      if (data.tenant?.name) {
        setStoreInfo((prev) => ({
          ...prev,
          slug: data.tenant.slug || targetSlug,
          name: data.tenant.name,
          brandColor: data.tenant.brandColor || '#ff5722',
          logoUrl: data.tenant.logoUrl || prev.logoUrl,
        }));
      }
      setJwtLink(typeof data.saveToWalletUrl === 'string' ? data.saveToWalletUrl : '');
      setIsSubmitted(true);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create the Wallet pass.';
      setErrorMessage(message);
      setIsSubmitted(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.chime();
    try {
      await generatePass(customerName, email, phone);
    } catch {
      // Error handled in generatePass
    }
  };

  const handleCopyLink = () => {
    sounds.click();
    const fallbackUrl = storeInfo.slug
      ? `${window.location.origin}/?view=enroll&store=${encodeURIComponent(storeInfo.slug)}`
      : window.location.href;
    navigator.clipboard?.writeText(jwtLink || fallbackUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const storeInitial = storeInfo.name.slice(0, 1).toUpperCase() || 'S';

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 select-none max-w-2xl mx-auto py-6">

      <div className="w-full max-w-md bg-surface-container-low rounded-3xl p-6 sm:p-8 tactile-card ring-1 ring-white/90 shadow-2xl relative overflow-hidden">
        {/* Shimmer Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div>

        {/* Store Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-6 relative z-10">
          <div
            className="w-16 h-16 rounded-2xl text-white flex items-center justify-center font-headline-lg text-headline-lg font-bold tactile-active-glow shadow-md overflow-hidden"
            style={{ backgroundColor: storeInfo.brandColor || '#ff5722' }}
          >
            {storeInfo.logoUrl ? (
              <img src={storeInfo.logoUrl} alt={storeInfo.name} className="w-full h-full object-cover" />
            ) : (
              storeInitial
            )}
          </div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight mt-1">
            {storeInfo.name}
          </h2>
          <span className="px-3 py-1 rounded-full bg-primary-fixed text-[#ff5722] font-label-sm text-label-sm font-bold uppercase tracking-wider">
            Filtered strictly for {storeInfo.name}
          </span>
        </div>

        {!getAuthToken() && !storeInfo.slug ? (
          /* Public Store Code / Slug Lookup */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = lookupSlugInput.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
              if (clean) fetchStoreProfile(clean);
            }}
            className="flex flex-col gap-4 relative z-10"
          >
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
              Enter your merchant&apos;s store code (from their QR poster or join link) to claim your loyalty card.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Store Code / Slug
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <input
                  required
                  type="text"
                  value={lookupSlugInput}
                  onChange={(e) => setLookupSlugInput(e.target.value)}
                  placeholder="e.g. roast-bistro"
                  className="bg-transparent w-full font-mono text-sm text-on-surface focus:outline-none"
                />
              </div>
            </div>
            {errorMessage && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={isLookingUpStore}
              className="w-full py-3 rounded-full bg-[#ff5722] text-white font-bold text-sm tactile-glow flex items-center justify-center gap-2"
            >
              <span>{isLookingUpStore ? 'Looking up store...' : 'Continue to Store Enrollment'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>
        ) : !isSubmitted ? (
          /* Enrollment Form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Full Name
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer full name"
                  className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Email Address
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Mobile Phone (SMS Fallback)
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>

            {errorMessage && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3.5 rounded-full bg-[#ff5722] text-white font-headline-sm text-headline-sm font-bold tactile-glow flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-lg"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                  <span>Signing RS256 JWT...</span>
                </>
              ) : (
                <>
                  <span>Enroll &amp; Generate Pass</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* "Add to Google Wallet" Success State */
          <div className="flex flex-col items-center text-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center font-bold text-2xl animate-bounce">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>

            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Welcome, {customerName}!
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                {enrolledMember.points > 0
                  ? `Your digital loyalty card is ready at ${storeInfo.name}. Enjoy ${enrolledMember.points.toLocaleString()} Bonus PTS instantly!`
                  : `Your digital loyalty card is now active at ${storeInfo.name}.`}
              </p>
            </div>

            {jwtLink ? (
              <a
                href={jwtLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sounds.chime()}
                className="w-full py-3.5 px-6 rounded-full bg-black text-white hover:bg-neutral-900 tactile-glow flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl border border-white/20 group cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px] text-white">wallet</span>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-white">
                  Add to Google Wallet
                </span>
              </a>
            ) : (
              <div className="w-full p-3.5 rounded-2xl bg-surface-container border border-surface-container-highest text-xs text-on-surface-variant flex items-center gap-2 text-left">
                <span className="material-symbols-outlined text-[18px] text-[#ff5722] shrink-0">qr_code_2</span>
                <span>
                  Digital card saved to store registry. Present QR code or Member ID <strong className="text-on-surface font-mono">{enrolledMember.uid}</strong> at checkout.
                </span>
              </div>
            )}

            {/* In-App Visualizer Button */}
            <button
              onClick={() => {
                sounds.chime();
                setIsWalletModalOpen(true);
              }}
              className="text-[12px] text-[#ff5722] hover:underline font-bold flex items-center gap-1"
            >
              <span>Preview Card in In-App Wallet Visualizer</span>
              <span className="material-symbols-outlined text-[14px]">visibility</span>
            </button>

            {/* Pass QR Barcode Render */}
            <div className="w-full p-4 rounded-2xl bg-surface-container-lowest tactile-deboss flex flex-col items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Digital Pass QR Code
              </span>
              <div
                onClick={() => setIsWalletModalOpen(true)}
                className="p-2 bg-white rounded-xl border border-surface-container shadow-sm cursor-pointer hover:scale-105 transition-transform"
                title="Click to view digital pass"
              >
                <svg className="w-32 h-32" viewBox="0 0 29 29" fill="#191c1e">
                  <path d="M0 0h7v7H0zM2 2v3h3V2zM9 0h2v1H9zM12 0h1v3h-1zM14 0h3v1h-3zM18 0h1v1h-1zM20 0h2v1h-2zM22 0h7v7h-7zM24 2v3h3V2zM0 9h1v3H0zM2 9h2v1H2zM5 9h1v2H5zM7 9h2v2H7zM10 9h1v1h-1zM12 9h3v1h-3zM17 9h1v2h-1zM20 9h1v1h-1zM22 9h2v1h-2zM25 9h2v1h-2zM28 9h1v3h-1zM0 22h7v7H0zM2 24v3h3v-3zM9 22h2v1H9zM12 22h2v3h-2zM15 22h2v1h-2zM18 22h1v1h-1zM20 22h2v1h-2zM23 22h2v2h-2zM26 22h3v1h-3zM9 26h1v3H9zM12 26h1v1h-1zM14 26h2v1h-2zM18 26h1v2h-1zM20 26h3v1h-3zM25 26h2v1h-2zM28 26h1v3h-1zM3 3h1v1H3zM25 3h1v1h-1zM3 25h1v1H3zM10 12h2v2h-2zM13 13h3v3h-3zM17 12h2v2h-2zM12 16h2v2h-2zM15 16h3v2h-3zM10 18h2v2h-2zM18 18h2v2h-2zM12 20h2v2h-2z" />
                </svg>
              </div>
              <span className="font-label-sm text-label-sm font-mono text-outline">
                UID: {enrolledMember.uid}
              </span>
            </div>

            {/* Fallback Share Links */}
            <div className="flex items-center justify-between w-full gap-2 pt-2 border-t border-surface-container-highest">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2 px-3 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold tactile-btn flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>{copied ? 'Copied!' : jwtLink ? 'Copy Save URL' : 'Copy Join Link'}</span>
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  setIsSubmitted(false);
                }}
                className="py-2 px-3 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold hover:text-on-surface"
              >
                Re-enroll
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Google Wallet Pass Simulator Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121316] text-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10 flex flex-col relative animate-in fade-in zoom-in duration-200">
            {/* Wallet Header */}
            <div className="p-4 bg-[#1e1f23] flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[22px]">wallet</span>
                <span className="font-bold text-[15px] tracking-tight text-white">Google Wallet Pass</span>
              </div>
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-white/80 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Google Wallet Card Visualizer */}
            <div className="p-6 flex flex-col items-center gap-5">
              {/* The Actual Pass Card */}
              <div
                className="w-full text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-56 border border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${storeInfo.brandColor || '#ff5722'}, #1f2229)`,
                }}
              >
                {/* Background Pattern */}
                <div className="absolute right-[-20%] bottom-[-20%] w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none"></div>

                {/* Card Top */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-xl shadow-md"
                      style={{ color: storeInfo.brandColor || '#ff5722' }}
                    >
                      {storeInitial}
                    </div>
                    <div>
                      <h4 className="font-bold text-[16px] leading-tight">{storeInfo.name}</h4>
                      <span className="text-[11px] text-white/80 font-medium">{storeInfo.programName || 'Loyalty Pass'}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-black/25 text-amber-300 font-bold text-[11px] tracking-wider uppercase border border-white/20">
                    {enrolledMember.tier}
                  </span>
                </div>

                {/* Card Points Display */}
                <div className="my-2 relative z-10">
                  <span className="text-[11px] text-white/80 uppercase font-bold tracking-wider block">
                    Points Balance
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {enrolledMember.points.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-amber-200">PTS</span>
                  </div>
                </div>

                {/* Card Bottom */}
                <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/20">
                  <div>
                    <span className="text-[10px] text-white/70 uppercase block">Cardholder</span>
                    <span className="font-bold text-sm">{customerName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] bg-black/20 px-2.5 py-1 rounded-full border border-white/10">
                    <span className="material-symbols-outlined text-[14px]">nfc</span>
                    <span>Smart Tap Ready</span>
                  </div>
                </div>
              </div>

              {/* Barcode Render */}
              <div className="w-full bg-white p-4 rounded-2xl flex flex-col items-center gap-1.5 shadow-inner">
                <svg className="w-48 h-12" viewBox="0 0 100 24" fill="#000">
                  <rect x="0" y="0" width="2" height="24" />
                  <rect x="3" y="0" width="1" height="24" />
                  <rect x="5" y="0" width="3" height="24" />
                  <rect x="9" y="0" width="1" height="24" />
                  <rect x="11" y="0" width="2" height="24" />
                  <rect x="14" y="0" width="4" height="24" />
                  <rect x="19" y="0" width="1" height="24" />
                  <rect x="21" y="0" width="2" height="24" />
                  <rect x="24" y="0" width="3" height="24" />
                  <rect x="28" y="0" width="1" height="24" />
                  <rect x="30" y="0" width="2" height="24" />
                  <rect x="33" y="0" width="4" height="24" />
                  <rect x="38" y="0" width="1" height="24" />
                  <rect x="40" y="0" width="2" height="24" />
                  <rect x="43" y="0" width="3" height="24" />
                  <rect x="47" y="0" width="1" height="24" />
                  <rect x="49" y="0" width="2" height="24" />
                  <rect x="52" y="0" width="4" height="24" />
                  <rect x="57" y="0" width="1" height="24" />
                  <rect x="59" y="0" width="2" height="24" />
                  <rect x="62" y="0" width="3" height="24" />
                  <rect x="66" y="0" width="1" height="24" />
                  <rect x="68" y="0" width="2" height="24" />
                  <rect x="71" y="0" width="4" height="24" />
                  <rect x="76" y="0" width="1" height="24" />
                  <rect x="78" y="0" width="2" height="24" />
                  <rect x="81" y="0" width="3" height="24" />
                  <rect x="85" y="0" width="1" height="24" />
                  <rect x="87" y="0" width="2" height="24" />
                  <rect x="90" y="0" width="4" height="24" />
                  <rect x="95" y="0" width="1" height="24" />
                  <rect x="97" y="0" width="3" height="24" />
                </svg>
                <span className="font-mono text-[11px] text-gray-700 tracking-widest font-bold">
                  {enrolledMember.uid.replace(/^#/, '')}
                </span>
              </div>

              {/* Success Badge */}
              <div className="w-full p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[12px] flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Pass Minted &amp; Synced with POS Node #01</span>
              </div>

              <button
                onClick={() => {
                  sounds.chime();
                  setIsWalletModalOpen(false);
                }}
                className="w-full py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
