import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/sound';
import { authFetch, getAuthToken } from '../utils/auth';
import { useI18n, MIDDLE_EAST_COUNTRIES } from '../utils/i18n';

interface CustomerEnrollmentViewProps {
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
}

export const CustomerEnrollmentView: React.FC<CustomerEnrollmentViewProps> = ({
  activeSlug = '',
}) => {
  const { isRtl, t } = useI18n();

  const [customerName, setCustomerName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('SA');
  const [phoneDigits, setPhoneDigits] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [jwtLink, setJwtLink] = useState<string>('');
  const [applePassUrl, setApplePassUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [activeWalletTab, setActiveWalletTab] = useState<'apple' | 'google'>('apple');
  const [lookupSlugInput, setLookupSlugInput] = useState<string>('');
  const [isLookingUpStore, setIsLookingUpStore] = useState<boolean>(false);

  const currentCountry =
    MIDDLE_EAST_COUNTRIES.find((c) => c.code === selectedCountry) || MIDDLE_EAST_COUNTRIES[0];

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
    name: activeSlug || (isRtl ? 'برنامج ولاء المتجر' : 'Store Loyalty Club'),
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
      setErrorMessage(
        data?.error ||
          (isRtl
            ? `المتجر "${slugToLoad}" غير موجود أو غير مفعل حالياً.`
            : `Store "${slugToLoad}" was not found or is not active yet.`)
      );
    } catch {
      setErrorMessage(
        isRtl
          ? 'تعذر جلب بيانات المتجر في الوقت الحالي.'
          : 'Unable to look up store profile right now.'
      );
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
      name: targetSlug || (isRtl ? 'برنامج ولاء المتجر' : 'Store Loyalty Club'),
    }));

    if (targetSlug) {
      fetchStoreProfile(targetSlug);
    }
  }, [activeSlug, isRtl]);

  const generatePass = async (name: string, userEmail: string, userPhone: string) => {
    setIsLoading(true);
    setErrorMessage('');
    const targetSlug = storeInfo.slug || activeSlug;
    const hasToken = Boolean(getAuthToken());

    if (!hasToken && !targetSlug) {
      const msg = isRtl
        ? 'يرجى تسجيل الدخول أو فتح رابط انضمام صالح للمتجر (?store=your-slug).'
        : 'No active store selected. Sign in or open a valid store join link (?store=your-slug).';
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
        throw new Error(data.error || (isRtl ? 'فشل حفظ تسجيل العضو في قاعدة البيانات.' : 'Failed to save member enrollment in database.'));
      }

      const pts = Number(data.member.points ?? data.pass?.points ?? 0);
      const tier = data.pass?.tier || (pts >= 4000 ? 'VIP Platinum' : pts >= 1500 ? 'Gold' : 'Silver');
      const memberCode = data.member.member_id || data.member.id;

      setEnrolledMember({
        uid: `#${memberCode}`,
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

      const gUrl = typeof data.saveToWalletUrl === 'string' ? data.saveToWalletUrl : '';
      setJwtLink(gUrl);
      const appleUrl = (data as any)?.applePassUrl || (data as any)?.appleWalletUrl || `/api/passes/apple/${encodeURIComponent(memberCode)}`;
      setApplePassUrl(appleUrl);
      setIsSubmitted(true);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : (isRtl ? 'تعذر إنشاء بطاقة المحفظة الرقمية.' : 'Unable to create the Wallet pass.');
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
    const cleanDigits = phoneDigits.replace(/\D/g, '');
    const fullPhone = cleanDigits ? `${currentCountry.dialCode}${cleanDigits}` : '';
    try {
      await generatePass(customerName, email, fullPhone);
    } catch {
      // Handled in generatePass
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
        <div className="absolute -top-16 -right-16 rtl:-right-auto rtl:-left-16 w-36 h-36 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div>

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
          <span className="px-3.5 py-1 rounded-full bg-primary-fixed text-[#ff5722] font-label-sm text-label-sm font-bold tracking-wide">
            {isRtl ? `برنامج ولاء ${storeInfo.name}` : `Official Loyalty Club • ${storeInfo.name}`}
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
              {isRtl
                ? 'أدخل كود المتجر (من الملصق أو الباركود في المتجر) للانضمام لبرنامج المكافآت.'
                : 'Enter your merchant\'s store code (from their QR poster or join link) to claim your loyalty card.'}
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                {t('storeCodeLookup')}
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <input
                  required
                  type="text"
                  value={lookupSlugInput}
                  onChange={(e) => setLookupSlugInput(e.target.value)}
                  placeholder="e.g. oasis-cafe"
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
              <span>{isLookingUpStore ? (isRtl ? 'جاري البحث عن المتجر...' : 'Looking up store...') : t('lookupBtn')}</span>
              <span className="material-symbols-outlined text-[18px] rtl:rotate-180">arrow_forward</span>
            </button>
          </form>
        ) : !isSubmitted ? (
          /* Customer Enrollment Form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                {t('fullName')}
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <input
                  required
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                {t('emailAddress')}
              </label>
              <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                />
              </div>
            </div>

            {/* Middle East Regional Phone Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                {t('mobilePhone')}
              </label>
              <div className="flex items-center gap-2">
                {/* Country Code Dropdown */}
                <div className="h-11 px-2.5 rounded-xl bg-surface tactile-deboss flex items-center shrink-0">
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="bg-transparent font-sans text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
                  >
                    {MIDDLE_EAST_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-white text-black">
                        {c.flag} {c.dialCode} ({isRtl ? c.nameAr : c.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone Digits Input */}
                <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center flex-1">
                  <input
                    type="tel"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(e.target.value)}
                    placeholder={currentCountry.placeholder}
                    className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none font-mono"
                  />
                </div>
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
                  <span>{t('signingPass')}</span>
                </>
              ) : (
                <>
                  <span>{t('enrollButton')}</span>
                  <span className="material-symbols-outlined text-[20px] rtl:rotate-180">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Dual Wallet Success State (Apple Wallet & Google Wallet) */
          <div className="flex flex-col items-center text-center gap-5 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center font-bold text-2xl animate-bounce">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>

            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {isRtl ? `أهلاً بك، ${customerName}!` : `Welcome, ${customerName}!`}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                {enrolledMember.points > 0
                  ? isRtl
                    ? `تم تفعيل بطاقتك بنجاح في ${storeInfo.name} مع رصيد ${enrolledMember.points.toLocaleString()} نقطة ترحيبية!`
                    : `Your digital loyalty card is ready at ${storeInfo.name}. Enjoy ${enrolledMember.points.toLocaleString()} Bonus PTS instantly!`
                  : isRtl
                  ? `بطاقتك الرقمية نشطة الآن في ${storeInfo.name}.`
                  : `Your digital loyalty card is now active at ${storeInfo.name}.`}
              </p>
            </div>

            {/* Dual Wallet Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full">
              {/* Add to Apple Wallet Button */}
              <button
                type="button"
                onClick={() => {
                  sounds.chime();
                  setActiveWalletTab('apple');
                  setIsWalletModalOpen(true);
                }}
                className="w-full py-3.5 px-6 rounded-full bg-black text-white hover:bg-neutral-900 tactile-glow flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl border border-white/20 group cursor-pointer"
              >
                {/* Apple Logo SVG */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.66-7.85-11.91-14.42-6-9.15-10.79-19.78-14.37-31.9-3.57-12.12-5.37-23.73-5.37-34.82 0-14.73 3.65-27.17 10.96-37.33 7.31-10.15 16.59-15.34 27.84-15.56 5.6 0 11.66 1.48 18.17 4.43 6.51 2.95 10.74 4.48 12.69 4.58 1.58 0 6.08-1.63 13.51-4.89 7.43-3.26 13.79-4.64 19.08-4.14 14.18.99 25.13 6.34 32.85 16.07-12.62 7.64-18.8 17.89-18.54 30.75.24 10.05 4.11 18.52 11.62 25.4 7.51 6.88 16.29 10.76 26.34 11.64-2.22 6.53-4.82 13.06-7.8 19.59zM119.22 31.84c0-7.72 2.76-14.97 8.27-21.75 5.51-6.78 12.35-10.99 20.52-12.63.15 1.06.23 2.05.23 2.97 0 7.5-2.92 14.86-8.77 22.09-5.85 7.23-12.82 11.45-20.9 12.67-.34-1.12-.51-2.23-.51-3.35z" />
                </svg>
                <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-white">
                  {t('addToAppleWallet')}
                </span>
              </button>

              {/* Add to Google Wallet Button */}
              {jwtLink ? (
                <a
                  href={jwtLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => sounds.chime()}
                  className="w-full py-3.5 px-6 rounded-full bg-[#1e293b] text-white hover:bg-slate-800 tactile-glow flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl border border-white/20 group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[22px] text-amber-400">wallet</span>
                  <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-white">
                    {t('addToGoogleWallet')}
                  </span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sounds.chime();
                    setActiveWalletTab('google');
                    setIsWalletModalOpen(true);
                  }}
                  className="w-full py-3.5 px-6 rounded-full bg-[#1e293b] text-white hover:bg-slate-800 tactile-glow flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl border border-white/20 group cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[22px] text-amber-400">wallet</span>
                  <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-white">
                    {t('addToGoogleWallet')}
                  </span>
                </button>
              )}
            </div>

            {/* In-App Interactive Wallet Visualizer Button */}
            <button
              onClick={() => {
                sounds.chime();
                setIsWalletModalOpen(true);
              }}
              className="text-xs text-[#ff5722] hover:underline font-bold flex items-center gap-1.5"
            >
              <span>{t('previewCard')}</span>
              <span className="material-symbols-outlined text-[15px]">visibility</span>
            </button>

            {/* Pass QR Barcode Render */}
            <div className="w-full p-4 rounded-2xl bg-surface-container-lowest tactile-deboss flex flex-col items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                {t('qrBarcodeLabel')}
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
                {t('memberId')}: {enrolledMember.uid}
              </span>
              <p className="text-[11px] text-on-surface-variant text-center">
                {t('presentAtCheckout')}
              </p>
            </div>

            {/* Fallback Share Links */}
            <div className="flex items-center justify-between w-full gap-2 pt-2 border-t border-surface-container-highest">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2 px-3 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold tactile-btn flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>{copied ? (isRtl ? 'تم النسخ!' : 'Copied!') : t('copyPassLink')}</span>
              </button>
              <button
                onClick={() => {
                  sounds.click();
                  setIsSubmitted(false);
                }}
                className="py-2 px-3 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold hover:text-on-surface"
              >
                {t('reEnroll')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Dual Wallet Pass Simulator Modal (Apple Wallet & Google Wallet) */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121316] text-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10 flex flex-col relative animate-in fade-in zoom-in duration-200">
            {/* Modal Header with Wallet Switcher Tabs */}
            <div className="p-3 bg-[#1e1f23] flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-full border border-white/10">
                {/* Apple Wallet Tab */}
                <button
                  type="button"
                  onClick={() => {
                    sounds.click();
                    setActiveWalletTab('apple');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    activeWalletTab === 'apple'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.66-7.85-11.91-14.42-6-9.15-10.79-19.78-14.37-31.9-3.57-12.12-5.37-23.73-5.37-34.82 0-14.73 3.65-27.17 10.96-37.33 7.31-10.15 16.59-15.34 27.84-15.56 5.6 0 11.66 1.48 18.17 4.43 6.51 2.95 10.74 4.48 12.69 4.58 1.58 0 6.08-1.63 13.51-4.89 7.43-3.26 13.79-4.64 19.08-4.14 14.18.99 25.13 6.34 32.85 16.07-12.62 7.64-18.8 17.89-18.54 30.75.24 10.05 4.11 18.52 11.62 25.4 7.51 6.88 16.29 10.76 26.34 11.64-2.22 6.53-4.82 13.06-7.8 19.59zM119.22 31.84c0-7.72 2.76-14.97 8.27-21.75 5.51-6.78 12.35-10.99 20.52-12.63.15 1.06.23 2.05.23 2.97 0 7.5-2.92 14.86-8.77 22.09-5.85 7.23-12.82 11.45-20.9 12.67-.34-1.12-.51-2.23-.51-3.35z" />
                  </svg>
                  <span>Apple Wallet</span>
                </button>

                {/* Google Wallet Tab */}
                <button
                  type="button"
                  onClick={() => {
                    sounds.click();
                    setActiveWalletTab('google');
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    activeWalletTab === 'google'
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">wallet</span>
                  <span>Google Wallet</span>
                </button>
              </div>

              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-white/80 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Wallet Visualizer Body */}
            <div className="p-6 flex flex-col items-center gap-5">
              {activeWalletTab === 'apple' ? (
                /* Apple Wallet (.pkpass) Pass Layout */
                <div
                  className="w-full text-white rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between h-72 border border-white/20"
                  style={{
                    background: `linear-gradient(145deg, #18191c 0%, ${storeInfo.brandColor || '#ff5722'}cc 100%)`,
                  }}
                >
                  {/* Top Apple Pass Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/15">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-base shadow"
                        style={{ color: storeInfo.brandColor || '#ff5722' }}
                      >
                        {storeInitial}
                      </div>
                      <div>
                        <h4 className="font-bold text-[14px] tracking-tight">{storeInfo.name}</h4>
                        <span className="text-[10px] text-white/70 uppercase tracking-wider block">
                          PassKit Loyalty
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white font-extrabold text-[10px] tracking-wider uppercase border border-white/30">
                      {enrolledMember.tier}
                    </span>
                  </div>

                  {/* Middle Balance Strip */}
                  <div className="my-2 bg-black/25 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white/70 uppercase font-bold tracking-wider block">
                        {isRtl ? 'رصيد المكافآت' : 'Points Balance'}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black tracking-tight">
                          {enrolledMember.points.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-amber-300">{t('points')}</span>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="text-[10px] text-white/70 uppercase font-bold tracking-wider block">
                        {t('memberId')}
                      </span>
                      <span className="font-mono text-xs font-bold text-white/90">
                        {enrolledMember.uid}
                      </span>
                    </div>
                  </div>

                  {/* Pass Holder & NFC */}
                  <div className="flex items-end justify-between pt-2 border-t border-white/15">
                    <div>
                      <span className="text-[9px] text-white/60 uppercase block">
                        {isRtl ? 'حامل البطاقة' : 'Cardholder'}
                      </span>
                      <span className="font-bold text-xs">{customerName || 'Pass Member'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] bg-white/15 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[12px]">contactless</span>
                      <span>Apple Pay Ready</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Google Wallet Pass Layout */
                <div
                  className="w-full text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-64 border border-white/20"
                  style={{
                    background: `linear-gradient(135deg, ${storeInfo.brandColor || '#ff5722'}, #1f2229)`,
                  }}
                >
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
                        <span className="text-[11px] text-white/80 font-medium">Google Wallet Smart Tap</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-black/25 text-amber-300 font-bold text-[11px] tracking-wider uppercase border border-white/20">
                      {enrolledMember.tier}
                    </span>
                  </div>

                  <div className="my-2 relative z-10">
                    <span className="text-[11px] text-white/80 uppercase font-bold tracking-wider block">
                      {isRtl ? 'رصيد النقاط' : 'Points Balance'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {enrolledMember.points.toLocaleString()}
                      </span>
                      <span className="text-sm font-bold text-amber-200">{t('points')}</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/20">
                    <div>
                      <span className="text-[10px] text-white/70 uppercase block">{t('fullName')}</span>
                      <span className="font-bold text-sm">{customerName || 'Loyalty Member'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] bg-black/20 px-2.5 py-1 rounded-full border border-white/10">
                      <span className="material-symbols-outlined text-[14px]">nfc</span>
                      <span>Smart Tap Ready</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Barcode Render */}
              <div className="w-full bg-white p-3.5 rounded-2xl flex flex-col items-center gap-1.5 shadow-inner">
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

              {/* Status Badge */}
              <div className="w-full p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>
                  {isRtl ? 'تم إصدار وتوثيق البطاقة وتحديث رصيد العميل' : 'Pass Minted & Verified for Middle East POS Fleet'}
                </span>
              </div>

              <button
                onClick={() => {
                  sounds.chime();
                  setIsWalletModalOpen(false);
                }}
                className="w-full py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all shadow-lg"
              >
                {t('done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
