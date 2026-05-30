# 足球随机分队战术板：前端学习说明

这份文档是给初学者看的。它不假设你已经熟悉 React、TypeScript 或 Vite，会从“这个项目为什么这样写”开始讲。

## 1. 这个项目是什么

这是一个纯前端网页应用。用户用手机打开网页后，可以：

- 输入邀请码进入应用。
- 创建一支球队，选择队名、颜色、队标预设和上场人数。
- 设置每个位置需要几个人。
- 点击随机，把球员随机分配到不同位置。
- 在战术板上拖动球员牌。
- 记录进球、助攻和比分。
- 添加到手机主屏幕，像一个轻量 App 一样打开。

项目没有后端服务器，也没有数据库。数据主要保存在浏览器本地，所以适合内部小范围使用。

## 2. 技术栈

项目用到的核心技术：

- **React**：负责把数据变成页面。
- **TypeScript**：给 JavaScript 加类型，减少写错字段、传错数据的问题。
- **Vite**：开发服务器和打包工具，负责本地启动、热更新、生产构建。
- **CSS**：负责 FIFA 风格的界面、战术板球场、移动端适配。
- **Web Crypto**：用浏览器的 `crypto.getRandomValues()` 做加密级随机。
- **localStorage / sessionStorage**：把配置、随机结果、战术板坐标保存在浏览器里。
- **PWA**：让网页可以添加到手机主屏幕，并在打开过一次后缓存页面资源。

## 3. 文件结构

```text
D:\fendui
├─ index.html
├─ public
│  ├─ favicon.svg
│  ├─ manifest.webmanifest
│  ├─ pwa-icon-192.png
│  ├─ pwa-icon-512.png
│  ├─ pwa-icon.svg
│  └─ sw.js
├─ src
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ random.ts
│  ├─ random.test.ts
│  ├─ serviceWorkerRegistration.ts
│  ├─ storage.ts
│  ├─ styles.css
│  └─ types.ts
├─ docs
│  ├─ DEPLOYMENT.md
│  └─ FRONTEND_LEARNING.md
├─ package.json
├─ vercel.json
└─ vite.config.ts
```

## 4. 从入口开始理解

浏览器最先打开的是 `index.html`。

`index.html` 里有这行：

```html
<script type="module" src="/src/main.tsx"></script>
```

这表示页面会加载 `src/main.tsx`。

`src/main.tsx` 做了两件事：

1. 把 React 应用挂载到页面里的 `<div id="root"></div>`。
2. 在生产环境注册 service worker，让网页具备 PWA 缓存能力。

简化理解：

```tsx
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
registerServiceWorker();
```

`App` 就是整个应用的主组件。

## 5. React 组件是什么

React 的思路是：页面由组件组成，组件根据数据渲染 UI。

在这个项目里，`src/App.tsx` 是最大的一块。它包含了：

- 登录邀请码界面。
- 创建队伍界面。
- 位置/阵型设置界面。
- 随机结果界面。
- 战术板。
- 进球记录。

初学时可以先记住一句话：

> React 页面 = 当前数据 + JSX 模板。

当用户输入队名、选择颜色、编辑球员名字时，React 会更新状态，然后自动重新渲染页面。

## 6. TypeScript 类型

`src/types.ts` 用来定义项目里的数据形状。

例如：

```ts
export type Team = {
  id: string;
  name: string;
  color: string;
  crestUrl?: string;
};
```

这表示一支球队至少有：

- `id`：唯一标识。
- `name`：队名。
- `color`：主色。
- `crestUrl`：可选的队标 URL。

TypeScript 的好处是：如果你在代码里把 `team.name` 写成 `team.namme`，编辑器或构建时会提醒你。

## 7. 状态管理

这个项目没有引入 Redux、Zustand 这类状态管理库，因为规模还不大。

React 内部主要用：

```ts
useState()
```

来保存界面状态，例如：

- 当前是否已登录。
- 当前队伍配置。
- 当前阵型列表。
- 当前随机结果。
- 战术板显示号码还是名字。

初学者可以把 `useState` 理解成“页面记忆”。

## 8. 本地保存

`src/storage.ts` 封装了浏览器存储。

项目里用了两种浏览器存储：

- `localStorage`：长期保存，关闭浏览器后也还在。
- `sessionStorage`：当前标签页保存，关闭这个页面后清空。

为什么这里很多数据用 `sessionStorage`？

因为你的使用场景是“一支队伍一个页面”。如果多支队伍一起用，就打开多个页面。`sessionStorage` 可以让不同页面互不影响。

## 9. 随机逻辑

随机分配核心在 `src/random.ts`。

这个项目没有用：

```ts
Math.random()
```

而是用：

```ts
crypto.getRandomValues()
```

这是浏览器提供的加密级随机来源，比普通伪随机更适合做公平随机。

分配逻辑大致是：

1. 计算阵型一共需要多少人。
2. 如果真实球员不足，就补“虚拟球员”。
3. 如果真实球员超出，多出来的人进入替补。
4. 用 Fisher-Yates 洗牌打乱球员。
5. 把球员填进不同位置。

项目还有 `src/random.test.ts`，用来测试随机逻辑里一些重要规则。

## 10. 战术板拖拽

战术板是用普通 HTML + CSS 做的，不是 Canvas。

每个球员牌都是一个可以拖动的元素。拖动时记录它在球场上的百分比坐标，例如：

- `x = 50` 表示横向中间。
- `y = 70` 表示纵向靠下。

用百分比的好处是：手机屏幕和电脑屏幕尺寸不同，站位仍然能大致保持。

## 11. 样式系统

`src/styles.css` 是整个应用的视觉样式。

里面包含：

- 深色背景。
- 荧光绿色强调色。
- 球场草坪条纹。
- 白色球场线。
- 队标氛围层。
- 移动端响应式布局。
- 球员牌大小和字体适配。

如果你想改 UI，通常先从这个文件入手。

## 12. PWA 是什么

PWA 的意思是 Progressive Web App，可以理解成“更像 App 的网页”。

本项目新增了三个关键文件：

- `public/manifest.webmanifest`
- `public/pwa-icon.svg`
- `public/sw.js`

`manifest.webmanifest` 告诉手机：

- App 名字叫什么。
- 主屏幕图标是什么。
- 打开时用独立窗口还是浏览器标签。
- 主题色是什么。

`sw.js` 是 service worker，负责缓存页面资源。

效果是：

- 手机可以“添加到主屏幕”。
- 第二次打开会更快。
- 打开过一次后，即使球场网络差，也更容易进入页面。

注意：第一次使用仍然需要网络；队标图片来自远程 CDN，最好在去球场前打开一次，让浏览器缓存它们。

## 13. 邀请码机制

邀请码在前端环境变量里配置：

```text
VITE_INVITE_CODES=code1,code2,code3
```

代码里会读取这个变量，然后判断用户输入是否匹配。

真实邀请码不写死在代码里，部署时从 Vercel 或 Cloudflare Pages 的环境变量注入。本地开发可以复制 `.env.example` 为 `.env.local`。

这适合内部使用，但它不是银行级安全。因为纯前端应用的代码最终会下载到用户浏览器里，有技术能力的人仍然可能找到构建后的邀请码。

如果以后需要真正安全，就要加后端登录或 Cloudflare Access。

## 14. 本地开发命令

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

运行测试：

```bash
npm test
```

生产构建：

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

## 15. 初学者建议的学习顺序

1. 先看 `src/types.ts`，理解数据长什么样。
2. 再看 `src/random.ts`，理解球员如何分配。
3. 再看 `src/App.tsx`，从登录界面开始顺着 UI 看。
4. 再看 `src/styles.css`，观察样式如何影响页面。
5. 最后看 `public/sw.js` 和 `manifest.webmanifest`，理解 PWA。

不要一开始就试图读懂全部代码。先抓住“数据如何流动”，项目会清楚很多。
