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
    let newCount = 0;
    let updateCount = 0;
    let processedIds = new Set();

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
        let hasNewOrUpdated = false;

        // 处理新的历史记录
        for (const item of data.data.list) {
          const historyItem = {
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
          };

          // 检查是否已经处理过这个ID
          if (processedIds.has(historyItem.id)) {
            continue;
          }
          processedIds.add(historyItem.id);

          const existingIndex = existingHistory.findIndex(h => h.id === historyItem.id);
          if (existingIndex === -1) {
            // 新记录
            existingHistory.unshift(historyItem);
            newCount++;
            hasNewOrUpdated = true;
          } else {
            // 更新已存在记录的viewTime
            if (existingHistory[existingIndex].viewTime !== historyItem.viewTime) {
              existingHistory[existingIndex].viewTime = historyItem.viewTime;
              updateCount++;
              hasNewOrUpdated = true;
            }
          }
        }

        console.log(`同步了${data.data.list.length}条历史记录`);

        // 如果这一批数据中没有任何新增或更新，且已经处理了足够多的记录，就退出循环
        if (!hasNewOrUpdated && processedIds.size >= 100) {
          console.log('没有新的更新，同步结束');
          break;
        }

        // 添加延时，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 按观看时间排序
    existingHistory.sort((a, b) => b.viewTime - a.viewTime);

    // 保存到文件
    writeFileSync(HISTORY_FILE, JSON.stringify(existingHistory, null, 2));

    return {
      success: true,
      newCount,
      updateCount,
      message: `成功同步 ${newCount} 条新记录，更新 ${updateCount} 条记录`
    };
  } catch (error) {
    console.error('同步历史记录失败:', error);
    throw error;
  }
} 