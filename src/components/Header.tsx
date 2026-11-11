import React, { useState } from 'react';
import { sounds } from '../utils/sound';

interface HeaderProps {
  onSearch?: (query: string) => void;
  openScannerModal: () => void;
  onQuickNotice?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, openScannerModal, onQuickNotice }) => {
  const [query, setQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header className="fixed top-6 left-28 lg:left-32 right-6 h-16 bg-surface-container-low/90 backdrop-blur-xl rounded-xl tactile-convex z-40 px-6 flex items-center justify-between transition-all">
      {/* Left: Brand OS Pill & Search Input */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-container-lowest tactile-convex-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-container tactile-active-glow animate-pulse"></div>
          <span className="font-label-md text-label-md tracking-wider uppercase text-on-surface font-semibold">
            Pass<span className="text-primary-container">Loyal</span> OS 3.4
          </span>
        </div>

        <div className="w-64 sm:w-80 h-10 px-4 rounded-full bg-surface tactile-deboss flex items-center gap-2.5">
          <span className="material-symbols-outlined text-outline text-[18px]">search</span>
          <input
            className="bg-transparent w-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
            placeholder="Search passes, members, or terminal nodes..."
            type="text"
            value={query}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Right: Core Telemetry & User Controls */}
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface tactile-deboss">
          <span className="w-2 h-2 rounded-full bg-tertiary"></span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Core Online
          </span>
          <span className="font-label-sm text-label-sm text-tertiary font-semibold">
            48ms
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Scan button */}
          <button
            onClick={() => {
              sounds.click();
              openScannerModal();
            }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold tactile-active-glow hover:brightness-105 active:scale-95 transition-all"
            title="Scan Pass"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            <span>Scan Pass</span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => {
              sounds.click();
              if (onQuickNotice) onQuickNotice();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface tactile-convex-sm transition-all relative"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-container tactile-active-glow"></span>
          </button>

          {/* Refresh/Power */}
          <button
            onClick={() => {
              sounds.click(1200, 0.03);
              window.location.reload();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface tactile-convex-sm transition-all"
            title="Reset Terminal Session"
          >
            <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
          </button>
        </div>

        {/* User Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-white shadow-sm" title="Merchant Host: Elena Rostova">
          <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
};
