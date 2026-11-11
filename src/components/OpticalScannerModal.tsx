import React, { useState } from 'react';
import { sounds } from '../utils/sound';

interface OpticalScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: () => void;
}

export const OpticalScannerModal: React.FC<OpticalScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [beepOn, setBeepOn] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (beepOn) sounds.scannerBeep();
    else sounds.chime();

    if (onScanSuccess) {
      onScanSuccess();
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
                  Optical Pass Scanner
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                  Ready
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Google Wallet QR &amp; Code-128 Optical Handshake
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container tactile-deboss text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              <span>1080p HD Cam #01 • 60 FPS</span>
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
        </div>

        {/* Viewfinder Window */}
        <div className="relative w-full h-80 rounded-2xl overflow-hidden bg-inverse-surface flex items-center justify-center border-2 border-surface-container shadow-inner">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-container/20 via-transparent to-black pointer-events-none"></div>

          {/* Corner Brackets */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-primary-container rounded-tl-lg z-20"></div>
          <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-primary-container rounded-tr-lg z-20"></div>
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-primary-container rounded-bl-lg z-20"></div>
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-primary-container rounded-br-lg z-20"></div>

          {/* Animated Scanning Beam */}
          <div
            className="absolute left-6 right-6 h-0.5 bg-primary-container shadow-[0_0_12px_#ff5722] z-20 animate-pulse"
            style={{ top: '48%' }}
          ></div>

          {/* Detected Pass Card Banner */}
          <div className="relative z-10 flex flex-col items-center gap-3 p-4 bg-surface-container-lowest/90 backdrop-blur-md rounded-2xl ring-2 ring-primary-container/70 tactile-glow max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between w-full pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-ping"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold text-primary-container">
                  Wallet Pass Detected (99.4%)
                </span>
              </div>
              <span className="material-symbols-outlined text-primary-container text-[18px]">
                verified
              </span>
            </div>
            <div className="flex items-center gap-3.5 w-full">
              <div className="w-16 h-16 rounded-xl bg-surface-container-lowest flex items-center justify-center tactile-deboss shrink-0 p-1">
                <svg className="w-12 h-12 text-on-surface fill-current" viewBox="0 0 24 24">
                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h2v2h-2v-2zm-4-2h2v4h-2v-4zm2 4h4v2h-4v-2zm2 2h2v2h-2v-2zm-6-2h2v4h-2v-4zm8-2h2v2h-2v-2z"></path>
                </svg>
              </div>
              <div className="min-w-0 text-left flex-1">
                <p className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                  Marcus Vance
                </p>
                <p className="font-body-sm text-body-sm text-primary font-semibold">
                  Gold VIP • PASS-889042
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">
                    sync_saved_locally
                  </span>
                  <span>Google Smart Tap Synced</span>
                </div>
              </div>
            </div>
          </div>

          {/* Camera controls overlay */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sounds.click();
                  setTorchOn(!torchOn);
                }}
                className={`px-3 py-1 rounded-full backdrop-blur-sm text-on-surface font-label-sm text-label-sm font-bold flex items-center gap-1.5 tactile-btn ${
                  torchOn ? 'bg-primary-container text-white' : 'bg-surface-container-lowest/80'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">highlight</span>
                <span>Torch {torchOn ? 'ON' : 'OFF'}</span>
              </button>
              <button
                type="button"
                onClick={() => sounds.click()}
                className="px-3 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1.5 tactile-btn"
              >
                <span className="material-symbols-outlined text-[16px]">flip_camera_ios</span>
                <span>Lens: Overhead</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                sounds.click();
                setBeepOn(!beepOn);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm text-on-surface font-label-sm text-label-sm"
            >
              <span className="material-symbols-outlined text-[16px] text-primary-container">
                {beepOn ? 'volume_up' : 'volume_off'}
              </span>
              <span>Beep: {beepOn ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-4 pt-2">
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
            onClick={handleConfirm}
            className="flex-1 py-3 px-6 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm font-bold tactile-glow flex items-center justify-center gap-3 transition-transform active:scale-[0.99] shadow-md hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[20px]">done_all</span>
            <span>Confirm Scanned Pass &amp; Apply Perks</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
