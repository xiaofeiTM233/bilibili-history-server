# Bilibili 历史记录服务器

这是一个简单的 Bilibili 历史记录服务器，用于同步和存储 B站观看历史。本项目参考了 [bilibili-history-wxt](https://github.com/mundane799699/bilibili-history-wxt) 项目的部分实现。

## 功能特点

- 自动同步 B站观看历史
- 支持搜索和过滤历史记录
- 支持分页加载
- 支持删除历史记录
- 数据本地存储（JSON文件）
- RESTful API 接口

## 系统要求

- Node.js >= 14.0.0
- npm >= 6.0.0

## 安装

1. 克隆项目
```bash
git clone https://github.com/haha2026/bilibili-history-server.git
cd bilibili-history-server
```

2. 安装依赖
```bash
npm install
```

3. 配置
复制 `config-example.json` 为 `config.json` 并修改配置：
```json
{
  "bilibili": {
    "cookie": "SESSDATA=your_sessdata_here; bili_jct=your_bili_jct_here"
  },
  "server": {
    "port": 3000,
    "syncInterval": 3600000
  }
}
```

> 注意：`cookie` 中的 `SESSDATA` 和 `bili_jct` 需要从浏览器中获取，请确保这些值的安全性。

## 运行

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API 接口

### 获取历史记录
```
GET /api/history
参数：
- keyword: 搜索关键词（可选）
- authorKeyword: UP主名称关键词（可选）
- date: 日期（YYYY-MM-DD，可选）
- page: 页码（默认：1）
- pageSize: 每页数量（默认：20）
```

### 同步历史记录
```
POST /api/history/sync
```

### 删除历史记录
```
DELETE /api/history/:id
```

## 数据存储

所有数据存储在 `data/history.json` 文件中。建议定期备份该文件。

## 开发

1. 代码风格遵循 ESLint 配置
2. 提交代码前请运行测试
3. 遵循 Git Flow 工作流

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [bilibili-history-wxt](https://github.com/mundane799699/bilibili-history-wxt) - 参考项目
- 所有为本项目做出贡献的开发者 