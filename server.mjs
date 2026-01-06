import "dotenv/config";
import express from "express";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const app = express();

// DB 接続（環境変数 DATABASE_URL 使用）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// === DB の初期化（テーブル作成） ===
async function initDB() {
  // player
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.player (
      auth0_user_id TEXT PRIMARY KEY,
      chips INTEGER NOT NULL,
      wins INTEGER NOT NULL,
      losses INTEGER NOT NULL,
      draws INTEGER NOT NULL,
      max_chips INTEGER NOT NULL
    );
  `);

  // game_results（無ければ作る：既にあるなら何もしない）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.game_results (
      id BIGSERIAL PRIMARY KEY,
      auth0_user_id TEXT NOT NULL,
      result TEXT NOT NULL,
      bet INTEGER,
      payout INTEGER,
      is_blackjack BOOLEAN DEFAULT false,
      is_double BOOLEAN DEFAULT false,
      is_split BOOLEAN DEFAULT false,
      start_chips INTEGER,
      end_chips INTEGER,
      played_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("DB tables ready (player, game_results)");
}
initDB().catch((e) => console.error("❌ initDB error:", e));

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
// ② API
// -----------------------------------------

// GET /api/player
app.get("/api/player", async (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    const result = await pool.query(
      `SELECT * FROM public.player WHERE auth0_user_id = $1`,
      [uid]
    );

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // すべてのログイン方式対応
    await pool.query(
      `INSERT INTO public.player (auth0_user_id, chips, wins, losses, draws, max_chips)
       VALUES ($1, 100, 0, 0, 0, 100)`,
      [uid]
    );

    const created = await pool.query(
      `SELECT * FROM public.player WHERE auth0_user_id = $1`,
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
      `INSERT INTO public.player (auth0_user_id, chips, wins, losses, draws, max_chips)
       VALUES ($1, 100, 0, 0, 0, 100)
       ON CONFLICT (auth0_user_id) DO NOTHING`,
      [uid]
    );

    const result = await pool.query(
      `SELECT * FROM public.player WHERE auth0_user_id = $1`,
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
      `UPDATE public.player
       SET chips = 100,
           wins = 0,
           losses = 0,
           draws = 0,
           max_chips = 100
       WHERE auth0_user_id = $1`,
      [uid]
    );

    const updated = await pool.query(
      `SELECT * FROM public.player WHERE auth0_user_id = $1`,
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
      `UPDATE public.player
       SET chips = $1,
           wins = wins + $2,
           losses = losses + $3,
           draws = draws + $4,
           max_chips = GREATEST(max_chips, $1)
       WHERE auth0_user_id = $5`,
      [chips, w, l, d, uid]
    );

    const updated = await pool.query(
      `SELECT * FROM public.player WHERE auth0_user_id = $1`,
      [uid]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/game-result
app.post("/api/game-result", async (req, res) => {
  try {
    const {
      uid,
      result,
      bet,
      payout,
      is_blackjack = false,
      is_double = false,
      is_split = false,
      start_chips,
      end_chips
    } = req.body;

    if (!uid || !result) {
      return res.status(400).json({ error: "uid and result required" });
    }

    await pool.query(
      `
      INSERT INTO public.game_results
        (
          auth0_user_id,
          result,
          bet,
          payout,
          is_blackjack,
          is_double,
          is_split,
          start_chips,
          end_chips
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        uid,
        result,
        bet,
        payout,
        is_blackjack,
        is_double,
        is_split,
        start_chips,
        end_chips
      ]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error("❌ game_results insert error:", err);
    res.status(500).json({ error: "failed to save game result" });
  }
});

// GET /api/game-results?uid=xxx&limit=10
app.get("/api/game-results", async (req, res) => {
  const { uid, limit = 10 } = req.query;

  if (!uid) {
    return res.status(400).json({ error: "uid required" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        result,
        bet,
        payout,
        is_blackjack,
        is_double,
        is_split,
        start_chips,
        end_chips,
        played_at
      FROM public.game_results
      WHERE auth0_user_id = $1
      ORDER BY played_at DESC, id DESC
      LIMIT $2
      `,
      [uid, limit]
    );

    // データがなくても「空配列」を返す
    return res.json(result.rows);

  } catch (err) {
    console.error("❌ game_results fetch error:", err);
    // 500 を返さない（元の方針）
    return res.json([]);
  }
});

// GET /api/game-results/stats?uid=xxx
app.get("/api/game-results/stats", async (req, res) => {
  const { uid } = req.query;
  if (!uid) {
    return res.status(400).json({ error: "uid required" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        COUNT(*) AS total_games,
        COUNT(*) FILTER (WHERE result = 'WIN') AS wins,
        COUNT(*) FILTER (WHERE is_blackjack = true) AS blackjack_count,
        COUNT(*) FILTER (WHERE is_double = true) AS double_count
      FROM public.game_results
      WHERE auth0_user_id = $1
      `,
      [uid]
    );

    const row = result.rows[0];

    const totalGames = Number(row.total_games);
    const wins = Number(row.wins);
    const blackjackCount = Number(row.blackjack_count);
    const doubleCount = Number(row.double_count);

    res.json({
      totalGames,
      winRate: totalGames ? +(wins / totalGames * 100).toFixed(1) : 0,
      blackjackRate: totalGames ? +(blackjackCount / totalGames * 100).toFixed(1) : 0,
      doubleRate: totalGames ? +(doubleCount / totalGames * 100).toFixed(1) : 0,
    });
  } catch (err) {
    console.error("❌ stats error:", err);
    res.status(500).json({ error: "failed to fetch stats" });
  }
});

// POST /api/game-results/reset 
app.post("/api/game-results/reset", async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    await pool.query(
      `DELETE FROM public.game_results WHERE auth0_user_id = $1`,
      [uid]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ game_results reset error:", err);
    res.status(500).json({ error: "failed to reset game results" });
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
