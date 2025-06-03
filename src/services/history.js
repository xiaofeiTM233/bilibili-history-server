import fetch from 'node-fetch';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(readFileSync(join(__dirname, '../../config.json'), 'utf-8'));
const HISTORY_FILE = join(__dirname, '../../data/history.json');

export async function syncHistory() {
  try {
    const existingHistory = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    let hasMore = true;
    let max = 0;
    let view_at = 0;
    const type = 'all';
    const ps = 30;
    const newHistory = [];

    while (hasMore) {
      const response = await fetch(
        `https://api.bilibili.com/x/web-interface/history/cursor?max=${max}&view_at=${view_at}&type=${type}&ps=${ps}`,
        {
          headers: {
            Cookie: config.bilibili.cookie,
          },
        }
      );

      if (!response.ok) {
        throw new Error('获取历史记录失败');
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.message || '获取历史记录失败');
      }

      hasMore = data.data.list.length > 0;
      max = data.data.cursor.max;
      view_at = data.data.cursor.view_at;

      if (data.data.list.length > 0) {
        // 检查是否已经同步过这些数据
        const firstItem = data.data.list[0];
        const lastItem = data.data.list[data.data.list.length - 1];
        const firstItemExists = existingHistory.some(item => item.id === firstItem.history.oid);
        const lastItemExists = existingHistory.some(item => item.id === lastItem.history.oid);

        if (firstItemExists && lastItemExists) {
          console.log('增量同步至此结束');
          break;
        }

        // 处理新的历史记录
        for (const item of data.data.list) {
          newHistory.push({
            id: item.history.oid,
            business: item.history.business,
            bvid: item.history.bvid,
            cid: item.history.cid,
            title: item.title,
            tag_name: item.tag_name,
            cover: item.cover || (item.covers && item.covers[0]),
            viewTime: item.view_at,
            uri: item.uri,
            author_name: item.author_name || '',
            author_mid: item.author_mid || '',
            timestamp: Date.now(),
          });
        }

        console.log(`同步了${data.data.list.length}条历史记录`);

        // 添加延时，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 合并新旧数据，去重
    const mergedHistory = [...existingHistory];
    for (const newItem of newHistory) {
      const existingIndex = mergedHistory.findIndex(item => item.id === newItem.id);
      if (existingIndex === -1) {
        mergedHistory.push(newItem);
      }
    }

    // 按观看时间排序
    mergedHistory.sort((a, b) => b.viewTime - a.viewTime);

    // 保存到文件
    writeFileSync(HISTORY_FILE, JSON.stringify(mergedHistory, null, 2));

    return {
      success: true,
      message: `成功同步 ${newHistory.length} 条新记录`,
    };
  } catch (error) {
    console.error('同步历史记录失败:', error);
    throw error;
  }
} 