const fs = require('fs');
const { Client } = require('pg');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'samarth_dental',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'patch_documents.sql'), 'utf8');
  try {
    await client.query(sql);
    console.log('Patch executed successfully');
  } catch(e) {
    console.error('Error executing patch:', e.message);
  } finally {
    await client.end();
  }
}

run();
