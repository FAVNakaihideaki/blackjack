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
    // プレイヤー新規作成
    await pool.query(
      `INSERT INTO player (auth0_user_id, chips, wins, losses, draws, max_chips)
       VALUES ($1, 100, 0, 0, 0, 100)
       ON CONFLICT (auth0_user_id) DO NOTHING`,
      [uid]
    );

    // 返却データ取得
    const result = await pool.query(
      `SELECT * FROM player WHERE auth0_user_id = $1`,
      [uid]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE error:", err);
    return res.status(500).json({ error: err.message });
  }
}
