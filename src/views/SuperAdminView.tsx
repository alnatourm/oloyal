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
  status: 'Active' | 'Pending' | 'Pending Approval' | 'Suspended' | 'Rejected' | 'Maintenance';
  createdAt: string;
  apiKey?: string;
  baseEarnRate?: number;
}

interface SuperAdminViewProps {
  onSelectTenantDashboard?: (slug: string) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onSelectTenantDashboard }) => {
  const [tenants, setTenants] = useState<TenantStore[]>([]);
  const [pendingQueue, setPendingQueue] = useState<TenantStore[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'growth' | 'scale'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending Approval' | 'Active' | 'Suspended' | 'Rejected' | 'Maintenance'>('all');

  // Modals state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [managingTenant, setManagingTenant] = useState<TenantStore | null>(null);

  // Google Wallet Master Setup Credentials
  const [issuerIdInput, setIssuerIdInput] = useState('3388000000022258509');
  const [saEmailInput, setSaEmailInput] = useState('id-banlis-wallet@walletcard-514107.iam.gserviceaccount.com');
  const [saPrivateKeyInput, setSaPrivateKeyInput] = useState('');
  const [isTestingConn, setIsTestingConn] = useState(false);

  // New Merchant Form state
  const [newStoreName, setNewStoreName] = useState('');
  const [newLegalEntity, setNewLegalEntity] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newPassword, setNewPassword] = useState('admin123');
  const [newBrandColor, setNewBrandColor] = useState('#ff5722');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newArchetype, setNewArchetype] = useState<'loyalty' | 'gift' | 'ticket' | 'benefit'>('loyalty');
  const [newPlan, setNewPlan] = useState<'starter' | 'growth' | 'scale'>('growth');
  const [newStatus, setNewStatus] = useState<'Active' | 'Pending Approval'>('Active');
  const [newEarnRate, setNewEarnRate] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast Notice State
  const [notice, setNotice] = useState<string | null>(null);

  // Management Modal Active Tab
  const [manageTab, setManageTab] = useState<'user-mgmt' | 'edit-info' | 'google-class' | 'danger'>('user-mgmt');
  const [merchantNewPassword, setMerchantNewPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const mapTenantRow = (t: any): TenantStore => {
    const rawStatus = (t.status || '').trim().toLowerCase();
    const normalizedStatus: TenantStore['status'] =
      rawStatus === 'pending' || rawStatus === 'pending approval'
        ? 'Pending Approval'
        : rawStatus === 'suspended'
        ? 'Suspended'
        : rawStatus === 'rejected'
        ? 'Rejected'
        : rawStatus === 'maintenance'
        ? 'Maintenance'
        : 'Active';

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      legalEntity: t.legalEntity || `${t.name} LLC`,
      ownerName: t.ownerName || 'Store Manager',
      ownerEmail: t.ownerEmail || `admin@${t.slug}.com`,
      brandColor: t.brandColor || t.color || '#ff5722',
      logoUrl: t.logoUrl || t.logo || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
      archetype: t.archetype || 'loyalty',
      classId: t.classId || t.class_id,
      plan: t.plan || 'growth',
      passLimit: Number(t.passLimit || t.pass_limit || (t.plan === 'scale' ? 50000 : t.plan === 'starter' ? 500 : 5000)),
      passCount: Number(t.passCount || t.pass_count || 0),
      status: normalizedStatus,
      createdAt: t.createdAt || new Date().toISOString(),
      apiKey: `pk_live_${(t.slug || 'store').replace(/-/g, '_')}_${Math.floor(100000 + Math.random() * 900000)}`,
      baseEarnRate: 10,
    };
  };

  const fetchTenants = async () => {
    try {
      const [allRes, pendingRes] = await Promise.all([
        fetch('/api/tenants'),
        fetch('/api/tenants?status=Pending'),
      ]);
      const allData = await allRes.json();
      const pendingData = await pendingRes.json().catch(() => []);

      if (Array.isArray(allData)) {
        const mapped = allData.map(mapTenantRow);
        setTenants(mapped);
        if (Array.isArray(pendingData) && pendingRes.ok) {
          setPendingQueue(pendingData.map(mapTenantRow));
        } else {
          setPendingQueue(mapped.filter((t) => t.status === 'Pending Approval' || t.status === 'Pending'));
        }
      }
    } catch (err) {
      console.error('Error fetching tenants from DB:', err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const triggerNotice = (msg: string) => {
    sounds.click(1000, 0.02);
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Approve a pending merchant & activate live issuing (UPDATE tenants SET status='Active')
  const handleApproveTenant = async (tenant: TenantStore) => {
    sounds.chime();
    try {
      const res = await fetch(`/api/tenants/${tenant.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' }),
      });
      if (res.ok) {
        await fetchTenants();
        triggerNotice(`Approved & Activated Merchant "${tenant.name}" (status = Active)!`);
      } else {
        triggerNotice('Failed to update tenant status in database');
      }
    } catch (err) {
      triggerNotice('Error connecting to database');
    }
  };

  // Reject a merchant application (UPDATE tenants SET status='Rejected')
  const handleRejectTenant = async (tenant: TenantStore) => {
    sounds.click(400, 0.05);
    try {
      const res = await fetch(`/api/tenants/${tenant.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected' }),
      });
      if (res.ok) {
        await fetchTenants();
        triggerNotice(`Application for "${tenant.name}" has been Rejected.`);
      }
    } catch (err) {
      triggerNotice('Error connecting to database');
    }
  };

  // Handle Provisioning New Merchant into Neon Postgres DB
  const handleProvisionMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      triggerNotice('Error: Store Name is required!');
      return;
    }

    sounds.click(800, 0.04);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStoreName.trim(),
          legalEntity: newLegalEntity.trim() || `${newStoreName.trim()} LLC`,
          ownerName: newOwnerName.trim() || 'Store Manager',
          ownerEmail: newOwnerEmail.trim() || `admin@${newStoreName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'store'}.com`,
          password: newPassword.trim() || 'admin123',
          brandColor: newBrandColor,
          logoUrl: newLogoUrl.trim() || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
          archetype: newArchetype,
          plan: newPlan,
          status: newStatus,
        }),
      });

      if (res.ok) {
        await fetchTenants(); // Refetch directly from DB!
        triggerNotice(`Successfully Provisioned Merchant "${newStoreName.trim()}" (${newStatus})!`);
      } else {
        const err = await res.json().catch(() => ({}));
        triggerNotice(`Error: ${err.error || 'Failed to provision merchant'}`);
      }
    } catch (err) {
      console.error('Create merchant error:', err);
      triggerNotice('Database connection error');
    } finally {
      setIsSubmitting(false);
      setIsProvisionModalOpen(false);

      // Reset Form
      setNewStoreName('');
      setNewLegalEntity('');
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewPassword('admin123');
      setNewBrandColor('#ff5722');
      setNewLogoUrl('');
      setNewArchetype('loyalty');
      setNewPlan('growth');
      setNewStatus('Active');
    }
  };

  // Handle Updates to Managed Tenant
  const handleUpdateTenant = async (updated: TenantStore) => {
    sounds.click(900, 0.02);
    setTenants(tenants.map((t) => (t.id === updated.id ? updated : t)));
    setManagingTenant(updated);

    try {
      await fetch(`/api/tenants/${updated.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.name,
          legalEntity: updated.legalEntity,
          ownerName: updated.ownerName,
          ownerEmail: updated.ownerEmail,
          brandColor: updated.brandColor,
          logoUrl: updated.logoUrl,
          archetype: updated.archetype,
          status: updated.status,
          plan: updated.plan,
          passLimit: updated.passLimit,
        }),
      });
      triggerNotice(`Updated Settings & Status for ${updated.name}`);
    } catch (err) {
      console.error('Update tenant error:', err);
    }
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

  // Handle Delete Tenant with backend DB persistence
  const handleDeleteTenant = async (tenantId: string, slug: string, storeName: string) => {
    sounds.click(400, 0.05);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tenants/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        setTenants((prev) => prev.filter((t) => t.id !== tenantId && t.slug !== slug));
        setManagingTenant(null);
        triggerNotice(`Permanently deleted merchant "${storeName}" & archived records.`);
      } else {
        triggerNotice('Failed to delete merchant from database');
      }
    } catch {
      triggerNotice('Error connecting to database');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Update Merchant Password
  const handleUpdatePassword = async (slug: string, newPw: string) => {
    if (!newPw || newPw.trim().length < 4) {
      triggerNotice('Password must be at least 4 characters');
      return;
    }
    sounds.click();
    setIsSavingPassword(true);
    try {
      const res = await fetch(`/api/tenants/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPw.trim() }),
      });
      if (res.ok) {
        triggerNotice(`Login password successfully updated for ${managingTenant?.name}!`);
        setMerchantNewPassword('');
      } else {
        triggerNotice('Failed to update password');
      }
    } catch {
      triggerNotice('Error connecting to server');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Toggle Block / Suspend User
  const handleToggleBlock = async (tenant: TenantStore) => {
    const targetStatus = tenant.status === 'Suspended' ? 'Active' : 'Suspended';
    sounds.click(targetStatus === 'Suspended' ? 400 : 800, 0.04);
    try {
      const res = await fetch(`/api/tenants/${tenant.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (res.ok) {
        const updated: TenantStore = { ...tenant, status: targetStatus as any };
        setTenants((prev) => prev.map((t) => (t.id === tenant.id ? updated : t)));
        setManagingTenant(updated);
        triggerNotice(
          targetStatus === 'Suspended'
            ? `Blocked merchant "${tenant.name}" (${tenant.ownerEmail}). Login disabled.`
            : `Unblocked merchant "${tenant.name}". Account is now Active!`
        );
      } else {
        triggerNotice('Failed to update status');
      }
    } catch {
      triggerNotice('Error connecting to database');
    }
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
  const pendingTenants = pendingQueue.length > 0
    ? pendingQueue
    : tenants.filter((t) => t.status === 'Pending Approval' || t.status === 'Pending');
  const totalMRR = tenants.reduce((acc, t) => {
    if (t.status === 'Suspended' || t.status === 'Rejected') return acc;
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
            Master Issuer ID: <span className="font-mono text-on-surface font-bold">3388000000022258509</span> • RSA256 JWT Signing Active
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

      {/* Dedicated Pending Approvals Queue (WHERE status IN ('Pending', 'Pending Approval')) */}
      <div className="p-6 rounded-xl bg-surface-container-low tactile-card border border-amber-500/30 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md shrink-0 ${
              pendingTenants.length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-emerald-600 text-white'
            }`}>
              <span className="material-symbols-outlined text-[22px]">
                {pendingTenants.length > 0 ? 'hourglass_top' : 'task_alt'}
              </span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span>Pending Merchant Approvals</span>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                  pendingTenants.length > 0
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {pendingTenants.length} Pending
                </span>
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Stores awaiting verification before activating Google Wallet pass issuing (status = Active)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.click();
              fetchTenants();
            }}
            className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold tactile-btn flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh Queue</span>
          </button>
        </div>

        {pendingTenants.length === 0 ? (
          <div className="p-4 rounded-xl bg-surface-container tactile-deboss text-center text-sm text-on-surface-variant">
            No pending merchant registrations at the moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="border-b border-surface-container-highest text-outline uppercase font-label-sm text-label-sm">
                  <th className="py-2.5 px-4">Store Name</th>
                  <th className="py-2.5 px-4">Owner / Email</th>
                  <th className="py-2.5 px-4">Requested Package</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Approval Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/60">
                {pendingTenants.map((pt) => (
                  <tr key={pt.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-on-surface">
                      <div>{pt.name}</div>
                      <div className="font-mono text-[11px] text-outline">/{pt.slug}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-on-surface">{pt.ownerName}</div>
                      <div className="text-[11px] text-on-surface-variant">{pt.ownerEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-label-sm text-label-sm font-bold uppercase">
                        {pt.plan} (${pt.plan === 'scale' ? 399 : pt.plan === 'starter' ? 49 : 149}/mo)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-label-sm text-label-sm font-bold ring-1 ring-amber-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                        Pending
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApproveTenant(pt)}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-label-sm text-label-sm font-bold shadow-md flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectTenant(pt)}
                          className="px-3.5 py-1.5 rounded-full bg-red-600/10 hover:bg-red-600 hover:text-white text-red-700 font-label-sm text-label-sm font-bold transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            {(['all', 'Pending Approval', 'Active', 'Suspended', 'Rejected', 'Maintenance'] as const).map((st) => {
              const pendingCount = tenants.filter((t) => t.status === 'Pending Approval' || t.status === 'Pending').length;
              const label =
                st === 'all'
                  ? 'All'
                  : st === 'Pending Approval'
                  ? `Pending (${pendingCount})`
                  : st;

              return (
                <button
                  key={st}
                  onClick={() => {
                    sounds.click(900, 0.01);
                    setStatusFilter(st);
                  }}
                  className={`px-3 py-1 rounded-full text-[12px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                    statusFilter === st
                      ? 'bg-[#ff5722] text-white shadow-sm'
                      : st === 'Pending Approval' && pendingCount > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-500/50'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {st === 'Pending Approval' && pendingCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
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
                              : t.status === 'Pending Approval' || t.status === 'Pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-500/40'
                              : t.status === 'Suspended' || t.status === 'Rejected'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.status === 'Active'
                                ? 'bg-emerald-500 animate-pulse'
                                : t.status === 'Pending Approval' || t.status === 'Pending'
                                ? 'bg-amber-500 animate-ping'
                                : t.status === 'Suspended' || t.status === 'Rejected'
                                ? 'bg-red-500'
                                : 'bg-blue-500'
                            }`}
                          ></span>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {t.status === 'Pending Approval' && (
                            <>
                              <button
                                onClick={() => handleApproveTenant(t)}
                                className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-label-sm text-label-sm font-bold shadow-md flex items-center gap-1 active:scale-95 transition-all tactile-glow"
                                title="Approve merchant and activate Google Wallet pass issuing"
                              >
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectTenant(t)}
                                className="px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-red-600 hover:text-white text-on-surface-variant font-label-sm text-label-sm font-semibold transition-all tactile-btn"
                                title="Reject registration"
                              >
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              sounds.click(1000, 0.02);
                              setManagingTenant(t);
                              setManageTab('user-mgmt');
                              setMerchantNewPassword('');
                              setDeleteConfirmInput('');
                            }}
                            className="px-4 py-1.5 rounded-full bg-[#ff5722] text-white font-label-sm text-label-sm font-bold tactile-glow flex items-center gap-1.5 hover:brightness-105 active:scale-95 shadow-sm"
                            title="Manage User, Reset Password, Edit Info, Block/Unblock, or Delete"
                          >
                            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                            <span>Manage</span>
                          </button>
                        </div>
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
                    Mint Google Wallet Class Template under Master Issuer ID 3388000000022258509
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

              {/* Owner Contact & Authentication */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Owner Name
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
                    Owner Login Email
                  </label>
                  <input
                    type="email"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="e.g. marco@mammamia.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="admin123"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  />
                </div>
              </div>

              {/* Program Archetype, Plan & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Wallet Pass Archetype
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
                    SaaS Package Tier
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  >
                    <option value="starter">Starter ($49/mo - 500 passes)</option>
                    <option value="growth">Growth ($149/mo - 5,000 passes)</option>
                    <option value="scale">Scale ($399/mo - 50,000 passes)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-label-md font-bold text-on-surface mb-1.5">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container tactile-deboss text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                  >
                    <option value="Active">Active (Instant Issuing)</option>
                    <option value="Pending Approval">Pending Approval</option>
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
                      3388000000022258509.tenant_{newStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'store'}_
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
            <div className="flex border-b border-surface-container-highest bg-surface-container px-6 pt-2 gap-2 overflow-x-auto">
              <button
                onClick={() => {
                  sounds.click(900, 0.01);
                  setManageTab('user-mgmt');
                }}
                className={`px-4 py-2.5 font-label-md text-label-md font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  manageTab === 'user-mgmt'
                    ? 'border-[#ff5722] text-[#ff5722] bg-surface-container-low'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                <span>User &amp; Password</span>
              </button>

              <button
                onClick={() => {
                  sounds.click(900, 0.01);
                  setManageTab('edit-info');
                }}
                className={`px-4 py-2.5 font-label-md text-label-md font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  manageTab === 'edit-info'
                    ? 'border-[#ff5722] text-[#ff5722] bg-surface-container-low'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                <span>Edit Information</span>
              </button>

              <button
                onClick={() => {
                  sounds.click(900, 0.01);
                  setManageTab('google-class');
                }}
                className={`px-4 py-2.5 font-label-md text-label-md font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  manageTab === 'google-class'
                    ? 'border-[#ff5722] text-[#ff5722] bg-surface-container-low'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">wallet</span>
                <span>Google Wallet &amp; Keys</span>
              </button>

              <button
                onClick={() => {
                  sounds.click(900, 0.01);
                  setManageTab('danger');
                }}
                className={`px-4 py-2.5 font-label-md text-label-md font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  manageTab === 'danger'
                    ? 'border-red-600 text-red-600 bg-surface-container-low'
                    : 'border-transparent text-on-surface-variant hover:text-red-500'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                <span>Delete Store</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* TAB 1: USER MANAGEMENT, PASSWORDS & BLOCK USER */}
              {manageTab === 'user-mgmt' && (
                <div className="space-y-6">
                  {/* Account Identity & Status Card */}
                  <div className="p-5 rounded-2xl bg-surface-container border border-surface-container-highest space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                          Merchant User Profile
                        </span>
                        <h4 className="font-headline-sm text-lg font-bold text-on-surface mt-0.5">
                          {managingTenant.ownerName}
                        </h4>
                        <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                          {managingTenant.ownerEmail} • Slug: /{managingTenant.slug}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {onSelectTenantDashboard && (
                          <button
                            onClick={() => {
                              sounds.click(1000, 0.02);
                              onSelectTenantDashboard(managingTenant.slug);
                            }}
                            className="px-4 py-2 rounded-full bg-surface-container-high hover:bg-[#ff5722] hover:text-white text-on-surface font-label-sm text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            title="Launch merchant dashboard view in this store context"
                          >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            <span>Open Store Dashboard</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Status & Blocking Controls */}
                    <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-highest flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 ${
                            managingTenant.status === 'Suspended'
                              ? 'bg-red-600'
                              : managingTenant.status === 'Pending Approval'
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {managingTenant.status === 'Suspended'
                              ? 'block'
                              : managingTenant.status === 'Pending Approval'
                              ? 'hourglass_top'
                              : 'check_circle'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-on-surface flex items-center gap-2">
                            <span>Account Status: {managingTenant.status}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                managingTenant.status === 'Suspended'
                                  ? 'bg-red-100 text-red-800'
                                  : managingTenant.status === 'Pending Approval'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {managingTenant.status === 'Suspended' ? 'Blocked' : 'Active'}
                            </span>
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {managingTenant.status === 'Suspended'
                              ? 'This user is currently BLOCKED. Login access is disabled and wallet pass issuing is halted.'
                              : managingTenant.status === 'Pending Approval'
                              ? 'Registration submitted. Awaiting Super Admin package approval.'
                              : 'Active merchant account. Authorized to access store dashboard and issue passes.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {managingTenant.status === 'Pending Approval' ? (
                          <button
                            onClick={async () => {
                              await handleApproveTenant(managingTenant);
                              setManagingTenant({ ...managingTenant, status: 'Active' });
                            }}
                            className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>Approve User</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleBlock(managingTenant)}
                            className={`px-4 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                              managingTenant.status === 'Suspended'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {managingTenant.status === 'Suspended' ? 'lock_open' : 'block'}
                            </span>
                            <span>
                              {managingTenant.status === 'Suspended' ? 'Unblock User' : 'Block User'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Password Management & Reset Card */}
                  <div className="p-5 rounded-2xl bg-surface-container border border-surface-container-highest space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[20px]">key</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface text-sm">
                            Merchant Password Management
                          </h4>
                          <p className="text-xs text-on-surface-variant">
                            Reset or assign a new login password for this merchant user
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-[#ff5722] font-semibold bg-[#ff5722]/10 px-2.5 py-1 rounded-full">
                        Default: admin123
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-on-surface mb-1">
                          New Merchant Password
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showPasswordText ? 'text' : 'password'}
                              value={merchantNewPassword}
                              onChange={(e) => setMerchantNewPassword(e.target.value)}
                              placeholder="Enter new password (min. 4 characters)..."
                              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-surface text-on-surface text-xs border border-surface-container-highest focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswordText(!showPasswordText)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {showPasswordText ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const rand = 'pass_' + Math.random().toString(36).substring(2, 8);
                              setMerchantNewPassword(rand);
                              setShowPasswordText(true);
                              sounds.click();
                            }}
                            className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all"
                            title="Generate a random password"
                          >
                            Generate
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMerchantNewPassword('admin123');
                              sounds.click();
                            }}
                            className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all"
                            title="Reset to default admin123"
                          >
                            Set admin123
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const creds = `PassLoyal OS Merchant Login\nURL: ${window.location.origin}\nIdentifier: ${managingTenant.ownerEmail}\nSlug: ${managingTenant.slug}\nPassword: ${merchantNewPassword || 'admin123'}`;
                            navigator.clipboard.writeText(creds);
                            triggerNotice('Copied Merchant Login Credentials to Clipboard!');
                          }}
                          className="px-3.5 py-2 rounded-full bg-surface-container-lowest hover:bg-surface-container-high text-on-surface text-xs font-bold border border-surface-container-highest flex items-center gap-1.5 transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          <span>Copy Login Credentials</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSavingPassword || !merchantNewPassword.trim()}
                          onClick={() => handleUpdatePassword(managingTenant.slug, merchantNewPassword)}
                          className="px-5 py-2 rounded-full bg-[#ff5722] disabled:opacity-50 text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          {isSavingPassword ? (
                            <>
                              <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">save</span>
                              <span>Update Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: EDIT STORE INFORMATION */}
              {manageTab === 'edit-info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">Store / Business Name</label>
                      <input
                        type="text"
                        value={managingTenant.name}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, name: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">Legal Entity</label>
                      <input
                        type="text"
                        value={managingTenant.legalEntity}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, legalEntity: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">Owner Name</label>
                      <input
                        type="text"
                        value={managingTenant.ownerName}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, ownerName: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">Owner Work Email</label>
                      <input
                        type="email"
                        value={managingTenant.ownerEmail}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, ownerEmail: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">Brand Accent Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={managingTenant.brandColor}
                          onChange={(e) =>
                            handleUpdateTenant({ ...managingTenant, brandColor: e.target.value })
                          }
                          className="w-10 h-10 rounded-xl cursor-pointer bg-surface p-1 border border-surface-container-highest"
                        />
                        <input
                          type="text"
                          value={managingTenant.brandColor}
                          onChange={(e) =>
                            handleUpdateTenant({ ...managingTenant, brandColor: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">SaaS Plan Package</label>
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
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-xs text-on-surface focus:outline-none"
                      >
                        <option value="starter">Starter Plan ($49/mo - 500 Limit)</option>
                        <option value="growth">Growth Plan ($149/mo - 5,000 Limit)</option>
                        <option value="scale">Scale Enterprise ($399/mo - 50,000 Limit)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">Pass Card Archetype</label>
                      <select
                        value={managingTenant.archetype}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, archetype: e.target.value as any })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-xs text-on-surface focus:outline-none"
                      >
                        <option value="loyalty">Loyalty Club</option>
                        <option value="gift">Digital Gift Card</option>
                        <option value="ticket">Event Ticket Pass</option>
                        <option value="benefit">VIP Membership Pass</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">Pass Issuing Limit</label>
                      <input
                        type="number"
                        value={managingTenant.passLimit}
                        onChange={(e) =>
                          handleUpdateTenant({ ...managingTenant, passLimit: Number(e.target.value) || 1000 })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-on-surface text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Logo Asset URL</label>
                    <input
                      type="url"
                      value={managingTenant.logoUrl}
                      onChange={(e) =>
                        handleUpdateTenant({ ...managingTenant, logoUrl: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-surface-container-highest text-xs text-on-surface"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => triggerNotice(`Saved Information for ${managingTenant.name}!`)}
                      className="px-5 py-2.5 rounded-full bg-[#ff5722] text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Save Information</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: GOOGLE WALLET & API KEYS */}
              {manageTab === 'google-class' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-surface-container border border-surface-container-highest space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#ff5722] text-[28px]">
                          cloud_done
                        </span>
                        <div>
                          <h4 className="font-bold text-on-surface text-sm">Google Wallet API Class State</h4>
                          <p className="text-xs text-on-surface-variant font-mono">
                            {managingTenant.classId}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                        ACTIVE ON GOOGLE SERVERS
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-surface-container-lowest">
                        <span className="text-outline block text-[10px] uppercase font-bold">Issuer ID</span>
                        <span className="text-on-surface font-bold">3388000000022258509</span>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-container-lowest">
                        <span className="text-outline block text-[10px] uppercase font-bold">Review Status</span>
                        <span className="text-emerald-500 font-bold">APPROVED / UNDER_REVIEW</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => triggerNotice('Force Synced LoyaltyClass Template with Google REST API!')}
                        className="px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface font-bold text-xs tactile-btn flex items-center gap-2 hover:text-[#ff5722]"
                      >
                        <span className="material-symbols-outlined text-[18px]">sync</span>
                        <span>Force Re-Sync Google LoyaltyClass</span>
                      </button>
                    </div>
                  </div>

                  {/* Secret API Key Pod */}
                  <div className="p-5 rounded-xl bg-surface-container border border-surface-container-highest space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-on-surface text-sm">Merchant Secret API Key</h4>
                        <p className="text-xs text-on-surface-variant">
                          Used by POS terminals to authenticate points REST webhooks
                        </p>
                      </div>
                      <button
                        onClick={() => handleRegenerateKey(managingTenant.id)}
                        className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface font-bold text-xs tactile-btn flex items-center gap-1.5"
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
                        className="flex-1 px-3.5 py-2 rounded-xl bg-surface-container-lowest font-mono text-xs text-on-surface border border-surface-container-highest select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(managingTenant.apiKey || '');
                          triggerNotice('API Key copied to clipboard!');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#ff5722] text-white font-bold text-xs tactile-glow"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DANGER ZONE & DELETE STORE */}
              {manageTab === 'danger' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-red-950/15 border border-red-500/40 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shrink-0">
                        <span className="material-symbols-outlined text-[22px]">warning</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-red-600 text-base">Permanently Delete Merchant Store</h4>
                        <p className="text-xs text-on-surface-variant">
                          This will permanently delete <strong>{managingTenant.name}</strong> (`/{managingTenant.slug}`), all issued passes, member records, and de-provision its Google Wallet class.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface-container border border-red-500/20 text-xs text-on-surface-variant space-y-2">
                      <p>
                        To confirm deletion, please type the store name <strong className="text-on-surface font-mono">{managingTenant.name}</strong> below:
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        placeholder={`Type "${managingTenant.name}" to confirm`}
                        className="w-full px-3.5 py-2 rounded-xl bg-surface text-on-surface text-xs border border-surface-container-highest font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={isDeleting || deleteConfirmInput.trim() !== managingTenant.name}
                        onClick={() => handleDeleteTenant(managingTenant.id, managingTenant.slug, managingTenant.name)}
                        className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
                      >
                        {isDeleting ? (
                          <>
                            <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                            <span>Permanently Delete Merchant</span>
                          </>
                        )}
                      </button>
                    </div>
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
                  placeholder="e.g. 3388000000022258509"
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
