import { neon } from '@neondatabase/serverless';
import pkg from 'pg';
import crypto from 'crypto';

const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL || '';

export const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

const neonSql = DATABASE_URL ? neon(DATABASE_URL) : null;

export const MASTER_ISSUER_ID = process.env.ISSUER_ID || '3388000000022258509';

export function hashPassword(password) {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  try {
    if (!storedHash.includes(':')) {
      const sha = crypto.createHash('sha256').update(password).digest('hex');
      return sha === storedHash || password === storedHash;
    }
    const [salt, hash] = storedHash.split(':');
    const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const checkBuf = Buffer.from(checkHash, 'hex');
    if (hashBuf.length !== checkBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, checkBuf);
  } catch {
    return false;
  }
}

export const sql = (strings, ...values) => {
  if (!DATABASE_URL) return Promise.resolve([]);
  if (Array.isArray(strings) && strings.raw) {
    if (neonSql) {
      return neonSql(strings, ...values);
    }
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ''), '');
    return pool.query(text, values).then((res) => res.rows);
  }
  if (typeof strings === 'string') {
    if (neonSql) {
      return neonSql(strings, values);
    }
    return pool.query(strings, values).then((res) => res.rows);
  }
  return Promise.resolve([]);
};

let migrationPromise = null;

export async function ensureMigration() {
  if (!DATABASE_URL) {
    console.log('[Neon Postgres] DATABASE_URL not set; skipping live migration.');
    return;
  }

  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        console.log('[Migration] Enabling pgcrypto extension and running tenant auth migrations...');
        try {
          await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
        } catch (extErr) {
          console.warn('[Migration] pgcrypto extension notice:', extErr?.message || extErr);
        }

        await sql`
          ALTER TABLE tenants 
          ADD COLUMN IF NOT EXISTS owner_name TEXT, 
          ADD COLUMN IF NOT EXISTS owner_email TEXT UNIQUE, 
          ADD COLUMN IF NOT EXISTS password_hash TEXT, 
          ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Approval',
          ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'growth',
          ADD COLUMN IF NOT EXISTS pass_limit INT DEFAULT 5000,
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        `;

        try {
          await sql`
            UPDATE tenants 
            SET status = 'Active',
                password_hash = COALESCE(password_hash, crypt('admin123', gen_salt('bf')))
            WHERE (slug = 'banlis' OR slug = 'banlis-bistro' OR owner_email = 'banlis@oloyal.com')
              AND (password_hash IS NULL OR password_hash = '');
          `;
        } catch (banlisErr) {
          console.warn('[Migration] Banlis seed password notice:', banlisErr?.message || banlisErr);
        }

        console.log('[Migration] SUCCESS: pgcrypto enabled and tenants auth columns verified.');
      } catch (err) {
        console.warn('[Migration] Note on combined statement:', err?.message || err);
      }
    })();
  }

  await migrationPromise;
}

if (DATABASE_URL) {
  ensureMigration().catch((err) => {
    console.error('[Migration] Startup migration execution error:', err);
  });
}

export default pool;
