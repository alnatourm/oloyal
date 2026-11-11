import React, { useState } from 'react';
import { ArchetypeKey, PassArchetype, SwatchColor } from '../types';
import { sounds } from '../utils/sound';

interface PassStudioViewProps {
  onPublishToFleet?: () => void;
}

export const PassStudioView: React.FC<PassStudioViewProps> = ({ onPublishToFleet }) => {
  const archetypes: Record<ArchetypeKey, PassArchetype> = {
    loyalty: {
      id: 'PASS-BANLIS-VIP-01',
      title: 'Epicurean VIP Club',
      merchant: 'Banlis Bistro & Dining',
      avatar: 'B',
      badge: 'Epicurean VIP Club',
      holderLabel: 'Cardholder',
      holderName: 'Marcus Vance',
      tierText: 'Gold VIP Tier',
      tierIcon: 'stars',
      tierBg: 'bg-primary-container/15',
      tierColor: 'text-primary-container',
      metricLabel: 'Balance',
      metricValue: '1,450',
      submetricValue: '$14.50 Value',
      nfcIcon: 'contactless',
      nfcText: 'Hold near terminal to redeem',
      barcodeType: 'barcode',
      barcodeNum: '9802 4410 7719 3321',
      showExtra: false,
      rotaryDeg: 0,
      dialSubtitle: 'Pass Class 01 • NFC Ready',
      stepperLabel: 'Loyalty / Class 01',
      accentColor: '#ff5722',
    },
    gift: {
      id: 'PASS-BANLIS-GFT-02',
      title: 'Banlis Gift Card Voucher',
      merchant: 'Banlis Bistro & Dining',
      avatar: '🎁',
      badge: 'Gift Card',
      holderLabel: 'Recipient',
      holderName: 'Marcus Vance',
      tierText: 'Card #9802 • PIN: ••••',
      tierIcon: 'lock_reset',
      tierBg: 'bg-[#107c41]/15',
      tierColor: 'text-[#107c41]',
      metricLabel: 'Gift Balance',
      metricValue: '$125.00',
      submetricValue: 'Original: $150.00',
      nfcIcon: 'qr_code_scanner',
      nfcText: 'Scan at cashier terminal to spend',
      barcodeType: 'qr',
      barcodeNum: 'GIFT-9802-8812-7740',
      showExtra: false,
      rotaryDeg: 45,
      dialSubtitle: 'Class 02 • Stored Value',
      stepperLabel: 'Gift Card / Class 02',
      accentColor: '#107c41',
    },
    ticket: {
      id: 'PASS-BANLIS-EVT-03',
      title: "Chef's Tasting Experience",
      merchant: 'Banlis Evening Event',
      avatar: '🎟️',
      badge: "Chef's Tasting Ticket",
      holderLabel: 'Guest',
      holderName: 'Marcus Vance (2 Persons)',
      tierText: 'Friday, Nov 15, 2024',
      tierIcon: 'event',
      tierBg: 'bg-[#007caf]/15',
      tierColor: 'text-[#007caf]',
      metricLabel: 'Seat & Time',
      metricValue: 'Table 08 • 7:30 PM',
      submetricValue: 'Main Dining Pavilion',
      nfcIcon: 'sensor_door',
      nfcText: 'Present at entrance gate',
      barcodeType: 'qr',
      barcodeNum: 'TKT-2024-EVT-4409',
      showExtra: true,
      rotaryDeg: 90,
      dialSubtitle: 'Class 03 • Single Admission',
      stepperLabel: 'Ticket / Class 03',
      accentColor: '#007caf',
    },
  };

  const swatches: SwatchColor[] = [
    { name: 'Terracotta', color: '#ff5722', dark: '#421305', glow: 'rgba(255, 87, 34, 0.4)' },
    { name: 'Obsidian', color: '#1e2530', dark: '#0f131a', glow: 'rgba(30, 37, 48, 0.4)' },
    { name: 'Emerald', color: '#107c41', dark: '#08381d', glow: 'rgba(16, 124, 65, 0.4)' },
    { name: 'Cobalt', color: '#1a73e8', dark: '#0b3875', glow: 'rgba(26, 115, 232, 0.4)' },
    { name: 'Champagne', color: '#d4af37', dark: '#5e4c0c', glow: 'rgba(212, 175, 55, 0.4)' },
  ];

  const [currentArchetypeKey, setCurrentArchetypeKey] = useState<ArchetypeKey>('loyalty');
  const [selectedSwatch, setSelectedSwatch] = useState<SwatchColor>(swatches[0]);
  const [sheenValue, setSheenValue] = useState<number>(72);
  const [merchantName, setMerchantName] = useState<string>('Banlis Bistro & Dining');
  const [programTitle, setProgramTitle] = useState<string>('Epicurean VIP Club');
  
  // Cardholder field toggles
  const [fields, setFields] = useState({
    pointsBalance: true,
    tierBadge: true,
    expirationCountdown: false,
    proximityBeacon: true,
  });

  const [testPushStatus, setTestPushStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [simTapStatus, setSimTapStatus] = useState<boolean>(false);
  const [publishStatus, setPublishStatus] = useState<boolean>(false);

  const archetypeKeys: ArchetypeKey[] = ['loyalty', 'gift', 'ticket'];
  const activeArchetype = archetypes[currentArchetypeKey];

  const handleArchetypeChange = (key: ArchetypeKey) => {
    sounds.dialTick();
    setCurrentArchetypeKey(key);
    setProgramTitle(archetypes[key].title);
    setMerchantName(archetypes[key].merchant);
  };

  const handleNextArchetype = () => {
    const idx = archetypeKeys.indexOf(currentArchetypeKey);
    const nextKey = archetypeKeys[(idx + 1) % archetypeKeys.length];
    handleArchetypeChange(nextKey);
  };

  const handlePrevArchetype = () => {
    const idx = archetypeKeys.indexOf(currentArchetypeKey);
    const prevKey = archetypeKeys[(idx - 1 + archetypeKeys.length) % archetypeKeys.length];
    handleArchetypeChange(prevKey);
  };

  const handleSwatchSelect = (swatch: SwatchColor) => {
    sounds.click(1000, 0.02);
    setSelectedSwatch(swatch);
  };

  const handleTestPush = () => {
    sounds.click(1200, 0.03);
    setTestPushStatus('sending');
    setTimeout(() => {
      setTestPushStatus('sent');
      setTimeout(() => setTestPushStatus('idle'), 2000);
    }, 800);
  };

  const handleSimulateTap = () => {
    sounds.chime();
    setSimTapStatus(true);
    setTimeout(() => setSimTapStatus(false), 1800);
  };

  const handlePublish = () => {
    sounds.chime();
    setPublishStatus(true);
    if (onPublishToFleet) onPublishToFleet();
    setTimeout(() => setPublishStatus(false), 2500);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg select-none">
      {/* TOP SUB-HEADER / TOOL RIBBON */}
      <header className="w-full bg-surface-container-low rounded-xl px-6 py-3 tactile-convex flex flex-wrap items-center justify-between gap-4">
        {/* Left: Breadcrumb & Class ID */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface tactile-deboss">
            <span className="material-symbols-outlined text-primary-container text-[18px]">verified</span>
            <span className="font-label-md text-label-md text-on-surface tracking-wider uppercase">Pass Studio</span>
            <span className="text-outline-variant">/</span>
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">Loyalty Pass Designer</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-surface-container-lowest tactile-convex-sm font-label-sm text-label-sm text-outline tracking-wider font-semibold">
            ID: {activeArchetype.id}
          </div>
        </div>

        {/* Center: Smart Tap Status & Latency */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface tactile-deboss">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
            </span>
            <span className="font-label-md text-label-md text-on-surface font-semibold tracking-wider">
              Google Smart Tap v3.2
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="font-label-sm text-label-sm text-tertiary font-medium">Sync: 12ms</span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleArchetypeChange('loyalty')}
            className="px-4 py-2 rounded-full bg-surface-container-lowest text-on-surface-variant hover:text-on-surface font-label-md text-label-md tracking-wider uppercase tactile-convex-sm active:translate-y-0.5 transition-all"
            type="button"
          >
            Revert Draft
          </button>
          <button
            className="px-4 py-2 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md tracking-wider uppercase tactile-convex-sm flex items-center gap-1.5 active:translate-y-0.5 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">smartphone</span>
            Android 14
          </button>
          <button
            onClick={handlePublish}
            className="px-5 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold tracking-wider uppercase tactile-active-glow flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all"
            type="button"
          >
            <span>{publishStatus ? 'Published to Fleet!' : 'Publish to Fleet'}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </header>

      {/* MAIN THREE-COLUMN STUDIO WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* COLUMN 1: Pass Architecture & Geometry (Left Panel ~320px) */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          {/* Step 1: Program & Merchant Identity */}
          <section className="p-5 rounded-xl bg-surface-container-low tactile-convex flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-label-sm text-label-sm text-primary font-bold">
                  1
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Merchant Identity</h2>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">domain</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                Merchant Legal Entity
              </label>
              <div className="h-10 px-3.5 rounded-lg bg-surface tactile-deboss flex items-center">
                <input
                  className="bg-transparent w-full font-body-sm text-body-sm text-on-surface focus:outline-none font-medium"
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                Program / Class Title
              </label>
              <div className="h-10 px-3.5 rounded-lg bg-surface tactile-deboss flex items-center">
                <input
                  className="bg-transparent w-full font-body-sm text-body-sm text-on-surface focus:outline-none font-medium"
                  type="text"
                  value={programTitle}
                  onChange={(e) => setProgramTitle(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <label className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                Pass Archetype
              </label>
              <div className="grid grid-cols-3 gap-2">
                {archetypeKeys.map((key) => {
                  const isActive = currentArchetypeKey === key;
                  const icons: Record<ArchetypeKey, string> = {
                    loyalty: 'loyalty',
                    gift: 'card_giftcard',
                    ticket: 'confirmation_number',
                  };
                  return (
                    <button
                      key={key}
                      onClick={() => handleArchetypeChange(key)}
                      className={`py-2.5 px-2 rounded-lg font-label-sm text-label-sm flex flex-col items-center gap-1 transition-all duration-200 capitalize ${
                        isActive
                          ? 'bg-surface-container-lowest text-primary-container tactile-active-glow font-semibold scale-105'
                          : 'bg-surface text-on-surface-variant tactile-convex-sm hover:text-on-surface'
                      }`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {icons[key]}
                      </span>
                      {key === 'loyalty' ? 'Loyalty' : key === 'gift' ? 'Gift Card' : 'Ticket'}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Step 2: Barcode & Transmission Protocol */}
          <section className="p-5 rounded-xl bg-surface-container-low tactile-convex flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-label-sm text-label-sm text-primary font-bold">
                  2
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Transmission Protocol</h2>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">contactless</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="p-3 rounded-lg bg-surface-container-lowest tactile-convex-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[20px]">nfc</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">NFC Smart Tap</span>
                    <span className="font-body-sm text-body-sm text-outline">Encrypted Terminal Sync</span>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-active-glow"></span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface tactile-deboss flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-outline text-[18px]">qr_code_2</span>
                  <span className="font-body-sm text-body-sm text-on-surface">Dynamic QR Code</span>
                </div>
                <span className="font-label-sm text-label-sm text-outline">Auto</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface tactile-deboss flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-outline text-[18px]">barcode</span>
                  <span className="font-body-sm text-body-sm text-on-surface">Code 128 (Laser Scan)</span>
                </div>
                <span className="font-label-sm text-label-sm text-outline">Aux</span>
              </div>
            </div>
          </section>

          {/* Step 3: Cardholder Fields Configuration */}
          <section className="p-5 rounded-xl bg-surface-container-low tactile-convex flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center font-label-sm text-label-sm text-primary font-bold">
                  3
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Field Attributes</h2>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">tune</span>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              {[
                { key: 'pointsBalance', label: 'Points Accrual Balance' },
                { key: 'tierBadge', label: 'Member Tier Badge' },
                { key: 'expirationCountdown', label: 'Expiration Countdown' },
                { key: 'proximityBeacon', label: 'Lockscreen Proximity Beacon' },
              ].map(({ key, label }) => {
                const isChecked = fields[key as keyof typeof fields];
                return (
                  <label
                    key={key}
                    onClick={() => {
                      sounds.click(700, 0.015);
                      setFields((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
                    }}
                    className="flex items-center justify-between cursor-pointer py-1"
                  >
                    <span className="font-body-sm text-body-sm text-on-surface">{label}</span>
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                        isChecked
                          ? 'bg-primary-container justify-end tactile-active-glow'
                          : 'bg-surface-container-highest justify-start tactile-deboss'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-surface-container-lowest shadow-md"></div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        </aside>

        {/* COLUMN 2: 3D Porcelain Calibration Rotary Dial (Center ~460px) */}
        <main className="lg:col-span-5 flex flex-col gap-4">
          {/* Focal Porcelain Dial Panel */}
          <section className="p-6 rounded-xl bg-surface-container-low tactile-convex flex flex-col items-center relative overflow-hidden">
            {/* Calibration Header */}
            <div className="w-full flex items-center justify-between mb-4">
              <div>
                <span className="font-label-sm text-label-sm text-outline tracking-wider uppercase">
                  Pass Archetype Selector
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Mode Dial Calibration
                </h3>
              </div>
              <button
                onClick={handleNextArchetype}
                className="w-9 h-9 rounded-full bg-surface tactile-convex-sm flex items-center justify-center text-primary-container hover:rotate-45 transition-transform"
                title="Rotate Dial"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">rotate_right</span>
              </button>
            </div>

            {/* The Concentric 3D Ceramic Dial Container */}
            <div className="relative w-80 h-80 my-2 flex items-center justify-center select-none">
              {/* Outer Stepped Shadow Basin */}
              <div className="absolute inset-0 rounded-full bg-surface-container tactile-deboss"></div>

              {/* Graduated Tick Ring (SVG) */}
              <svg className="absolute inset-3 w-[296px] h-[296px] pointer-events-none" viewBox="0 0 300 300">
                <circle
                  cx="150"
                  cy="150"
                  r="128"
                  fill="none"
                  stroke="#e0e3e6"
                  strokeWidth="6"
                  strokeDasharray="680"
                  strokeDashoffset="140"
                  strokeLinecap="round"
                />
                {/* Active Orange Arc */}
                <circle
                  cx="150"
                  cy="150"
                  r="128"
                  fill="none"
                  stroke={selectedSwatch.color}
                  strokeWidth="7"
                  strokeDasharray="680"
                  strokeDashoffset="360"
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 8px ${selectedSwatch.glow})`,
                    transition: 'stroke 0.3s, filter 0.3s, stroke-dashoffset 0.5s',
                  }}
                />
                {/* Ticks */}
                <g opacity="0.45" stroke="#907067" strokeWidth="1.5">
                  <line x1="150" y1="14" x2="150" y2="22" />
                  <line x1="202" y1="28" x2="198" y2="36" />
                  <line x1="246" y1="68" x2="239" y2="74" />
                  <line x1="272" y1="120" x2="264" y2="122" />
                  <line x1="268" y1="178" x2="260" y2="176" />
                  <line x1="239" y1="232" x2="233" y2="226" />
                  <line x1="192" y1="270" x2="189" y2="262" />
                  <line x1="138" y1="284" x2="138" y2="276" />
                  <line x1="84" y1="268" x2="88" y2="260" />
                  <line x1="44" y1="228" x2="50" y2="222" />
                  <line x1="24" y1="172" x2="32" y2="172" />
                  <line x1="30" y1="114" x2="38" y2="118" />
                  <line x1="60" y1="64" x2="67" y2="70" />
                  <line x1="104" y1="28" x2="108" y2="36" />
                </g>
              </svg>

              {/* Middle Beveled Ceramic Tier */}
              <div
                className="w-60 h-60 rounded-full bg-surface-container-low tactile-convex flex items-center justify-center relative transition-transform duration-500 ease-out cursor-pointer"
                style={{ transform: `rotate(${activeArchetype.rotaryDeg}deg)` }}
                onClick={handleNextArchetype}
              >
                {/* Indicator Pin */}
                <div
                  className="absolute top-2 w-3.5 h-3.5 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: selectedSwatch.color,
                    boxShadow: `0 0 12px ${selectedSwatch.glow}`,
                  }}
                ></div>

                {/* Inner Ceramic Rotating Core Well - Counter-rotated so text remains horizontal! */}
                <div
                  className="w-44 h-44 rounded-full bg-surface tactile-deboss flex flex-col items-center justify-center p-3 text-center transition-transform duration-500 ease-out origin-center"
                  style={{ transform: `rotate(-${activeArchetype.rotaryDeg}deg)` }}
                >
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-container/15 text-primary text-label-sm font-bold uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container tactile-active-glow"></span>
                    Active Mode
                  </div>
                  <div className="flex items-baseline justify-center">
                    <span
                      className="font-headline-lg text-headline-lg font-bold tracking-tight uppercase transition-colors duration-300"
                      style={{ color: selectedSwatch.color }}
                    >
                      {currentArchetypeKey}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-outline font-medium mt-0.5">
                    {activeArchetype.dialSubtitle}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    {archetypeKeys.map((k) => (
                      <span
                        key={k}
                        className={`rounded-full transition-all ${
                          k === currentArchetypeKey
                            ? 'w-2.5 h-2.5 bg-primary-container tactile-active-glow'
                            : 'w-1.5 h-1.5 bg-outline-variant'
                        }`}
                      ></span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Precision Stepper Pills Below Dial */}
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={handlePrevArchetype}
                className="w-10 h-10 rounded-full bg-surface-container-lowest tactile-convex-sm flex items-center justify-center text-on-surface hover:text-primary active:scale-95 transition-all"
                title="Previous Archetype"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <div className="px-5 py-2 rounded-full bg-surface tactile-deboss flex items-center gap-2.5">
                <span className="font-label-md text-label-md uppercase tracking-wider text-outline">Archetype</span>
                <span className="font-label-md text-label-md font-bold" style={{ color: selectedSwatch.color }}>
                  {activeArchetype.stepperLabel}
                </span>
              </div>
              <button
                onClick={handleNextArchetype}
                className="w-10 h-10 rounded-full text-white tactile-active-glow flex items-center justify-center active:scale-95 transition-all"
                style={{ backgroundColor: selectedSwatch.color }}
                title="Next Archetype"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </section>

          {/* Tactile Color Palette Swatches */}
          <section className="p-5 rounded-xl bg-surface-container-low tactile-convex flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-headline-sm text-on-surface">Substrate Ceramic Swatches</span>
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">5 Tones</span>
            </div>
            <div className="grid grid-cols-5 gap-3 py-1">
              {swatches.map((swatch) => {
                const isSelected = selectedSwatch.name === swatch.name;
                return (
                  <button
                    key={swatch.name}
                    onClick={() => handleSwatchSelect(swatch)}
                    className="group flex flex-col items-center gap-1.5 focus:outline-none"
                    type="button"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
                        isSelected ? 'scale-105 tactile-active-glow' : 'tactile-convex-sm'
                      }`}
                      style={{
                        backgroundColor: swatch.color,
                        boxShadow: isSelected ? `0 0 16px ${swatch.glow}` : undefined,
                      }}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-white text-[18px]">check</span>
                      )}
                    </div>
                    <span
                      className={`font-label-sm text-label-sm ${
                        isSelected ? 'text-on-surface font-semibold' : 'text-outline font-medium'
                      }`}
                    >
                      {swatch.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Slider Bar: Luminance & Sheen */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Luminance &amp; Metallic Sheen
                </span>
                <span className="font-label-sm text-label-sm font-bold" style={{ color: selectedSwatch.color }}>
                  {sheenValue}% Translucent
                </span>
              </div>
              <div className="relative w-full h-4 rounded-full bg-surface tactile-deboss flex items-center px-1">
                <div
                  className="h-2 rounded-full transition-all duration-150"
                  style={{
                    width: `${sheenValue}%`,
                    backgroundColor: selectedSwatch.color,
                  }}
                ></div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={sheenValue}
                  onChange={(e) => setSheenValue(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div
                  className="absolute w-6 h-6 rounded-full bg-surface-container-lowest tactile-convex-sm flex items-center justify-center pointer-events-none shadow-md transition-all duration-150"
                  style={{ left: `calc(${sheenValue}% - 12px)` }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedSwatch.color }}
                  ></div>
                </div>
              </div>
            </div>
          </section>

          {/* Asset Upload & Identity Badges */}
          <section className="p-5 rounded-xl bg-surface-container-low tactile-convex flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl bg-surface tactile-deboss flex items-center justify-center font-headline-md text-headline-md font-bold"
                style={{ color: selectedSwatch.color }}
              >
                {activeArchetype.avatar}
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Hero Monogram &amp; Stamp
                </span>
                <span className="font-body-sm text-body-sm text-outline">Vector SVG • Transparent Mask</span>
              </div>
            </div>
            <button
              onClick={() => sounds.click(900, 0.02)}
              className="px-4 py-2 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm uppercase tracking-wider tactile-convex-sm hover:text-primary active:scale-95 transition-all"
              type="button"
            >
              Replace SVG
            </button>
          </section>
        </main>

        {/* COLUMN 3: Live 3D Pass Simulator & Fleet Telemetry (~380px) */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          {/* Live Android Wallet Pass Simulator Card */}
          <section className="p-6 rounded-xl bg-surface-container-low tactile-convex flex flex-col items-center">
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[18px]">
                  phone_android
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Live Wallet Simulator</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface tactile-deboss">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Render 60fps</span>
              </div>
            </div>

            {/* Rendered Google Wallet Pass Card */}
            <div
              className={`w-full rounded-2xl bg-gradient-to-br from-surface-container-lowest via-surface to-surface-container-low p-5 shadow-2xl relative overflow-hidden transition-all duration-300 ${
                simTapStatus ? 'ring-4 ring-primary-container scale-[1.02]' : 'hover:-translate-y-1'
              }`}
            >
              {/* Porcelain Shimmer Flare */}
              <div
                className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-colors duration-300"
                style={{ backgroundColor: `${selectedSwatch.color}25` }}
              ></div>

              {/* Dynamic Accent Strip */}
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{
                  background: `linear-gradient(to right, ${selectedSwatch.color}, #fe6f42, ${selectedSwatch.color})`,
                  opacity: 0.85,
                }}
              ></div>

              {/* Pass Content Inner */}
              <div className="transition-all duration-200">
                {/* Pass Top Bar */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold tactile-active-glow transition-colors duration-300"
                      style={{ backgroundColor: selectedSwatch.color }}
                    >
                      {activeArchetype.avatar}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-bold tracking-tight">
                        {merchantName}
                      </span>
                      <span
                        className="font-label-sm text-label-sm uppercase font-semibold tracking-wider transition-colors duration-300"
                        style={{ color: selectedSwatch.color }}
                      >
                        {programTitle}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-highest/60 text-on-surface font-label-sm text-label-sm font-medium">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">
                      account_balance_wallet
                    </span>
                    <span>Wallet</span>
                  </div>
                </div>

                {/* Cardholder Section */}
                <div className="mt-6 flex items-end justify-between relative z-10">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                      {activeArchetype.holderLabel}
                    </span>
                    <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                      {activeArchetype.holderName}
                    </span>
                    {fields.tierBadge && (
                      <div
                        className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full ${activeArchetype.tierBg} ${activeArchetype.tierColor} w-fit font-label-sm text-label-sm font-bold`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {activeArchetype.tierIcon}
                        </span>
                        <span>{activeArchetype.tierText}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                      {activeArchetype.metricLabel}
                    </span>
                    <span
                      className="font-display-xl-mobile text-display-xl-mobile font-bold tracking-tight transition-colors duration-300"
                      style={{ color: selectedSwatch.color }}
                    >
                      {activeArchetype.metricValue}
                    </span>
                    <span className="font-label-sm text-label-sm text-outline-variant font-medium">
                      {activeArchetype.submetricValue}
                    </span>
                  </div>
                </div>

                {/* Extra Ticket Info if applicable */}
                {activeArchetype.showExtra && (
                  <div className="mt-3 pt-2 border-t border-surface-container-highest/60 flex items-center justify-between text-xs text-on-surface-variant font-medium">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-tertiary">schedule</span> Doors 7:00 PM
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">local_parking</span> Valet Included
                    </span>
                  </div>
                )}

                {/* Barcode & NFC Zone */}
                <div className="mt-5 pt-3 rounded-xl bg-surface-container-lowest/80 p-3 flex flex-col items-center gap-2 tactile-deboss">
                  <div className="flex items-center gap-1.5 text-on-surface font-label-sm text-label-sm font-medium">
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ color: selectedSwatch.color }}
                    >
                      {activeArchetype.nfcIcon}
                    </span>
                    <span>{activeArchetype.nfcText}</span>
                  </div>

                  {/* Barcode Graphic */}
                  <div className="w-full flex items-center justify-center py-1">
                    {activeArchetype.barcodeType === 'barcode' ? (
                      <svg className="w-full h-12 px-2" preserveAspectRatio="none" viewBox="0 0 280 48">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <rect
                            key={i}
                            x={i * 7}
                            y="0"
                            width={(i % 3) + 1.5}
                            height="48"
                            fill="#191c1e"
                          />
                        ))}
                      </svg>
                    ) : (
                      <div className="flex items-center justify-center p-1 bg-white rounded-lg border border-surface-container">
                        <svg className="w-14 h-14" viewBox="0 0 29 29" fill="#191c1e">
                          <path d="M0 0h7v7H0zM2 2v3h3V2zM9 0h2v1H9zM12 0h1v3h-1zM14 0h3v1h-3zM18 0h1v1h-1zM20 0h2v1h-2zM22 0h7v7h-7zM24 2v3h3V2zM0 9h1v3H0zM2 9h2v1H2zM5 9h1v2H5zM7 9h2v2H7zM10 9h1v1h-1zM12 9h3v1h-3zM17 9h1v2h-1zM20 9h1v1h-1zM22 9h2v1h-2zM25 9h2v1h-2zM28 9h1v3h-1zM0 22h7v7H0zM2 24v3h3v-3zM9 22h2v1H9zM12 22h2v3h-2zM15 22h2v1h-2zM18 22h1v1h-1zM20 22h2v1h-2zM23 22h2v2h-2zM26 22h3v1h-3zM9 26h1v3H9zM12 26h1v1h-1zM14 26h2v1h-2zM18 26h1v2h-1zM20 26h3v1h-3zM25 26h2v1h-2zM28 26h1v3h-1zM3 3h1v1H3zM25 3h1v1h-1zM3 25h1v1H3zM10 12h2v2h-2zM13 13h3v3h-3zM17 12h2v2h-2zM12 16h2v2h-2zM15 16h3v2h-3zM10 18h2v2h-2zM18 18h2v2h-2zM12 20h2v2h-2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="font-label-sm text-label-sm text-outline tracking-widest font-mono">
                    {activeArchetype.barcodeNum}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Test Controls */}
            <div className="grid grid-cols-2 gap-2.5 w-full mt-4">
              <button
                onClick={handleTestPush}
                className="py-2.5 px-3 rounded-xl bg-surface-container-lowest tactile-convex-sm font-label-sm text-label-sm text-on-surface font-semibold flex items-center justify-center gap-1.5 hover:text-primary active:translate-y-0.5 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-primary-container">
                  {testPushStatus === 'sending'
                    ? 'refresh'
                    : testPushStatus === 'sent'
                    ? 'check'
                    : 'notifications_active'}
                </span>
                {testPushStatus === 'sending' ? 'Sending...' : testPushStatus === 'sent' ? 'Sent!' : 'Test Push Alert'}
              </button>
              <button
                onClick={handleSimulateTap}
                className="py-2.5 px-3 rounded-xl bg-surface-container-lowest tactile-convex-sm font-label-sm text-label-sm text-on-surface font-semibold flex items-center justify-center gap-1.5 hover:text-tertiary active:translate-y-0.5 transition-all"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary">
                  {simTapStatus ? 'check_circle' : 'tap_and_play'}
                </span>
                {simTapStatus ? 'NFC Synced!' : 'Simulate Tap'}
              </button>
            </div>
          </section>

          {/* Fleet Distribution Velocity Card */}
          <section className="p-5 rounded-xl bg-surface-container-low tactile-convex flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Fleet Deployment Velocity
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-lg text-headline-lg text-on-surface font-bold">3,842</span>
                  <span className="font-label-sm text-label-sm text-primary font-bold bg-primary-container/15 px-2 py-0.5 rounded-full">
                    +28% MoM
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[20px]">hub</span>
            </div>

            {/* Spline Velocity Chart */}
            <div className="w-full h-20 pt-1">
              <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="metricGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={selectedSwatch.color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={selectedSwatch.color} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 65 Q 45 60 75 48 T 150 42 T 225 24 T 300 12 L 300 80 L 0 80 Z"
                  fill="url(#metricGlow)"
                />
                <path
                  d="M 0 65 Q 45 60 75 48 T 150 42 T 225 24 T 300 12"
                  fill="none"
                  stroke={selectedSwatch.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle
                  cx="300"
                  cy="12"
                  r="4.5"
                  fill={selectedSwatch.color}
                  style={{ filter: `drop-shadow(0 0 6px ${selectedSwatch.glow})` }}
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-outline font-label-sm text-label-sm pt-1">
              <span>Active Google Wallet Nodes</span>
              <span className="text-on-surface font-semibold">99.98% Cryptographic Uptime</span>
            </div>
          </section>
        </aside>
      </div>

      {/* FLOATING HARDWARE PROTOCOL STRIP */}
      <footer className="w-full bg-surface-container-low rounded-xl px-6 py-3 tactile-convex flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-active-glow"></div>
          <span className="font-label-md text-label-md text-on-surface font-medium">
            Google Pay Smart Tap Protocol v3.2 Verified
          </span>
          <span className="text-outline-variant">•</span>
          <span className="font-label-sm text-label-sm text-outline">
            Station Node #01 (EMV Contactless Terminal Ready)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-outline font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[15px]">lock</span>
            <span>Cryptographic HMAC-SHA256 Signed</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-surface tactile-deboss font-label-sm text-label-sm text-tertiary font-semibold">
            SECURE CHANNEL 0x88F
          </div>
        </div>
      </footer>
    </div>
  );
};
