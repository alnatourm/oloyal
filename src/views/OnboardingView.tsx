import React, { useState } from 'react';
import { sounds } from '../utils/sound';

interface OnboardingViewProps {
  onCompleteStep?: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onCompleteStep }) => {
  const [activeStep, setActiveStep] = useState<number>(3);
  const [programName, setProgramName] = useState<string>('Banlis Epicurean Club');
  const [welcomeGrant, setWelcomeGrant] = useState<number>(100);
  const [welcomeActive, setWelcomeActive] = useState<boolean>(true);
  const [earnVelocity, setEarnVelocity] = useState<number>(10);
  const [minFloor, setMinFloor] = useState<number>(500);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const [vouchers, setVouchers] = useState([
    { id: 'v1', title: '$5 Instant Dining Credit', subtitle: 'Redeemable at Bistro Register', points: 500, icon: 'local_cafe', colorBg: 'bg-secondary-fixed text-secondary' },
    { id: 'v2', title: 'Truffle Risotto & Pairing', subtitle: 'Signature Kitchen Tasting Entree', points: 750, icon: 'restaurant', colorBg: 'bg-tertiary-fixed text-tertiary' },
    { id: 'v3', title: '$10 Bill Ledger Deduction', subtitle: 'Automatic POS Check Offset', points: 1000, icon: 'receipt_long', colorBg: 'bg-secondary-fixed text-secondary' },
  ]);

  const handleSaveDraft = () => {
    sounds.click(1000, 0.02);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleProceed = () => {
    sounds.chime();
    if (activeStep < 4) {
      setActiveStep((prev) => prev + 1);
    } else if (onCompleteStep) {
      onCompleteStep();
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 select-none">
      {/* TOP WIZARD PROGRESSION & CONTROLS STRIP */}
      <header className="w-full bg-surface-container-low rounded-xl tactile-convex p-4 lg:p-5 flex flex-wrap items-center justify-between gap-4">
        {/* Step Chain Matrix */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Step 1 */}
          <div
            onClick={() => setActiveStep(1)}
            className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest tactile-convex-sm"
          >
            <span className="w-5 h-5 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">check</span>
            </span>
            <span className="font-label-md text-label-md text-on-surface">1. Store Profile</span>
          </div>

          <div className="w-4 h-0.5 bg-surface-container-highest rounded-full"></div>

          {/* Step 2 */}
          <div
            onClick={() => setActiveStep(2)}
            className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest tactile-convex-sm"
          >
            <span className="w-5 h-5 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">check</span>
            </span>
            <span className="font-label-md text-label-md text-on-surface">2. Wallet Identity</span>
          </div>

          <div className="w-4 h-0.5 bg-primary-container rounded-full tactile-active-glow"></div>

          {/* Step 3 */}
          <div
            onClick={() => setActiveStep(3)}
            className={`cursor-pointer flex items-center gap-2.5 px-4 py-2 rounded-full ${
              activeStep === 3
                ? 'bg-surface-container-lowest tactile-convex tactile-active-glow'
                : 'bg-surface tactile-deboss'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold animate-pulse">
              3
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold">
                Step 3 Active
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface leading-none">
                Loyalty Engine &amp; Tiers
              </span>
            </div>
          </div>

          <div className="w-4 h-0.5 bg-surface-container-highest rounded-full"></div>

          {/* Step 4 */}
          <div
            onClick={() => setActiveStep(4)}
            className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full ${
              activeStep === 4
                ? 'bg-surface-container-lowest tactile-convex tactile-active-glow'
                : 'bg-surface tactile-deboss opacity-70'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-label-sm text-label-sm">
              4
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              Provisioning &amp; Live
            </span>
          </div>
        </div>

        {/* Merchant Meta + Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-surface tactile-deboss">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-active-glow"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                Merchant
              </span>
            </div>
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              Banlis Bistro
            </span>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">
              75% Setup
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md tactile-convex-sm active:translate-y-0.5 transition-transform flex items-center gap-1.5 hover:text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{savedNotice ? 'Saved!' : 'Save Draft'}</span>
            </button>
            <button
              onClick={handleProceed}
              className="px-5 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold tactile-convex-sm tactile-active-glow hover:bg-secondary-container active:scale-95 transition-all flex items-center gap-2"
            >
              <span>{activeStep === 4 ? 'Complete Onboarding' : 'Continue to Step 4'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3-COLUMN CALIBRATION COCKPIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMN 1: EARN MECHANICS & INSET WELLS (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-surface-container-lowest tactile-convex-sm flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Program Core</span>
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold px-2 py-0.5 bg-primary-fixed rounded-full">
                v3.2 Spec
              </span>
            </div>

            {/* Display Name Input */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center justify-between">
                <span>Pass Program Display Name</span>
                <span className="font-label-sm text-label-sm text-outline">Wallet Header</span>
              </label>
              <div className="w-full h-11 px-3.5 rounded-full bg-surface tactile-deboss flex items-center gap-2">
                <span className="material-symbols-outlined text-outline text-[18px]">badge</span>
                <input
                  className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none font-medium"
                  type="text"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                />
                <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
              </div>
            </div>

            {/* Welcome Grant Switch */}
            <div className="p-3.5 rounded-lg bg-surface-container tactile-deboss flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Welcome Grant Upon Tap
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Instant bonus on Google Wallet save
                </span>
              </div>
              <div
                onClick={() => {
                  sounds.click();
                  setWelcomeActive(!welcomeActive);
                }}
                className={`w-14 h-8 rounded-full bg-surface tactile-deboss p-1 flex items-center cursor-pointer transition-colors ${
                  welcomeActive ? 'justify-end bg-gradient-to-r from-primary-fixed to-primary-container/30' : 'justify-start'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-primary-container tactile-convex-sm tactile-active-glow flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-on-primary"></span>
                </div>
              </div>
            </div>

            {/* Welcome Bonus Counter */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-full bg-surface-container-lowest tactile-convex-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                Grant Magnitude
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.dialTick();
                    setWelcomeGrant((prev) => Math.max(0, prev - 25));
                  }}
                  className="w-7 h-7 rounded-full bg-surface tactile-deboss flex items-center justify-center text-on-surface hover:text-primary active:scale-90 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">remove</span>
                </button>
                <span className="font-headline-md text-headline-md text-primary font-bold min-w-16 text-center">
                  {welcomeGrant} <span className="text-body-sm font-normal text-on-surface-variant">PTS</span>
                </span>
                <button
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

            {/* Base Earn Velocity Selector */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center justify-between">
                <span>Base Earn Velocity</span>
                <span className="font-label-sm text-label-sm text-primary font-semibold">
                  {earnVelocity} Pts/$1 Active
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2 p-1.5 rounded-full bg-surface tactile-deboss">
                {[1, 10, 15, 25].map((pts) => {
                  const isSelected = earnVelocity === pts;
                  return (
                    <button
                      key={pts}
                      onClick={() => {
                        sounds.click();
                        setEarnVelocity(pts);
                      }}
                      className={`py-2 rounded-full font-label-md text-label-md text-center transition-all ${
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

            {/* Dynamic Yield Calculator */}
            <div className="p-3.5 rounded-lg bg-surface tactile-deboss flex flex-col gap-2">
              <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">calculate</span>
                  Simulated Check Yield
                </span>
                <span className="font-mono text-tertiary font-medium">Bistro POS Avg</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-display-xl-mobile text-display-xl-mobile text-on-surface font-light">
                  $35.00
                </span>
                <span className="material-symbols-outlined text-outline text-[20px]">arrow_forward</span>
                <div className="flex items-baseline gap-1 text-primary">
                  <span className="font-headline-lg text-headline-lg font-bold">
                    +{35 * earnVelocity}
                  </span>
                  <span className="font-label-md text-label-md uppercase">Pts</span>
                </div>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full w-2/3 rounded-full"></div>
              </div>
            </div>

            {/* Floor Redemption Stepper */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Min. Redemption Floor
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Minimum spend block required
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest tactile-convex-sm">
                <span className="font-label-md text-label-md font-bold text-on-surface">
                  {minFloor} PTS
                </span>
                <span className="font-body-sm text-body-sm text-outline">
                  (${(minFloor / 100).toFixed(2)})
                </span>
              </div>
            </div>
          </section>

          {/* Security / NFC Telemetry Capsule */}
          <div className="bg-surface-container-low rounded-xl tactile-convex p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface tactile-deboss flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[22px]">contactless</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  Google Smart Tap v3.2
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  AES-128 NFC Cryptographic Payload
                </span>
              </div>
            </div>
            <div className="w-3 h-3 rounded-full bg-tertiary tactile-active-glow animate-ping"></div>
          </div>
        </div>

        {/* COLUMN 2: 3D ROTARY DIAL & REWARDS VOUCHERS (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Central Tactile Rotary Module */}
          <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col items-center justify-between gap-4 relative overflow-hidden">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-surface-container-lowest tactile-convex-sm flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[18px]">donut_large</span>
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Tier Architecture Matrix
                </span>
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                Rotary Calibrator
              </span>
            </div>

            {/* 3D Concentric Rotary Gauge Container */}
            <div className="relative w-64 h-64 my-2 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-surface tactile-deboss flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="68" fill="none" stroke="#d1d9e6" strokeWidth="8" strokeLinecap="round" />
                  <circle
                    cx="80"
                    cy="80"
                    r="68"
                    fill="none"
                    stroke="#ff5722"
                    strokeWidth="8"
                    strokeDasharray="427"
                    strokeDashoffset="130"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(255,87,34,0.6))' }}
                  />
                </svg>
              </div>

              <div className="absolute w-48 h-48 rounded-full bg-surface-container-low tactile-convex flex items-center justify-center">
                <div className="absolute inset-2 rounded-full border-dashed border border-surface-container-highest opacity-70"></div>
                <div className="w-36 h-36 rounded-full bg-surface-container-lowest tactile-convex flex flex-col items-center justify-center p-3 relative cursor-pointer active:scale-95 transition-transform group">
                  <div className="absolute top-2 w-1.5 h-3.5 rounded-full bg-primary-container tactile-active-glow"></div>
                  <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider font-semibold">
                    Tier Level
                  </span>
                  <span className="font-display-xl text-display-xl text-primary leading-none font-bold group-hover:scale-105 transition-transform">
                    3
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold tracking-tight">
                    Active Tiers
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                  </div>
                </div>
              </div>

              <div className="absolute top-1 right-2 px-2.5 py-1 rounded-full bg-surface-container-lowest tactile-convex-sm text-on-surface font-label-sm text-label-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                <span>VIP Plat</span>
              </div>
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-surface-container-lowest tactile-convex-sm text-on-surface font-label-sm text-label-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-outline"></span>
                <span>Silver (0-1.4k)</span>
              </div>
            </div>

            {/* Multipliers Bar */}
            <div className="w-full grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-surface tactile-deboss flex flex-col items-center text-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Silver</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">1.0x</span>
                <span className="font-body-sm text-body-sm text-outline">Base Rate</span>
              </div>
              <div className="p-2.5 rounded-lg bg-primary-fixed tactile-convex-sm flex flex-col items-center text-center">
                <span className="font-label-sm text-label-sm text-primary font-bold">Gold (Mid)</span>
                <span className="font-headline-sm text-headline-sm text-primary font-bold">1.25x</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">1,500 Pts</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface tactile-deboss flex flex-col items-center text-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">VIP Plat</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">1.50x</span>
                <span className="font-body-sm text-body-sm text-outline">4,000 Pts</span>
              </div>
            </div>
          </section>

          {/* Rewards Vouchers Plate */}
          <section className="bg-surface-container-low rounded-xl tactile-convex p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-surface-container-lowest tactile-convex-sm flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[18px]">redeem</span>
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Redeemable Rewards</span>
              </div>
              <button
                onClick={() => {
                  sounds.click();
                  setVouchers((prev) => [
                    ...prev,
                    {
                      id: `v${prev.length + 1}`,
                      title: 'Special House Pairing',
                      subtitle: 'Seasonal Chef Special Voucher',
                      points: 1200,
                      icon: 'local_bar',
                      colorBg: 'bg-primary-fixed text-primary',
                    },
                  ]);
                }}
                className="px-3 py-1 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md font-semibold tactile-convex-sm hover:bg-primary-container hover:text-on-primary active:scale-95 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Voucher</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {vouchers.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-lg bg-surface-container-lowest tactile-convex-sm flex items-center justify-between gap-3 hover:translate-x-1 transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${v.colorBg}`}>
                      <span className="material-symbols-outlined text-[20px]">{v.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        {v.title}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {v.subtitle}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-surface tactile-deboss font-label-sm text-label-sm font-bold text-primary">
                      {v.points} PTS
                    </span>
                    <button className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-outline">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* COLUMN 3: LIVE GOOGLE WALLET SIMULATOR (3 COLS) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <section className="bg-surface-container-low rounded-xl tactile-convex p-4 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-active-glow"></span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Wallet Simulator</span>
              </div>
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                Pixel 8 Emulation
              </span>
            </div>

            {/* Smartphone Chassis */}
            <div className="w-full max-w-[280px] bg-surface-container-high rounded-xl tactile-convex p-3 flex flex-col items-center relative">
              <div className="w-16 h-1 rounded-full bg-surface-variant mb-2"></div>
              <div className="w-full bg-[#111315] rounded-lg p-3.5 text-white flex flex-col gap-3 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/20 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs">
                      B
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold tracking-tight text-white leading-tight">
                        Banlis Bistro
                      </span>
                      <span className="text-[9px] text-[#A6AFBF]">{programName}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-white text-[16px]">contactless</span>
                </div>

                <div className="p-2.5 rounded-md bg-white/10 backdrop-blur-md flex flex-col gap-1 relative z-10 border border-white/5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] uppercase tracking-wider text-[#A6AFBF]">Member</span>
                    <span className="text-[9px] uppercase tracking-widest text-[#FF5722] font-bold">
                      Gold Tier
                    </span>
                  </div>
                  <span className="text-[13px] font-semibold text-white">Marcus Vance</span>
                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <div className="text-[8px] uppercase tracking-wider text-[#A6AFBF]">Points Balance</div>
                      <div className="text-[20px] font-light text-white leading-none">
                        {welcomeActive ? welcomeGrant : 0}{' '}
                        <span className="text-[10px] text-[#FF5722] font-semibold">PTS</span>
                      </div>
                    </div>
                    {welcomeActive && (
                      <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded text-white">
                        +{welcomeGrant} Grant
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-md p-2 flex flex-col items-center justify-center gap-1">
                  <svg className="w-full h-9" preserveAspectRatio="none" viewBox="0 0 120 30">
                    {Array.from({ length: 22 }).map((_, i) => (
                      <rect key={i} x={i * 5.5} y="0" width={(i % 2) + 1.5} height="30" fill="#000" />
                    ))}
                  </svg>
                  <span className="text-[8px] tracking-widest text-[#191c1e] font-mono font-medium">
                    9842 1049 8831
                  </span>
                </div>

                <div
                  onClick={() => sounds.chime()}
                  className="w-full py-1.5 px-3 rounded-full bg-black border border-white/20 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px] text-white">wallet</span>
                  <span className="text-[10px] font-medium text-white tracking-wide">
                    Add to Google Wallet
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full p-3 rounded-lg bg-surface tactile-deboss flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                  NFC Node Status
                </span>
                <span className="font-label-sm text-label-sm text-tertiary font-bold">18 Nodes Ready</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-on-surface-variant">Tap Handshake Latency</span>
                <span className="text-on-surface font-semibold font-mono">34ms (Local)</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* FOOTER NAVIGATION */}
      <footer className="w-full bg-surface-container-low rounded-xl tactile-convex p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface tactile-deboss">
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Draft Autosaved
            </span>
            <span className="font-label-sm text-label-sm text-on-surface font-mono">14 seconds ago</span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
            className="px-5 py-2.5 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md tactile-convex-sm active:translate-y-0.5 transition-transform flex items-center gap-2 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back</span>
          </button>
          <button
            onClick={handleProceed}
            className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold tactile-convex-sm tactile-active-glow hover:bg-secondary-container active:scale-95 transition-all flex items-center gap-2"
          >
            <span>Proceed to Step 4: Provisioning</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
