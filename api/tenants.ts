import { sql, MASTER_ISSUER_ID, ensureMigration, hashPassword } from './_db';

export default async function handler(req: any, res: any) {
  await ensureMigration();

  if (req.method === 'GET') {
    if (sql) {
      try {
        const rows = await sql`
          SELECT 
            t.id, 
            t.slug, 
            t.name, 
            t.logo, 
            t.color, 
            t.archetype, 
            t.class_id, 
            t.issuer_id,
            t.owner_name,
            t.owner_email,
            t.status,
            t.plan,
            t.pass_limit,
            t.created_at,
            COUNT(m.id)::int as pass_count
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
          ORDER BY t.id;
        `;

        const mapped = rows.map((r: any) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          ownerName: r.owner_name || 'Store Manager',
          ownerEmail: r.owner_email || `${r.slug}@oloyal.com`,
          legalEntity: `${r.name} LLC`,
          brandColor: r.color || '#ff5722',
          logoUrl: r.logo,
          archetype: r.archetype || 'loyalty',
          classId: r.class_id,
          plan: r.plan || 'growth',
          passLimit: Number(r.pass_limit || (r.plan === 'scale' ? 50000 : r.plan === 'starter' ? 500 : 5000)),
          passCount: Number(r.pass_count || 0),
          status: r.status || 'Active',
          createdAt: r.created_at || new Date().toISOString(),
        }));
        return res.status(200).json(mapped);
      } catch (err) {
        console.error('[Neon Postgres API] GET /api/tenants error:', err);
        return res.status(500).json({ error: 'Database connection failed' });
      }
    }
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { name, legalEntity, brandColor, logoUrl, archetype, plan, status, ownerName, owner_name, ownerEmail, owner_email, password } = body;

    // 4) Validation: store name, owner_email, password >= 8 chars, plan in [starter, growth, scale]
    const storeName = (name || '').trim();
    if (!storeName) {
      return res.status(400).json({ error: 'Store name is required' });
    }

    const rawEmail = (ownerEmail || owner_email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@') || !rawEmail.includes('.')) {
      return res.status(400).json({ error: 'Valid owner email is required' });
    }

    const rawPassword = password ? String(password).trim() : '';
    if (!rawPassword || rawPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const rawPlan = (plan || 'growth').trim().toLowerCase();
    if (!['starter', 'growth', 'scale'].includes(rawPlan)) {
      return res.status(400).json({ error: 'Plan must be one of: starter, growth, scale' });
    }

    if (!sql) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `store-${Date.now()}`;

    // 3) Handle duplicates gracefully: if slug or owner_email exists, return 409
    try {
      const existing = await sql`
        SELECT id, slug, owner_email FROM tenants 
        WHERE slug = ${slug} OR LOWER(owner_email) = ${rawEmail}
        LIMIT 1;
      `;
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Store name or email already exists — try another' });
      }
    } catch (checkErr: any) {
      console.error('REGISTER_FAIL', checkErr);
      return res.status(500).json({
        error: checkErr.message || 'Database error during duplicate verification',
        code: checkErr.code,
        detail: checkErr.detail,
      });
    }

    const tenantId = `t-${Date.now()}`;
    const classId = `${MASTER_ISSUER_ID}.tenant_${tenantId}_${archetype || 'loyalty'}_class`;
    const logo = logoUrl || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop';
    const color = brandColor || '#ff5722';
    const finalOwnerName = (ownerName || owner_name || '').trim() || 'Store Manager';
    const passwordHash = hashPassword(rawPassword);
    const passLimit = rawPlan === 'scale' ? 50000 : rawPlan === 'starter' ? 500 : 5000;
    const finalStatus = status || 'Pending Approval'; // Default new registrations to Pending Approval

    let insertedRow: any = null;

    // 1) Wrap DB insert in try/catch and return {error: err.message, code: err.code, detail: err.detail}
    try {
      const inserted = await sql`
        INSERT INTO tenants (
          id, slug, name, logo, color, archetype, class_id, issuer_id, owner_name, owner_email, password_hash, status, plan, pass_limit, created_at
        )
        VALUES (
          ${tenantId}, ${slug}, ${storeName}, ${logo}, ${color}, ${archetype || 'loyalty'}, ${classId}, ${MASTER_ISSUER_ID},
          ${finalOwnerName}, ${rawEmail}, ${passwordHash}, ${finalStatus}, ${rawPlan}, ${passLimit}, NOW()
        )
        RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, owner_name, owner_email, status, plan, pass_limit, created_at;
      `;
      if (inserted && inserted.length > 0) {
        insertedRow = inserted[0];
      }
    } catch (err: any) {
      // 5) Log full error to Vercel Logs with console.error("REGISTER_FAIL", err)
      console.error('REGISTER_FAIL', err);

      // 3) Duplicate key code 23505
      if (
        err.code === '23505' ||
        err.message?.includes('duplicate key') ||
        err.message?.includes('unique constraint') ||
        err.detail?.includes('already exists')
      ) {
        return res.status(409).json({
          error: 'Store name or email already exists — try another',
          code: err.code,
          detail: err.detail,
        });
      }

      return res.status(500).json({
        error: err.message || 'Database error occurred during store registration',
        code: err.code,
        detail: err.detail,
      });
    }

    if (!insertedRow) {
      return res.status(500).json({ error: 'Failed to insert tenant record into database' });
    }

    const responseTenant = {
      id: insertedRow?.id || tenantId,
      slug: insertedRow?.slug || slug,
      name: insertedRow?.name || storeName,
      ownerName: insertedRow?.owner_name || finalOwnerName,
      ownerEmail: insertedRow?.owner_email || rawEmail,
      legalEntity: legalEntity || `${storeName} LLC`,
      brandColor: insertedRow?.color || color,
      logoUrl: insertedRow?.logo || logo,
      archetype: insertedRow?.archetype || archetype || 'loyalty',
      classId: insertedRow?.class_id || classId,
      plan: insertedRow?.plan || rawPlan,
      passLimit: Number(insertedRow?.pass_limit || passLimit),
      passCount: 0,
      status: insertedRow?.status || finalStatus,
      createdAt: insertedRow?.created_at || new Date().toISOString(),
    };

    return res.status(201).json({
      success: true,
      tenant: responseTenant,
      message: finalStatus === 'Pending Approval' 
        ? 'Store registered and submitted for Super Admin package approval' 
        : 'Store provisioned successfully with auth in Neon Postgres',
    });
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { slug, id, status, plan, passLimit, name, brandColor, logoUrl, archetype } = body;
    const target = slug || id || req.query?.slug || req.query?.id;

    if (!target) {
      return res.status(400).json({ error: 'Tenant slug or id is required for update' });
    }

    const computedLimit = passLimit || (plan === 'scale' ? 50000 : plan === 'starter' ? 500 : plan === 'growth' ? 5000 : null);

    if (sql) {
      try {
        const rows = await sql`
          UPDATE tenants
          SET 
            status = COALESCE(${status || null}, status),
            plan = COALESCE(${plan || null}, plan),
            pass_limit = COALESCE(${computedLimit || null}, pass_limit),
            name = COALESCE(${name || null}, name),
            color = COALESCE(${brandColor || null}, color),
            logo = COALESCE(${logoUrl || null}, logo),
            archetype = COALESCE(${archetype || null}, archetype)
          WHERE slug = ${target} OR id = ${target}
          RETURNING id, slug, name, logo, color, archetype, class_id, status, plan, pass_limit;
        `;

        if (rows.length > 0) {
          const r = rows[0];
          return res.status(200).json({
            success: true,
            tenant: {
              id: r.id,
              slug: r.slug,
              name: r.name,
              status: r.status,
              plan: r.plan,
              passLimit: r.pass_limit,
              brandColor: r.color,
              logoUrl: r.logo,
              archetype: r.archetype,
            },
            message: 'Tenant status and plan updated successfully',
          });
        }
        return res.status(404).json({ error: 'Tenant not found' });
      } catch (err: any) {
        console.error('[Neon Postgres API] PATCH /api/tenants error:', err);
        return res.status(500).json({ error: err.message || 'Failed to update tenant' });
      }
    }

    return res.status(500).json({ error: 'Database not configured' });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
