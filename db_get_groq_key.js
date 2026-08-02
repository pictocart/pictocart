import pg from 'pg';

const connectionString = 'postgresql://postgres:Iphone214%40%23%40@db.ylvvvcqnenbaangyzojl.supabase.co:5432/postgres';

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Connected to Dev database.");

  try {
    const res = await client.query(`
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GROQ_API_KEY';
    `);

    if (res.rows.length > 0) {
      console.log("Found GROQ_API_KEY in vault:", res.rows[0].decrypted_secret);
    } else {
      console.log("❌ GROQ_API_KEY not found in vault!");
    }
  } catch (err) {
    console.error("❌ Failed to query vault:", err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
