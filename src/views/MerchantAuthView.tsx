import React, { useState } from 'react';
import { sounds } from '../utils/sound';

interface MerchantAuthViewProps {
  onLoginSuccess: (slug?: string, tenantName?: string, role?: 'super_admin' | 'admin' | 'merchant', email?: string) => void;
  onNavigateToCustomerEnroll: () => void;
}

export const MerchantAuthView: React.FC<MerchantAuthViewProps> = ({
  onLoginSuccess,
  onNavigateToCustomerEnroll,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  // Unified Sign In form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign up (Register Store) form state
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [brandColor, setBrandColor] = useState('#ff5722');
  const [archetype, setArchetype] = useState<'loyalty' | 'gift' | 'ticket'>('loyalty');
  const [plan, setPlan] = useState<'starter' | 'growth' | 'scale'>('growth');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Pending Approval State (shown to newly registered merchants awaiting admin approval)
  const [pendingNotice, setPendingNotice] = useState<{
    storeName: string;
    ownerEmail: string;
    plan: string;
  } | null>(null);

  // Unified Sign In Handler: automatically detects Admin vs Merchant by credentials
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setPendingNotice(null);
    setIsLoggingIn(true);
    sounds.click();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Check if this merchant is pending admin approval
      if (res.status === 403 && data.pending) {
        sounds.click(400, 0.05);
        setPendingNotice({
          storeName: data.tenant?.name || identifier,
          ownerEmail: data.tenant?.ownerEmail || identifier,
          plan: data.tenant?.plan || 'growth',
        });
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials. Please verify your email/slug and password.');
      }

      sounds.chime();

      // If backend detected Super Admin credentials
      if (data.role === 'super_admin' || data.role === 'admin') {
        onLoginSuccess(undefined, 'Super Admin Master Issuer', 'super_admin', data.user?.email || identifier.trim().toLowerCase());
        return;
      }

      // Otherwise merchant store login
      const targetSlug = data.tenant?.slug || 'banlis';
      const name = data.tenant?.name || 'Your Store';
      onLoginSuccess(targetSlug, name, 'merchant', data.tenant?.ownerEmail || data.user?.email || identifier.trim().toLowerCase());
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setPendingNotice(null);
    setIsSigningUp(true);
    sounds.click();

    try {
      if (!storeName.trim()) {
        throw new Error('Please enter a valid store name.');
      }
      if (!ownerEmail.trim()) {
        throw new Error('Please enter owner email.');
      }

      if (!signupPassword || signupPassword.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName.trim(),
          ownerName: ownerName.trim() || 'Store Manager',
          ownerEmail: ownerEmail.trim().toLowerCase(),
          password: signupPassword,
          brandColor,
          archetype,
          plan,
          status: 'Pending Approval',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const serverError = data.error || data.detail || (data.code ? `Database error (${data.code})` : 'Unable to complete registration.');
        throw new Error(serverError);
      }

      sounds.chime();
      setPendingNotice({
        storeName: storeName.trim(),
        ownerEmail: ownerEmail.trim(),
        plan,
      });
    } catch (err: any) {
      setSignupError(err.message || 'Registration failed.');
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[78vh] w-full px-4 select-none max-w-xl mx-auto py-8">
      {/* Customer Enrollment Switcher Banner */}
      <div className="w-full mb-6 p-4 rounded-2xl bg-surface-container-low border border-primary-container/30 tactile-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">wallet</span>
          </div>
          <div>
            <h4 className="font-bold text-[14px] text-on-surface">Are you a shopper / customer?</h4>
            <p className="text-[12px] text-on-surface-variant">
              Looking to join a loyalty club and save your card to Google Wallet?
            </p>
          </div>
        </div>
        <button
          onClick={onNavigateToCustomerEnroll}
          className="shrink-0 px-3.5 py-2 rounded-full bg-surface-container-high hover:bg-[#ff5722] hover:text-white text-on-surface font-label-sm text-label-sm font-bold tactile-btn transition-all flex items-center gap-1.5"
        >
          <span>Customer Join</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full bg-surface-container-low rounded-3xl p-6 sm:p-8 tactile-card ring-1 ring-white/90 shadow-2xl relative overflow-hidden">
        {/* Glow Element */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div>

        {/* PENDING APPROVAL CONFIRMATION (For Merchants Awaiting Admin Activation) */}
        {pendingNotice ? (
          <div className="flex flex-col items-center text-center gap-5 relative z-10 py-3 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg animate-bounce">
              <span className="material-symbols-outlined text-[32px]">hourglass_top</span>
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 font-label-sm text-label-sm font-bold uppercase tracking-wider">
                Registration Submitted • Awaiting Admin Approval
              </span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface mt-2">
                {pendingNotice.storeName}
              </h3>
              <p className="text-body-sm text-on-surface-variant mt-1 max-w-sm mx-auto">
                Your store has submitted registration for the{' '}
                <strong className="text-on-surface uppercase">{pendingNotice.plan} Package</strong> ($
                {pendingNotice.plan === 'scale' ? 399 : pendingNotice.plan === 'starter' ? 49 : 149}/mo).
              </p>
            </div>

            <div className="w-full p-4 rounded-2xl bg-surface-container tactile-deboss text-left space-y-2 text-[12px] text-on-surface-variant">
              <div className="flex items-center gap-2 font-bold text-on-surface text-[13px]">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">verified</span>
                <span>Review &amp; Activation Process</span>
              </div>
              <p>
                To maintain high Google Wallet deliverability and dedicated RSA256 cryptographic pass signing, the platform administrator verifies and approves newly registered packages before live pass issuing begins.
              </p>
              <div className="pt-2 border-t border-surface-container-highest flex items-center justify-between font-mono text-[11px]">
                <span>Registered Email:</span>
                <span className="text-on-surface font-bold">{pendingNotice.ownerEmail}</span>
              </div>
            </div>

            {/* Merchant only sees return to sign in. ZERO admin buttons! */}
            <div className="flex items-center justify-center w-full pt-2">
              <button
                onClick={() => {
                  sounds.click();
                  setPendingNotice(null);
                  setTab('signin');
                }}
                className="w-full py-3 rounded-full bg-surface-container text-on-surface font-label-md text-label-md font-bold tactile-btn hover:text-[#ff5722]"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-2 mb-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-[#ff5722] text-white flex items-center justify-center font-headline-lg text-headline-lg font-bold tactile-active-glow shadow-md">
                <span className="material-symbols-outlined text-[28px]">
                  {tab === 'signin' ? 'lock' : 'storefront'}
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight mt-1">
                PassLoyal OS
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                {tab === 'signin'
                  ? 'Sign in to access your platform console or store dashboard.'
                  : 'Register your store to issue branded Google Wallet loyalty passes.'}
              </p>
            </div>

            {/* 2 Standard Tabs: Sign In / Register Store */}
            <div className="flex items-center p-1 rounded-2xl bg-surface-container mb-6 relative z-10">
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setTab('signin');
                  setLoginError(null);
                }}
                className={`flex-1 py-2 rounded-xl font-label-md text-label-md font-bold transition-all text-center ${
                  tab === 'signin'
                    ? 'bg-surface-container-lowest text-on-surface shadow-md'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setTab('signup');
                  setSignupError(null);
                }}
                className={`flex-1 py-2 rounded-xl font-label-md text-label-md font-bold transition-all text-center ${
                  tab === 'signup'
                    ? 'bg-surface-container-lowest text-on-surface shadow-md'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Register Store
              </button>
            </div>

            {/* TAB 1: UNIFIED SIGN IN (Admin coordinates automatically log in as Admin, Merchant as Merchant) */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="flex flex-col gap-4 relative z-10">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Email, Username, or Store Slug
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">person</span>
                    <input
                      required
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. alnatour.m@gmail.com or banlis"
                      className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Password
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">lock</span>
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                    />
                  </div>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="mt-2 w-full py-3.5 rounded-full bg-[#ff5722] text-white font-headline-sm text-headline-sm font-bold tactile-glow flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-lg hover:brightness-105"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: REGISTER STORE */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="flex flex-col gap-4 relative z-10">
                {/* Package Tier Selection Cards */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Select SaaS Subscription Package *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'starter', name: 'Starter', price: '$49', limit: '500 passes' },
                      { id: 'growth', name: 'Growth', price: '$149', limit: '5,000 passes', badge: 'Popular' },
                      { id: 'scale', name: 'Scale', price: '$399', limit: '50k passes' },
                    ].map((pkg) => {
                      const isSelected = plan === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => {
                            sounds.click(900, 0.01);
                            setPlan(pkg.id as any);
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer text-center transition-all relative ${
                            isSelected
                              ? 'border-[#ff5722] bg-[#ff5722]/10 ring-2 ring-[#ff5722]/30'
                              : 'border-surface-container-highest bg-surface-container hover:bg-surface-container-high'
                          }`}
                        >
                          {pkg.badge && (
                            <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-[#ff5722] text-white font-mono text-[9px] font-bold uppercase">
                              {pkg.badge}
                            </span>
                          )}
                          <div className="font-bold text-sm text-on-surface">{pkg.name}</div>
                          <div className="font-extrabold text-base text-[#ff5722] leading-tight">
                            {pkg.price}
                            <span className="text-[10px] text-outline font-normal">/mo</span>
                          </div>
                          <div className="text-[10px] text-outline mt-0.5">{pkg.limit}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Store or Business Name
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">store</span>
                    <input
                      required
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Bella Pasta Cucina"
                      className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                      Owner Full Name
                    </label>
                    <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                      <input
                        required
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Marco Rossi"
                        className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                      Owner Work Email
                    </label>
                    <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                      <input
                        required
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="marco@bellapasta.com"
                        className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    Password
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-surface tactile-deboss flex items-center">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">key</span>
                    <input
                      required
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create secure merchant password"
                      className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                      Brand Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                      />
                      <span className="font-mono text-sm uppercase">{brandColor}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                      Pass Card Archetype
                    </label>
                    <select
                      value={archetype}
                      onChange={(e) => setArchetype(e.target.value as any)}
                      className="h-11 px-3 rounded-xl bg-surface tactile-deboss text-on-surface font-label-md text-label-md focus:outline-none"
                    >
                      <option value="loyalty">Loyalty Club</option>
                      <option value="gift">Gift Card</option>
                      <option value="ticket">Event Pass</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container border border-surface-container-highest text-[11px] text-on-surface-variant flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5">verified</span>
                  <p>
                    <strong>Approval Policy:</strong> New merchant store registrations are submitted for platform administrator review before pass issuance is activated.
                  </p>
                </div>

                {signupError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{signupError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSigningUp}
                  className="mt-2 w-full py-3.5 rounded-full bg-[#ff5722] text-white font-headline-sm text-headline-sm font-bold tactile-glow flex items-center justify-center gap-2 transition-transform active:scale-[0.99] shadow-lg hover:brightness-105"
                >
                  {isSigningUp ? (
                    <>
                      <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                      <span>Submitting Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>Register Store &amp; Submit for Approval</span>
                      <span className="material-symbols-outlined text-[20px]">send</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
