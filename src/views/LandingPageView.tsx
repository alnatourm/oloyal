import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/sound';

interface LandingPageViewProps {
  onNavigateToDashboard?: () => void;
  onNavigateToEnroll?: () => void;
  onOpenLoginModal?: () => void;
  onLoginSuccess?: (slug?: string, tenantName?: string, role?: 'admin' | 'merchant') => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onNavigateToDashboard,
  onNavigateToEnroll,
  onOpenLoginModal,
  onLoginSuccess,
}) => {
  // Feature tab deep-dive state
  const [activeTab, setActiveTab] = useState<number>(0);

  // ROI Calculator state
  const [locations, setLocations] = useState<number>(3);
  const [diners, setDiners] = useState<number>(350);
  const [ticket, setTicket] = useState<number>(38);

  // Animated Taps Processed Counter
  const [tapsCounter, setTapsCounter] = useState<number>(84920);

  // Integrated Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');

  // Sign In Form State
  const [identifier, setIdentifier] = useState('alnatour.m@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign Up (Register Store) Form State
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('admin123');
  const [brandColor, setBrandColor] = useState('#ff5722');
  const [archetype, setArchetype] = useState<'loyalty' | 'gift' | 'ticket'>('loyalty');
  const [plan, setPlan] = useState<'starter' | 'growth' | 'scale'>('growth');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Pending Approval State
  const [pendingNotice, setPendingNotice] = useState<{
    storeName: string;
    ownerEmail: string;
    plan: string;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTapsCounter((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const terminalStates = [
    {
      title: 'Smart Tap NFC Active',
      desc: 'Customer pass auto-detected in 0.18s',
    },
    {
      title: 'Eddystone Beacon Sync',
      desc: 'Lockscreen notification broadcasted to nearby patrons',
    },
    {
      title: 'Pass Studio Preview',
      desc: 'Real-time JSON schema pushed to Google Wallet cache',
    },
    {
      title: 'Live POS Webhook Stream',
      desc: 'Check #4819 accrued 140 pts via Toast API',
    },
  ];

  // Model: 18% repeat visit lift on 20% enrolled diners = 3.6% incremental spend across total base
  const totalMonthlyDiners = locations * diners * 30;
  const grossMonthlyVolume = totalMonthlyDiners * ticket;
  const incrementalRevenue = Math.round(grossMonthlyVolume * 0.036);

  const openAuthModal = (mode: 'signin' | 'signup', targetPlan?: 'starter' | 'growth' | 'scale') => {
    sounds.click();
    setAuthTab(mode);
    if (targetPlan) setPlan(targetPlan);
    setLoginError(null);
    setSignupError(null);
    setPendingNotice(null);
    setIsAuthModalOpen(true);
  };

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
      setIsAuthModalOpen(false);

      if (data.role === 'admin') {
        if (onLoginSuccess) {
          onLoginSuccess(undefined, 'Super Admin Master Issuer', 'admin');
        } else if (onNavigateToDashboard) {
          onNavigateToDashboard();
        }
        return;
      }

      const targetSlug = data.tenant?.slug || 'banlis';
      const name = data.tenant?.name || 'Your Store';
      if (onLoginSuccess) {
        onLoginSuccess(targetSlug, name, 'merchant');
      } else if (onNavigateToDashboard) {
        onNavigateToDashboard();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

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

  const handleExploreDemo = () => {
    sounds.click();
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    }
  };

  return (
    <div className="w-full min-h-screen bg-surface font-body-md text-on-surface antialiased select-none">
      {/* Top Standalone Header Bar - Matching image_88028f8b */}
      <header className="sticky top-0 w-full z-40 bg-surface/90 backdrop-blur-xl border-b border-surface-container-highest/60 shadow-[0_2px_12px_rgba(209,217,230,0.4)]">
        <div className="h-18 max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-[-3px_-3px_8px_#ffffff,3px_3px_8px_#d1d9e6]">
              <span className="material-symbols-outlined text-[#ff5722] text-[22px]">contactless</span>
            </div>
            <span className="font-headline-md text-xl tracking-tight text-on-surface font-extrabold">
              Pass<span className="text-[#ff5722]">Loyal</span>
            </span>
          </div>

          {/* Navigation links matching screenshot: Platform, Smart Tap, Beacons, Pricing, Enterprise */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-surface-container-low rounded-full shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff]">
            <a href="#showcase" className="px-4 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:text-on-surface font-semibold transition-all">
              Platform
            </a>
            <a href="#features" className="px-4 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:text-on-surface font-semibold transition-all">
              Smart Tap
            </a>
            <a href="#features" className="px-4 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:text-on-surface font-semibold transition-all">
              Beacons
            </a>
            <a href="#pricing" className="px-4 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:text-on-surface font-semibold transition-all">
              Pricing
            </a>
            <a href="#enterprise" className="px-4 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant hover:text-on-surface font-semibold transition-all">
              Enterprise
            </a>
          </nav>

          {/* Right Action Buttons matching image_88028f8b: Login, Get Started Free ->, and User Profile Circle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuthModal('signin')}
              className="px-4 py-2 font-label-md text-label-md text-on-surface hover:text-[#ff5722] font-bold transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => openAuthModal('signup')}
              className="px-5 py-2.5 rounded-full bg-[#ff5722] text-white font-label-md text-label-md font-bold shadow-[0_0_20px_rgba(255,87,34,0.35)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button
              onClick={() => openAuthModal('signin')}
              className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface shadow-[-3px_-3px_8px_#ffffff,3px_3px_8px_#d1d9e6] hover:text-[#ff5722] transition-colors"
              title="Sign In / Account"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Landing Content */}
      <div className="flex flex-col w-full">
        {/* Top Ambient Glow Layer */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-[#ff5722]/15 via-secondary-container/5 to-transparent blur-3xl pointer-events-none rounded-full"></div>

          {/* 1. HERO SECTION */}
          <section className="w-full px-4 lg:px-8 pt-6 pb-12 flex flex-col items-center">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5722] shadow-[0_0_8px_#ff5722] animate-pulse"></span>
              <span className="font-label-md text-label-md tracking-wider text-on-surface uppercase font-semibold">
                Google Wallet Smart Tap 2.0 Certified
              </span>
              <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-headline-lg text-3xl sm:text-4xl lg:text-5xl text-center text-on-surface max-w-4xl tracking-tight leading-tight font-extrabold">
              Turn Every Tap Into a <span className="font-extrabold text-[#ff5722]">Lifelong Regular</span>
            </h1>

            {/* Subheadline */}
            <p className="font-body-lg text-body-lg text-on-surface-variant text-center max-w-2xl mt-4 mb-8">
              PassLoyal empowers modern restaurants and retailers to issue native Google Wallet loyalty passes, trigger lockscreen geo-proximity alerts, and scan via NFC in 0.2s — zero apps required.
            </p>

            {/* CTA Buttons Group */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <button
                onClick={() => openAuthModal('signup')}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#ff5722] text-white font-headline-sm text-headline-sm font-bold shadow-[0_4px_24px_rgba(255,87,34,0.35),-3px_-3px_8px_#ffffff] hover:brightness-105 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Deploy Your First Pass Free</span>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </button>
              <button
                onClick={handleExploreDemo}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-surface-container-lowest text-on-surface font-headline-sm text-headline-sm font-bold shadow-[-5px_-5px_12px_#ffffff,5px_5px_12px_#d1d9e6] hover:shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[#ff5722] text-[20px]">play_circle</span>
                <span>Explore Live Interactive Demo</span>
              </button>
            </div>

            {/* Social Proof Rating Pill */}
            <div className="flex items-center gap-2 px-5 py-1.5 rounded-full bg-surface-container-low shadow-[inset_1px_1px_3px_#d1d9e6,inset_-1px_-1px_3px_#ffffff] mb-12">
              <div className="flex items-center text-[#ff5722]">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                ))}
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                4.9/5 from 1,200+ multi-unit restaurant operators
              </span>
              <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
              <span className="font-label-sm text-label-sm text-primary font-bold">98.4% Pass Retention</span>
            </div>

            {/* Hero 3D Tactile Workstation Showcase */}
            <div className="w-full max-w-6xl rounded-3xl bg-surface-container-low p-6 lg:p-8 shadow-[-12px_-12px_28px_#ffffff,12px_12px_28px_#d1d9e6] relative" id="showcase">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left Metric Pods */}
                <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1">
                  <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-[-4px_-4px_10px_#ffffff,4px_4px_10px_#d1d9e6]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                        Velocity
                      </span>
                      <span className="material-symbols-outlined text-[#ff5722] text-[18px]">trending_up</span>
                    </div>
                    <p className="font-headline-lg text-2xl font-bold text-on-surface">+34%</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Revisit cadence over 30 days</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-[-4px_-4px_10px_#ffffff,4px_4px_10px_#d1d9e6]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                        Smart Tap NFC
                      </span>
                      <span className="material-symbols-outlined text-tertiary text-[18px]">bolt</span>
                    </div>
                    <p className="font-headline-lg text-2xl font-bold text-on-surface">0.2s</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Instant zero-touch handshake</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-container-lowest shadow-[-4px_-4px_10px_#ffffff,4px_4px_10px_#d1d9e6]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                        Save Rate
                      </span>
                      <span className="material-symbols-outlined text-[#ff5722] text-[18px]">install_mobile</span>
                    </div>
                    <p className="font-headline-lg text-2xl font-bold text-on-surface">94.2%</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Google Wallet install conversion</p>
                  </div>
                </div>

                {/* Central 3D Concentric Rotary Dial Cockpit */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 rounded-2xl bg-surface shadow-[inset_4px_4px_10px_#d1d9e6,inset_-4px_-4px_10px_#ffffff] order-1 lg:order-2">
                  <div className="w-full flex items-center justify-between px-4 py-1.5 rounded-full bg-surface-container-lowest shadow-[-2px_-2px_6px_#ffffff,2px_2px_6px_#d1d9e6] mb-6">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ff5722] text-[16px] animate-pulse">cell_tower</span>
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                        Beacon Active: 300m Geo-Fence
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#ff5722] text-white font-label-sm text-label-sm font-bold">
                      LIVE
                    </span>
                  </div>

                  {/* Concentric Rotary Dial */}
                  <div className="relative w-60 h-60 sm:w-64 sm:h-64 rounded-full bg-surface-container-low shadow-[-10px_-10px_20px_#ffffff,10px_10px_20px_#d1d9e6] flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 288 288">
                      <circle cx="144" cy="144" fill="none" r="118" stroke="#e0e3e6" strokeWidth="12" />
                      <circle
                        className="transition-all duration-1000"
                        cx="144"
                        cy="144"
                        fill="none"
                        r="118"
                        stroke="#ff5722"
                        strokeDasharray="741"
                        strokeDashoffset="180"
                        strokeLinecap="round"
                        strokeWidth="12"
                      />
                    </svg>
                    <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-surface shadow-[-6px_-6px_14px_#ffffff,6px_6px_14px_#d1d9e6] flex flex-col items-center justify-center text-center relative p-3">
                      <div className="absolute top-2 w-1.5 h-3.5 bg-[#ff5722] rounded-full shadow-[0_0_8px_#ff5722]"></div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold mt-2">
                        Taps Processed
                      </span>
                      <span className="font-headline-lg text-3xl font-extrabold text-on-surface tracking-tight">
                        {tapsCounter.toLocaleString()}
                      </span>
                      <span className="font-label-sm text-label-sm text-primary font-medium flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5722]"></span>
                        +12.4% this week
                      </span>
                    </div>
                  </div>

                  {/* Lockscreen Push Notification Preview Pill */}
                  <div className="mt-6 w-full max-w-md p-3 rounded-2xl bg-surface-container-lowest shadow-[-3px_-3px_8px_#ffffff,3px_3px_8px_#d1d9e6] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#ff5722] flex items-center justify-center text-white shadow-[0_0_12px_rgba(255,87,34,0.4)] shrink-0">
                      <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label-sm text-label-sm font-bold text-on-surface truncate">
                        Banlis Bistro • Proximity Push
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        🔥 Double Points Tonight! Tap at register to redeem.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">Now</span>
                  </div>
                </div>

                {/* Right: Google Wallet Pass Interactive Mockup */}
                <div className="lg:col-span-3 flex flex-col items-center order-3">
                  <div className="w-full max-w-[270px] rounded-2xl bg-surface-container-lowest p-4 shadow-[-6px_-6px_16px_#ffffff,6px_6px_16px_#d1d9e6] relative overflow-hidden">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-container-highest">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">account_balance_wallet</span>
                        <span className="font-label-sm text-label-sm font-bold text-on-surface">Google Wallet</span>
                      </div>
                      <span className="material-symbols-outlined text-[#ff5722] text-[18px] animate-pulse">contactless</span>
                    </div>

                    <div className="w-full h-24 rounded-xl bg-gradient-to-tr from-primary to-[#ff5722] p-3 flex flex-col justify-between text-white shadow-sm mb-3">
                      <div className="flex items-center justify-between">
                        <span className="font-headline-sm text-sm font-bold tracking-tight">BANLIS BISTRO</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-label-sm text-[10px] backdrop-blur-sm font-bold">
                          VIP GOLD
                        </span>
                      </div>
                      <div>
                        <span className="font-label-sm text-[10px] uppercase opacity-80">Reward Balance</span>
                        <p className="font-headline-md text-lg font-bold">1,450 PTS</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 mb-2 font-label-sm text-xs">
                      <div>
                        <span className="text-on-surface-variant text-[10px]">Member</span>
                        <p className="font-semibold text-on-surface">Marcus Vance</p>
                      </div>
                      <div>
                        <span className="text-on-surface-variant text-[10px]">Free Entrée</span>
                        <p className="font-semibold text-[#ff5722]">50 pts away</p>
                      </div>
                    </div>

                    <div className="w-full p-2 rounded-xl bg-surface-container-low shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] flex flex-col items-center justify-center">
                      <div className="flex items-center justify-center gap-0.5 h-7 w-36">
                        <span className="w-1 h-full bg-on-surface"></span>
                        <span className="w-0.5 h-full bg-on-surface"></span>
                        <span className="w-1.5 h-full bg-on-surface"></span>
                        <span className="w-0.5 h-full bg-on-surface"></span>
                        <span className="w-2 h-full bg-on-surface"></span>
                        <span className="w-0.5 h-full bg-on-surface"></span>
                        <span className="w-1 h-full bg-on-surface"></span>
                        <span className="w-2 h-full bg-on-surface"></span>
                      </div>
                      <span className="font-mono text-[9px] tracking-widest text-on-surface-variant mt-1">
                        9842-8930-1011
                      </span>
                    </div>

                    <div className="mt-2 text-center">
                      <span className="font-label-sm text-[10px] text-tertiary flex items-center justify-center gap-1 font-semibold">
                        <span className="material-symbols-outlined text-[13px]">nfc</span>
                        Hold near NFC reader to scan
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. SOCIAL PROOF LOGO STRIP */}
          <section className="w-full px-4 lg:px-8 py-8">
            <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest text-center mb-6 font-semibold">
                Trusted by forward-thinking dining groups, specialty cafes, and hospitality chains
              </p>
              <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {['TARTINE', 'Blue Bottle', 'sweetgreen', 'SHAKE SHACK', 'DISHOOM', 'momofuku'].map((logo, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-2xl bg-surface-container-low shadow-[-3px_-3px_6px_#ffffff,3px_3px_6px_#d1d9e6] flex items-center justify-center px-4 hover:shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] transition-all cursor-default"
                  >
                    <span className="font-bold text-sm text-on-surface tracking-tight">{logo}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. VALUE PROPOSITION & 3D INTERACTIVE PILLARS */}
          <section className="w-full px-4 lg:px-8 py-12">
            <div className="w-full max-w-6xl mx-auto">
              <div className="flex flex-col items-center text-center mb-10">
                <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-semibold">
                  Engineered For Zero Friction
                </span>
                <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface mt-1 max-w-2xl">
                  Why Modern Hospitality Groups Are Abandoning Custom Mobile Apps
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pillar 1 */}
                <div className="rounded-3xl bg-surface-container-low p-6 shadow-[-8px_-8px_20px_#ffffff,8px_8px_20px_#d1d9e6] flex flex-col justify-between group hover:shadow-[-12px_-12px_24px_#ffffff,12px_12px_24px_#d1d9e6] transition-all">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#d1d9e6] flex items-center justify-center text-[#ff5722] mb-4 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[26px]">wallet</span>
                    </div>
                    <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">
                      Native Google Wallet Passes
                    </h3>
                    <p className="font-body-md text-sm text-on-surface-variant leading-relaxed mb-6">
                      Zero app downloads or App Store passwords required. Guests add their membership pass in a single tap via table QR code, SMS receipt, or contactless tap.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface shadow-[inset_3px_3px_7px_#d1d9e6,inset_-3px_-3px_7px_#ffffff]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-label-sm text-xs font-bold text-on-surface">Install Completion Rate</span>
                      <span className="font-label-sm text-xs text-[#ff5722] font-bold">96.8%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className="h-full bg-[#ff5722] rounded-full w-[96%]"></div>
                    </div>
                    <span className="font-label-sm text-[11px] text-on-surface-variant mt-1.5 block">
                      vs 14% traditional custom app downloads
                    </span>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="rounded-3xl bg-surface-container-low p-6 shadow-[-8px_-8px_20px_#ffffff,8px_8px_20px_#d1d9e6] flex flex-col justify-between group hover:shadow-[-12px_-12px_24px_#ffffff,12px_12px_24px_#d1d9e6] transition-all">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#d1d9e6] flex items-center justify-center text-[#ff5722] mb-4 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[26px]">contactless</span>
                    </div>
                    <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">
                      Smart Tap 2.0 &amp; Optical Scanning
                    </h3>
                    <p className="font-body-md text-sm text-on-surface-variant leading-relaxed mb-6">
                      Certified Google Smart Tap 2.0 protocol synchronizes pass credentials via encrypted NFC in 200 milliseconds. Seamlessly integrates with POS or our terminal scanner.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface shadow-[inset_3px_3px_7px_#d1d9e6,inset_-3px_-3px_7px_#ffffff]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-label-sm text-xs font-bold text-on-surface">Line Speed Improvement</span>
                      <span className="font-label-sm text-xs text-tertiary font-bold">-12 sec/txn</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {['Toast', 'Square', 'Clover', 'NCR'].map((pos) => (
                        <span key={pos} className="px-2 py-0.5 rounded-md bg-surface-container-lowest text-on-surface font-mono text-[10px] font-bold shadow-sm">
                          {pos}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="rounded-3xl bg-surface-container-low p-6 shadow-[-8px_-8px_20px_#ffffff,8px_8px_20px_#d1d9e6] flex flex-col justify-between group hover:shadow-[-12px_-12px_24px_#ffffff,12px_12px_24px_#d1d9e6] transition-all">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest shadow-[-4px_-4px_8px_#ffffff,4px_4px_8px_#d1d9e6] flex items-center justify-center text-[#ff5722] mb-4 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[26px]">radar</span>
                    </div>
                    <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">
                      Autonomous Geo-Fencing &amp; Beacons
                    </h3>
                    <p className="font-body-md text-sm text-on-surface-variant leading-relaxed mb-6">
                      Trigger high-priority lockscreen notifications when loyalty members walk within 300 meters of your venue. Bluetooth Low Energy Eddystone beacons activate instantly.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-surface shadow-[inset_3px_3px_7px_#d1d9e6,inset_-3px_-3px_7px_#ffffff]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-label-sm text-xs font-bold text-on-surface">Proximity Open Rate</span>
                      <span className="font-label-sm text-xs text-[#ff5722] font-bold">64.3%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className="h-full bg-[#ff5722] rounded-full w-[64%]"></div>
                    </div>
                    <span className="font-label-sm text-[11px] text-on-surface-variant mt-1.5 block">
                      4.2x higher conversion than standard email
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. INTERACTIVE FEATURE DEEP-DIVE & TERMINAL SHOWCASE */}
          <section className="w-full px-4 lg:px-8 py-12 bg-surface-container-low/60 rounded-3xl my-6" id="features">
            <div className="w-full max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left: Tab Selectors */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-semibold">
                    Architectural Deep Dive
                  </span>
                  <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface">
                    Precision Tooling For High-Volume Venues
                  </h2>
                  <p className="font-body-md text-sm text-on-surface-variant mb-2">
                    Review live transaction telemetry, configure automated geo-fences, and dynamically update pass metadata without app updates.
                  </p>

                  <div className="flex flex-col gap-2">
                    {[
                      { title: 'Smart Tap 2.0 Protocol', desc: 'Instant NFC verification & crypto handshake', icon: 'contactless' },
                      { title: 'Geo-Radius Push Beacons', desc: 'Lockscreen trigger when customer enters 300m', icon: 'sensors' },
                      { title: 'Pass Studio Archetypes', desc: 'Drag-and-drop wallet design with live preview', icon: 'palette' },
                      { title: 'Real-Time POS Telemetry', desc: 'Bi-directional webhook sync with check balances', icon: 'sync_alt' },
                    ].map((tab, idx) => {
                      const isSelected = activeTab === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            sounds.click();
                            setActiveTab(idx);
                          }}
                          className={`text-left p-3.5 rounded-2xl flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-surface-container-lowest shadow-[-4px_-4px_10px_#ffffff,4px_4px_10px_#d1d9e6]'
                              : 'bg-surface shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] hover:bg-surface-container-low'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-[22px] ${isSelected ? 'text-[#ff5722]' : 'text-on-surface-variant'}`}>
                              {tab.icon}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-on-surface">{tab.title}</h4>
                              <p className="text-xs text-on-surface-variant">{tab.desc}</p>
                            </div>
                          </div>
                          <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-[#ff5722]' : 'text-on-surface-variant'}`}>
                            chevron_right
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Porcelain Terminal Mockup */}
                <div className="lg:col-span-7">
                  <div className="rounded-3xl bg-surface-container-low p-6 shadow-[-10px_-10px_24px_#ffffff,10px_10px_24px_#d1d9e6] relative">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-container-highest">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5722] shadow-[0_0_8px_#ff5722]"></div>
                        <span className="font-mono text-xs uppercase tracking-wider font-bold text-on-surface">
                          TERMINAL #402 • BANLIS DOWNTOWN
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest font-mono text-[11px] text-on-surface shadow-sm">
                          NFC Ready
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#ff5722] text-white font-mono text-[11px] font-bold shadow-sm">
                          ONLINE
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Scanning Surface */}
                      <div className="rounded-2xl bg-surface p-4 shadow-[inset_3px_3px_8px_#d1d9e6,inset_-3px_-3px_8px_#ffffff] flex flex-col items-center justify-center min-h-[220px] text-center relative">
                        <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#ff5722]/40 flex items-center justify-center relative animate-spin [animation-duration:16s]">
                          <div className="w-14 h-14 rounded-full bg-surface-container-lowest shadow-[-3px_-3px_6px_#ffffff,3px_3px_6px_#d1d9e6] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#ff5722] text-[24px]">contactless</span>
                          </div>
                        </div>
                        <p className="font-bold text-on-surface mt-3 text-sm">
                          {terminalStates[activeTab].title}
                        </p>
                        <p className="text-xs text-on-surface-variant max-w-[200px] mt-0.5">
                          {terminalStates[activeTab].desc}
                        </p>
                        <div className="mt-2 px-2.5 py-0.5 rounded-full bg-surface-container-lowest shadow-sm text-[#ff5722] font-mono text-[10px] font-bold">
                          AES-256 Verified
                        </div>
                      </div>

                      {/* Transaction Stream */}
                      <div className="flex flex-col gap-2">
                        <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                          Recent Wallet Handshakes
                        </span>
                        {[
                          { name: 'Alex R. (Gold VIP)', note: 'Table 12 • 2x Cold Brew', pts: '+120 PTS' },
                          { name: 'Sarah K. (Silver)', note: 'Bar • Avocado Toast Box', pts: '+85 PTS' },
                          { name: 'Michael D. (First Tap)', note: 'Takeout • Citrus Brioche', pts: 'PASS SAVED' },
                          { name: 'Liam W. (Platinum)', note: 'Table 4 • Signature Tasting', pts: 'REWARD USED' },
                        ].map((tx, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-on-surface">{tx.name}</p>
                              <p className="text-[10px] text-on-surface-variant">{tx.note}</p>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#ff5722]">{tx.pts}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. ROI & REVENUE CALCULATOR WIDGET */}
          <section className="w-full px-4 lg:px-8 py-12" id="calculator">
            <div className="w-full max-w-5xl mx-auto rounded-3xl bg-surface-container-low p-6 lg:p-10 shadow-[-10px_-10px_26px_#ffffff,10px_10px_26px_#d1d9e6]">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-semibold">
                  Immediate Business Impact
                </span>
                <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface mt-1">
                  Estimate Your Monthly Incremental Revenue
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-1">
                  Calculate the exact top-line expansion generated by converting anonymous walk-ins into Google Wallet cardholders.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Sliders Column */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-surface shadow-[inset_2px_2px_6px_#d1d9e6,inset_-2px_-2px_6px_#ffffff]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-on-surface">Store Locations</span>
                      <span className="font-bold text-base text-[#ff5722]">
                        {locations} {locations === 1 ? 'Store' : 'Stores'}
                      </span>
                    </div>
                    <input
                      className="w-full accent-[#ff5722] cursor-pointer"
                      max="25"
                      min="1"
                      type="range"
                      value={locations}
                      onChange={(e) => setLocations(parseInt(e.target.value) || 1)}
                    />
                    <div className="flex justify-between text-[11px] text-on-surface-variant mt-1 font-mono">
                      <span>1 Location</span>
                      <span>25 Locations</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface shadow-[inset_2px_2px_6px_#d1d9e6,inset_-2px_-2px_6px_#ffffff]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-on-surface">Daily Diners per Store</span>
                      <span className="font-bold text-base text-[#ff5722]">{diners} Guests</span>
                    </div>
                    <input
                      className="w-full accent-[#ff5722] cursor-pointer"
                      max="1500"
                      min="50"
                      step="25"
                      type="range"
                      value={diners}
                      onChange={(e) => setDiners(parseInt(e.target.value) || 50)}
                    />
                    <div className="flex justify-between text-[11px] text-on-surface-variant mt-1 font-mono">
                      <span>50 Diners</span>
                      <span>1,500 Diners</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface shadow-[inset_2px_2px_6px_#d1d9e6,inset_-2px_-2px_6px_#ffffff]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-on-surface">Average Guest Check</span>
                      <span className="font-bold text-base text-[#ff5722]">${ticket}</span>
                    </div>
                    <input
                      className="w-full accent-[#ff5722] cursor-pointer"
                      max="150"
                      min="12"
                      step="1"
                      type="range"
                      value={ticket}
                      onChange={(e) => setTicket(parseInt(e.target.value) || 12)}
                    />
                    <div className="flex justify-between text-[11px] text-on-surface-variant mt-1 font-mono">
                      <span>$12 / check</span>
                      <span>$150 / check</span>
                    </div>
                  </div>
                </div>

                {/* Output Dial Column */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-3xl bg-surface-container-lowest shadow-[-6px_-6px_16px_#ffffff,6px_6px_16px_#d1d9e6] text-center">
                  <div className="w-14 h-14 rounded-full bg-surface-container-low shadow-sm flex items-center justify-center text-[#ff5722] mb-3">
                    <span className="material-symbols-outlined text-[28px]">payments</span>
                  </div>
                  <span className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold">
                    Projected Monthly Revenue Lift
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#ff5722] mt-1 tracking-tight">
                    +${incrementalRevenue.toLocaleString()}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 mb-4">
                    Based on empirical 18% repeat visit lift and 0% App Store drop-off.
                  </p>
                  <div className="w-full py-2 px-3 rounded-xl bg-surface shadow-sm flex items-center justify-between text-xs font-bold text-tertiary">
                    <span>Payback Window:</span>
                    <span>3.8x ROI within 45 days</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6. TESTIMONIALS & CASE STUDIES */}
          <section className="w-full px-4 lg:px-8 py-12" id="testimonials">
            <div className="w-full max-w-6xl mx-auto">
              <div className="flex flex-col items-center text-center mb-8">
                <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-semibold">
                  Operator Case Studies
                </span>
                <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface mt-1">
                  Loved By Michelin Starred Concepts &amp; Fast Casual Chains Alike
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    quote: "Our repeat dining frequency leaped by 42% after switching to PassLoyal's Google Wallet passes. Zero app download friction meant 9 out of 10 guests actually added the card right at the table.",
                    name: 'Chef Marcus Vance',
                    role: 'Owner, Banlis Bistro (3 Locations)',
                    img: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop',
                  },
                  {
                    quote: 'Smart Tap cut our counter line wait times during peak dinner rush by 12 seconds per transaction. Cashiers never have to ask for phone numbers or fumble with barcode scanners anymore.',
                    name: 'Elena Rostova',
                    role: 'VP Operations, Artisanal Hospitality',
                    img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop',
                  },
                  {
                    quote: 'The 300-meter lockscreen geo-push notification singlehandedly filled our Tuesday happy hour lull. PassLoyal acts like a private billboard right inside the diner\'s pocket.',
                    name: 'David Chen',
                    role: 'Founder, Urban Roastery (8 Cafes)',
                    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-3xl bg-surface-container-low shadow-[-6px_-6px_16px_#ffffff,6px_6px_16px_#d1d9e6] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1 text-[#ff5722] mb-3">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-on-surface leading-relaxed italic mb-4">
                        "{item.quote}"
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-3 border-t border-surface-container-highest">
                      <img className="w-10 h-10 rounded-full object-cover shadow-sm" src={item.img} alt={item.name} />
                      <div>
                        <p className="font-bold text-sm text-on-surface">{item.name}</p>
                        <p className="text-xs text-on-surface-variant">{item.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 7. ARCHITECTURAL COMPARISON TABLE */}
          <section className="w-full px-4 lg:px-8 py-12 bg-surface-container-low/60 rounded-3xl my-6">
            <div className="w-full max-w-5xl mx-auto">
              <div className="flex flex-col items-center text-center mb-8">
                <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-semibold">
                  Architectural Comparison
                </span>
                <h2 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface mt-1">
                  Why Custom Apps Are Failing Restaurants
                </h2>
              </div>

              <div className="w-full overflow-x-auto rounded-2xl border border-surface-container-highest/80 shadow-md">
                <table className="w-full text-left bg-surface-container-low text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-surface-container-highest bg-surface-container">
                      <th className="p-4 font-bold text-on-surface">Dimension</th>
                      <th className="p-4 font-bold text-[#ff5722] bg-surface-container-lowest/80">PassLoyal Wallet</th>
                      <th className="p-4 font-bold text-on-surface-variant">Custom Mobile App</th>
                      <th className="p-4 font-bold text-on-surface-variant">Plastic Stamp Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-highest">
                    {[
                      { dim: 'App Store Download Friction', pass: '0% (Saved in 1 Tap)', app: '86% Drop-off Rate', stamp: 'None (Physical)' },
                      { dim: 'Lockscreen Geo-Proximity', pass: 'Native 300m Beacons', app: 'Requires App Permissions', stamp: 'Impossible' },
                      { dim: 'NFC Smart Tap Speed', pass: '0.2s Handshake', app: 'Slow QR Screen Unlock', stamp: 'Manual Punch Card' },
                      { dim: 'Launch Timeline', pass: 'Under 15 Minutes', app: '4-6 Months Dev Work', stamp: '2-3 Weeks Printing' },
                      { dim: 'Maintenance & Store Fees', pass: '$0 / Included', app: '$25k+ Annual Dev Costs', stamp: 'Constant Reprinting' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-container/40">
                        <td className="p-3.5 font-bold text-on-surface">{row.dim}</td>
                        <td className="p-3.5 text-[#ff5722] font-bold bg-surface-container-lowest/80 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>{row.pass}</span>
                        </td>
                        <td className="p-3.5 text-on-surface-variant">{row.app}</td>
                        <td className="p-3.5 text-on-surface-variant">{row.stamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 8. PRICING & SAAS PACKAGES SECTION */}
          <section className="w-full px-4 lg:px-8 py-16" id="pricing">
            <div className="w-full max-w-6xl mx-auto">
              <div className="flex flex-col items-center text-center mb-12">
                <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-semibold">
                  Transparent SaaS Packages
                </span>
                <h2 className="font-headline-lg text-3xl sm:text-4xl font-extrabold text-on-surface mt-1">
                  Predictable Pricing for Growing Merchants
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant max-w-xl mt-2">
                  All plans include zero App Store commissions, unlimited lockscreen geo-beacons, and Google Smart Tap 2.0 verification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Starter */}
                <div className="rounded-3xl bg-surface-container-low p-8 shadow-[-8px_-8px_20px_#ffffff,8px_8px_20px_#d1d9e6] flex flex-col justify-between relative border border-transparent hover:border-surface-container-highest transition-all">
                  <div>
                    <span className="font-label-md text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                      Starter Package
                    </span>
                    <h3 className="font-headline-lg text-2xl font-bold text-on-surface mt-1">Single Venue</h3>
                    <div className="mt-4 mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-on-surface">$49</span>
                      <span className="text-on-surface-variant font-semibold text-sm">/month</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-6">
                      Perfect for boutique cafes, neighborhood bakeries, and single-store restaurateurs.
                    </p>
                    <ul className="space-y-3 text-xs text-on-surface mb-8">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Up to <strong>500 active passes</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Google Smart Tap 2.0 NFC</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>1 Geo-Fence Proximity Beacon</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Standard optical QR scanner</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => openAuthModal('signup', 'starter')}
                    className="w-full py-3 rounded-full bg-surface-container text-on-surface hover:bg-[#ff5722] hover:text-white font-label-md text-label-md font-bold transition-all shadow-sm"
                  >
                    Select Starter Plan
                  </button>
                </div>

                {/* Growth - Popular */}
                <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[-10px_-10px_24px_#ffffff,10px_10px_24px_#d1d9e6] ring-2 ring-[#ff5722] flex flex-col justify-between relative">
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#ff5722] text-white font-mono text-[11px] font-bold uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>
                  <div>
                    <span className="font-label-md text-xs uppercase tracking-wider text-[#ff5722] font-bold">
                      Growth Package
                    </span>
                    <h3 className="font-headline-lg text-2xl font-bold text-on-surface mt-1">Multi-Unit Brands</h3>
                    <div className="mt-4 mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-[#ff5722]">$149</span>
                      <span className="text-on-surface-variant font-semibold text-sm">/month</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-6">
                      Designed for fast casual chains, busy bistros, and expanding hospitality groups.
                    </p>
                    <ul className="space-y-3 text-xs text-on-surface mb-8">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Up to <strong>5,000 active passes</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Unlimited Geo-Fence Beacons</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>POS Bi-directional Webhooks</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Priority Admin Review &amp; Approval</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => openAuthModal('signup', 'growth')}
                    className="w-full py-3.5 rounded-full bg-[#ff5722] text-white font-label-md text-label-md font-bold shadow-lg hover:brightness-105 transition-all"
                  >
                    Select Growth Plan
                  </button>
                </div>

                {/* Scale */}
                <div className="rounded-3xl bg-surface-container-low p-8 shadow-[-8px_-8px_20px_#ffffff,8px_8px_20px_#d1d9e6] flex flex-col justify-between relative border border-transparent hover:border-surface-container-highest transition-all">
                  <div>
                    <span className="font-label-md text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                      Scale Package
                    </span>
                    <h3 className="font-headline-lg text-2xl font-bold text-on-surface mt-1">High Volume Fleets</h3>
                    <div className="mt-4 mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-on-surface">$399</span>
                      <span className="text-on-surface-variant font-semibold text-sm">/month</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mb-6">
                      Engineered for regional franchises, stadiums, and multi-location retail networks.
                    </p>
                    <ul className="space-y-3 text-xs text-on-surface mb-8">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Up to <strong>50,000 active passes</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Dedicated RSA256 Signing Key</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Sub-second POS Telemetry Streams</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff5722] text-[18px]">check_circle</span>
                        <span>Dedicated Account Manager &amp; SLA</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => openAuthModal('signup', 'scale')}
                    className="w-full py-3 rounded-full bg-surface-container text-on-surface hover:bg-[#ff5722] hover:text-white font-label-md text-label-md font-bold transition-all shadow-sm"
                  >
                    Select Scale Plan
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 9. ENTERPRISE SECTION */}
          <section className="w-full px-4 lg:px-8 py-12" id="enterprise">
            <div className="w-full max-w-6xl mx-auto rounded-3xl bg-surface-container-low p-8 lg:p-12 shadow-[-10px_-10px_24px_#ffffff,10px_10px_24px_#d1d9e6]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8">
                  <span className="font-label-md text-xs uppercase tracking-wider text-[#ff5722] font-bold">
                    PassLoyal OS Enterprise
                  </span>
                  <h3 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface mt-1">
                    Custom Infrastructure For 50+ Venues
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant mt-2 leading-relaxed max-w-2xl">
                    Need bespoke ERP/POS integration, custom Smart Tap v3.2 cryptographic hardware nodes, or tailored merchant revenue share tiers? Our solutions architects provision dedicated Google Wallet Master Issuer classes on private VPC clusters.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
                    <div className="p-3 rounded-xl bg-surface-container-lowest shadow-sm">
                      <span className="font-bold text-sm text-on-surface block">Custom HSM</span>
                      <span className="text-[11px] text-on-surface-variant">Hardware Security Modules</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-lowest shadow-sm">
                      <span className="font-bold text-sm text-on-surface block">99.99% Uptime</span>
                      <span className="text-[11px] text-on-surface-variant">Guaranteed Enterprise SLA</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-lowest shadow-sm">
                      <span className="font-bold text-sm text-on-surface block">Multi-Tenant RBAC</span>
                      <span className="text-[11px] text-on-surface-variant">Franchise hierarchy</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 flex flex-col items-center justify-center text-center">
                  <button
                    onClick={() => openAuthModal('signup', 'scale')}
                    className="w-full py-4 rounded-full bg-[#ff5722] text-white font-headline-sm text-headline-sm font-bold shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Register Enterprise</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                  <p className="text-[11px] text-on-surface-variant mt-3 font-mono">
                    Direct Master Issuer Provisioning
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 10. HIGH-IMPACT FINAL CTA SECTION */}
          <section className="w-full px-4 lg:px-8 py-12">
            <div className="w-full max-w-5xl mx-auto rounded-3xl bg-surface-container-lowest p-8 lg:p-12 shadow-[-12px_-12px_28px_#ffffff,12px_12px_28px_#d1d9e6] relative overflow-hidden text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">contactless</span>
              </div>
              <h2 className="font-headline-lg text-2xl sm:text-3xl font-extrabold text-on-surface max-w-2xl">
                Ready to turn foot traffic into VIP retention?
              </h2>
              <p className="text-sm sm:text-base text-on-surface-variant max-w-xl mt-2 mb-6">
                Deploy Google Wallet passes across your locations today. No hardware replacements, zero customer download barriers.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 w-full sm:w-auto">
                <button
                  onClick={() => openAuthModal('signup')}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#ff5722] text-white font-bold shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Get Started with 100 Free Passes</span>
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
                <button
                  onClick={handleExploreDemo}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-surface-container-low text-on-surface font-bold hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[#ff5722] text-[20px]">play_circle</span>
                  <span>Explore Terminal Console</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-on-surface-variant text-xs">
                <span className="flex items-center gap-1 font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-[#ff5722] text-[16px]">check</span> No credit card required
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                <span className="flex items-center gap-1 font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-[#ff5722] text-[16px]">check</span> Plug-and-play POS compatibility
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                <span className="flex items-center gap-1 font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-[#ff5722] text-[16px]">check</span> 5-minute automated setup
                </span>
              </div>
            </div>
          </section>

          {/* Standalone Landing Page Footer */}
          <footer className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-10 mt-8 border-t border-surface-container-highest/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ff5722] text-[18px]">verified_user</span>
              <span className="font-bold text-on-surface">PassLoyal OS</span>
              <span>© 2026 PassLoyal OS • Google Wallet API Verified Issuer</span>
            </div>
            <div className="flex items-center gap-6 font-semibold">
              <button
                onClick={() => openAuthModal('signin')}
                className="hover:text-[#ff5722] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="hover:text-[#ff5722] transition-colors"
              >
                Register Store
              </button>
              <a href="mailto:alnatour.m@gmail.com" className="hover:text-[#ff5722] transition-colors">
                Contact Support
              </a>
            </div>
          </footer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTEGRATED AUTHENTICATION & STORE REGISTRATION MODAL */}
      {/* ========================================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-surface-container-low rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-white/90 relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                sounds.click();
                setIsAuthModalOpen(false);
              }}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface hover:text-[#ff5722] shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Shopper / Customer switcher banner */}
            <div className="w-full mb-5 p-3.5 rounded-2xl bg-surface-container border border-primary-container/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#ff5722] text-[20px]">account_balance_wallet</span>
                <span className="text-xs text-on-surface">Customer wanting to join a loyalty club?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(false);
                  if (onNavigateToEnroll) onNavigateToEnroll();
                }}
                className="px-3 py-1 rounded-full bg-surface-container-high hover:bg-[#ff5722] hover:text-white text-on-surface text-xs font-bold transition-all"
              >
                Customer Join →
              </button>
            </div>

            {/* PENDING APPROVAL CONFIRMATION */}
            {pendingNotice ? (
              <div className="flex flex-col items-center text-center gap-4 py-2 animate-in fade-in zoom-in duration-150">
                <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                  <span className="material-symbols-outlined text-[32px]">hourglass_top</span>
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 font-label-sm text-xs font-bold uppercase tracking-wider">
                    Registration Submitted • Awaiting Admin Approval
                  </span>
                  <h3 className="font-headline-md text-xl font-bold text-on-surface mt-2">
                    {pendingNotice.storeName}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                    Your store registration for the <strong className="uppercase text-on-surface">{pendingNotice.plan} package</strong> has been received and queued for Super Admin approval.
                  </p>
                </div>

                <div className="w-full p-4 rounded-2xl bg-surface-container text-left space-y-2 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2 font-bold text-on-surface">
                    <span className="material-symbols-outlined text-amber-500 text-[18px]">verified</span>
                    <span>Admin Verification Process</span>
                  </div>
                  <p>
                    New merchant accounts must be reviewed and approved by the Super Admin before live Google Wallet classes are minted. Once approved, you can sign in directly to your store dashboard.
                  </p>
                  <div className="pt-2 border-t border-surface-container-highest flex items-center justify-between font-mono text-[11px]">
                    <span>Registered Email:</span>
                    <span className="text-on-surface font-bold">{pendingNotice.ownerEmail}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sounds.click();
                    setPendingNotice(null);
                    setAuthTab('signin');
                  }}
                  className="w-full py-3 rounded-full bg-surface-container text-on-surface font-bold text-xs hover:text-[#ff5722] transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-col items-center text-center gap-1.5 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-[#ff5722] text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-[24px]">
                      {authTab === 'signin' ? 'lock' : 'storefront'}
                    </span>
                  </div>
                  <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight mt-1">
                    PassLoyal OS
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    {authTab === 'signin'
                      ? 'Sign in to access your platform console or store dashboard.'
                      : 'Register your store to issue Google Wallet loyalty passes.'}
                  </p>
                </div>

                {/* Tabs: Sign In / Register Store */}
                <div className="flex items-center p-1 rounded-2xl bg-surface-container mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.click();
                      setAuthTab('signin');
                      setLoginError(null);
                    }}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all text-center ${
                      authTab === 'signin'
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
                      setAuthTab('signup');
                      setSignupError(null);
                    }}
                    className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all text-center ${
                      authTab === 'signup'
                        ? 'bg-surface-container-lowest text-on-surface shadow-md'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Register Store
                  </button>
                </div>

                {/* SIGN IN FORM */}
                {authTab === 'signin' && (
                  <form onSubmit={handleSignIn} className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                        Email, Username, or Store Slug
                      </label>
                      <div className="h-11 px-3.5 rounded-xl bg-surface flex items-center shadow-inner">
                        <span className="material-symbols-outlined text-outline text-[18px] mr-2">person</span>
                        <input
                          required
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. alnatour.m@gmail.com or banlis"
                          className="bg-transparent w-full text-sm text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                          Password
                        </label>
                        <span className="text-[11px] text-[#ff5722] font-semibold">Default: admin123</span>
                      </div>
                      <div className="h-11 px-3.5 rounded-xl bg-surface flex items-center shadow-inner">
                        <span className="material-symbols-outlined text-outline text-[18px] mr-2">lock</span>
                        <input
                          required
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-transparent w-full text-sm text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>

                    {loginError && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span>{loginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="mt-1 w-full py-3 rounded-full bg-[#ff5722] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.99] flex items-center justify-center gap-2 transition-all"
                    >
                      {isLoggingIn ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </>
                      )}
                    </button>

                    {/* Quick Demo Fillers */}
                    <div className="pt-3 border-t border-surface-container-highest flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-outline font-bold text-center">
                        Quick Logins:
                      </span>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.click();
                            setIdentifier('alnatour.m@gmail.com');
                            setPassword('admin123');
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-mono font-bold text-[#ff5722]"
                          title="Admin Master Issuer"
                        >
                          alnatour.m@gmail.com (Admin)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sounds.click();
                            setIdentifier('banlis@oloyal.com');
                            setPassword('admin123');
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-mono"
                          title="Merchant Owner"
                        >
                          banlis@oloyal.com (Merchant)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sounds.click();
                            setIdentifier('banlis');
                            setPassword('admin123');
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-mono"
                          title="Merchant Slug"
                        >
                          banlis (Slug)
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* REGISTER STORE FORM */}
                {authTab === 'signup' && (
                  <form onSubmit={handleSignUp} className="flex flex-col gap-3.5">
                    {/* Package Selector */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                        SaaS Subscription Plan *
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
                              className={`p-2 rounded-xl border cursor-pointer text-center transition-all relative ${
                                isSelected
                                  ? 'border-[#ff5722] bg-[#ff5722]/10 ring-2 ring-[#ff5722]/30'
                                  : 'border-surface-container-highest bg-surface-container hover:bg-surface-container-high'
                              }`}
                            >
                              {pkg.badge && (
                                <span className="absolute -top-2 right-1 px-1 py-0.2 rounded-full bg-[#ff5722] text-white font-mono text-[8px] font-bold uppercase">
                                  {pkg.badge}
                                </span>
                              )}
                              <div className="font-bold text-xs text-on-surface">{pkg.name}</div>
                              <div className="font-extrabold text-sm text-[#ff5722]">
                                {pkg.price}
                                <span className="text-[9px] text-outline font-normal">/mo</span>
                              </div>
                              <div className="text-[9px] text-outline">{pkg.limit}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                        Store or Business Name
                      </label>
                      <div className="h-11 px-3.5 rounded-xl bg-surface flex items-center shadow-inner">
                        <span className="material-symbols-outlined text-outline text-[18px] mr-2">store</span>
                        <input
                          required
                          type="text"
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          placeholder="e.g. Bella Pasta Cucina"
                          className="bg-transparent w-full text-sm text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                          Owner Name
                        </label>
                        <div className="h-11 px-3.5 rounded-xl bg-surface flex items-center shadow-inner">
                          <input
                            required
                            type="text"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            placeholder="Marco Rossi"
                            className="bg-transparent w-full text-sm text-on-surface focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                          Work Email
                        </label>
                        <div className="h-11 px-3.5 rounded-xl bg-surface flex items-center shadow-inner">
                          <input
                            required
                            type="email"
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                            placeholder="marco@store.com"
                            className="bg-transparent w-full text-sm text-on-surface focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                        Password
                      </label>
                      <div className="h-11 px-3.5 rounded-xl bg-surface flex items-center shadow-inner">
                        <span className="material-symbols-outlined text-outline text-[18px] mr-2">key</span>
                        <input
                          required
                          type="password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Create merchant password"
                          className="bg-transparent w-full text-sm text-on-surface focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                          Brand Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                            className="w-9 h-9 rounded-xl cursor-pointer border-0 bg-transparent"
                          />
                          <span className="font-mono text-xs uppercase">{brandColor}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs uppercase tracking-wider text-outline font-semibold">
                          Card Archetype
                        </label>
                        <select
                          value={archetype}
                          onChange={(e) => setArchetype(e.target.value as any)}
                          className="h-10 px-2.5 rounded-xl bg-surface text-on-surface text-xs focus:outline-none shadow-inner"
                        >
                          <option value="loyalty">Loyalty Club</option>
                          <option value="gift">Gift Card</option>
                          <option value="ticket">Event Pass</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container border border-surface-container-highest text-[11px] text-on-surface-variant flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-[16px] mt-0.5">verified</span>
                      <p>
                        <strong>Approval Policy:</strong> Submitted stores wait for Super Admin approval before Google Wallet issuing is activated.
                      </p>
                    </div>

                    {signupError && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span>{signupError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSigningUp}
                      className="mt-1 w-full py-3 rounded-full bg-[#ff5722] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.99] flex items-center justify-center gap-2 transition-all"
                    >
                      {isSigningUp ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                          <span>Submitting Registration...</span>
                        </>
                      ) : (
                        <>
                          <span>Register Store &amp; Submit for Approval</span>
                          <span className="material-symbols-outlined text-[18px]">send</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
