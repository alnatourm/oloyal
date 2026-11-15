import React, { useEffect, useState } from 'react';
import { sounds } from '../utils/sound';
import { authFetch } from '../utils/auth';

interface ScannedMember {
  id: string;
  member_id: string;
  customer_name: string;
  email?: string;
  phone?: string;
  points: number;
}

interface OpticalScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSlug?: string;
  userRole?: 'super_admin' | 'admin' | 'merchant';
  onScanSuccess?: (memberId?: string) => void;
}

export const OpticalScannerModal: React.FC<OpticalScannerModalProps> = ({
  isOpen,
  onClose,
  activeSlug = '',
  userRole = 'merchant',
  onScanSuccess,
}) => {
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [beepOn, setBeepOn] = useState<boolean>(true);
  const [scanInput, setScanInput] = useState<string>('');
  const [members, setMembers] = useState<ScannedMember[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';
    const url = isAdmin && activeSlug
      ? `/api/members?slug=${encodeURIComponent(activeSlug)}`
      : '/api/members';

    authFetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        if (Array.isArray(rows)) {
          setMembers(rows);
          if (rows.length > 0 && !selectedId) {
            setSelectedId(rows[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen, activeSlug, userRole]);

  if (!isOpen) return null;

  const q = scanInput.trim().toLowerCase();
  const filteredMembers = q
    ? members.filter(
        (m) =>
          (m.customer_name || '').toLowerCase().includes(q) ||
          (m.member_id || '').toLowerCase().includes(q) ||
          (m.phone || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q)
      )
    : members;

  const matchedMember =
    filteredMembers.find((m) => m.id === selectedId) || filteredMembers[0] || null;

  const handleConfirm = () => {
    if (!matchedMember) return;
    if (beepOn) sounds.scannerBeep();
    else sounds.chime();

    if (onScanSuccess) {
      onScanSuccess(matchedMember.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-3xl p-6 md:p-8 tactile-card ring-1 ring-white/90 shadow-2xl flex flex-col gap-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center tactile-btn text-primary-container tactile-glow shrink-0">
              <span className="material-symbols-outlined text-[26px]">qr_code_scanner</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                  Optical Pass Scanner &amp; Lookup
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                  Ready
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Scan barcode/QR value or look up a member in active store registry
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.click();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center tactile-btn text-on-surface-variant hover:text-on-surface transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Barcode / Member ID input */}
        <div className="h-12 px-4 rounded-2xl bg-surface tactile-deboss flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-[20px]">barcode_reader</span>
          <input
            type="text"
            autoFocus
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matchedMember) {
                e.preventDefault();
                handleConfirm();
              }
            }}
            placeholder="Scan barcode PL-XXXXXX or type customer name / phone..."
            className="bg-transparent w-full font-body-md text-body-md text-on-surface focus:outline-none"
          />
          {scanInput && (
            <button
              type="button"
              onClick={() => setScanInput('')}
              className="text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Viewfinder / Matched Member Preview */}
        <div className="relative w-full min-h-[260px] rounded-2xl overflow-hidden bg-inverse-surface flex flex-col justify-between p-5 border-2 border-surface-container shadow-inner">
          <div className="absolute top-3 left-3 w-7 h-7 border-t-4 border-l-4 border-primary-container rounded-tl-lg pointer-events-none"></div>
          <div className="absolute top-3 right-3 w-7 h-7 border-t-4 border-r-4 border-primary-container rounded-tr-lg pointer-events-none"></div>
          <div className="absolute bottom-3 left-3 w-7 h-7 border-b-4 border-l-4 border-primary-container rounded-bl-lg pointer-events-none"></div>
          <div className="absolute bottom-3 right-3 w-7 h-7 border-b-4 border-r-4 border-primary-container rounded-br-lg pointer-events-none"></div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-white/70 text-sm gap-2">
              <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
              <span>Loading store member registry...</span>
            </div>
          ) : matchedMember ? (
            <div className="relative z-10 flex flex-col gap-3 my-auto max-w-md w-full mx-auto">
              <div className="flex flex-col gap-2 p-4 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl ring-2 ring-primary-container/70 shadow-xl">
                <div className="flex items-center justify-between w-full pb-2 border-b border-surface-container">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold text-primary-container">
                    Pass Matched
                  </span>
                  <span className="font-mono text-xs font-bold text-on-surface">
                    {matchedMember.member_id}
                  </span>
                </div>
                <div className="flex items-center gap-3.5 w-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary font-bold flex items-center justify-center text-lg shrink-0">
                    {(matchedMember.customer_name || 'M').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <p className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                      {matchedMember.customer_name}
                    </p>
                    <p className="font-body-sm text-body-sm text-primary font-semibold tabular-nums">
                      {Number(matchedMember.points || 0).toLocaleString()} PTS
                      {matchedMember.phone ? ` • ${matchedMember.phone}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {filteredMembers.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {filteredMembers.slice(0, 5).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        sounds.click();
                        setSelectedId(m.id);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                        matchedMember.id === m.id
                          ? 'bg-primary-container text-white'
                          : 'bg-white/15 text-white hover:bg-white/25'
                      }`}
                    >
                      {m.customer_name} ({m.member_id})
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/75 text-center gap-2">
              <span className="material-symbols-outlined text-[36px] text-white/40">person_search</span>
              <p className="font-semibold text-sm">No matching member pass found</p>
              <p className="text-xs text-white/50">Enroll a customer first or try a different search term.</p>
            </div>
          )}

          {/* Camera controls overlay */}
          <div className="flex items-center justify-between z-20 pt-2">
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setTorchOn(!torchOn);
              }}
              className={`px-3 py-1 rounded-full backdrop-blur-sm font-label-sm text-label-sm font-bold flex items-center gap-1.5 tactile-btn ${
                torchOn ? 'bg-primary-container text-white' : 'bg-surface-container-lowest/85 text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">highlight</span>
              <span>Torch {torchOn ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setBeepOn(!beepOn);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest/85 backdrop-blur-sm text-on-surface font-label-sm text-label-sm"
            >
              <span className="material-symbols-outlined text-[16px] text-primary-container">
                {beepOn ? 'volume_up' : 'volume_off'}
              </span>
              <span>Beep: {beepOn ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <button
            onClick={() => {
              sounds.click();
              onClose();
            }}
            className="px-6 py-3 rounded-full bg-surface-container text-on-surface font-label-md text-label-md font-bold tactile-btn hover:text-primary transition-all"
          >
            Cancel
          </button>
          <button
            disabled={!matchedMember}
            onClick={handleConfirm}
            className="flex-1 py-3 px-6 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-bold tactile-glow flex items-center justify-center gap-3 transition-transform active:scale-[0.99] shadow-md hover:bg-primary disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">done_all</span>
            <span>Open Pass in POS Terminal</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
