import pg from 'pg';

const connectionString = 'postgresql://postgres:Iphone214%40%23%40@db.ylvvvcqnenbaangyzojl.supabase.co:5432/postgres';

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Connected to Dev database.");

  try {
    const res = await client.query(`
      SELECT * FROM public.profiles LIMIT 1;
    `);

    if (res.rows.length > 0) {
      console.log("Columns in profiles:", Object.keys(res.rows[0]));
      console.log("Sample profile row:", res.rows[0]);
    } else {
      console.log("profiles table is empty!");
    }
  } catch (err) {
    console.error("❌ Failed to query profiles:", err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
