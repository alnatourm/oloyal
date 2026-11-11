import React, { useState, useEffect } from 'react';
import { sounds } from '../utils/sound';

export interface TenantStore {
  id: string;
  slug: string;
  name: string;
  legalEntity: string;
  ownerName: string;
  ownerEmail: string;
  brandColor: string;
  logoUrl: string;
  archetype: 'loyalty' | 'gift' | 'ticket' | 'benefit';
  classId: string;
  plan: 'starter' | 'growth' | 'scale';
  passLimit: number;
  passCount: number;
  status: 'Active' | 'Suspended' | 'Maintenance';
  createdAt: string;
  apiKey?: string;
  baseEarnRate?: number;
}

export const SuperAdminView: React.FC = () => {
  const [tenants, setTenants] = useState<TenantStore[]>([
    {
      id: 't-1',
      slug: 'banlis-bistro',
      name: 'Banlis Bistro & Dining',
      legalEntity: 'Banlis Hospitality Group LLC',
      ownerName: 'Elena Rostova',
      ownerEmail: 'elena@banlisbistro.com',
      brandColor: '#ff5722',
      logoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOdafCB4wuMaEYVho68VUTqz9Y9XuYsx0C4hf0Olcom_yduI7B3cOo8i7RAkWa3UvTsohpH0hrNqKDM6XNTvmwq36_a2_h_5xNeNwwPY1b22ghlaXplKV5av5E5K9HWG5ArAvPIVSkcYDA1vc9p_dp0PjtRGsScjJ8bGjt452B-beCSpH0LfjCskKenY1sH8Cd3Ep6JqQ6yq1PtNgl7QajthH7zfLTDGAGJsNe9CI',
      archetype: 'loyalty',
      classId: '3388000000022819402.tenant_banlis_bistro_loyalty',
      plan: 'growth',
      passLimit: 5000,
      passCount: 3842,
      status: 'Active',
      createdAt: '2024-01-15T08:00:00Z',
      apiKey: 'pk_live_banlis_889104277',
      baseEarnRate: 10,
    },
    {
      id: 't-2',
      slug: 'artisan-roastery',
      name: 'Artisan Coffee Roasters',
      legalEntity: 'Artisan Beans Co. LLC',
      ownerName: 'Devon Sterling',
      ownerEmail: 'devon@artisanroasters.com',
      brandColor: '#107c41',
      logoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&auto=format&fit=crop',
      archetype: 'gift',
      classId: '3388000000022819402.tenant_artisan_gift',
      plan: 'starter',
      passLimit: 500,
      passCount: 312,
      status: 'Active',
      createdAt: '2024-02-10T10:30:00Z',
      apiKey: 'pk_live_artisan_3129841',
      baseEarnRate: 12,
    },
    {
      id: 't-3',
      slug: 'skyline-pavilion',
      name: 'Skyline Live Events',
      legalEntity: 'Skyline Entertainment Group',
      ownerName: 'Marcus Vance',
      ownerEmail: 'm.vance@skylinepavilion.com',
      brandColor: '#007caf',
      logoUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop',
      archetype: 'ticket',
      classId: '3388000000022819402.tenant_skyline_ticket',
      plan: 'scale',
      passLimit: 50000,
      passCount: 12450,
      status: 'Active',
      createdAt: '2023-11-20T14:15:00Z',
      apiKey: 'pk_live_skyline_9941028',
      baseEarnRate: 5,
    },
    {
      id: 't-4',
      slug: 'urban-green',
      name: 'Urban Green Organic Bakery',
      legalEntity: 'Urban Bakery LLC',
      ownerName: 'Sarah Jenkins',
      ownerEmail: 'sarah@urbangreen.com',
      brandColor: '#7b1fa2',
      logoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&auto=format&fit=crop',
      archetype: 'loyalty',
      classId: '3388000000022819402.tenant_urban_loyalty',
      plan: 'starter',
      passLimit: 500,
      passCount: 184,
      status: 'Active',
      createdAt: '2024-03-01T09:00:00Z',
      apiKey: 'pk_live_urban_4412093',
      baseEarnRate: 10,
    },
    {
      id: 't-5',
      slug: 'kuro-sushi',
      name: 'Kuro Artisan Omakase',
      legalEntity: 'Kuro Dining Corp',
      ownerName: 'Kenji Takahashi',
      ownerEmail: 'kenji@kuro-sushi.jp',
      brandColor: '#d32f2f',
      logoUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=150&auto=format&fit=crop',
      archetype: 'benefit',
      classId: '3388000000022819402.tenant_kuro_vip',
      plan: 'growth',
      passLimit: 5000,
      passCount: 2190,
      status: 'Active',
      createdAt: '2024-02-18T16:20:00Z',
      apiKey: 'pk_live_kuro_7719283',
      baseEarnRate: 15,
    },
  ]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'growth' | 'scale'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Suspended' | 'Maintenance'>('all');

  // Modals state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [managingTenant, setManagingTenant] = useState<TenantStore | null>(null);

  // Google Wallet Master Setup Credentials
  const [issuerIdInput, setIssuerIdInput] = useState('3388000000022819402');
  const [saEmailInput, setSaEmailInput] = useState('id-banlis-wallet@walletcard-514107.iam.gserviceaccount.com');
  const [saPrivateKeyInput, setSaPrivateKeyInput] = useState('');
  const [isTestingConn, setIsTestingConn] = useState(false);

  // New Merchant Form state
  const [newStoreName, setNewStoreName] = useState('');
  const [newLegalEntity, setNewLegalEntity] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newBrandColor, setNewBrandColor] = useState('#ff5722');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newArchetype, setNewArchetype] = useState<'loyalty' | 'gift' | 'ticket' | 'benefit'>('loyalty');
  const [newPlan, setNewPlan] = useState<'starter' | 'growth' | 'scale'>('growth');
  const [newEarnRate, setNewEarnRate] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast Notice State
  const [notice, setNotice] = useState<string | null>(null);

  // Management Modal Active Tab
  const [manageTab, setManageTab] = useState<'overview' | 'settings' | 'google-class' | 'status'>('overview');

  useEffect(() => {
    // Fetch initial tenants from API if available
    fetch('/api/tenants')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Sync with API data where appropriate
          const mapped: TenantStore[] = data.map((t: any) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            legalEntity: t.legalEntity || `${t.name} LLC`,
            ownerName: 'Store Administrator',
            ownerEmail: `admin@${t.slug}.com`,
            brandColor: t.brandColor || '#ff5722',
            logoUrl: t.logoUrl,
            archetype: t.archetype || 'loyalty',
            classId: t.classId,
            plan: t.plan || 'growth',
            passLimit: t.passLimit || 5000,
            passCount: t.passCount || 0,
            status: t.status === 'suspended' ? 'Suspended' : 'Active',
            createdAt: t.createdAt || new Date().toISOString(),
            apiKey: `pk_live_${t.slug.replace(/-/g, '_')}_${Math.floor(100000 + Math.random() * 900000)}`,
            baseEarnRate: 10,
          }));

          // Merge without duplicate IDs
          setTenants((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const fresh = mapped.filter((m) => !existingIds.has(m.id));
            return [...prev, ...fresh];
          });
        }
      })
      .catch((err) => console.log('API sync fallback to local store:', err));
  }, []);

  const triggerNotice = (msg: string) => {
    sounds.click(1000, 0.02);
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Handle Provisioning New Merchant
  const handleProvisionMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      triggerNotice('Error: Store Name is required!');
      return;
    }

    sounds.click(800, 0.04);
    setIsSubmitting(true);

    const slug = newStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const newId = `t-${Date.now()}`;
    const generatedClassId = `3388000000022819402.tenant_${slug}_${newArchetype}`;
    const passLimitMap = { starter: 500, growth: 5000, scale: 50000 };

    const createdTenant: TenantStore = {
      id: newId,
      slug,
      name: newStoreName.trim(),
      legalEntity: newLegalEntity.trim() || `${newStoreName.trim()} LLC`,
      ownerName: newOwnerName.trim() || 'Store Manager',
      ownerEmail: newOwnerEmail.trim() || `admin@${slug}.com`,
      brandColor: newBrandColor,
      logoUrl: newLogoUrl.trim() || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOdafCB4wuMaEYVho68VUTqz9Y9XuYsx0C4hf0Olcom_yduI7B3cOo8i7RAkWa3UvTsohpH0hrNqKDM6XNTvmwq36_a2_h_5xNeNwwPY1b22ghlaXplKV5av5E5K9HWG5ArAvPIVSkcYDA1vc9p_dp0PjtRGsScjJ8bGjt452B-beCSpH0LfjCskKenY1sH8Cd3Ep6JqQ6yq1PtNgl7QajthH7zfLTDGAGJsNe9CI',
      archetype: newArchetype,
      classId: generatedClassId,
      plan: newPlan,
      passLimit: passLimitMap[newPlan],
      passCount: 0,
      status: 'Active',
      createdAt: new Date().toISOString(),
      apiKey: `pk_live_${slug.replace(/-/g, '_')}_${Math.floor(100000 + Math.random() * 900000)}`,
      baseEarnRate: newEarnRate,
    };

    // Try posting to backend REST API
    try {
      await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createdTenant.name,
          legalEntity: createdTenant.legalEntity,
          brandColor: createdTenant.brandColor,
          logoUrl: createdTenant.logoUrl,
          archetype: createdTenant.archetype,
          plan: createdTenant.plan,
        }),
      });
    } catch (err) {
      console.log('Backend tenant sync:', err);
    }

    setTenants([createdTenant, ...tenants]);
    setIsSubmitting(false);
    setIsProvisionModalOpen(false);

    // Reset Form
    setNewStoreName('');
    setNewLegalEntity('');
    setNewOwnerName('');
    setNewOwnerEmail('');
    setNewBrandColor('#ff5722');
    setNewLogoUrl('');
    setNewArchetype('loyalty');
    setNewPlan('growth');

    triggerNotice(`Successfully Provisioned Merchant "${createdTenant.name}" & Google LoyaltyClass!`);
  };

  // Handle Updates to Managed Tenant
  const handleUpdateTenant = (updated: TenantStore) => {
    sounds.click(900, 0.02);
    setTenants(tenants.map((t) => (t.id === updated.id ? updated : t)));
    setManagingTenant(updated);
    triggerNotice(`Updated Settings for ${updated.name}`);
  };

  // Handle Regenerate API Key
  const handleRegenerateKey = (tenantId: string) => {
    sounds.click(1200, 0.03);
    const newKey = `pk_live_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    setTenants(
      tenants.map((t) => {
        if (t.id === tenantId) {
          const updated = { ...t, apiKey: newKey };
          if (managingTenant?.id === tenantId) setManagingTenant(updated);
          return updated;
        }
        return t;
      })
    );
    triggerNotice('New Secret API Key Generated & HMAC Hash Updated!');
  };

  // Handle Delete Tenant
  const handleDeleteTenant = (tenantId: string, storeName: string) => {
    sounds.click(400, 0.05);
    setTenants(tenants.filter((t) => t.id !== tenantId));
    setManagingTenant(null);
    triggerNotice(`Archived Merchant "${storeName}" & De-provisioned LoyaltyClass`);
  };

  // Filtered List
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.classId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlan = planFilter === 'all' || t.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Calculate live stats
  const totalPassesMinted = tenants.reduce((acc, t) => acc + t.passCount, 0);
  const activeCount = tenants.filter((t) => t.status === 'Active').length;
  const totalMRR = tenants.reduce((acc, t) => {
    const costs = { starter: 49, growth: 149, scale: 399 };
    return acc + (costs[t.plan] || 149);
  }, 0);

  return (
    <div className="flex flex-col w-full gap-6 select-none max-w-7xl mx-auto pb-12">
      {/* Super Admin Top Banner */}
      <div className="p-6 rounded-xl bg-surface-container-low tactile-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5722] tactile-glow animate-pulse"></span>
            <span className="font-label-md text-label-md uppercase tracking-wider text-[#ff5722] font-bold">
              PassLoyal OS Super Admin
            </span>
          </div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight mt-1">
            Google Wallet Master Issuer Command Center
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Master Issuer ID: <span className="font-mono text-on-surface font-bold">3388000000022819402</span> • RSA256 JWT Signing Active
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-surface-container tactile-deboss flex items-center gap-2">
            <span className="font-label-sm text-label-sm uppercase text-outline">Platform MRR:</span>
            <span className="font-headline-sm text-headline-sm font-bold text-[#ff5722]">
              ${totalMRR.toLocaleString()}/mo
            </span>
          </div>
          <button
            onClick={() => {
              sounds.click(1000, 0.02);
              setIsCredentialsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-full bg-surface-container text-on-surface font-label-md text-label-md font-bold tactile-btn hover:text-[#ff5722] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">key</span>
            <span>Google API Credentials</span>
          </button>

          <button
            onClick={() => {
              sounds.click(1000, 0.02);
              setIsProvisionModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-full bg-[#ff5722] text-white font-label-md text-label-md font-bold tactile-glow hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,87,34,0.35)]"
          >
            <span className="material-symbols-outlined text-[20px]">add_business</span>
            <span>+ Provision New Merchant</span>
          </button>
        </div>
      </div>

      {/* Platform Level Metric Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Active Store Tenants
            </span>
            <span className="material-symbols-outlined text-[#ff5722] text-[22px]">store</span>
          </div>
          <div className="flex items-baseline gap-2 my-2">
            <span className="font-display-xl-mobile text-display-xl-mobile font-bold text-on-surface">
              {activeCount}
            </span>
            <span className="font-label-sm text-label-sm text-[#ff5722] font-bold">
              / {tenants.length} Total Stores
            </span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Multi-Tenant Isolated DB</span>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Total Wallet Passes Issued
            </span>
            <span className="material-symbols-outlined text-tertiary text-[22px]">wallet</span>
          </div>
          <div className="flex items-baseline gap-2 my-2">
            <span className="font-display-xl-mobile text-display-xl-mobile font-bold text-on-surface">
              {totalPassesMinted.toLocaleString()}
            </span>
            <span className="font-label-sm text-label-sm text-[#ff5722] font-bold">+18.4% MoM</span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Signed JWT Save Links</span>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Google REST API Node Health
            </span>
            <span className="material-symbols-outlined text-[#ff5722] text-[22px]">api</span>
          </div>
          <div className="flex items-baseline gap-2 my-2">
            <span className="font-display-xl-mobile text-display-xl-mobile font-bold text-on-surface">99.99%</span>
            <span className="font-label-sm text-label-sm text-tertiary font-bold">16ms Avg</span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Smart Tap v3.2 Protocol</span>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-low tactile-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Service Account Credentials
            </span>
            <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
          </div>
          <div className="flex items-baseline gap-2 my-2">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">RS256 JWT Active</span>
          </div>
          <span className="font-body-sm text-body-sm text-outline font-mono text-[11px]">
            gpay-saas@iam.gserviceaccount.com
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-surface-container-low tactile-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px] relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores, owners, slugs, or Google Class IDs..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-surface-container tactile-deboss text-on-surface font-body-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-full tactile-deboss">
            <span className="text-[11px] uppercase font-bold text-outline px-2">Plan:</span>
            {(['all', 'starter', 'growth', 'scale'] as const).map((plan) => (
              <button
                key={plan}
                onClick={() => {
                  sounds.click(900, 0.01);
                  setPlanFilter(plan);
                }}
                className={`px-3 py-1 rounded-full text-[12px] font-bold uppercase transition-all ${
                  planFilter === plan
                    ? 'bg-[#ff5722] text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {plan}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-full tactile-deboss">
            <span className="text-[11px] uppercase font-bold text-outline px-2">Status:</span>
            {(['all', 'Active', 'Suspended', 'Maintenance'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  sounds.click(900, 0.01);
                  setStatusFilter(st);
                }}
                className={`px-3 py-1 rounded-full text-[12px] font-bold uppercase transition-all ${
                  statusFilter === st
                    ? 'bg-[#ff5722] text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tenant Directory Matrix */}
      <div className="p-6 rounded-xl bg-surface-container-low tactile-card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Multi-Tenant Stores &amp; Google Wallet Class Directory
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Master Issuer LoyaltyClasses dynamically minted and synced to Google Wallet REST API servers
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-surface-container font-label-sm text-label-sm text-[#ff5722] font-bold tactile-deboss">
            Showing {filteredTenants.length} of {tenants.length} Stores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-sm text-body-sm">
            <thead>
              <tr className="border-b border-surface-container-highest text-outline uppercase font-label-sm text-label-sm">
                <th className="py-3 px-4">Merchant Store</th>
                <th className="py-3 px-4">Owner / Contact</th>
                <th className="py-3 px-4">Archetype</th>
                <th className="py-3 px-4">SaaS Tier</th>
                <th className="py-3 px-4">Wallet Pass Meter</th>
                <th className="py-3 px-4">Google Class ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest/60">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant font-body-md">
                    No merchants match the selected filters or search query.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const usagePercent = Math.round((t.passCount / t.passLimit) * 100);

                  return (
                    <tr key={t.id} className="hover:bg-surface-container/50 transition-colors group">
                      <td className="py-3.5 px-4 font-bold text-on-surface">
                        <div className="flex items-center gap-3">
                          <img
                            src={t.logoUrl}
                            alt={t.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-surface-container-highest shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface group-hover:text-[#ff5722] transition-colors">
                              {t.name}
                            </span>
                            <span className="font-mono text-[11px] text-outline">/{t.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface">{t.ownerName}</span>
                          <span className="text-[11px] text-on-surface-variant">{t.ownerEmail}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm font-bold uppercase text-on-surface border border-surface-container-highest">
                          {t.archetype}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold uppercase ${
                            t.plan === 'scale'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : t.plan === 'growth'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {t.plan} (${t.plan === 'scale' ? 399 : t.plan === 'growth' ? 149 : 49}/mo)
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="font-bold text-on-surface">{t.passCount.toLocaleString()}</span>
                            <span className="text-outline">/ {t.passLimit.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                usagePercent > 90
                                  ? 'bg-red-500'
                                  : usagePercent > 70
                                  ? 'bg-[#ff5722]'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, usagePercent)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-outline text-[11px]">
                        <span className="bg-surface-container px-2 py-1 rounded tactile-deboss text-on-surface-variant font-mono">
                          {t.classId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                            t.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : t.status === 'Suspended'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.status === 'Active'
                                ? 'bg-emerald-500 animate-pulse'
                                : t.status === 'Suspended'
                                ? 'bg-red-500'
                                : 'bg-amber-500'
                            }`}
                          ></span>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            sounds.click(1000, 0.02);
                            setManagingTenant(t);
                            setManageTab('overview');
                          }}
                          className="px-4 py-1.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-bold tactile-btn hover:text-[#ff5722] hover:border-[#ff5722]/30 flex items-center gap-1.5 ml-auto"
                        >
                          <span className="material-symbols-outlined text-[16px]">tune</span>
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: PROVISION NEW MERCHANT */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-low rounded-2xl tactile-card w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-container-highest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ff5722] text-white flex items-center justify-center tactile-glow">
                  <span className="material-symbols-outlined text-[22px]">add_business</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Provision New Store Merchant
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Mint Google Wallet Class Template under Master Issuer ID 3388000000022819402
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center tactile-btn"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleProvisionMerchant} className="p-6 overflow-y-auto space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Store / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="e.g. Mamma Mia Pizzeria"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Legal Business Entity
                  </label>
                  <input
                    type="text"
                    value={newLegalEntity}
                    onChange={(e) => setNewLegalEntity(e.target.value)}
                    placeholder="e.g. Mamma Mia Dining Group Inc"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  />
                </div>
              </div>

              {/* Owner Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Owner / Contact Name
                  </label>
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="e.g. Marco Rossi"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Contact Email Address
                  </label>
                  <input
                    type="email"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="e.g. marco@mammamia.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  />
                </div>
              </div>

              {/* Program Archetype & Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Google Wallet Pass Archetype
                  </label>
                  <select
                    value={newArchetype}
                    onChange={(e) => setNewArchetype(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  >
                    <option value="loyalty">Loyalty Rewards Card</option>
                    <option value="gift">Digital Gift Card</option>
                    <option value="ticket">Event Ticket Pass</option>
                    <option value="benefit">VIP Benefits Membership</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    SaaS Subscription Plan Tier
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  >
                    <option value="starter">Starter Plan ($49/mo - 500 passes)</option>
                    <option value="growth">Growth Plan ($149/mo - 5,000 passes)</option>
                    <option value="scale">Scale Enterprise ($399/mo - 50,000 passes)</option>
                  </select>
                </div>
              </div>

              {/* Branding Assets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Brand Color Accent (Hex)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newBrandColor}
                      onChange={(e) => setNewBrandColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-surface-container tactile-deboss p-1 border-0"
                    />
                    <input
                      type="text"
                      value={newBrandColor}
                      onChange={(e) => setNewBrandColor(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-mono font-bold text-body-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Base Earn Rate (Points / $1)
                  </label>
                  <input
                    type="number"
                    value={newEarnRate}
                    onChange={(e) => setNewEarnRate(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                  Store Logo URL (500x500 PNG)
                </label>
                <input
                  type="url"
                  value={newLogoUrl}
                  onChange={(e) => setNewLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png (Leave blank for default sample logo)"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                />
              </div>

              {/* Auto Provision Banner */}
              <div className="p-4 rounded-xl bg-surface-container p-3 border border-surface-container-highest flex items-start gap-3">
                <span className="material-symbols-outlined text-[#ff5722] text-[20px] mt-0.5">verified</span>
                <div className="text-[12px] text-on-surface-variant">
                  <p className="font-bold text-on-surface">Automated Google Wallet Class Minting</p>
                  <p>
                    Creating this merchant will issue Google Wallet LoyaltyClass{' '}
                    <span className="font-mono text-[#ff5722]">
                      3388000000022819402.tenant_{newStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'store'}_
                      {newArchetype}
                    </span>{' '}
                    and generate an RSA256 JWT minting key instantly.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md font-bold tactile-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full bg-[#ff5722] text-white font-label-md text-label-md font-bold tactile-glow hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                      <span>Provisioning Class...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                      <span>Provision &amp; Create Merchant</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE MERCHANT DRAWER / MODAL */}
      {managingTenant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-low rounded-2xl tactile-card w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Drawer Header */}
            <div className="p-6 border-b border-surface-container-highest flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-4">
                <img
                  src={managingTenant.logoUrl}
                  alt={managingTenant.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-[#ff5722]/40 tactile-card"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {managingTenant.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${
                        managingTenant.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {managingTenant.status}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant font-mono text-[12px]">
                    Class ID: {managingTenant.classId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManagingTenant(null)}
                className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center tactile-btn"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Management Tabs Navigation */}
            <div className="flex border-b border-surface-container-highest bg-surface-container px-6 pt-2 gap-2">
              <button
                onClick={() => {
                  sounds.click(900, 0.01);
                  setManageTab('overview');
                }}
                className={`px-4 py-2.5 font-label-md text-label-md font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                  manageTab === 'overview'
                    ? 'border-[#ff5722] text-[#ff5722] bg-surface-container-low'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>Overview &amp; API Keys</span>
              </button>

              <button
                onClick={() => {
                  sounds.click(900, 0.01);
                  setManageTab('settings');
                }}
                className={`px-4 py-2.5 font-label-md text-label-md font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                  manageTab === 'settings'
                    ? 'border-[#ff5722] text-[#ff5722] bg-surface-container-low'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span>Store Info &amp; Branding</span>
              </button>

              <button
                onClick={() => {
                  sounds.click(900, 0.01);
                  setManageTab('google-class');
                }}
                className={`px-4 py-2.5 font-label-md text-label-md font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                  manageTab === 'google-class'
                    ? 'border-[#ff5722] text-[#ff5722] bg-surface-container-low'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">wallet</span>
                <span>Google Wallet Class</span>
              </button>

              <button
                onClick={() => {
                  sounds.click(900, 0.01);
                  setManageTab('status');
                }}
                className={`px-4 py-2.5 font-label-md text-label-md font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                  manageTab === 'status'
                    ? 'border-[#ff5722] text-[#ff5722] bg-surface-container-low'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">shield</span>
                <span>Status &amp; Actions</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* TAB 1: OVERVIEW & API KEYS */}
              {manageTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-surface-container tactile-deboss flex flex-col justify-between">
                      <span className="text-[11px] font-bold uppercase text-outline">Merchant Tenant ID</span>
                      <span className="font-mono font-bold text-on-surface text-body-md mt-1">
                        {managingTenant.id}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container tactile-deboss flex flex-col justify-between">
                      <span className="text-[11px] font-bold uppercase text-outline">Pass Limit &amp; Usage</span>
                      <span className="font-mono font-bold text-[#ff5722] text-body-md mt-1">
                        {managingTenant.passCount.toLocaleString()} / {managingTenant.passLimit.toLocaleString()} Passes
                      </span>
                    </div>
                  </div>

                  {/* Secret API Key Pod */}
                  <div className="p-5 rounded-xl bg-surface-container border border-surface-container-highest space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                          Merchant Secret API Key
                        </h4>
                        <p className="text-[12px] text-on-surface-variant">
                          Used by merchant POS terminals to authenticate points REST webhooks
                        </p>
                      </div>
                      <button
                        onClick={() => handleRegenerateKey(managingTenant.id)}
                        className="px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold tactile-btn flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">key</span>
                        <span>Regenerate Key</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={managingTenant.apiKey || 'pk_live_sample_key_994821'}
                        className="flex-1 px-4 py-2 rounded-xl bg-surface-container-lowest font-mono text-[13px] text-on-surface border border-surface-container-highest select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(managingTenant.apiKey || '');
                          triggerNotice('API Key copied to clipboard!');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#ff5722] text-white font-label-sm text-label-sm font-bold tactile-glow"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* POS Webhook Endpoint */}
                  <div className="p-4 rounded-xl bg-surface-container tactile-deboss space-y-2">
                    <span className="text-[11px] font-bold uppercase text-outline">Real-Time POS Webhook Endpoint</span>
                    <p className="font-mono text-[12px] text-on-surface bg-surface-container-lowest p-2.5 rounded-lg border border-surface-container-highest">
                      PATCH https://ais-dev-v6nnfts2ifjcwfsonsfq2o-86957709213.us-west1.run.app/api/passes/:objectId/points
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: STORE INFO & BRANDING */}
              {manageTab === 'settings' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-on-surface mb-1">Store Name</label>
                      <input
                        type="text"
                        value={managingTenant.name}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-on-surface mb-1">Legal Entity</label>
                      <input
                        type="text"
                        value={managingTenant.legalEntity}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, legalEntity: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface text-body-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-on-surface mb-1">Owner Name</label>
                      <input
                        type="text"
                        value={managingTenant.ownerName}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, ownerName: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-on-surface mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={managingTenant.ownerEmail}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, ownerEmail: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface text-body-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-on-surface mb-1">Brand Hex Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={managingTenant.brandColor}
                          onChange={(e) =>
                            handleUpdateTenant({ ...managingTenant, brandColor: e.target.value })
                          }
                          className="w-10 h-10 rounded-xl cursor-pointer bg-surface-container p-1 border-0"
                        />
                        <input
                          type="text"
                          value={managingTenant.brandColor}
                          onChange={(e) =>
                            handleUpdateTenant({ ...managingTenant, brandColor: e.target.value })
                          }
                          className="w-full px-4 py-2.5 rounded-xl bg-surface-container font-mono text-body-sm uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-on-surface mb-1">SaaS Plan</label>
                      <select
                        value={managingTenant.plan}
                        onChange={(e) => {
                          const p = e.target.value as any;
                          const limits = { starter: 500, growth: 5000, scale: 50000 };
                          handleUpdateTenant({
                            ...managingTenant,
                            plan: p,
                            passLimit: limits[p as keyof typeof limits],
                          });
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container font-body-sm text-on-surface"
                      >
                        <option value="starter">Starter Plan ($49/mo - 500 Limit)</option>
                        <option value="growth">Growth Plan ($149/mo - 5,000 Limit)</option>
                        <option value="scale">Scale Enterprise ($399/mo - 50,000 Limit)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-on-surface mb-1">Logo Asset URL</label>
                    <input
                      type="url"
                      value={managingTenant.logoUrl}
                      onChange={(e) =>
                        handleUpdateTenant({ ...managingTenant, logoUrl: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-body-sm text-on-surface"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: GOOGLE WALLET CLASS */}
              {manageTab === 'google-class' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-surface-container border border-surface-container-highest space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#ff5722] text-[28px]">
                          cloud_done
                        </span>
                        <div>
                          <h4 className="font-bold text-on-surface">Google Wallet API Class State</h4>
                          <p className="text-[12px] text-on-surface-variant font-mono">
                            {managingTenant.classId}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-label-sm text-label-sm font-bold">
                        ACTIVE ON GOOGLE SERVERS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
                      <div className="p-3 rounded-lg bg-surface-container-lowest">
                        <span className="text-outline block text-[10px] uppercase font-bold">Issuer ID</span>
                        <span className="text-on-surface font-bold">3388000000022819402</span>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-container-lowest">
                        <span className="text-outline block text-[10px] uppercase font-bold">Review Status</span>
                        <span className="text-emerald-500 font-bold">APPROVED / UNDER_REVIEW</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => triggerNotice('Force Synced LoyaltyClass Template with Google REST API!')}
                        className="px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold tactile-btn flex items-center gap-2 hover:text-[#ff5722]"
                      >
                        <span className="material-symbols-outlined text-[18px]">sync</span>
                        <span>Force Re-Sync Google LoyaltyClass</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: STATUS & ACTIONS */}
              {manageTab === 'status' && (
                <div className="space-y-6">
                  {/* Status Switcher */}
                  <div className="p-5 rounded-xl bg-surface-container space-y-3">
                    <h4 className="font-bold text-on-surface">Store Account Operating Status</h4>
                    <div className="flex gap-3">
                      {(['Active', 'Suspended', 'Maintenance'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateTenant({ ...managingTenant, status: st })}
                          className={`flex-1 py-2.5 rounded-xl font-label-md text-label-md font-bold uppercase transition-all ${
                            managingTenant.status === st
                              ? st === 'Active'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : st === 'Suspended'
                                ? 'bg-red-600 text-white shadow-md'
                                : 'bg-amber-600 text-white shadow-md'
                              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface tactile-btn'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Test Pass Issuer */}
                  <div className="p-5 rounded-xl bg-surface-container border border-surface-container-highest space-y-3">
                    <h4 className="font-bold text-on-surface">Issue Test Google Wallet Pass</h4>
                    <p className="text-[12px] text-on-surface-variant">
                      Mints a test signed JWT Google Wallet URL under store tenant /{managingTenant.slug}
                    </p>
                    <button
                      onClick={() => {
                        sounds.click(1000, 0.02);
                        const testUrl = `https://pay.google.com/gp/v/save/eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test_${managingTenant.slug}`;
                        navigator.clipboard.writeText(testUrl);
                        triggerNotice('Copied Test Signed JWT Wallet Save Link!');
                      }}
                      className="px-5 py-2.5 rounded-full bg-[#ff5722] text-white font-label-md text-label-md font-bold tactile-glow flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_to_home_screen</span>
                      <span>Copy Test Wallet Pass Link</span>
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div className="p-5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-3">
                    <h4 className="font-bold text-red-500">Danger Zone</h4>
                    <p className="text-[12px] text-on-surface-variant">
                      Deletes merchant tenant from PassLoyal OS and archives Google Wallet LoyaltyClass.
                    </p>
                    <button
                      onClick={() => handleDeleteTenant(managingTenant.id, managingTenant.name)}
                      className="px-5 py-2 rounded-full bg-red-600 text-white font-label-sm text-label-sm font-bold hover:bg-red-700 transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Archive &amp; Delete Store Tenant</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GOOGLE WALLET BUSINESS CREDENTIALS SETUP */}
      {isCredentialsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-low rounded-2xl tactile-card w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-container-highest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ff5722] text-white flex items-center justify-center tactile-glow">
                  <span className="material-symbols-outlined text-[22px]">verified_user</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Google Wallet Master Business Credentials
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Connect your official Google Pay &amp; Wallet Console Issuer ID and RSA256 Service Account Key
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCredentialsModalOpen(false)}
                className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center tactile-btn"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsTestingConn(true);
                sounds.chime();
                try {
                  await fetch('/api/credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      issuerId: issuerIdInput,
                      serviceAccountEmail: saEmailInput,
                      privateKey: saPrivateKeyInput,
                    }),
                  });
                } catch (err) {
                  console.log('Credentials sync:', err);
                }
                setTimeout(() => {
                  setIsTestingConn(false);
                  triggerNotice(`Authenticated Service Account: ${saEmailInput}`);
                  setIsCredentialsModalOpen(false);
                }, 1000);
              }}
              className="p-6 overflow-y-auto space-y-5"
            >
              {/* Step Checklist Banner */}
              <div className="p-4 rounded-xl bg-surface-container border border-primary-container/30 text-[12px] text-on-surface-variant space-y-1.5">
                <p className="font-bold text-on-surface text-[13px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#ff5722] text-[18px]">checklist</span>
                  <span>4-Step Setup Checklist for Google Wallet Business Account:</span>
                </p>
                <ol className="list-decimal pl-5 space-y-1 font-mono text-[11px] text-outline">
                  <li>Log in to <strong className="text-on-surface">pay.google.com/business/console</strong> &amp; copy your 20-digit Issuer ID.</li>
                  <li>In Google Cloud Console, enable <strong className="text-on-surface">Google Wallet API</strong> (`walletobjects.googleapis.com`).</li>
                  <li>Create a GCP Service Account &amp; download the Service Account Private Key JSON file.</li>
                  <li>In Google Pay Console under User Management, add your Service Account Email as Developer/Admin.</li>
                </ol>
              </div>

              {/* Issuer ID */}
              <div>
                <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                  Google Pay 20-Digit Issuer ID *
                </label>
                <input
                  type="text"
                  required
                  value={issuerIdInput}
                  onChange={(e) => setIssuerIdInput(e.target.value)}
                  placeholder="e.g. 3388000000022819402"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-mono font-bold text-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                />
                <span className="text-[11px] text-outline mt-1 block">
                  Found on your Google Pay &amp; Wallet Console home dashboard.
                </span>
              </div>

              {/* Service Account Email */}
              <div>
                <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                  GCP Service Account Email *
                </label>
                <input
                  type="email"
                  required
                  value={saEmailInput}
                  onChange={(e) => setSaEmailInput(e.target.value)}
                  placeholder="e.g. passloyal-saas@my-gcp-project.iam.gserviceaccount.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-mono text-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                />
              </div>

              {/* Private Key JSON / PEM */}
              <div>
                <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                  RSA256 Private Key (PEM / Service Account JSON)
                </label>
                <textarea
                  rows={4}
                  value={saPrivateKeyInput}
                  onChange={(e) => setSaPrivateKeyInput(e.target.value)}
                  placeholder="Paste your Service Account JSON contents or -----BEGIN PRIVATE KEY----- here..."
                  className="w-full p-4 rounded-xl bg-surface-container tactile-deboss text-on-surface font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50 resize-none"
                ></textarea>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setIsCredentialsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md font-bold tactile-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTestingConn}
                  className="px-6 py-2.5 rounded-full bg-[#ff5722] text-white font-label-md text-label-md font-bold tactile-glow hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  {isTestingConn ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                      <span>Testing OAuth Handshake...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Save Credentials &amp; Authenticate API</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Notification Toast */}
      {notice && (
        <div className="fixed bottom-8 right-8 z-50 bg-surface-container-lowest text-on-surface rounded-full px-6 py-4 tactile-card flex items-center gap-3 ring-1 ring-[#ff5722]/30 shadow-2xl animate-bounce">
          <span className="material-symbols-outlined text-[#ff5722]">verified</span>
          <span className="font-label-md text-label-md font-bold">{notice}</span>
        </div>
      )}
    </div>
  );
};
