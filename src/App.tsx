import { useState, useEffect } from 'react';
import { NavigationPath } from './types';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { PassStudioView } from './views/PassStudioView';
import { CashierView } from './views/CashierView';
import { CustomersCRMView } from './views/CustomersCRMView';
import { OnboardingView } from './views/OnboardingView';
import { SaaSBillingView } from './views/SaaSBillingView';
import { CustomerEnrollmentView } from './views/CustomerEnrollmentView';
import { SuperAdminView } from './views/SuperAdminView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsOfServiceView } from './views/TermsOfServiceView';
import { OpticalScannerModal } from './components/OpticalScannerModal';

export default function App() {
  const [currentPath, setCurrentPath] = useState<NavigationPath>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-Tenant Context State
  const [activeTenantSlug, setActiveTenantSlug] = useState<string>('banlis');
  const [tenants, setTenants] = useState<Array<{ id: string; slug: string; name: string; logoUrl?: string; brandColor?: string }>>([]);

  const fetchTenants = () => {
    fetch('/api/tenants')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTenants(data);
          if (data.length > 0 && (!activeTenantSlug || activeTenantSlug === 'banlis')) {
            setActiveTenantSlug(data[0].slug || 'banlis');
          }
        }
      })
      .catch((err) => console.error('Error fetching tenants list:', err));
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleNavigate = (path: NavigationPath) => {
    setCurrentPath(path);
  };

  const handleSelectTenant = (slug: string) => {
    setActiveTenantSlug(slug);
    setCurrentPath('dashboard');
  };

  const openScanner = () => {
    setIsScannerOpen(true);
  };

  const handleScanSuccess = () => {
    setToastMessage('Optical Pass Scan Confirmed: Member perks applied!');
    setCurrentPath('pos-cashier');
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#191c1e] font-sans antialiased pb-12">
      {/* Fixed Left Navigation Sidebar */}
      <Navigation
        currentPath={currentPath}
        onNavigate={handleNavigate}
        openScannerModal={openScanner}
      />

      {/* Top Header Bar with Tenant Switcher */}
      <Header
        openScannerModal={openScanner}
        onQuickNotice={() => setToastMessage('System Update: Smart Tap v3.2 Cryptographic Session Active.')}
        activeTenantSlug={activeTenantSlug}
        tenants={tenants}
        onSelectTenant={handleSelectTenant}
      />

      {/* Main View Container */}
      <main className="pl-28 lg:pl-32 pr-6 pt-24 max-w-[1600px] mx-auto transition-all">
        {currentPath === 'dashboard' && <DashboardView activeSlug={activeTenantSlug} />}
        
        {currentPath === 'pass-studio' && (
          <PassStudioView
            onPublishToFleet={() => {
              setToastMessage('Pass Template Published to 18 Active Regional POS Nodes!');
              setTimeout(() => setToastMessage(null), 3500);
            }}
          />
        )}

        {currentPath === 'pos-cashier' && (
          <CashierView openScannerModal={openScanner} />
        )}

        {currentPath === 'customers-crm' && (
          <CustomersCRMView
            onProvisionNewMember={() => {
              setCurrentPath('customer-join');
            }}
          />
        )}

        {currentPath === 'customer-join' && <CustomerEnrollmentView />}

        {currentPath === 'billing' && <SaaSBillingView />}

        {currentPath === 'super-admin' && (
          <SuperAdminView
            onSelectTenantDashboard={(slug) => {
              setActiveTenantSlug(slug);
              setCurrentPath('dashboard');
            }}
          />
        )}

        {currentPath === 'privacy' && <PrivacyPolicyView />}

        {currentPath === 'terms' && <TermsOfServiceView />}

        {(currentPath === 'onboarding' || currentPath === 'telemetry-hardware') && (
          <OnboardingView
            onCompleteStep={() => {
              setToastMessage('Onboarding Completed! Google Smart Tap v3.2 Live.');
              setCurrentPath('dashboard');
              setTimeout(() => setToastMessage(null), 3500);
            }}
          />
        )}

        {(currentPath === 'reports' || currentPath === 'settings') && (
          <div className="p-8 bg-surface-container-low rounded-xl tactile-card flex flex-col gap-4 max-w-2xl mx-auto text-center my-12">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary-container text-3xl mx-auto tactile-btn">
              <span className="material-symbols-outlined text-[32px]">
                {currentPath === 'reports' ? 'analytics' : 'settings'}
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              {currentPath === 'reports' ? 'Analytics & Telemetry Reports' : 'System Terminal Settings'}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              PassLoyal OS Node #01 • Cryptographic HMAC-SHA256 Encryption Active. All terminal telemetry channels are operational.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentPath('dashboard')}
                className="px-5 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold tactile-glow"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Legal & Compliance Footer Bar */}
        <footer className="mt-16 pt-8 border-t border-surface-container-highest/60 flex flex-wrap items-center justify-between gap-4 text-outline font-label-sm text-label-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff5722] text-[18px]">verified_user</span>
            <span className="font-bold text-on-surface">PassLoyal OS</span>
            <span>© 2026 PassLoyal OS • Google Wallet API Verified Issuer</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentPath('privacy')}
              className={`font-semibold transition-colors hover:text-[#ff5722] ${
                currentPath === 'privacy' ? 'text-[#ff5722] font-bold' : 'text-on-surface-variant'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setCurrentPath('terms')}
              className={`font-semibold transition-colors hover:text-[#ff5722] ${
                currentPath === 'terms' ? 'text-[#ff5722] font-bold' : 'text-on-surface-variant'
              }`}
            >
              Terms of Service
            </button>
            <a
              href="mailto:alnatour.m@gmail.com"
              className="text-on-surface-variant hover:text-[#ff5722] font-semibold"
            >
              Contact Support
            </a>
          </div>
        </footer>
      </main>

      {/* Optical Scanner Modal */}
      <OpticalScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Global Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-50 bg-surface-container-lowest text-on-surface rounded-full px-6 py-4 tactile-card flex items-center gap-3 ring-1 ring-primary-container/20 shadow-2xl animate-bounce">
          <span className="material-symbols-outlined text-primary-container text-[20px]">
            verified
          </span>
          <span className="font-label-md text-label-md font-bold text-on-surface">
            {toastMessage}
          </span>
        </div>
      )}
    </div>
  );
}
