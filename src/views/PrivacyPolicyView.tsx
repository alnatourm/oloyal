import React, { useState } from 'react';
import { sounds } from '../utils/sound';

export const PrivacyPolicyView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    sounds.click();
    navigator.clipboard.writeText(window.location.origin + '/privacy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col w-full gap-6 select-none max-w-4xl mx-auto pb-16 pt-2">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-surface-container-low tactile-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff5722] text-[20px]">shield</span>
            <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-bold">
              Legal Compliance Document
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight mt-1">
            Privacy Policy - PassLoyal OS
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
            <span>{copied ? 'Direct Link Copied!' : 'Copy Privacy URL'}</span>
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
          <span className="text-[#ff5722] font-bold">https://oloyal.vercel.app/privacy</span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText('https://oloyal.vercel.app/privacy');
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
            <span>What we collect</span>
          </h2>
          <p className="pl-10 text-on-surface">
            When you enroll in a merchant loyalty program through PassLoyal, we collect: your name, phone number,
            email address, member ID, points balance, and pass type (loyalty, gift card, event ticket, or offer).
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              2
            </span>
            <span>Why we collect it</span>
          </h2>
          <p className="pl-10 text-on-surface">
            To create and manage your loyalty / gift / ticket / offer pass, to show your points balance, and to let you
            save the pass to Google Wallet or Apple Wallet.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              3
            </span>
            <span>What we share with Google Wallet</span>
          </h2>
          <p className="pl-10 text-on-surface">
            When you tap "Save to Wallet", we share only the pass details needed to create your pass with Google
            Wallet: member name, member ID, points / balance, and the merchant's name, logo and brand color. We do not
            sell your data. We do not share your data with advertisers.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              4
            </span>
            <span>How long we keep it</span>
          </h2>
          <p className="pl-10 text-on-surface">
            We keep your data while your pass is active. If you delete your pass or ask us to delete your account, we
            delete your data within 30 days, except where the law requires us to keep transaction records longer.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              5
            </span>
            <span>Your rights</span>
          </h2>
          <p className="pl-10 text-on-surface">
            You can ask us at any time to see, correct, or delete your data. Email{' '}
            <a href="mailto:alnatour.m@gmail.com" className="text-[#ff5722] font-bold underline">
              alnatour.m@gmail.com
            </a>{' '}
            with your member ID and phone number. You can also remove the pass at any time from Google Wallet -
            removing it from Wallet does not delete your merchant account, email us if you want full deletion.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              6
            </span>
            <span>Security</span>
          </h2>
          <p className="pl-10 text-on-surface">
            We use HTTPS, signed requests, and access controls to protect your data. No system is 100% secure, but we
            take reasonable steps to protect it.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              7
            </span>
            <span>Children</span>
          </h2>
          <p className="pl-10 text-on-surface">
            PassLoyal is not intended for children under 16. If you believe a child gave us data, contact us and we will
            delete it.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-2 pt-4 border-t border-surface-container-highest/60">
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center text-[15px] font-bold">
              8
            </span>
            <span>Changes</span>
          </h2>
          <p className="pl-10 text-on-surface">
            If we change this policy, we will update the date above and publish the new version on this page.
          </p>
        </section>
      </div>
    </div>
  );
};
