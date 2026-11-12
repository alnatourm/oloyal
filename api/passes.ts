import { sql, ensureMigration } from './_db';

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
        if (rows && rows.length > 0) {
          return res.status(200).json(rows);
        }
      } catch (err) {
        console.error('[Neon Postgres API] GET /api/passes error:', err);
      }
    }
    return res.status(200).json([
      {
        id: '889042',
        tenant_id: 't-banlis-01',
        customer_name: 'Marcus Vance',
        phone: '+1 (555) 234-5678',
        email: 'marcus.vance@example.com',
        member_id: '889042',
        points: 1450,
        balance_cents: 0,
        google_object_id: '3388000000022258509.customer_889042_obj',
        store_name: 'Banlis Bistro & Dining',
        brand_color: '#ff5722',
        logo_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop',
        class_id: '3388000000022258509.tenant_banlis_loyalty_v3',
      },
    ]);
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
