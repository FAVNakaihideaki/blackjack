import "dotenv/config";
import pkg from "pg";
const { Client } = pkg;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL が未設定です (.env 読めてない)");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Neon 接続成功");

    // 1) 今どのDB/Schemaにいるか
    const dbRes = await client.query(
      "SELECT current_database() AS db, current_schema() AS schema"
    );
    console.log("🧠 現在DB/Schema:", dbRes.rows[0]);

    // 2) search_path（どのschemaを優先して見る設定か）
    const spRes = await client.query("SHOW search_path");
    console.log("🔎 search_path:", spRes.rows[0].search_path);

    // 3) game/playerっぽいテーブル候補を一覧表示
    const listRes = await client.query(`
      SELECT schemaname, tablename
      FROM pg_tables
      WHERE tablename ILIKE '%game%' OR tablename ILIKE '%player%'
      ORDER BY schemaname, tablename;
    `);
    console.log("📋 game/playerっぽいテーブル候補:");
    console.table(listRes.rows);

    // 4) 完全修飾名で件数チェック（public固定）
    const countGame = await client.query(
      "SELECT COUNT(*) AS count FROM public.game_results"
    );
    console.log("🎮 public.game_results 件数:", countGame.rows[0].count);

    const countPlayer = await client.query(
      "SELECT COUNT(*) AS count FROM public.player"
    );
    console.log("👤 public.player 件数:", countPlayer.rows[0].count);

  } catch (err) {
    console.error("❌ エラー", err);
  } finally {
    await client.end();
  }
}

main();
