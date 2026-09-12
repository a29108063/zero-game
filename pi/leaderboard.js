export default async function handler(req, res) {
  // 設定 CORS 跨網域存取權限
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 從 Vercel 環境變數自動取得連線網址與 Token
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: '資料庫連線金鑰未設定' });
  }

  try {
    // 1. 讀取排行榜前 10 名 (GET)
    if (req.method === 'GET') {
      const redisRes = await fetch(`${url}/zrevrange/leaderboard/0/9/WITHSCORES`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await redisRes.json();
      const rawList = data.result || [];

      const leaderboard = [];
      for (let i = 0; i < rawList.length; i += 2) {
        leaderboard.push({
          name: rawList[i],
          score: Number(rawList[i + 1])
        });
      }

      return res.status(200).json({ success: true, leaderboard });
    }

    // 2. 玩家選擇上榜 (POST)
    if (req.method === 'POST') {
      const { name, score } = req.body || {};

      if (!name || score === undefined) {
        return res.status(400).json({ error: '缺少暱稱或分數' });
      }

      const cleanName = String(name).trim().slice(0, 12) || '匿名玩家';
      const scoreNum = Number(score);

      // 將玩家分數與暱稱寫入 Redis 有序集合 (ZADD)
      await fetch(`${url}/zadd/leaderboard/${scoreNum}/${encodeURIComponent(cleanName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return res.status(200).json({ success: true, message: '成功登上排行榜！' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Leaderboard API Error:', error);
    return res.status(500).json({ error: '伺服器錯誤', details: error.message });
  }
}
