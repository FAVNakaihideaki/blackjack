import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    const result = await pool.query(
      `SELECT * FROM player WHERE auth0_user_id = $1`,
      [uid]
    );

    return res.status(200).json(result.rows[0] ?? null);
  } catch (err) {
    console.error("GET error:", err);
    return res.status(500).json({ error: err.message });
  }
}
