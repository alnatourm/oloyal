import React, { useState } from 'react';
import { sounds } from '../utils/sound';

export const TermsOfServiceView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    sounds.click();
    navigator.clipboard.writeText(window.location.origin + '/terms');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col w-full gap-6 select-none max-w-4xl mx-auto pb-16 pt-2">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-surface-container-low tactile-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff5722] text-[20px]">gavel</span>
            <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-bold">
              Legal Terms &amp; Agreement
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight mt-1">
            Terms of Service - PassLoyal OS
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Last updated: <span className="font-bold text-on-surface">November 11, 2026</span> • Contact:{' '}
            <a href="mailto:alnatour.m@gmail.com" className="text-[#ff5722] font-bold hover:underline">
              alnatour.m@gmail.com
            </a>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-md text-label-md font-bold tactile-btn flex items-center gap-2 hover:text-[#ff5722]"
          >
            <span className="material-symbols-outlined text-[18px]">link</span>
            <span>{copied ? 'Direct Link Copied!' : 'Copy Terms URL'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-full bg-[#ff5722] text-white font-label-md text-label-md font-bold tactile-glow flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print Document</span>
          </button>
        </div>
      </div>

      {/* Google Pay Publishing URL Summary Pod */}
      <div className="p-4 rounded-xl bg-surface-container border border-surface-container-highest text-[12px] font-mono flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-[#ff5722] text-[18px]">verified</span>
          <span className="font-bold">Google Pay Console Form URL:</span>
          <span className="text-[#ff5722] font-bold">https://oloyal.vercel.app/terms</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText('https://oloyal.vercel.app/terms');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-sans text-[11px] font-bold hover:text-[#ff5722]"
        >
          Copy Form URL
        </button>
      </div>

      {/* Main Content Body */}
      <div className="p-8 sm:p-10 rounded-3xl bg-surface-container-low tactile-card space-y-8 text-on-surface-variant font-body-md leading-relaxed border border-white/60">
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              1
            </span>
            <span>What PassLoyal is</span>
          </h2>
          <p className="pl-10 text-on-surface">
            PassLoyal OS is a platform that lets merchants (restaurants, cafes, event venues) issue digital passes: loyalty
            cards, gift cards, event tickets, and offers / coupons. The pass is issued by the merchant, not by Google and
            not by PassLoyal.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              2
            </span>
            <span>Your pass</span>
          </h2>
          <p className="pl-10 text-on-surface">
            Your points, balance, rewards, expiry, and redemption rules are set by the merchant. PassLoyal shows what the
            merchant tells us. If a reward is not available, ask the merchant directly.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              3
            </span>
            <span>Google Wallet / Apple Wallet</span>
          </h2>
          <p className="pl-10 text-on-surface">
            When you save a pass to Google Wallet or Apple Wallet, that wallet provider's terms also apply. You can remove the
            pass from your wallet at any time.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              4
            </span>
            <span>Fair use</span>
          </h2>
          <p className="pl-10 text-on-surface">
            Do not use PassLoyal to create fake passes, to copy another merchant's branding, to spam users, or to break the
            law. We may suspend accounts that abuse the service.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              5
            </span>
            <span>Liability</span>
          </h2>
          <p className="pl-10 text-on-surface">
            PassLoyal provides the platform "as is". The merchant is responsible for its program, its points, its gift balances,
            and its event tickets. To the extent allowed by law, our liability is limited to the fees paid for the service.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              6
            </span>
            <span>Changes</span>
          </h2>
          <p className="pl-10 text-on-surface">
            We may update these terms. The current version on this page applies. Continued use after a change means you accept
            the new terms.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              7
            </span>
            <span>Contact</span>
          </h2>
          <p className="pl-10 text-on-surface">
            Questions? Email{' '}
            <a href="mailto:alnatour.m@gmail.com" className="text-[#ff5722] font-bold underline">
              alnatour.m@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
};
