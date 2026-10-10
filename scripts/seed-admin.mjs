import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_CYXwFca6Hr1Q@ep-rapid-block-b4bhbo5z-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

async function main() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('Clearing existing sessions and user profiles...');
    await client.query('DELETE FROM "UserSession"');
    
    // Update any order references if necessary or delete user profiles
    // First, nullify userProfileId in orders if present
    try {
      await client.query('UPDATE "Order" SET "userProfileId" = NULL WHERE "userProfileId" IS NOT NULL');
    } catch (e) {
      console.log('Order table update skipped or not applicable:', e.message);
    }

    await client.query('DELETE FROM "UserProfile"');

    console.log('Creating single admin user...');
    const adminPhone = '0505632335';
    const adminPassword = 'Admin@123';
    const passwordHash = hashPassword(adminPassword);

    const result = await client.query(
      `
      INSERT INTO "UserProfile" ("fullName", phone, role, "passwordHash", email, address, city)
      VALUES ($1, $2, 'admin', $3, $4, $5, $6)
      RETURNING id, "fullName", phone, role
      `,
      ['Vera Admin', adminPhone, passwordHash, 'shopveracuttinglinks@gmail.com', 'Accra', 'Accra']
    );

    console.log('Admin account created successfully:', result.rows[0]);
    console.log(`Phone: ${adminPhone}`);
    console.log(`Password: ${adminPassword}`);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
