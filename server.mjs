import express from "express";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const app = express();

// Render の DB 接続（環境変数 DATABASE_URL 使用）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// === DB の初期化（テーブル作成） ===
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS player (
      auth0_user_id TEXT PRIMARY KEY,
      chips INTEGER NOT NULL,
      wins INTEGER NOT NULL,
      losses INTEGER NOT NULL,
      draws INTEGER NOT NULL,
      max_chips INTEGER NOT NULL
    );
  `);

  console.log("Player table ready");
}

initDB();

// __dirname を ES Module で使うための処理
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JSON ボディを受け取る設定
app.use(express.json());

// -----------------------------------------
// ① ルート直下の index.html / css / js を配信
// -----------------------------------------
app.use(express.static(__dirname));

// -----------------------------------------
// ② API: /api/player （あなたの Next.js API を Express 化）
// -----------------------------------------

// GET /api/player
app.get("/api/player", async (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    const result = await pool.query(
      `SELECT * FROM player WHERE auth0_user_id = $1`,
      [uid]
    );

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // すべてのログイン方式対応
    await pool.query(
      `INSERT INTO player (auth0_user_id, chips, wins, losses, draws, max_chips)
       VALUES ($1, 100, 0, 0, 0, 100)`,
      [uid]
    );

    const created = await pool.query(
      `SELECT * FROM player WHERE auth0_user_id = $1`,
      [uid]
    );

    res.json(created.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/create
app.post("/api/player/create", async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    await pool.query(
      `INSERT INTO player (auth0_user_id, chips, wins, losses, draws, max_chips)
       VALUES ($1, 100, 0, 0, 0, 100)
       ON CONFLICT (auth0_user_id) DO NOTHING`,
      [uid]
    );

    const result = await pool.query(
      `SELECT * FROM player WHERE auth0_user_id = $1`,
      [uid]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/resetAll
app.post("/api/player/resetAll", async (req, res) => {
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
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/player/update
app.post("/api/player/update", async (req, res) => {
  const { uid, chips, result } = req.body;

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
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/game-result", async (req, res) => {
  try {
    const auth0UserId = req.user.sub; // ← Google / GitHub / LINE 共通
    const {
      result,
      bet,
      payout,
      isBlackjack = false,
      isDouble = false,
      isSplit = false,
    } = req.body;

    await pool.query(
      `
      INSERT INTO game_results
        (auth0_user_id, result, bet, payout, is_blackjack, is_double, is_split)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        auth0UserId,
        result,
        bet,
        payout,
        isBlackjack,
        isDouble,
        isSplit,
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ game_results insert error:", err);
    res.status(500).json({ error: "failed to save game result" });
  }
});

// -----------------------------------------
// ③ index.html を返す（SPA 対応）
// -----------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// -----------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
