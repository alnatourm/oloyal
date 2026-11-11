import { sql, ensureMigration, verifyPassword } from './_db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await ensureMigration();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const email = (body.email || body.owner_email || body.ownerEmail || body.username || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (sql) {
    try {
      const rows = await sql`
        SELECT 
          id, 
          slug, 
          name, 
          logo, 
          color, 
          archetype, 
          class_id, 
          issuer_id, 
          owner_name, 
          owner_email, 
          password_hash,
          created_at
        FROM tenants 
        WHERE LOWER(owner_email) = ${email} 
           OR slug = ${email} 
           OR id = ${email}
        LIMIT 1;
      `;

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const tenant = rows[0];
      const valid = verifyPassword(password, tenant.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      return res.status(200).json({
        success: true,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          ownerName: tenant.owner_name || 'Store Owner',
          ownerEmail: tenant.owner_email,
          brandColor: tenant.color || '#ff5722',
          logoUrl: tenant.logo,
          archetype: tenant.archetype || 'loyalty',
          classId: tenant.class_id,
        },
        token: `tok_${tenant.id}_${Date.now()}`,
        message: 'Login successful',
      });
    } catch (err: any) {
      console.error('[Login API] Error:', err);
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  }

  // Fallback for offline / dev mode
  return res.status(200).json({
    success: true,
    tenant: {
      id: 't-banlis',
      slug: 'banlis',
      name: 'Banlis Bistro & Dining',
      ownerName: 'Admin',
      ownerEmail: email,
      brandColor: '#ff5722',
      archetype: 'loyalty',
    },
    token: `tok_fallback_${Date.now()}`,
    message: 'Login successful (offline fallback)',
  });
}
