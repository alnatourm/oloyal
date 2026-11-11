import React, { useState } from 'react';
import { TerminalEvent } from '../types';
import { sounds } from '../utils/sound';

export const DashboardView: React.FC = () => {
  const [tapVolume, setTapVolume] = useState<number>(482);
  const [zeroTapActive, setZeroTapActive] = useState<boolean>(true);
  const [timeFilter, setTimeFilter] = useState<'today' | '7d' | '30d'>('today');
  const [pushNotice, setPushNotice] = useState<boolean>(false);

  const events: TerminalEvent[] = [
    {
      id: 'evt-1',
      memberName: 'Marcus Vance',
      tier: 'GOLD',
      action: '-$10.00 Off • Tap & Pay • Table #08',
      location: 'Main Dining',
      pointsDelta: 550,
      timestamp: '2m ago',
      icon: 'credit_card',
      type: 'card',
    },
    {
      id: 'evt-2',
      memberName: 'Elena Rostova',
      tier: 'SILVER',
      action: '$35.00 Bill • NFC Tap • Patio #14',
      location: 'Patio',
      pointsDelta: 120,
      timestamp: '14m ago',
      icon: 'contactless',
      type: 'nfc',
    },
    {
      id: 'evt-3',
      memberName: 'David Chen',
      tier: 'GOLD',
      action: '-600 pts • Truffle Risotto Voucher',
      location: 'Kitchen',
      pointsDelta: -600,
      timestamp: '28m ago',
      icon: 'redeem',
      type: 'redeem',
    },
    {
      id: 'evt-4',
      memberName: 'Sarah Jenkins',
      tier: 'BRONZE',
      action: 'New Pass • Google Wallet Installed',
      location: 'Table QR',
      pointsDelta: 100,
      timestamp: '45m ago',
      icon: 'wallet',
      type: 'install',
    },
  ];

  const handleAdjustTaps = (delta: number) => {
    sounds.dialTick();
    setTapVolume((prev) => Math.max(0, prev + delta));
  };

  const handlePushPromo = () => {
    sounds.chime();
    setPushNotice(true);
    setTimeout(() => setPushNotice(false), 2500);
  };

  return (
    <div className="flex flex-col w-full gap-6 select-none">
      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 rounded-full bg-surface-container-low tactile-card flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-glow animate-pulse"></span>
            <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface font-semibold">
              Merchant POS Node #01
            </span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-surface-dim"></div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Main Dining &amp; Bar Patio • POS Terminal #3
          </span>
          <div className="px-3 py-1 rounded-full bg-surface-container-high/50 tactile-deboss flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-primary-container">
              wifi_tethering
            </span>
            <span>{tapVolume} Taps Today</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
            Timeframe:
          </span>
          <div className="p-1 rounded-full bg-surface-container-high/60 tactile-deboss flex items-center gap-1">
            {(['today', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  sounds.click();
                  setTimeFilter(tf);
                }}
                className={`px-3 py-1 rounded-full font-label-md text-label-md transition-all ${
                  timeFilter === tf
                    ? 'bg-surface-container text-primary-container font-semibold tactile-glow'
                    : 'text-on-surface-variant hover:bg-surface-container/50 font-medium'
                }`}
              >
                {tf === 'today' ? 'Today' : tf.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handlePushPromo}
            className="px-4 py-2 rounded-full bg-primary-container text-on-primary tactile-glow font-label-md text-label-md font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">campaign</span>
            {pushNotice ? 'Push Sent!' : 'Push Promo'}
          </button>
        </div>
      </div>

      {/* 5-Grid Merchant Business KPI Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Today's Revenue */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Today's Revenue
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary-container">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              $3,420
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface-variant">.50</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">arrow_outward</span>+18.4%
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">vs yesterday</span>
          </div>
        </div>

        {/* KPI 2: Active Passes */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Active Passes
            </span>
            <button
              onClick={() => sounds.click()}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface hover:text-primary-container"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              3,842
            </span>
            <span className="font-label-md text-label-md uppercase text-on-surface-variant">
              members
            </span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span className="text-primary-container font-semibold">94% Google Wallet</span>
            <span>+12 today</span>
          </div>
        </div>

        {/* KPI 3: Redemption Rate */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Redemption Rate
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary-container">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              28.4%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>+4.2%
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">vs last mo</span>
          </div>
        </div>

        {/* KPI 4: Avg Check */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Avg Check
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary-container">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              $48.20
            </span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <span>$32.00 Non-member</span>
          </div>
        </div>

        {/* KPI 5: Points Liability */}
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Points Liability
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-primary-container">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
              184.2K
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">pts</span>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
            <span className="text-on-surface font-semibold">$1,842.00</span>
            <span>reserve</span>
          </div>
        </div>
      </div>

      {/* 3-Column Ergonomic Arrangement */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Live Terminal Activity Stream */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="p-6 rounded-xl bg-surface-container-low tactile-card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse"></div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Terminal Live Stream
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">
                Real-Time
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
              Live tap telemetry &amp; voucher redemptions from POS nodes
            </p>

            {/* Stream Feed Cards */}
            <div className="flex flex-col gap-3">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl bg-surface-container-high/40 tactile-deboss flex items-center justify-between gap-3 hover:bg-surface-container-high/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-full bg-surface-container tactile-card flex items-center justify-center shrink-0">
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          evt.type === 'card'
                            ? 'text-primary-container'
                            : evt.type === 'nfc'
                            ? 'text-tertiary'
                            : 'text-secondary'
                        }`}
                      >
                        {evt.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface truncate">
                          {evt.memberName}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm font-bold ${
                            evt.tier === 'GOLD'
                              ? 'bg-primary-fixed text-primary'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          {evt.tier}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                        {evt.action}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-label-md text-label-md font-bold ${
                        evt.pointsDelta >= 0 ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      {evt.pointsDelta >= 0 ? `+${evt.pointsDelta} pts` : `${evt.pointsDelta} pts`}
                    </span>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">
                      {evt.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Zero-Tap Auto Redeem Toggle */}
            <div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
              <span>Zero-Tap Auto Redeem</span>
              <button
                onClick={() => {
                  sounds.click();
                  setZeroTapActive(!zeroTapActive);
                }}
                className={`w-11 h-6 rounded-full tactile-glow flex items-center px-0.5 transition-all ${
                  zeroTapActive ? 'bg-primary-container justify-end' : 'bg-surface-container-highest justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-surface-container-lowest tactile-card shadow-sm"></div>
              </button>
            </div>
          </div>
        </div>

        {/* CENTER HERO: 3D Porcelain Concentric Tap Cadence Dial & Hourly Density Chart */}
        <div className="col-span-12 lg:col-span-5 flex flex-col items-center">
          <div className="w-full relative flex flex-col items-center p-6 rounded-xl bg-surface-container-low tactile-card">
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface font-bold">
                  Tap Cadence &amp; Frequency
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold">
                  Smart Tap Active
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">speed</span>
                POS Reader #01
              </div>
            </div>

            {/* 3D Ceramic Turntable / Dial Substrate */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 my-4 flex items-center justify-center">
              {/* Outer Concave Moat Track */}
              <div className="absolute inset-0 rounded-full bg-surface-container-high tactile-deboss flex items-center justify-center p-4">
                <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_12px_rgba(255,87,34,0.45)]" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#d8dadd"
                    strokeWidth="4.5"
                    strokeDasharray="210 264"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#ff5722"
                    strokeWidth="4.5"
                    strokeDasharray="165 264"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Middle Orbiting Ring */}
              <div className="absolute inset-8 rounded-full bg-surface-container-low tactile-card flex items-center justify-center">
                {/* Inner Concentric Stepper Dial */}
                <div className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-surface-container tactile-btn flex flex-col items-center justify-center text-center p-4 select-none group">
                  <div className="absolute top-2.5 w-2 h-2 rounded-full bg-primary-container tactile-glow"></div>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                    Today's Tap Volume
                  </span>
                  <div className="flex items-baseline justify-center gap-1 my-0.5">
                    <span className="font-display-xl text-display-xl font-bold tracking-tight text-on-surface group-hover:text-primary transition-colors">
                      {tapVolume}
                    </span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-primary-container">
                      taps
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/70 tactile-deboss text-on-surface-variant font-label-md text-label-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>
                    <span>Peak: 12-2 PM &amp; 7-9 PM</span>
                  </div>
                </div>
              </div>

              {/* Stepper Adjustment Buttons */}
              <button
                onClick={() => handleAdjustTaps(-5)}
                className="absolute left-2 w-10 h-10 rounded-full bg-surface-container tactile-btn flex items-center justify-center text-on-surface hover:text-primary-container transition-all"
                title="Decrease Tap Volume"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <button
                onClick={() => handleAdjustTaps(5)}
                className="absolute right-2 w-10 h-10 rounded-full bg-primary-container text-on-primary tactile-glow flex items-center justify-center shadow-lg active:scale-95 transition-all"
                title="Increase Tap Volume"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>

            {/* Hourly Tap Density Bar Graph */}
            <div className="w-full p-4 rounded-xl bg-surface-container-high/50 tactile-deboss">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-md text-label-md text-on-surface font-semibold uppercase tracking-wider">
                  Hourly Tap Density
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  Peak Lunch &amp; Dinner
                </span>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-20 pt-2 px-1">
                {[
                  { hour: '10a', h: '18%', peak: false },
                  { hour: '11a', h: '35%', peak: false },
                  { hour: '12p', h: '85%', peak: true },
                  { hour: '1p', h: '95%', peak: true },
                  { hour: '2p', h: '40%', peak: false },
                  { hour: '3p', h: '25%', peak: false },
                  { hour: '4p', h: '30%', peak: false },
                  { hour: '5p', h: '50%', peak: false },
                  { hour: '6p', h: '70%', peak: false },
                  { hour: '7p', h: '100%', peak: true },
                  { hour: '8p', h: '80%', peak: true },
                  { hour: '9p', h: '45%', peak: false },
                ].map((item) => (
                  <div key={item.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${
                        item.peak ? 'bg-primary-container tactile-glow' : 'bg-surface-container tactile-card'
                      }`}
                      style={{ height: item.h }}
                    ></div>
                    <span
                      className={`font-label-sm text-[10px] ${
                        item.peak ? 'text-primary font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      {item.hour}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Google Wallet Pass Simulator & Retention Pod */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
          {/* Live Google Wallet Pass */}
          <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary-container">
                  wallet
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-bold">
                  Live Google Wallet Pass
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                Simulated
              </span>
            </div>

            {/* Pass Simulation Card */}
            <div className="w-full rounded-xl bg-surface-container-lowest ring-1 ring-white/80 tactile-card p-4 flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[16px]">restaurant</span>
                  </div>
                  <span className="font-label-md text-label-md font-bold text-on-surface">
                    Banlis Bistro
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">
                  GOLD VIP
                </span>
              </div>

              <div className="mt-1">
                <div className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Member
                </div>
                <div className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Marcus Vance
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-high/40 tactile-deboss">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Reward Points
                  </span>
                  <span className="font-headline-md text-headline-md font-bold text-primary">
                    1,450 PTS
                  </span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Tier Level
                  </span>
                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                    Tier 3 / Gold
                  </span>
                </div>
              </div>

              {/* Barcode deboss zone */}
              <div className="p-2.5 rounded-lg bg-surface-container-high/60 tactile-deboss flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-0.5 h-7 w-full">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-on-surface h-full"
                      style={{ width: `${(i % 3) + 1}px` }}
                    ></div>
                  ))}
                </div>
                <span className="font-label-sm text-[10px] text-on-surface-variant tracking-widest font-mono">
                  CODE 128 • 8904-2219
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px] text-primary-container animate-pulse">
                  contactless
                </span>
                <span>Hold near terminal for Smart Tap</span>
              </div>
            </div>

            <button
              onClick={handlePushPromo}
              className="w-full py-2.5 rounded-full bg-primary-container text-on-primary tactile-glow font-label-md text-label-md font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
              Push Pass Update
            </button>
          </div>

          {/* Pass Retention Pod */}
          <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-bold">
                Google Wallet Retention
              </span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">
                98.4%
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              3,842 passes installed in Google Wallets with 0.4% opt-out rate
            </p>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-high/40 tactile-deboss">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-surface-container-low">
                  MV
                </div>
                <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-white text-xs font-bold ring-2 ring-surface-container-low">
                  ER
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold ring-2 ring-surface-container-low">
                  DC
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-label-sm text-label-sm text-on-surface font-bold ring-2 ring-surface-container-low">
                  +3.8k
                </div>
              </div>
              <div className="text-right">
                <div className="font-label-md text-label-md font-semibold text-on-surface">
                  218 Taps
                </div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">
                  Today
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
