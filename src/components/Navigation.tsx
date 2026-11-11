import React from 'react';
import { NavigationPath } from '../types';
import { sounds } from '../utils/sound';

interface NavigationProps {
  currentPath: NavigationPath;
  onNavigate: (path: NavigationPath) => void;
  openScannerModal: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPath, onNavigate, openScannerModal }) => {
  const handleNav = (path: NavigationPath) => {
    sounds.click(900, 0.02);
    onNavigate(path);
  };

  const navItems: { path: NavigationPath; title: string; icon: string }[] = [
    { path: 'dashboard', title: 'Dashboard', icon: 'space_dashboard' },
    { path: 'pass-studio', title: 'Pass Studio / Designer', icon: 'palette' },
    { path: 'pos-cashier', title: 'POS Cashier Terminal', icon: 'point_of_sale' },
    { path: 'customers-crm', title: 'Customers / CRM', icon: 'group' },
    { path: 'customer-join', title: 'Customer Enrollment (Add to Wallet)', icon: 'add_to_home_screen' },
    { path: 'onboarding', title: 'Merchant Onboarding', icon: 'tune' },
    { path: 'billing', title: 'SaaS Billing & Limits', icon: 'credit_card' },
    { path: 'super-admin', title: 'Super Admin Master Issuer', icon: 'admin_panel_settings' },
  ];

  return (
    <aside className="fixed left-4 lg:left-6 top-6 bottom-6 w-20 z-50 flex flex-col items-center justify-between py-6 bg-surface-container-low rounded-xl tactile-convex transition-all">
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand Logo Button */}
        <button
          onClick={() => handleNav('dashboard')}
          className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center tactile-convex-sm transition-transform active:scale-95 group"
          title="PassLoyal OS Home"
        >
          <span className="material-symbols-outlined text-[#ff5722] text-[24px] group-hover:rotate-12 transition-transform">
            fingerprint
          </span>
        </button>

        <div className="w-8 h-1 rounded-full bg-surface-container-highest"></div>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-3.5 w-full px-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                title={item.title}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-[#ff5722] text-white tactile-active-glow shadow-[0_0_16px_rgba(255,87,34,0.45)] scale-105'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface tactile-btn'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {item.icon}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={openScannerModal}
          title="Quick Optical Scanner"
          className="w-12 h-12 rounded-full bg-surface-container text-[#ff5722] flex items-center justify-center tactile-btn hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">
            qr_code_scanner
          </span>
        </button>
        <button
          onClick={() => handleNav('settings')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            currentPath === 'settings'
              ? 'bg-[#ff5722] text-white'
              : 'text-on-surface-variant hover:bg-surface-container-high'
          }`}
          title="Settings"
        >
          <span className="material-symbols-outlined text-[20px]">
            settings
          </span>
        </button>
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5722] animate-pulse tactile-glow" title="Core Online"></div>
      </div>
    </aside>
  );
};
