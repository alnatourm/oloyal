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
            COUNT(m.id)::int as pass_count,
            COALESCE(SUM(m.points)::int, 0) as total_points
          FROM tenants t
          LEFT JOIN members m ON m.tenant_id = t.id
          WHERE t.slug = ${slug} 
             OR t.id = ${slug} 
             OR t.slug = ${slug.replace(/-bistro$/, '')}
          GROUP BY t.id, t.slug, t.name, t.logo, t.color, t.archetype, t.class_id, t.issuer_id
          LIMIT 1;
        `;

        if (rows.length > 0) {
          const r = rows[0];
          return res.status(200).json({
            id: r.id,
            slug: r.slug,
            name: r.name,
            legalEntity: `${r.name} LLC`,
            brandColor: r.color || '#ff5722',
            logoUrl: r.logo,
            archetype: r.archetype || 'loyalty',
            classId: r.class_id,
            plan: 'growth',
            passLimit: 5000,
            passCount: Number(r.pass_count || 0),
            totalPoints: Number(r.total_points || 0),
            status: 'active',
          });
        }
      } catch (err) {
        console.error('[Neon Postgres API] GET /api/tenants/[slug] error:', err);
      }
    }

    return res.status(200).json({
      id: 't-banlis',
      slug,
      name: slug.toUpperCase(),
      brandColor: '#ff5722',
      logoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
      archetype: 'loyalty',
      classId: '3388000000022258509.tenant_t-banlis_loyalty_class',
      passCount: 0,
      totalPoints: 0,
      status: 'active',
    });
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { name, logoUrl, brandColor, archetype } = body;

    if (sql) {
      try {
        const rows = await sql`
          UPDATE tenants
          SET 
            name = COALESCE(${name || null}, name),
            logo = COALESCE(${logoUrl || null}, logo),
            color = COALESCE(${brandColor || null}, color),
            archetype = COALESCE(${archetype || null}, archetype)
          WHERE slug = ${slug} OR id = ${slug} OR slug = ${slug.replace(/-bistro$/, '')}
          RETURNING id, slug, name, logo, color, archetype, class_id, issuer_id;
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
            },
            message: 'Tenant customization saved to Neon Postgres',
          });
        }
      } catch (err: any) {
        console.error('[Neon Postgres API] PATCH /api/tenants/[slug] error:', err);
        return res.status(500).json({ error: `Failed to save tenant customization: ${err?.message || 'Database error'}` });
      }
    }

    return res.status(200).json({
      success: true,
      tenant: {
        id: 't-banlis',
        slug,
        name: name || slug,
        brandColor: brandColor || '#ff5722',
        logoUrl: logoUrl || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
        archetype: archetype || 'loyalty',
      },
      message: 'Tenant customization saved',
    });
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
