import pg from 'pg';

const connectionString = 'postgresql://postgres:Iphone214%40%23%40@db.ylvvvcqnenbaangyzojl.supabase.co:5432/postgres';

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Connected to Dev database.");

  try {
    const res = await client.query(`
      SELECT created_at, template_name, recipient_email, status, error_message 
      FROM public.email_send_log 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);

    console.log("\nRecent Email Send Logs:");
    for (const row of res.rows) {
      console.log(`[${row.created_at}] Template: ${row.template_name}, Recipient: ${row.recipient_email}, Status: ${row.status}, Error: ${row.error_message}`);
    }
  } catch (err) {
    console.error("❌ Failed to query email logs:", err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
