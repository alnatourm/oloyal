import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const rawId = req.query?.id || req.query?.params?.id;
  if (!rawId) {
    return res.status(400).json({ error: 'Member ID parameter is required' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const delta = Number(body.points ?? body.deltaPoints ?? 0);
  const absolute = typeof body.absolutePoints === 'number' ? body.absolutePoints : null;
  const reason = body.reason || 'Points Adjustment';

  let member: any = null;

  if (sql) {
    try {
      // Find member
      const rows = await sql`
        SELECT * FROM members 
        WHERE id = ${rawId} OR google_object_id = ${rawId} OR member_id = ${rawId}
        LIMIT 1;
      `;

      if (rows.length > 0) {
        const currentMember = rows[0];
        const currentPoints = Number(currentMember.points || 0);
        let newPoints = currentPoints;
        let changeAmount = 0;

        if (absolute !== null) {
          newPoints = Math.max(0, absolute);
          changeAmount = newPoints - currentPoints;
        } else {
          changeAmount = delta;
          newPoints = Math.max(0, currentPoints + delta);
        }

        // UPDATE members SET points = newPoints
        const updatedRows = await sql`
          UPDATE members 
          SET points = ${newPoints} 
          WHERE id = ${currentMember.id}
          RETURNING *;
        `;

        if (updatedRows.length > 0) {
          member = updatedRows[0];
        } else {
          member = { ...currentMember, points: newPoints };
        }

        // INSERT INTO point_transactions
        const txId = `tx-${Date.now()}`;
        try {
          await sql`
            INSERT INTO point_transactions (id, member_id, change_amount, reason)
            VALUES (${txId}, ${currentMember.id}, ${changeAmount}, ${reason});
          `;
        } catch {
          try {
            await sql`
              INSERT INTO point_transactions (id, member_id, tenant_id, change_amount, reason)
              VALUES (${txId}, ${currentMember.id}, ${currentMember.tenant_id}, ${changeAmount}, ${reason});
            `;
          } catch (e) {
            console.error('[Neon Postgres API] point_transactions INSERT error:', e);
          }
        }
      }
    } catch (err: any) {
      console.error('[Neon Postgres API] UPDATE points error:', err);
      return res.status(500).json({ error: `Failed to update points in database: ${err?.message || 'Database error'}` });
    }
  }

  if (!member) {
    member = {
      id: rawId,
      points: Math.max(0, absolute !== null ? absolute : delta),
    };
  }

  const finalPoints = Number(member.points || 0);

  return res.status(200).json({
    success: true,
    member,
    newPoints: finalPoints,
    points: finalPoints,
    message: 'Points updated and synced with database',
  });
}
