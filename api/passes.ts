import { sql, ensureMigration } from './_db.js';

export default async function handler(req: any, res: any) {
  await ensureMigration();
  if (req.method === 'GET') {
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
          ORDER BY m.id DESC;
        `;
        return res.status(200).json(rows || []);
      } catch (err) {
        console.error('[Neon Postgres API] GET /api/passes error:', err);
        return res.status(500).json({ error: 'Database connection failed' });
      }
    }
    return res.status(500).json({ error: 'Database not configured' });
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
