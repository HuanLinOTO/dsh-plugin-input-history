<p align="center">
  <a href="https://dshfind.com/zh/plugins/huanlinoto/dsh-plugin-input-history"><img src="https://dshfind.com/api/card/huanlinoto/dsh-plugin-input-history?lang=zh" alt="dsh-plugin-input-history card"></a>
</p>

# dsh-plugin-input-history

[![npm version](https://img.shields.io/npm/v/@huanlin/dsh-plugin-input-history)](https://www.npmjs.com/package/@huanlin/dsh-plugin-input-history)

> 终端式 prompt 历史导航：在 DSH 输入框按 ↑/↓ 切换最近发送过的消息。

在 DSH 的 prompt 输入框中按 **↑** 方向键，自动填入上一条已发送的 prompt；继续按 ↑ 向更旧的条目回溯，按 ↓ 向更新条目前进，按到最新条目之后再按 ↓ 恢复用户原本正在编辑的草稿。历史跨会话共享、持久化到 `localStorage`，刷新浏览器后仍然保留。

## 功能

- **↑ / ↓ 切换历史**：在 DSH prompt 输入框（聊天页底部的 Lexical 编辑器）按方向键，从最近一条 prompt 开始向旧回溯，或向新前进。
- **草稿保留**：切到历史预览后，按 ↓ 越过最新条目会自动恢复用户原本正在编辑的草稿——不会丢失在途文本。
- **跨会话全局持久化**：历史来自所有会话的 `user` + `steering` 消息，存到 `localStorage`（FIFO，500 条上限），刷新浏览器、新建会话、切换 workspace 都保留。
- **多行边界触发**：ArrowUp 仅在光标位于第一行任意位置时触发；ArrowDown 仅在最后一行任意位置时触发。多行编辑时方向键仍正常移动光标，不会被劫持。
- **IME 安全**：中文/日文输入法候选词状态按方向键不会被劫持（遵循 DSH core InputBar 的 IME 守卫约定，issue #535）。
- **斜杠菜单兼容**：斜杠命令 / @ 引用菜单打开时，方向键归菜单高亮导航使用，插件不动。
- **零源码 patch**：纯插件，通过 `conversation.composer.dock` 隐藏条目挂载捕获阶段 `keydown` 监听器。不修改 DSH 源码任何文件。

## 架构

单 bundle 双入口（host `.` + 浏览器 `./client` + invariant `./invariant`），仿照 `dsh-spur` / `dsh-auto-blame`。

- **宿主半边**（`src/index.ts`）：空 `apply`——纯客户端插件。
- **浏览器半边**（`src/client/index.ts`）：注册 `conversation.composer.dock` list slot（id `dsh-plugin-input-history`，order 100，与 ui-chat 的 StatsLine 同槽共存）。dock 条目渲染一个 `display: none` 的不可见 anchor，**历史收集**与**历史导航**都由这个 session 作用域的 dock 组件承担——两者都需要只有 session 作用域 slot 组件才能拿到的机器接口（`useChat` / `inputActions`）。
- **纯函数模块**：
  - `src/client/history.ts`：`appendHistory` / `nextIndex` / `entryAt` / `HistoryStore`（localStorage 后端，quota 异常降级为内存）
  - `src/client/dom.ts`：`findComposerEditable` / `findTriggerMenu`（data-attribute 定位器）/ `caretLineBoundary`（光标-行盒几何）/ `boundaryFromLineTops`（纯判定核心）
  - `src/client/ime.ts`：`isImeComposition`（IME 守卫）

### 历史回填机制：`inputActions.setDraft`

v0.1.2 起 composer 是 Lexical contenteditable，没有 textarea 可以用 native setter 驱动。插件改走 slot 系统注入的 `inputActions.setDraft(text)`——这是 input machine 的公开整草稿写入口（Lexical update、光标落到末尾、undo 合并）。注意：含引用 chip 的草稿恢复时按 clipboard 投影文本还原（chip 变回 `/name` 形式）。

### Slot 选择

`conversation.composer.dock`（list，session 作用域）——编辑器卡片下方的条带，由 `ui-conversation` 拥有。dock 条目从框架接收 `InputZone`（owner：`input: InputState`）+ `SessionStandardProps`（`useSession` / `sessionId` / `useInput` / `inputActions`，以及 ui-chat merge 进来的 `useChat`）。DSH 把 blank session 当作 hero 渲染时该 dock 不挂载，插件随之休眠——hero 模式本就没有 input machine，导航无处落地（见已知限制）。

### 历史收集

dock 通过 `useChat(s => s.legacy.nodes)` 订阅 Chat target 的节点列表（`ConversationNode` 平铺数组，新在后），从尾向前找到第一个 `kind === 'user'` 或 `kind === 'steering'` 节点，提取其 `content` 中所有 `type === 'text'` 块的文本拼接。文本变化时 append 到 `HistoryStore`。store 内部做去重（最新相等 no-op、旧出现移到末尾）和 FIFO 截断，重复 append 无副作用。

### 键盘事件处理链

`document.addEventListener('keydown', handler, true)`（**捕获阶段**，在 Lexical 挂在 editable 元素上的 keydown 监听器之前触发），监听器由 dock 组件挂载/卸载：

1. **键过滤**：只处理 `ArrowUp` / `ArrowDown`。
2. **IME 守卫**：`event.isComposing || event.keyCode === 229` → 放行。
3. **已拦截守卫**：`event.defaultPrevented` → 放行。
4. **editable 定位**：`findComposerEditable(event.target)` 向上找 `[data-composer-card]` 祖先，查其下 `[data-composer-input]`（Lexical contenteditable），并要求 target 在 editable 内部（卡片按钮/chrome 上的按键不触发）。
5. **菜单兼容**：`findTriggerMenu(editable)` 在同一卡片内查 `[data-trigger-menu]`——菜单打开时方向键归菜单高亮仲裁（捕获阶段先于 keymap 的 arbitrate，不能再用 `defaultPrevented` 启发式）。
6. **phase gate**：`input.phase !== 'plain'` 放行（adjudicating / claimed / submitting 提交事务中不干扰）。
7. **多行边界**：`caretLineBoundary(editable)` 用折叠选区的 rect 与内容行盒 tops 比较；ArrowUp 仅 `atFirstLine` 触发，ArrowDown 仅 `atLastLine` 触发；几何不可得（无布局环境）→ 不导航。
8. **导航**：`nextIndex(cursor, total, dir)` 计算下一索引；`null` 表示越过最新端 → `inputActions.setDraft(savedDraft)` 恢复草稿；否则 `setDraft(entry)`。
9. **草稿保存**：第一次从"未导航"切到"导航中"时，把当前 `input.draft`（clipboard 投影）存到 `savedDraft`。
10. **消费事件**：`preventDefault()` + `stopPropagation()`。捕获阶段在 document 上 `stopPropagation` 使事件永远到不了 Lexical 的 editable 监听器——否则 keymap 会在草稿已被替换后再移动光标。

## 开发

```sh
pnpm install          # 安装开发依赖
pnpm run typecheck    # tsc --noEmit（通过 tsconfig paths + node_modules junction 解析 DSH 源码）
pnpm test             # vitest run（纯函数单元测试）
pnpm run build        # tsdown + tsc → lib/index.js, lib/invariant.js, lib/client.js, lib/types/
```

### 基于 DSH checkout 类型检查

`@deepseek-ai/*` 的 alpha 版本未发布到 npm：`peerDependencies` 照写 `^0.1.2-alpha.1`（仅声明），本地开发用两条通道解析类型——

1. `tsconfig.json` 的 `paths` 指向 `C:/Users/Administrator/.dsh/source/current/packages/*/lib/types`（需该 checkout 已 `pnpm run build`）；
2. `node_modules/@deepseek-ai/*` 为指向同一 checkout 的 junction（首次需手工创建，或从 dsh-interpreters / dsh-mineru 复制做法）。

`pnpm-workspace.yaml` 的 `autoInstallPeers: false` 阻止 pnpm 去 registry 拉取不存在的 peer 版本（pnpm 10 读 workspace.yaml 的这一项，不是 `.npmrc`）。

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
- **DOM 标记是上游内部属性。** 插件通过 `[data-composer-card]` / `[data-composer-input]` / `[data-trigger-menu]` 定位 composer 卡片、Lexical editable 与触发菜单。这些属性是 `ui-conversation` / `ui-input-trigger` 包的内部实现，目前稳定但无文档保证；上游若改名，定位器需要更新（单点：`src/client/dom.ts`）。
- **hero / blank session 下休眠。** DSH 把 blank session 当作 hero 渲染，`conversation.composer.dock` 不挂载，插件的收集与监听都随 dock 休眠。且 hero 模式本就没有当前 session 的 input machine（`inputActions` 不存在），导航无处落地。会话激活后（发出第一条消息）恢复正常。
- **含 chip 的草稿按纯文本恢复。** 导航保存的"在途草稿"是 `input.draft`（clipboard 投影）：恢复时引用 chip 会变回 `/name` 纯文本形式。历史条目本身也始终是纯文本。
- **无跨 tab 同步。** 多窗口同时发消息时 localStorage 写竞争通过 try/catch 容错；最坏丢一条，下次 append 会纠正。
- **历史范围全局共享。** 不区分 workspace / session，所有 `user` + `steering` 消息进同一历史。如需按 workspace 隔离，需要扩展 `HistoryStore` 的 key 命名空间。

## 设计参考

- 插件开发规范：`plugin-development-guide.md`
- DSH Native UI slot 速查：`DSH-Native-UI.md`
- 范本插件：`dsh-spur`（dock + inputActions 模式）、`dsh-auto-blame`（SuggestionBubbles）、`DSH-better-sidebar`（IME 守卫）
