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
  const role = body.role || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!sql) {
    return res.status(500).json({ error: 'Database not configured' });
  }

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
        status,
        plan,
        pass_limit,
        created_at,
        (password_hash = crypt(${password}, password_hash)) as is_valid
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
    const isValid = tenant.is_valid || (tenant.password_hash ? verifyPassword(password, tenant.password_hash) : false);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (tenant.status === 'Pending Approval' || tenant.status === 'pending') {
      return res.status(403).json({
        success: false,
        pending: true,
        status: 'Pending Approval',
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          ownerName: tenant.owner_name || 'Store Owner',
          ownerEmail: tenant.owner_email,
          plan: tenant.plan || 'growth',
          status: 'Pending Approval',
        },
        error: 'Your store registration has been received and is currently waiting for Super Admin approval for your package.',
      });
    }

    if (tenant.status === 'Suspended') {
      return res.status(403).json({
        success: false,
        status: 'Suspended',
        error: 'This merchant account has been suspended by the platform administrator.',
      });
    }

    const userEmail = (tenant.owner_email || '').toLowerCase();
    const assignedRole = (
      userEmail === 'alnatour.m@gmail.com' ||
      userEmail === 'admin@passloyal.com' ||
      userEmail === 'admin@oloyal.com' ||
      tenant.slug === 'super-admin' ||
      tenant.plan === 'scale' ||
      tenant.plan === 'admin'
    ) ? 'admin' : 'merchant';

    return res.status(200).json({
      success: true,
      role: assignedRole,
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
        status: tenant.status || 'Active',
        plan: tenant.plan || 'growth',
      },
      user: {
        name: tenant.owner_name || tenant.name,
        email: tenant.owner_email,
        role: assignedRole,
      },
      token: `tok_${tenant.id}_${Date.now()}`,
      message: 'Login successful',
    });
  } catch (err: any) {
    console.error('[Login API] Error:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
}
