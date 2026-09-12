import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // 設定 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. 讀取排行榜 (GET)
  if (req.method === 'GET') {
    try {
      // 從 Redis 抓取前 50 名排行榜資料
      const data = await kv.get('stock_leaderboard');
      const leaderboard = data || [];
      return res.status(200).json(leaderboard);
    } catch (error) {
      return res.status(500).json({ error: '讀取失敗：' + error.message });
    }
  }

  // 2. 上傳成績 (POST)
  if (req.method === 'POST') {
    try {
      const { name, days, assets, title } = req.body;
      if (!name) {
        return res.status(400).json({ error: '缺少必要欄位' });
      }

      // 取得現有排行榜
      const currentList = (await kv.get('stock_leaderboard')) || [];

      // 加入新紀錄
      currentList.push({
        name,
        days: Number(days),
        assets: Number(assets),
        title: title || '【台股散戶】',
        timestamp: Date.now()
      });

      // 排序：先比天數（降序），天數相同比資產（降序）
      currentList.sort((a, b) => {
        if (b.days !== a.days) return b.days - a.days;
        return b.assets - a.assets;
      });

      // 只保留前 50 名
      const top50 = currentList.slice(0, 50);

      // 存回 Redis
      await kv.set('stock_leaderboard', top50);

      return res.status(200).json({ message: '成功上傳成績！' });
    } catch (error) {
      return res.status(500).json({ error: '寫入失敗：' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
