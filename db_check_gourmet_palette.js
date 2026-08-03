import pg from 'pg';

const connectionString = 'postgresql://postgres:Iphone214%40%23%40@db.ylvvvcqnenbaangyzojl.supabase.co:5432/postgres';
const themeId = 'theme-70904877';

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Connected to Dev database.");

  try {
    const res = await client.query(`
      SELECT files_manifest 
      FROM public.theme_master_versions 
      WHERE theme_id = $1 
      ORDER BY version DESC 
      LIMIT 1;
    `, [themeId]);
    
    if (res.rows.length > 0) {
      const manifest = res.rows[0].files_manifest;
      console.log("Vibrant Gourmet Palette:");
      console.log(manifest.dna.palette);
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

run();
