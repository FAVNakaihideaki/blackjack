import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { uid, chips, result } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  let w = 0, l = 0, d = 0;
  if (result === "WIN") w = 1;
  if (result === "LOSE") l = 1;
  if (result === "DRAW") d = 1;

  try {
    await pool.query(
      `UPDATE player
       SET chips = $1,
           wins = wins + $2,
           losses = losses + $3,
           draws = draws + $4,
           max_chips = GREATEST(max_chips, $1)
       WHERE auth0_user_id = $5`,
      [chips, w, l, d, uid]
    );

    const updated = await pool.query(
      `SELECT * FROM player WHERE auth0_user_id = $1`,
      [uid]
    );

    return res.status(200).json(updated.rows[0]);
  } catch (err) {
    console.error("UPDATE error:", err);
    return res.status(500).json({ error: err.message });
  }
}
