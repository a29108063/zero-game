import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // 設定 CORS 讓前端能順利存取
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. 讀取排行榜 (GET)
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`
        SELECT name, days, assets, title 
        FROM leaderboard 
        ORDER BY days DESC, assets DESC 
        LIMIT 50;
      `;
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Database Error:', error);
      return res.status(500).json({ error: '資料庫讀取失敗：' + error.message });
    }
  }

  // 2. 上傳成績 (POST)
  if (req.method === 'POST') {
    try {
      const { name, days, assets, title } = req.body;
      if (!name) {
        return res.status(400).json({ error: '缺少必要欄位' });
      }

      await sql`
        INSERT INTO leaderboard (name, days, assets, title) 
        VALUES (${name}, ${days}, ${assets}, ${title});
      `;
      return res.status(200).json({ message: '成功上傳成績！' });
    } catch (error) {
      console.error('Database Error:', error);
      return res.status(500).json({ error: '資料庫寫入失敗：' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
