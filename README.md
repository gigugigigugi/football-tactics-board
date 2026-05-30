# 足球随机分队战术板

一个纯前端 React + TypeScript + Vite 网页应用，支持邀请码进入、单队页面、上场人数、阵型位置、Web Crypto 随机分配、虚拟补位、替补分配、进球记录和可拖拽足球战术板。

项目已加入 PWA 支持，部署后可以在手机浏览器里“添加到主屏幕”，适合去球场时快速打开使用。

## 本地运行

```bash
npm install
npm run dev
```

## 构建与测试

```bash
npm test
npm run build
```

## 部署

项目包含 `vercel.json`，推送到 GitHub 后可直接在 Vercel 导入部署。应用不需要后端和数据库。

邀请码不写死在代码里。部署时需要在 Environment Variables 里设置多个邀请码，用英文逗号分隔：

```bash
VITE_INVITE_CODES=your-code,another-code
```

本地开发可以复制 `.env.example` 为 `.env.local`，然后把里面的邀请码改成自己的。

更详细的部署步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 数据保存

配置和随机结果使用 `sessionStorage`，每个浏览器页面互相独立。多支队伍一起使用时，给每支队伍打开一个新页面即可。

部分长期偏好会使用 `localStorage` 保存。

## PWA 手机使用

部署后，用手机浏览器打开线上地址：

- iPhone Safari：分享 -> 添加到主屏幕。
- Android Chrome：菜单 -> 添加到主屏幕 / 安装应用。

第一次打开需要网络；打开过一次后，页面资源会被 service worker 缓存，球场网络差时也更容易进入页面。

## 随机性说明

随机分队使用浏览器 `crypto.getRandomValues()`，并用拒绝采样避免取模偏差。它是加密级随机来源，但不是物理真随机。

## 学习文档

如果你想学习这个项目里的前端技术，可以从 [docs/FRONTEND_LEARNING.md](docs/FRONTEND_LEARNING.md) 开始。
