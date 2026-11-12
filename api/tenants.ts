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
      }
    }
    return res.status(200).json([]);
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { name, legalEntity, brandColor, logoUrl, archetype, plan, status, ownerName, owner_name, ownerEmail, owner_email, password } = body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Store name is required' });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const tenantId = `t-${Date.now()}`;
    const classId = `${MASTER_ISSUER_ID}.tenant_${tenantId}_${archetype || 'loyalty'}_class`;
    const logo = logoUrl || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop';
    const color = brandColor || '#ff5722';
    const finalOwnerName = (ownerName || owner_name || '').trim() || 'Store Manager';
    const finalOwnerEmail = (ownerEmail || owner_email || '').trim().toLowerCase() || `${slug}@oloyal.com`;
    const passwordHash = hashPassword(password || 'admin123');
    const finalPlan = plan || 'growth';
    const passLimit = finalPlan === 'scale' ? 50000 : finalPlan === 'starter' ? 500 : 5000;
    const finalStatus = status || 'Pending Approval'; // Default new registrations to Pending Approval

    let insertedRow: any = null;

    if (sql) {
      try {
        const inserted = await sql`
          INSERT INTO tenants (
            id, slug, name, logo, color, archetype, class_id, issuer_id, owner_name, owner_email, password_hash, status, plan, pass_limit, created_at
          )
          VALUES (
            ${tenantId}, ${slug}, ${name.trim()}, ${logo}, ${color}, ${archetype || 'loyalty'}, ${classId}, ${MASTER_ISSUER_ID},
            ${finalOwnerName}, ${finalOwnerEmail}, ${passwordHash}, ${finalStatus}, ${finalPlan}, ${passLimit}, NOW()
          )
          RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, owner_name, owner_email, status, plan, pass_limit, created_at;
        `;
        if (inserted.length > 0) {
          insertedRow = inserted[0];
        }
      } catch (err: any) {
        console.error('[Neon Postgres API] INSERT tenant error:', err);
        try {
          const inserted = await sql`
            INSERT INTO tenants (id, slug, name, logo, color, archetype, class_id, issuer_id, status)
            VALUES (${tenantId}, ${slug}, ${name.trim()}, ${logo}, ${color}, ${archetype || 'loyalty'}, ${classId}, ${MASTER_ISSUER_ID}, ${finalStatus})
            RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status;
          `;
          if (inserted.length > 0) {
            insertedRow = inserted[0];
          }
        } catch (innerErr) {
          console.error('[Neon Postgres API] Secondary INSERT error:', innerErr);
        }
      }
    }

    const responseTenant = {
      id: insertedRow?.id || tenantId,
      slug: insertedRow?.slug || slug,
      name: insertedRow?.name || name.trim(),
      ownerName: insertedRow?.owner_name || finalOwnerName,
      ownerEmail: insertedRow?.owner_email || finalOwnerEmail,
      legalEntity: legalEntity || `${name.trim()} LLC`,
      brandColor: insertedRow?.color || color,
      logoUrl: insertedRow?.logo || logo,
      archetype: insertedRow?.archetype || archetype || 'loyalty',
      classId: insertedRow?.class_id || classId,
      plan: insertedRow?.plan || finalPlan,
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
      } catch (err: any) {
        console.error('[Neon Postgres API] PATCH /api/tenants error:', err);
        return res.status(500).json({ error: err.message || 'Failed to update tenant' });
      }
    }

    return res.status(200).json({ success: true, message: 'Tenant updated' });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
