/**
 * Database Migration Runner
 * Usage: node database/migrate.js [--seed]
 * --seed : also runs seed.sql after schema.sql
 */

require('dotenv').config({ path: './backend/.env' });

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const shouldSeed = args.includes('--seed');

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'samarth_dental',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function runSQL(client, filePath, label) {
  console.log(`\n📄 Running: ${label}...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await client.query(sql);
    console.log(`✅ ${label} — completed successfully.`);
  } catch (err) {
    console.error(`❌ ${label} — FAILED:`, err.message);
    throw err;
  }
}

async function main() {
  const client = new Client(DB_CONFIG);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  🦷  Samarth Dental — DB Migration Runner ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\nConnecting to PostgreSQL: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL.\n');

    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const seedPath   = path.join(__dirname, 'database', 'seed.sql');

    await runSQL(client, schemaPath, 'Schema (schema.sql)');

    if (shouldSeed) {
      await runSQL(client, seedPath, 'Seed Data (seed.sql)');
    } else {
      console.log('\n💡 Tip: Run with --seed flag to also insert demo data.');
      console.log('   node database/migrate.js --seed');
    }

    console.log('\n🎉 Migration complete!\n');
  } catch (err) {
    console.error('\n💥 Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
