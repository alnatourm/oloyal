import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export default async function handler(req: any, res: any) {
  const rawSlug = req.query?.slug || req.query?.params?.slug || 'banlis';
  const slug = String(rawSlug).trim();

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
            COUNT(m.id)::int as pass_count,
            COALESCE(SUM(m.points)::int, 0) as total_points
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          WHERE t.slug = ${slug} 
             OR t.id = ${slug} 
             OR t.slug = ${slug.replace(/-bistro$/, '')}
          GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id, t.owner_name, t.owner_email, t.status, t.plan, t.pass_limit, t.created_at
          LIMIT 1;
        `;

        if (rows.length > 0) {
          const r = rows[0];
          return res.status(200).json({
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
            totalPoints: Number(r.total_points || 0),
            status: r.status || 'Active',
            createdAt: r.created_at || new Date().toISOString(),
          });
        }
        return res.status(404).json({ error: 'Tenant not found' });
      } catch (err) {
        console.error('[Neon Postgres API] GET /api/tenants/[slug] error:', err);
        return res.status(500).json({ error: 'Database connection failed' });
      }
    }

    return res.status(500).json({ error: 'Database not configured' });
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { name, logoUrl, brandColor, archetype, status, plan, passLimit, pass_limit, ownerName, ownerEmail } = body;
    const computedLimit = passLimit || pass_limit || (plan === 'scale' ? 50000 : plan === 'starter' ? 500 : plan === 'growth' ? 5000 : null);

    if (sql) {
      try {
        const rows = await sql`
          UPDATE tenants
          SET 
            name = COALESCE(${name || null}, name),
            logo = COALESCE(${logoUrl || null}, logo),
            color = COALESCE(${brandColor || null}, color),
            archetype = COALESCE(${archetype || null}, archetype),
            status = COALESCE(${status || null}, status),
            plan = COALESCE(${plan || null}, plan),
            pass_limit = COALESCE(${computedLimit || null}, pass_limit),
            owner_name = COALESCE(${ownerName || null}, owner_name),
            owner_email = COALESCE(${ownerEmail || null}, owner_email)
          WHERE slug = ${slug} OR id = ${slug} OR slug = ${slug.replace(/-bistro$/, '')}
          RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id, status, plan, pass_limit, owner_name, owner_email;
        `;

        if (rows.length > 0) {
          const r = rows[0];
          return res.status(200).json({
            success: true,
            tenant: {
              id: r.id,
              slug: r.slug,
              name: r.name,
              brandColor: r.color,
              logoUrl: r.logo,
              archetype: r.archetype,
              classId: r.class_id,
              status: r.status,
              plan: r.plan,
              passLimit: r.pass_limit,
              ownerName: r.owner_name,
              ownerEmail: r.owner_email,
            },
            message: 'Tenant settings and status updated in Neon Postgres',
          });
        }
        return res.status(404).json({ error: 'Tenant not found' });
      } catch (err: any) {
        console.error('[Neon Postgres API] PATCH /api/tenants/[slug] error:', err);
        return res.status(500).json({ error: `Failed to save tenant customization: ${err?.message || 'Database error'}` });
      }
    }

    return res.status(500).json({ error: 'Database not configured' });
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
