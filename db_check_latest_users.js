import pg from 'pg';

const connectionString = 'postgresql://postgres:Iphone214%40%23%40@db.ylvvvcqnenbaangyzojl.supabase.co:5432/postgres';

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Connected to Dev database.");

  try {
    const res = await client.query(`
      SELECT id, email, created_at, confirmation_sent_at 
      FROM auth.users 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);

    console.log("\nLatest Users in Dev DB:");
    for (const row of res.rows) {
      console.log(`[${row.created_at}] Email: ${row.email}, ID: ${row.id}, SentAt: ${row.confirmation_sent_at}`);
    }
  } catch (err) {
    console.error("❌ Failed to query auth users:", err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
