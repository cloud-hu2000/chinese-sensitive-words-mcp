# 笔记卫士 Web

面向小红书和抖音的“发布前风险检测”Web 产品。它提供风险提示，不承诺或宣称平台官方审核结果。

## 审核架构

1. **规则初筛**：兼容 `chinese-sensitive-words-mcp` 的词库 API；离线时保留手机号、外链、导流、极限词、医疗和金融承诺的基础规则。
2. **多模态 Agent**：百炼 Qwen-VL 根据平台策略树进行二阶段、分层语境审核，识别 OCR 文本、二维码/联系方式和画面风险；图片问题以 0–1000 归一化坐标返回，前端可框选。
3. **风险报告**：合并规则与模型证据，提供分数、风险等级、原因和修改建议。规则命中是线索，不会机械地把孤立词语判定为风险。

设计参考 [Hi-Guard](https://github.com/lianqi1008/Hi-Guard) 的“安全分流 → 策略对齐的分层风险路径 → 可解释输出”思路。上层引擎保留 `chinese-sensitive-words-mcp` 的 MIT 许可与上游关联。

## 本地运行

```bash
cp .env.example .env
npm install
npm run dev
```

访问 `http://localhost:3000`。未设置 `DASHSCOPE_API_KEY` 时仍可以体验规则审核；设置后才启用百炼视觉模型。`WORDSCHECK_API_BASE` 指向可用的兼容词库服务时，会启用完整的规则词库。

## 阿里云部署

1. 安装 Node.js 20.9+、MySQL 8 和 Nginx；创建不具备登录权限的 `note_guard` MySQL 用户。
2. 执行 `mysql -u root -p < db/schema.sql` 初始化数据库；复制 `.env.example` 为 `.env`，填写 MySQL URL、`DASHSCOPE_API_KEY` 和词库服务地址/Token。
3. 执行 `npm ci && npm run build`，以 `npm run start` 或 systemd 启动服务。示例监听本机 `127.0.0.1:3000`，由 Nginx 代理 HTTPS 请求。
4. `UPLOAD_DIR` 必须位于非公网静态目录并限制访问权限；生产环境建议改为带生命周期策略的阿里云 OSS 私有桶。

`db/schema.sql` 包括账户、会话、会员额度、审核历史、风险项和私有图片元数据。实际支付需要配置支付宝或微信支付的商户号、签名密钥、异步通知 URL；会员数据模型已预留订阅提供商字段。
