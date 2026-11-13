import bcrypt from 'bcryptjs';
import { sql, MASTER_ISSUER_ID } from '../_db.js';

const DEFAULT_SERVICE_ACCOUNT =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'oloyal-wallet-sa@banlis-bistro-app.iam.gserviceaccount.com';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const email = (process.env.SUPER_ADMIN_EMAIL || '').trim();
    if (sql) {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS platform_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `;
        const rows = await sql`
          SELECT key, value FROM platform_settings
          WHERE key IN ('admin_display_name', 'admin_organization', 'admin_phone', 'admin_contact_email', 'admin_issuer_id', 'admin_service_account');
        `;
        const map: Record<string, string> = {};
        rows.forEach((r: any) => {
          map[r.key] = r.value;
        });
        return res.status(200).json({
          email: email || map.admin_contact_email || '',
          displayName: map.admin_display_name || 'Super Admin Master Issuer',
          organization: map.admin_organization || 'PassLoyal OS Master Issuer',
          phone: map.admin_phone || '',
          contactEmail: map.admin_contact_email || email,
          issuerId: map.admin_issuer_id || MASTER_ISSUER_ID,
          serviceAccountEmail: map.admin_service_account || DEFAULT_SERVICE_ACCOUNT,
        });
      } catch (err) {
        console.warn('[Vercel Admin Profile] GET notice:', err);
      }
    }

    return res.status(200).json({
      email,
      displayName: 'Super Admin Master Issuer',
      organization: 'PassLoyal OS Master Issuer',
      phone: '',
      contactEmail: email,
      issuerId: MASTER_ISSUER_ID,
      serviceAccountEmail: DEFAULT_SERVICE_ACCOUNT,
    });
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      displayName,
      organization,
      phone,
      contactEmail,
      issuerId,
      serviceAccountEmail,
      currentPassword,
      newPassword,
    } = body;

    let generatedPasswordHash: string | undefined;
    if (newPassword) {
      const trimmedNew = String(newPassword).trim();
      if (trimmedNew.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      const existingHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
      if (existingHash) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to change admin password' });
        }
        const match = await bcrypt.compare(String(currentPassword), existingHash);
        if (!match) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
      }
      generatedPasswordHash = await bcrypt.hash(trimmedNew, 10);
    }

    const savedProfile = {
      email: (process.env.SUPER_ADMIN_EMAIL || contactEmail || '').trim(),
      displayName: (displayName || 'Super Admin Master Issuer').trim(),
      organization: (organization || 'PassLoyal OS Master Issuer').trim(),
      phone: (phone || '').trim(),
      contactEmail: (contactEmail || process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase(),
      issuerId: (issuerId || MASTER_ISSUER_ID).trim(),
      serviceAccountEmail: (serviceAccountEmail || DEFAULT_SERVICE_ACCOUNT).trim(),
    };

    if (sql) {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS platform_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `;
        const entries: [string, string][] = [
          ['admin_display_name', savedProfile.displayName],
          ['admin_organization', savedProfile.organization],
          ['admin_phone', savedProfile.phone],
          ['admin_contact_email', savedProfile.contactEmail],
          ['admin_issuer_id', savedProfile.issuerId],
          ['admin_service_account', savedProfile.serviceAccountEmail],
        ];
        for (const [k, v] of entries) {
          await sql`
            INSERT INTO platform_settings (key, value, updated_at)
            VALUES (${k}, ${v}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
          `;
        }
      } catch (err) {
        console.warn('[Vercel Admin Profile] PATCH DB notice:', err);
      }
    }

    return res.status(200).json({
      success: true,
      profile: savedProfile,
      ...(generatedPasswordHash ? { generatedPasswordHash } : {}),
      message: generatedPasswordHash
        ? 'Admin profile saved and new bcrypt password hash generated. Update ADMIN_PASSWORD_HASH in Vercel to persist the new password.'
        : 'Admin profile updated successfully.',
    });
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
