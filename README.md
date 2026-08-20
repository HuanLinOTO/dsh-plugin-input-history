<p align="center">
  <a href="https://dshfind.com/zh/plugins/huanlinoto/dsh-plugin-input-history"><img src="https://dshfind.com/api/card/huanlinoto/dsh-plugin-input-history?lang=zh" alt="dsh-plugin-input-history card"></a>
</p>

# dsh-plugin-input-history

[![npm version](https://img.shields.io/npm/v/@huanlin/dsh-plugin-input-history)](https://www.npmjs.com/package/@huanlin/dsh-plugin-input-history)

> 终端式 prompt 历史导航：在 DSH 输入框按 ↑/↓ 切换最近发送过的消息。

在 DSH 的 prompt 输入框中按 **↑** 方向键，自动填入上一条已发送的 prompt；继续按 ↑ 向更旧的条目回溯，按 ↓ 向更新条目前进，按到最新条目之后再按 ↓ 恢复用户原本正在编辑的草稿。历史跨会话共享、持久化到 `localStorage`，刷新浏览器后仍然保留。

## 功能

- **↑ / ↓ 切换历史**：在 DSH prompt 输入框（聊天页底部那个 textarea）按方向键，从最近一条 prompt 开始向旧回溯，或向新前进。
- **草稿保留**：切到历史预览后，按 ↓ 越过最新条目会自动恢复用户原本正在编辑的草稿——不会丢失在途文本。
- **跨会话全局持久化**：历史来自所有会话的 `user` + `steering` 消息，存到 `localStorage`（FIFO，500 条上限），刷新浏览器、新建会话、切换 workspace 都保留。
- **多行边界触发**：ArrowUp 仅在光标位于第一行任意位置时触发；ArrowDown 仅在最后一行任意位置时触发。多行编辑时方向键仍正常移动光标，不会被劫持。
- **IME 安全**：中文/日文输入法候选词状态按方向键不会被劫持（遵循 DSH core InputBar 的 IME 守卫约定，issue #535）。
- **斜杠菜单兼容**：斜杠命令菜单打开时，方向键归菜单高亮导航使用，插件不动。
- **零源码 patch**：纯插件，通过 `conversation.composer.dock` 隐藏条目挂载 `document` 级 `keydown` 监听器。不修改 DSH 源码任何文件。

## 架构

单 bundle 双入口（host `.` + 浏览器 `./client` + invariant `./invariant`），仿照 `dsh-spur` / `dsh-auto-blame`。

- **宿主半边**（`src/index.ts`）：空 `apply`——纯客户端插件。
- **浏览器半边**（`src/client/index.ts`）：
  - 注册 `conversation.composer.dock` list slot（id `dsh-plugin-input-history`，order 100）。dock 条目渲染一个 `display: none` 的不可见 anchor，仅负责**历史收集**（每次 render 读 `session.nodes`，新 user/steering 文本 append 到 store）。
  - 在 `apply` 里直接挂 `document.addEventListener('keydown', ...)` bubble-phase 监听器，负责**历史导航**。监听器放在 `apply` 而非 dock 组件里，因为 dock 是 session scope，而 DSH 把 blank session 当作 hero 渲染（`ConversationRoot.tsx:79-80`），hero 模式下 dock 不挂载（`ConversationRoot.tsx:156` 的 `!hero` 守卫）。放在 `apply` 确保健听器始终在线。
- **纯函数模块**：
  - `src/client/history.ts`：`appendHistory` / `nextIndex` / `entryAt` / `HistoryStore`（localStorage 后端，quota 异常降级为内存）
  - `src/client/dom.ts`：`cursorLineInfo`（多行边界判断）/ `findComposerTextarea`（DOM 查询）
  - `src/client/ime.ts`：`isImeComposition`（IME 守卫）

### 历史回填机制：native setter + dispatch input event

监听器不通过 `inputActions.setDraft`（那是 per-session 的，通过 slot provide 注入，hero/blank 模式下 dock 不挂载时拿不到）。而是用 native prototype setter 改 textarea.value + dispatch `input` event，触发 InputBar 的 `onChange` → `keyboard.setDraft`——与用户手动输入走同一路径。这是浏览器自动化库（Playwright / Testing Library）模拟用户输入的标准手法。

### Slot 选择

`conversation.composer.dock`（list，session 作用域）——编辑器卡片下方的条带，由 `ui-conversation` 拥有。dock 条目从框架接收 `InputZone`（owner：`session: ConversationSnapshot`）+ `SessionStandardProps`。dock 只负责历史收集；导航监听器在 `apply` 里，不依赖 dock 挂载。

### 历史收集

每次 render 读 `props.session.nodes`（point-in-time 快照），从尾向前找到第一个 `kind === 'user'` 或 `kind === 'steering'` 节点，提取其 `content` 中所有 `type === 'text'` 块的文本拼接。与上次看到的文本比较，不同则 `append` 到 `HistoryStore`。store 内部做去重（最新相等 no-op、旧出现移到末尾）和 FIFO 截断。

### 键盘事件处理链

`document.addEventListener('keydown', handler, false)`（bubble 阶段，在 React 委托的 root handler 之后触发），监听器挂在 `apply` 里（非 dock 组件）：

1. **键过滤**：只处理 `ArrowUp` / `ArrowDown`。
2. **IME 守卫**：`event.isComposing || event.keyCode === 229` → 放行。
3. **斜杠菜单兼容**：`event.defaultPrevented` → 放行（InputBar 已消费，菜单打开中方向键移动高亮）。
4. **textarea 定位**：从 `event.target` 向上找 `[data-composer-card]` 祖先，找其下的 `<textarea>`；找不到放行。
5. **target 校验**：`event.target !== textarea` 放行（排除点击 composer 卡片 chrome 的情况）。
6. **readOnly/disabled gate**：`textarea.readOnly || textarea.disabled` 放行（hero 模式 workspace picker trigger、submit 进行中）。
7. **多行边界**：`cursorLineInfo(value, selStart, selEnd)` 计算；ArrowUp 仅 `atFirstLine` 触发，ArrowDown 仅 `atLastLine` 触发。
8. **导航**：`nextIndex(cursor, total, dir)` 计算下一索引；`null` 表示越过最新端 → 恢复 `savedDraft`；否则 `setNativeTextareaValue(textarea, entry)` + `event.preventDefault()`。
9. **草稿保存**：第一次从"未导航"切到"导航中"时，把当前 `textarea.value` 存到 `savedDraft`。

### 历史回填：native setter

`setNativeTextareaValue(textarea, value)` 用 `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set` 调用原生 setter（绕过 React 的 value tracker），然后 `dispatchEvent(new Event('input', { bubbles: true }))`。React 感知到值变化，触发 InputBar 的 `onChange` → `keyboard.setDraft(next)` → input machine 更新 draft → React 重新渲染 textarea value。与用户手动输入走完全相同的路径。

## 开发

```sh
pnpm install          # 安装开发依赖
pnpm run typecheck    # tsc --noEmit（通过 ../dsh 解析 DSH 源码）
pnpm test             # vitest run（纯函数单元测试）
pnpm run build        # tsc + tsdown → lib/index.js, lib/invariant.js, lib/client.js
```

### 基于 DSH checkout 类型检查

`tsconfig.json` 继承 `../dsh/tsconfig.base.client.json`，继承其 `paths` 映射到同级 DSH checkout 的 `packages/*/*/src`。需在 `../dsh` 是 DSH checkout 根目录的同级布局下运行 typecheck。

### 预构建 lib/

`lib/` 随仓库提交（与 `dsh-spur` / `dsh-auto-blame` 相同模式），git 安装时无需 `prepare` 脚本。开发时改动源码后跑 `pnpm run build`（或 `pnpm run bundle:client`）重建 `lib/`，再提交。

## 安装

```sh
# 从 npm 安装（推荐）：
dsh plugin --profile web add @huanlin/dsh-plugin-input-history

# 从 GitHub 安装：
dsh plugin --profile web add github:huanlinoto/dsh-plugin-input-history

# 本地开发（link:）：
dsh plugin --profile web add link:D:/Projects/deepseek-harness/dsh-plugin-input-history
```

安装后重启 `dsh web` 进程，浏览器硬刷新（`Ctrl+Shift+R`）。

## 配置

无配置。capacity 硬编码为 500 条（见已知限制）。

## 已知限制

- **Capacity 硬编码。** 历史上限固定为 500 条（`DEFAULT_CAPACITY` in `src/client/history.ts`）。改为 `Config` 字段需要 host-client 间 RPC 通道（client bundle 与 host bundle 是独立的模块作用域，无法直接共享 Config）。如需调整，编辑源码后重建 `lib/`。
- **textarea DOM 句柄无私有 API。** 插件通过 `document.querySelector('[data-composer-card] textarea')` 定位 InputBar 的 textarea。`data-composer-card` 属性是 `ui-conversation` 包的内部实现（`InputBar.tsx:629`），目前稳定但无文档保证；上游若改名，定位器需要更新（单点：`findComposerTextarea`）。
- **斜杠菜单开/关状态无私有 API。** 通过 `event.defaultPrevented` 启发式判断：InputBar 的 onKeyDown 在菜单打开时方向键已 `preventDefault`（`InputBar.tsx:316`），bubble 阶段监听器据此识别"菜单已消费"。若上游改变该逻辑，启发式可能失效。
- **hero 模式（无 workspace 的 workspace picker）下不触发。** hero 模式的 textarea 是 readOnly 的 workspace picker trigger，`textarea.readOnly` 守卫会放行。但 blank session（有 workspace、textarea 可编辑）下正常工作——这是关键修复点，因为 DSH 把 blank session 当 hero 渲染导致 dock 不挂载，监听器放在 `apply` 里绕过了这个限制。
- **无跨 tab 同步。** 多窗口同时发消息时 localStorage 写竞争通过 try/catch 容错；最坏丢一条，下次 append 会纠正。
- **历史范围全局共享。** 不区分 workspace / session，所有 `user` + `steering` 消息进同一历史。如需按 workspace 隔离，需要扩展 `HistoryStore` 的 key 命名空间。

## 设计参考

- 插件开发规范：`plugin-development-guide.md`
- DSH Native UI slot 速查：`DSH-Native-UI.md`
- 范本插件：`dsh-spur`（dock + inputActions 模式）、`dsh-auto-blame`（SuggestionBubbles）、`DSH-better-sidebar`（IME 守卫）
