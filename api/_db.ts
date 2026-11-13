import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || '';
export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
export const MASTER_ISSUER_ID = process.env.ISSUER_ID || '3388000000022258509';

export function hashPassword(password: string): string {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null): boolean {
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

let migrationPromise: Promise<void> | null = null;

export async function ensureMigration(): Promise<void> {
  if (!sql) {
    console.log('[Neon Postgres] DATABASE_URL not set; skipping live migration.');
    return;
  }

  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        console.log('[Migration] Enabling pgcrypto extension and running tenant auth migrations...');
        try {
          await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
        } catch (extErr: any) {
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

        // Ensure default seed store 'banlis' has Active status and crypt password hash
        try {
          await sql`
            UPDATE tenants 
            SET status = 'Active',
                password_hash = COALESCE(password_hash, crypt('admin123', gen_salt('bf')))
            WHERE (slug = 'banlis' OR slug = 'banlis-bistro' OR owner_email = 'banlis@oloyal.com')
              AND (password_hash IS NULL OR password_hash = '');
          `;
        } catch (banlisErr: any) {
          console.warn('[Migration] Banlis seed password notice:', banlisErr?.message || banlisErr);
        }

        console.log('[Migration] SUCCESS: pgcrypto enabled and tenants auth columns verified.');
      } catch (err: any) {
        console.warn('[Migration] Note on combined statement:', err?.message || err);
        try {
          await sql`
            CREATE TABLE IF NOT EXISTS tenants (
              id TEXT PRIMARY KEY,
              slug TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              logo TEXT,
              color TEXT,
              archetype TEXT DEFAULT 'loyalty',
              class_id TEXT,
              issuer_id TEXT
            );
          `;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name TEXT;`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_email TEXT;`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS password_hash TEXT;`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Approval';`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'growth';`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pass_limit INT DEFAULT 5000;`;
          await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`;
          try {
            await sql`CREATE UNIQUE INDEX IF NOT EXISTS tenants_owner_email_unique ON tenants(owner_email) WHERE owner_email IS NOT NULL;`;
          } catch {}
          console.log('[Migration] SUCCESS: Individual auth and package columns verified.');
        } catch (fallbackErr: any) {
          console.error('[Migration] Migration fallback error:', fallbackErr);
        }
      }
    })();
  }

  await migrationPromise;
}

// Auto-run migration on server startup / module import
if (sql) {
  ensureMigration().catch((err) => {
    console.error('[Migration] Startup migration execution error:', err);
  });
}
