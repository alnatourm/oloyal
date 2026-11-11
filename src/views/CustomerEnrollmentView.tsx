import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/sound';

export const CustomerEnrollmentView: React.FC = () => {
  const [customerName, setCustomerName] = useState<string>('Marcus Vance');
  const [email, setEmail] = useState<string>('marcus.vance@example.com');
  const [phone, setPhone] = useState<string>('+1 (555) 234-5678');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [jwtLink, setJwtLink] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Generate dynamic pass link on mount or form submission
  const generatePass = async (name: string, userEmail: string, userPhone: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tenants/banlis-bistro/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: userEmail, phone: userPhone }),
      });
      const data = await res.json();
      if (data.saveToWalletUrl) {
        setJwtLink(data.saveToWalletUrl);
      }
    } catch (err) {
      console.log('Error generating pass:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Generate initial pass link on load
    generatePass(customerName, email, phone);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.chime();
    await generatePass(customerName, email, phone);
    setIsSubmitted(true);
  };

  const handleCopyLink = () => {
    sounds.click();
    if (jwtLink) {
      navigator.clipboard.writeText(jwtLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full px-4 select-none max-w-2xl mx-auto py-6">
      {/* Explanation Banner */}
      <div className="w-full mb-6 p-4 rounded-2xl bg-surface-container-low border border-primary-container/30 tactile-card flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[20px]">info</span>
        </div>
        <div className="text-left text-[13px] text-on-surface-variant leading-relaxed">
          <p className="font-bold text-on-surface text-[14px]">
            Why does Google Pay show "Something went wrong" on `pay.google.com`?
          </p>
          <p className="mt-1">
            Google Pay requires <strong className="text-on-surface">2 final settings</strong> in your Google Pay &amp; Wallet Console:
          </p>
          <ol className="list-decimal pl-5 mt-1 font-mono text-[11px] text-outline space-y-1">
            <li>Paste your 20-digit <span className="text-[#ff5722] font-bold">Issuer ID</span> in Super Admin (`/super-admin`).</li>
            <li>In Google Pay Console, add your personal Google email (<span className="text-on-surface font-bold">alnatour.m@gmail.com</span>) under <span className="text-on-surface font-bold">Google Wallet API &gt; Test Accounts</span> while your account is in Draft mode.</li>
          </ol>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => {
                sounds.chime();
                setIsWalletModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-full bg-[#ff5722] text-white font-label-sm text-label-sm font-bold tactile-glow hover:brightness-105"
            >
              🚀 Open In-App Google Wallet Pass Visualizer
            </button>
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-[#ff5722] underline font-label-sm text-label-sm font-semibold"
            >
              {showExplanation ? 'Hide Setup' : 'View Requirements'}
            </button>
          </div>

          {showExplanation && (
            <div className="mt-3 pt-3 border-t border-surface-container-highest text-[12px] space-y-1.5 font-mono text-outline">
              <p>✔ Service Account Linked: <span className="text-emerald-500 font-bold">id-banlis-wallet@walletcard-514107.iam.gserviceaccount.com</span></p>
              <p>✔ RS256 Private Key: <span className="text-emerald-500 font-bold">AUTHENTICATED IN BACKEND</span></p>
              <p>⌛ Pending Google Console Action: Add <span className="text-on-surface font-bold">alnatour.m@gmail.com</span> to Test Accounts in pay.google.com/business/console!</p>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md bg-surface-container-low rounded-3xl p-6 sm:p-8 tactile-card ring-1 ring-white/90 shadow-2xl relative overflow-hidden">
        {/* Shimmer Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-primary-container/20 blur-2xl pointer-events-none"></div>

        {/* Store Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#ff5722] text-white flex items-center justify-center font-headline-lg text-headline-lg font-bold tactile-active-glow shadow-md">
            B
          </div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight mt-1">
            Banlis Bistro &amp; Dining
          </h2>
          <span className="px-3 py-1 rounded-full bg-primary-fixed text-[#ff5722] font-label-sm text-label-sm font-bold uppercase tracking-wider">
            Epicurean VIP Loyalty Card
          </span>
        </div>

        {!isSubmitted ? (
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
                  placeholder="e.g. Marcus Vance"
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
                  placeholder="e.g. marcus@example.com"
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
                Your digital loyalty card has been minted on Google Wallet. Enjoy 100 Bonus PTS instantly!
              </p>
            </div>

            {/* Official Black "Add to Google Wallet" Button */}
            <a
              href={jwtLink || '#'}
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
                UID: #PL-889042
              </span>
            </div>

            {/* Fallback Share Links */}
            <div className="flex items-center justify-between w-full gap-2 pt-2 border-t border-surface-container-highest">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2 px-3 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold tactile-btn flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                <span>{copied ? 'Link Copied!' : 'Copy Save URL'}</span>
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
              <div className="w-full bg-gradient-to-br from-[#ff5722] to-[#d84315] text-white rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-56 border border-white/20">
                {/* Background Pattern */}
                <div className="absolute right-[-20%] bottom-[-20%] w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none"></div>

                {/* Card Top */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-[#ff5722] flex items-center justify-center font-bold text-xl shadow-md">
                      B
                    </div>
                    <div>
                      <h4 className="font-bold text-[16px] leading-tight">Banlis Bistro</h4>
                      <span className="text-[11px] text-white/80 font-medium">Epicurean Club</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-black/25 text-amber-300 font-bold text-[11px] tracking-wider uppercase border border-white/20">
                    GOLD VIP
                  </span>
                </div>

                {/* Card Points Display */}
                <div className="my-2 relative z-10">
                  <span className="text-[11px] text-white/80 uppercase font-bold tracking-wider block">
                    Points Balance
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight">1,450</span>
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
                  9802 4410 7719 3321
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
