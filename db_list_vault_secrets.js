import pg from 'pg';

const connectionString = 'postgresql://postgres:Iphone214%40%23%40@db.ylvvvcqnenbaangyzojl.supabase.co:5432/postgres';

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Connected to Dev database.");

  try {
    const res = await client.query(`
      SELECT name, description FROM vault.decrypted_secrets;
    `);

    console.log("Secrets in vault:");
    res.rows.forEach(r => {
      console.log(`- Name: ${r.name}, Description: ${r.description}`);
    });
  } catch (err) {
    console.error("❌ Failed to query vault:", err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
