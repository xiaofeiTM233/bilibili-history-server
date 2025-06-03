import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { syncHistory } from './services/history.js';
import fetch from 'node-fetch';
import { setInterval as setNodeInterval, clearInterval as clearNodeInterval } from 'timers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf-8'));

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// 数据文件路径
const HISTORY_FILE = join(__dirname, '../data/history.json');

// 确保数据文件存在
try {
  readFileSync(HISTORY_FILE, 'utf-8');
} catch {
  writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

let syncTimer = null;
function startAutoSync() {
  if (syncTimer) clearNodeInterval(syncTimer);
  const interval = config.server.syncInterval || 3600000;
  syncTimer = setNodeInterval(async () => {
    try {
      await syncHistory();
      console.log('自动同步成功');
    } catch (e) {
      console.error('自动同步失败:', e);
    }
  }, interval);
  console.log('自动同步定时器已启动，间隔(ms):', interval);
}
startAutoSync();

// 获取历史记录
app.get('/api/history', (req, res) => {
  try {
    const { keyword = '', authorKeyword = '', date = '', page = 1, pageSize = 20 } = req.query;
    const history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    
    // 过滤数据
    let filtered = history.filter(item => {
      const matchKeyword = !keyword || item.title.toLowerCase().includes(keyword.toLowerCase());
      const matchAuthor = !authorKeyword || item.author_name.toLowerCase().includes(authorKeyword.toLowerCase());
      const matchDate = !date || new Date(item.viewTime * 1000).toISOString().split('T')[0] === date;
      return matchKeyword && matchAuthor && matchDate;
    });

    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = filtered.slice(start, end);

    res.json({
      items: paginated,
      total: filtered.length,
      hasMore: end < filtered.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 手动同步历史记录
app.post('/api/history/sync', async (req, res) => {
  try {
    await syncHistory();
    res.json({ message: '同步成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除历史记录
app.delete('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    const history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    const filtered = history.filter(item => item.id !== id);
    writeFileSync(HISTORY_FILE, JSON.stringify(filtered, null, 2));
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 图片代理接口
app.get('/img-proxy', async (req, res) => {
  const url = req.query.url;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).send('Invalid url');
  }
  try {
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://www.bilibili.com/',
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
      }
    });
    if (!response.ok) {
      return res.status(502).send('Bad gateway');
    }
    res.set('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    response.body.pipe(res);
  } catch (e) {
    res.status(500).send('Proxy error');
  }
});

// 设置自动同步间隔API
app.post('/api/set-sync-interval', express.json(), (req, res) => {
  const { interval } = req.body;
  if (!interval || typeof interval !== 'number' || interval < 60000) {
    return res.status(400).json({ error: '无效的同步间隔，最小1分钟' });
  }
  config.server.syncInterval = interval;
  // 更新config.json
  const configPath = join(__dirname, '../config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  startAutoSync();
  res.json({ message: '同步间隔已更新', interval });
});

// 获取当前同步间隔API
app.get('/api/get-sync-interval', (req, res) => {
  res.json({ interval: config.server.syncInterval || 3600000 });
});

// 启动服务器
app.listen(config.server.port, () => {
  console.log(`服务器运行在 http://localhost:${config.server.port}`);
}); 