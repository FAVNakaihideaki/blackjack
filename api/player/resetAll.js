import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    await pool.query(
      `UPDATE player
       SET chips = 100,
           wins = 0,
           losses = 0,
           draws = 0,
           max_chips = 100
       WHERE auth0_user_id = $1`,
      [uid]
    );

    const updated = await pool.query(
      `SELECT * FROM player WHERE auth0_user_id = $1`,
      [uid]
    );

    return res.status(200).json(updated.rows[0]);
  } catch (err) {
    console.error("RESET error:", err);
    return res.status(500).json({ error: err.message });
  }
}
