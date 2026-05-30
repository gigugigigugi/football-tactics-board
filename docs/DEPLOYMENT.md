# 足球随机分队战术板：详细部署文档

这份文档的目标是：让你把项目部署成一个手机可以访问的网页，并且在球场上可以通过手机完成随机分配和战术板拖动。

## 1. 当前项目规模

当前项目是纯前端静态应用，生产构建非常小：

- `dist` 总大小约 241 KB。
- 主 JavaScript 文件约 214 KB。
- CSS 文件约 12 KB。
- PWA 图标和 service worker 约 12 KB。
- 没有后端服务。
- 没有数据库。
- 队标图片目前使用远程 CDN 地址。

你的使用频率是一周 10 次以内，所以免费静态部署平台完全够用。

## 2. 推荐方案

我推荐两个方案：

| 方案 | 适合你吗 | 优点 | 备注 |
| --- | --- | --- | --- |
| Vercel | 最推荐先用 | 上手最快，Vite 支持好，已有 `vercel.json` | 今天就能部署给手机用 |
| Cloudflare Pages | 长期也很好 | 免费静态站额度宽松，全球 CDN 稳 | 配置也简单 |

当前项目已经有 `vercel.json`，所以如果你想最快上线，先用 Vercel。

官方参考：

- Vercel Vite 文档：https://vercel.com/docs/frameworks/frontend/vite
- Vercel 限制文档：https://vercel.com/docs/limits
- Cloudflare Pages Vite 文档：https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/
- Cloudflare Pages 限制文档：https://developers.cloudflare.com/pages/platform/limits/

## 3. 部署前检查

在本地运行：

```bash
npm install
npm test
npm run build
```

如果这三个命令都通过，就可以部署。

构建后会生成：

```text
dist/
```

这个目录就是最终要部署的静态网站。

## 4. 邀请码配置

项目支持多个邀请码。

环境变量名称：

```text
VITE_INVITE_CODES
```

多个邀请码用英文逗号分隔：

```text
VITE_INVITE_CODES=your-code-1,your-code-2,myclub888
```

注意：

- 变量名必须以 `VITE_` 开头，Vite 才会把它注入前端。
- 修改环境变量后，需要重新部署。
- 真实邀请码不要写进代码仓库，部署时通过平台环境变量设置。
- 这是内部使用的邀请码，不是真正强安全登录。

本地开发时，可以复制 `.env.example` 为 `.env.local`：

```text
VITE_INVITE_CODES=your-code-1,your-code-2,myclub888
```

`.env.local` 已经被 `.gitignore` 忽略，不会提交到 GitHub。

## 5. 使用 Vercel 部署

### 5.1 上传到 GitHub

如果项目还没有 Git 仓库：

```bash
git init
git add .
git commit -m "Initial football board app"
```

然后在 GitHub 创建一个仓库，把代码推上去。

### 5.2 导入 Vercel

1. 打开 https://vercel.com。
2. 登录。
3. 点击 `Add New...`。
4. 选择 `Project`。
5. 选择你的 GitHub 仓库。
6. Framework Preset 选择 `Vite`。

### 5.3 构建配置

Vercel 通常会自动识别 Vite。确认配置如下：

```text
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 5.4 添加环境变量

在 Vercel 项目设置里：

```text
Settings -> Environment Variables
```

添加：

```text
Name: VITE_INVITE_CODES
Value: your-code-1,your-code-2,myclub888
Environment: Production
```

### 5.5 部署

点击 Deploy。

完成后，Vercel 会给你一个地址，例如：

```text
https://your-project.vercel.app
```

用手机打开这个地址即可。

## 6. 使用 Cloudflare Pages 部署

如果你更想用 Cloudflare Pages：

1. 打开 https://dash.cloudflare.com。
2. 进入 `Workers & Pages`。
3. 点击 `Create application`。
4. 选择 `Pages`。
5. 选择 `Import from Git`。
6. 选择 GitHub 仓库。

构建配置：

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
```

环境变量：

```text
VITE_INVITE_CODES=your-code-1,your-code-2,myclub888
```

部署后会得到类似：

```text
https://your-project.pages.dev
```

的地址。

## 7. 手机使用建议

### 7.1 到球场前

建议提前做一次：

1. 用手机打开部署地址。
2. 输入邀请码。
3. 选择一次球队和队标。
4. 进入战术板页面。
5. 等队标和页面都加载完成。

这样浏览器会缓存页面、CSS、JS 和部分图片资源。

### 7.2 添加到主屏幕

#### iPhone Safari

1. 用 Safari 打开部署地址。
2. 点击分享按钮。
3. 选择“添加到主屏幕”。
4. 确认名称为“足球战术板”。

#### Android Chrome

1. 用 Chrome 打开部署地址。
2. 点击右上角菜单。
3. 选择“添加到主屏幕”或“安装应用”。

以后就可以从手机桌面直接打开。

## 8. PWA 离线能力说明

本项目已经加入：

- `manifest.webmanifest`
- `pwa-icon-192.png`
- `pwa-icon-512.png`
- `pwa-icon.svg`
- `sw.js`
- service worker 注册逻辑

它会缓存：

- 首页。
- 构建后的 JS。
- 构建后的 CSS。
- 图标。
- manifest。
- 已经加载过的图片。

重要限制：

- 第一次打开必须有网络。
- 如果你从来没打开过某个队标，离线时可能看不到那个队标。
- 随机和战术板本身不需要后端，页面加载成功后就能在手机本地运行。

## 9. 自定义域名

你可以先用免费二级域名：

- Vercel: `xxx.vercel.app`
- Cloudflare Pages: `xxx.pages.dev`

如果以后想用自己的域名，例如：

```text
football.yourdomain.com
```

可以在 Vercel 或 Cloudflare Pages 里绑定自定义域名。

对你现在的球场使用场景，自定义域名不是必须。

## 10. 更新项目后如何重新部署

如果使用 GitHub 连接 Vercel 或 Cloudflare Pages：

```bash
git add .
git commit -m "Update football board"
git push
```

平台会自动重新构建和部署。

部署完成后，手机刷新页面即可看到新版本。

如果手机一直看到旧版本，可以尝试：

- 关闭后重新打开主屏幕 App。
- 浏览器强制刷新。
- 删除主屏幕图标后重新添加。

## 11. 安全建议

当前邀请码适合内部小范围使用。

如果只是朋友踢球、球队内部使用，够用。

如果以后你担心链接外传，可以升级成：

- Cloudflare Access 邮箱登录。
- Supabase 登录。
- 自己写后端登录。

但这些都会增加复杂度。当前阶段先保持简单更好。

## 12. 我的最终建议

现在就用 Vercel：

```text
npm run build -> GitHub -> Vercel -> 手机打开 -> 添加到主屏幕
```

这个路径最短，最适合你现在“去球场用手机分配位置”的目标。
