import { sql, ensureMigration } from '../../_db';

export default async function handler(req: any, res: any) {
  await ensureMigration();
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const rawSlug = req.query?.slug || req.query?.params?.slug || 'banlis';
  const slug = String(rawSlug).trim();

  if (sql) {
    try {
      const rows = await sql`
        SELECT 
          m.id,
          m.tenant_id,
          m.name as customer_name,
          m.phone,
          m.email,
          m.member_id,
          m.points,
          m.balance_cents,
          m.google_object_id,
          t.name as store_name,
          t.color as brand_color,
          t.logo as logo_url,
          t.class_id
        FROM members m
        JOIN tenants t ON m.tenant_id = t.id
        WHERE t.slug = ${slug} 
           OR t.id = ${slug} 
           OR t.slug = ${slug.replace(/-bistro$/, '')}
           OR t.slug = 'banlis'
        ORDER BY m.id DESC;
      `;
      return res.status(200).json(rows);
    } catch (err) {
      console.error('[Neon Postgres API] GET /api/tenants/[slug]/members error:', err);
    }
  }

  return res.status(200).json([]);
}
