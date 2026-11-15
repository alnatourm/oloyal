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
import { MerchantAuthView } from './views/MerchantAuthView';
import { LandingPageView } from './views/LandingPageView';
import { SuperAdminView } from './views/SuperAdminView';
import { ProfileView } from './views/ProfileView';
import { PushGeoStudioView } from './views/PushGeoStudioView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { TermsOfServiceView } from './views/TermsOfServiceView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { OpticalScannerModal } from './components/OpticalScannerModal';

import {
  AUTH_ROLE_KEY,
  AUTH_TENANT_ID_KEY,
  AUTH_TENANT_SLUG_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_EMAIL_KEY,
  authFetch,
  clearAuthStorage,
  getAuthToken,
} from './utils/auth';

export default function App() {
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'merchant'>(() => {
    const token = getAuthToken();
    if (!token) return 'merchant';
    return (localStorage.getItem(AUTH_ROLE_KEY) as 'super_admin' | 'admin' | 'merchant') || 'merchant';
  });
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const [currentPath, setCurrentPath] = useState<NavigationPath>(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const viewParam = (params?.get('view') || '').trim().toLowerCase();
    const storeParam = (params?.get('store') || params?.get('slug') || '').trim();

    if (viewParam === 'enroll' || viewParam === 'join' || storeParam) {
      return 'customer-join';
    }
    if (viewParam === 'privacy') return 'privacy';
    if (viewParam === 'terms') return 'terms';
    if (viewParam === 'login' || viewParam === 'signin' || viewParam === 'auth') return 'merchant-auth';

    const token = getAuthToken();
    const savedRole = localStorage.getItem(AUTH_ROLE_KEY);
    if (!token || !savedRole) return 'landing';
    if (savedRole === 'super_admin' || savedRole === 'admin') return 'super-admin';
    if (savedRole === 'merchant') return 'dashboard';
    return 'landing';
  });
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [selectedPosMemberId, setSelectedPosMemberId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-Tenant Context State (no hardcoded cross-tenant fallback)
  const [activeTenantSlug, setActiveTenantSlug] = useState<string>(() => {
    return getAuthToken() ? localStorage.getItem(AUTH_TENANT_SLUG_KEY) || '' : '';
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    return getAuthToken() ? localStorage.getItem(AUTH_USER_EMAIL_KEY) || '' : '';
  });
  const [tenants, setTenants] = useState<Array<{ id: string; slug: string; name: string; logoUrl?: string; brandColor?: string }>>([]);

  const isAuthenticated = Boolean(getAuthToken());
  const isLanding = currentPath === 'landing';
  const isPublicShell =
    isLanding ||
    (!isAuthenticated &&
      (currentPath === 'customer-join' ||
        currentPath === 'merchant-auth' ||
        currentPath === 'privacy' ||
        currentPath === 'terms'));

  // Guard /super-admin: Non-admins CANNOT see or access the admin page
  useEffect(() => {
    if (currentPath === 'super-admin' && !isSuperAdmin) {
      setCurrentPath('dashboard');
    }
  }, [currentPath, isSuperAdmin]);

  const fetchTenants = async () => {
    const token = getAuthToken();
    if (!token) {
      setTenants([]);
      return;
    }
    try {
      const res = await authFetch('/api/tenants');
      if (res.status === 401) {
        clearAuthStorage();
        setTenants([]);
        setActiveTenantSlug('');
        setCurrentPath('landing');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setTenants(data);
        const roleNow = localStorage.getItem(AUTH_ROLE_KEY);
        if (roleNow === 'merchant' && data.length > 0 && data[0]?.slug) {
          setActiveTenantSlug(data[0].slug);
          localStorage.setItem(AUTH_TENANT_SLUG_KEY, data[0].slug);
          if (data[0]?.id) {
            localStorage.setItem(AUTH_TENANT_ID_KEY, data[0].id);
          }
        } else if ((roleNow === 'super_admin' || roleNow === 'admin') && data.length > 0 && !activeTenantSlug) {
          setActiveTenantSlug(data[0].slug || '');
        }
      }
    } catch (err) {
      console.error('Error fetching tenants list:', err);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    const savedRole = localStorage.getItem(AUTH_ROLE_KEY);

    if (!token) {
      if (savedRole) {
        clearAuthStorage();
      }
      setActiveTenantSlug('');
      setTenants([]);
      if (currentPath !== 'landing' && currentPath !== 'merchant-auth' && currentPath !== 'privacy' && currentPath !== 'terms' && currentPath !== 'customer-join') {
        setCurrentPath('landing');
      }
      return;
    }

    authFetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          clearAuthStorage();
          setUserRole('merchant');
          setUserEmail('');
          setActiveTenantSlug('');
          setTenants([]);
          setCurrentPath('landing');
          return;
        }
        const me = await res.json().catch(() => null);
        if (me?.user?.role) {
          const roleVal = me.user.role as 'super_admin' | 'admin' | 'merchant';
          setUserRole(roleVal);
          localStorage.setItem(AUTH_ROLE_KEY, roleVal);
          if (me.user.email) {
            setUserEmail(me.user.email);
            localStorage.setItem(AUTH_USER_EMAIL_KEY, me.user.email);
          }
          if (roleVal === 'merchant' && me.user.tenantSlug) {
            setActiveTenantSlug(me.user.tenantSlug);
            localStorage.setItem(AUTH_TENANT_SLUG_KEY, me.user.tenantSlug);
            if (me.user.tenantId) {
              localStorage.setItem(AUTH_TENANT_ID_KEY, me.user.tenantId);
            }
          }
        }
        fetchTenants();
      })
      .catch(() => {
        // Leave state intact on transient network failure
      });
  }, []);

  const handleNavigate = (path: NavigationPath) => {
    if (path === 'super-admin' && !isSuperAdmin) {
      setToastMessage('Access restricted to Super Admin only.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setCurrentPath(path);
  };

  const handleLogout = () => {
    setUserRole('merchant');
    setUserEmail('');
    setActiveTenantSlug('');
    setTenants([]);
    clearAuthStorage();
    setToastMessage('Signed out successfully.');
    setCurrentPath('landing');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSelectTenant = (slug: string) => {
    if (!isSuperAdmin) return;
    setActiveTenantSlug(slug);
    localStorage.setItem(AUTH_TENANT_SLUG_KEY, slug);
    setCurrentPath('dashboard');
  };

  const openScanner = () => {
    setIsScannerOpen(true);
  };

  const handleScanSuccess = (memberId?: string) => {
    if (memberId) {
      setSelectedPosMemberId(memberId);
    }
    setToastMessage('Optical Pass Scan Confirmed: Member loaded in POS!');
    setCurrentPath('pos-cashier');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLoginSuccess = (
    slug?: string,
    tenantName?: string,
    role?: 'super_admin' | 'admin' | 'merchant',
    email?: string,
    token?: string,
    tenantId?: string
  ) => {
    const assignedRole = role || (slug ? 'merchant' : 'super_admin');
    setUserRole(assignedRole);
    localStorage.setItem(AUTH_ROLE_KEY, assignedRole);
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
    if (tenantId) {
      localStorage.setItem(AUTH_TENANT_ID_KEY, tenantId);
    } else if (assignedRole !== 'merchant') {
      localStorage.removeItem(AUTH_TENANT_ID_KEY);
    }
    if (email) {
      setUserEmail(email);
      localStorage.setItem(AUTH_USER_EMAIL_KEY, email);
    }
    if (slug) {
      setActiveTenantSlug(slug);
      localStorage.setItem(AUTH_TENANT_SLUG_KEY, slug);
    } else if (assignedRole !== 'merchant') {
      setActiveTenantSlug('');
      localStorage.removeItem(AUTH_TENANT_SLUG_KEY);
    }
    fetchTenants();
    if (assignedRole === 'super_admin' || assignedRole === 'admin') {
      setToastMessage('Authenticated as Super Admin Master Issuer');
      setCurrentPath('super-admin');
    } else {
      setToastMessage(`Welcome! Authenticated as ${tenantName || 'Store Merchant'}`);
      setCurrentPath('dashboard');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#191c1e] font-sans antialiased">
      {/* Fixed Left Navigation Sidebar & Top Header - STRICTLY HIDDEN ON PUBLIC SHELL VIEWS */}
      {!isPublicShell && (
        <>
          <Navigation
            currentPath={currentPath}
            onNavigate={handleNavigate}
            openScannerModal={openScanner}
            userRole={userRole}
            onLogout={handleLogout}
          />
          <Header
            openScannerModal={openScanner}
            onQuickNotice={() => setToastMessage('System Update: Smart Tap v3.2 Cryptographic Session Active.')}
            activeTenantSlug={activeTenantSlug}
            tenants={isSuperAdmin ? tenants : []}
            onSelectTenant={isSuperAdmin ? handleSelectTenant : undefined}
            onNavigateToAuth={() => setCurrentPath('merchant-auth')}
            onNavigateToProfile={() => setCurrentPath('profile')}
            onNavigateToAdmin={() => setCurrentPath('super-admin')}
            onSelectMemberForPos={(memberId) => {
              setSelectedPosMemberId(memberId);
              setCurrentPath('pos-cashier');
            }}
            onNavigateView={handleNavigate}
            onLogout={handleLogout}
            userRole={userRole}
          />
        </>
      )}

      {/* Minimal Public Top Bar when unauthenticated outside Landing */}
      {isPublicShell && !isLanding && (
        <header className="w-full max-w-5xl mx-auto px-4 pt-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.location.search) {
                window.history.replaceState({}, '', window.location.pathname);
              }
              setCurrentPath('landing');
            }}
            className="px-4 py-2 rounded-full bg-surface-container-low tactile-convex-sm text-on-surface font-label-md text-label-md font-bold flex items-center gap-2 hover:text-[#ff5722] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-[#ff5722]">fingerprint</span>
            <span>PassLoyal OS</span>
          </button>
          {currentPath !== 'merchant-auth' && (
            <button
              type="button"
              onClick={() => setCurrentPath('merchant-auth')}
              className="px-4 py-2 rounded-full bg-surface-container-low tactile-convex-sm text-on-surface-variant hover:text-[#ff5722] font-label-md text-label-md font-semibold transition-colors"
            >
              Merchant Sign In
            </button>
          )}
        </header>
      )}

      {/* Main View Container */}
      <main
        className={
          isLanding
            ? 'w-full'
            : isPublicShell
            ? 'w-full px-4 pt-4 max-w-5xl mx-auto transition-all pb-12'
            : 'pl-28 lg:pl-32 pr-6 pt-24 max-w-[1600px] mx-auto transition-all pb-12'
        }
      >
        {currentPath === 'landing' && (
          <LandingPageView
            onLoginSuccess={handleLoginSuccess}
            onNavigateToDashboard={() => setCurrentPath('dashboard')}
            onNavigateToEnroll={() => setCurrentPath('customer-join')}
            onOpenLoginModal={() => setCurrentPath('merchant-auth')}
          />
        )}

        {currentPath === 'dashboard' && (
          <DashboardView
            activeSlug={activeTenantSlug}
            userRole={userRole}
            onNavigateToPassStudio={() => setCurrentPath('pass-studio')}
            onEnrollMember={() => setCurrentPath('customer-join')}
          />
        )}
        
        {currentPath === 'pass-studio' && (
          <PassStudioView
            activeSlug={activeTenantSlug}
            userRole={userRole}
            onPublishToFleet={() => {
              setToastMessage(`Pass Template Published for ${activeTenantSlug || 'Store'}!`);
              setTimeout(() => setToastMessage(null), 3500);
            }}
          />
        )}

        {currentPath === 'pos-cashier' && (
          <CashierView
            activeSlug={activeTenantSlug}
            userRole={userRole}
            openScannerModal={openScanner}
            selectedMemberId={selectedPosMemberId}
          />
        )}

        {currentPath === 'customers-crm' && (
          <CustomersCRMView
            activeSlug={activeTenantSlug}
            userRole={userRole}
            onProvisionNewMember={() => {
              setCurrentPath('customer-join');
            }}
          />
        )}

        {currentPath === 'push-and-geo-studio' && (
          <PushGeoStudioView
            activeSlug={activeTenantSlug}
            userRole={userRole}
          />
        )}

        {currentPath === 'customer-join' && (
          <CustomerEnrollmentView
            activeSlug={activeTenantSlug}
            userRole={userRole}
          />
        )}

        {currentPath === 'merchant-auth' && (
          <MerchantAuthView
            onLoginSuccess={handleLoginSuccess}
            onNavigateToCustomerEnroll={() => {
              setCurrentPath('customer-join');
            }}
          />
        )}

        {currentPath === 'billing' && (
          <SaaSBillingView
            activeSlug={activeTenantSlug}
            userRole={userRole}
          />
        )}

        {currentPath === 'super-admin' && isSuperAdmin && (
          <SuperAdminView
            onSelectTenantDashboard={(slug) => {
              setActiveTenantSlug(slug);
              localStorage.setItem(AUTH_TENANT_SLUG_KEY, slug);
              setCurrentPath('dashboard');
            }}
          />
        )}

        {currentPath === 'profile' && (
          <ProfileView
            userRole={userRole}
            activeTenantSlug={activeTenantSlug}
            userEmail={userEmail}
            onProfileUpdated={(_updatedName, updatedEmail) => {
              if (updatedEmail) {
                setUserEmail(updatedEmail);
                localStorage.setItem('passloyal_user_email', updatedEmail);
              }
              fetchTenants();
              setToastMessage('Profile updated successfully.');
              setTimeout(() => setToastMessage(null), 3500);
            }}
            onBack={() => setCurrentPath(isSuperAdmin ? 'super-admin' : 'dashboard')}
          />
        )}

        {currentPath === 'privacy' && <PrivacyPolicyView />}

        {currentPath === 'terms' && <TermsOfServiceView />}

        {(currentPath === 'onboarding' || currentPath === 'telemetry-hardware') && (
          <OnboardingView
            activeSlug={activeTenantSlug}
            userRole={userRole}
            onCompleteStep={() => {
              setToastMessage(`Program rules & coupons saved for ${activeTenantSlug || 'Store'}!`);
              setCurrentPath('dashboard');
              setTimeout(() => setToastMessage(null), 3500);
            }}
          />
        )}

        {currentPath === 'reports' && (
          <AnalyticsView
            activeSlug={activeTenantSlug}
            userRole={userRole}
          />
        )}

        {currentPath === 'settings' && (
          <SettingsView
            activeSlug={activeTenantSlug}
            userRole={userRole}
          />
        )}

        {/* Legal & Compliance Footer Bar */}
        {!isLanding && (
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
        )}
      </main>

      {/* Optical Scanner Modal */}
      <OpticalScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        activeSlug={activeTenantSlug}
        userRole={userRole}
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
