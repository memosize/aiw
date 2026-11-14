// Read-only checks. Run with the production environment; never log credentials
// or returned user data.
const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");

async function main() {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );
  const result = await client.from("users").select("uuid").limit(1)
    .abortSignal(AbortSignal.timeout(15000));
  if (result.error) throw new Error("Supabase HTTP API check failed");
  console.log("Supabase HTTP API: OK (read-only)");

  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 15000,
      query_timeout: 15000,
    });
    try {
      await pool.query("SELECT 1");
      console.log("Supabase PostgreSQL: OK (SELECT 1)");
    } finally {
      await pool.end();
    }
  }
}

main().catch((error) => {
  const codes = [error.code, error.cause?.code,
    ...(error.errors || []).map((item) => item.code)].filter(Boolean);
  console.error("Failure codes:", codes.join(", ") || "unspecified");
  console.error("Supabase connectivity check failed; credentials and user data hidden.");
  process.exitCode = 1;
});
