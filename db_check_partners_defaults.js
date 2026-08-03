import pg from 'pg';

const connectionString = 'postgresql://postgres:Iphone214%40%23%40@db.ylvvvcqnenbaangyzojl.supabase.co:5432/postgres';

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Connected to Dev database.");

  try {
    const res = await client.query(`
      SELECT column_name, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'partners';
    `);

    console.log("Columns in public.partners:\n");
    res.rows.forEach(r => {
      console.log(`- ${r.column_name}: default=${r.column_default}, type=${r.data_type}`);
    });
  } catch (err) {
    console.error("❌ Failed to query columns:", err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
