const { Client } = require('pg');

const projectRef = 'evxeqsfuyvisfkqxdaqv';
const regions = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'us-east-1',
  'us-west-1',
  'ap-southeast-1',
  'me-central-1',
  'sa-east-1'
];

async function checkPoolers() {
  for (const reg of regions) {
    const host = `aws-0-${reg}.pooler.supabase.com`;
    console.log(`Testing host resolution: ${host}...`);
    const client = new Client({
      host,
      port: 6543,
      user: `postgres.${projectRef}`,
      password: 'test',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });
    try {
      await client.connect();
    } catch (err) {
      console.log(`Host ${reg}:`, err.message);
    }
  }
}

checkPoolers();
