# 技术文档：沟通翻译助手

## 1. 技术栈

| 层次          | 技术选型                                | 说明                                 |
| ------------- | --------------------------------------- | ------------------------------------ |
| 前端          | React 18 + TypeScript                   | 组件化 UI                            |
| 前端样式      | Tailwind CSS                            | 快速样式开发                         |
| Markdown 渲染 | react-markdown + remark-gfm             | 渲染翻译结果                         |
| 后端框架      | NestJS + TypeScript                     | 模块化架构，与 LangChain.js 配合良好 |
| AI Agent      | LangChain.js                            | Tool 注册、Agent 调度、流式输出      |
| 大模型        | Anthropic Claude / OpenAI GPT（可切换） | 通过环境变量配置                     |
| 流式通信      | SSE（Server-Sent Events）               | 前端实时渲染 Token                   |
| 包管理        | pnpm + monorepo（Turborepo）            | 统一管理前后端依赖                   |

---

## 2. 项目目录结构

```
agents-translate/
├── apps/
│   ├── web/                        # React 前端
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── TranslatePanel.tsx    # 主翻译面板
│   │   │   │   ├── DirectionSelector.tsx # 翻译方向选择
│   │   │   │   ├── InputArea.tsx         # 输入区域
│   │   │   │   ├── OutputArea.tsx        # 结果展示（Markdown）
│   │   │   │   └── HistoryList.tsx       # 历史记录（P2）
│   │   │   ├── hooks/
│   │   │   │   └── useStreamTranslate.ts # SSE 流式请求 Hook
│   │   │   ├── types/
│   │   │   │   └── translate.ts          # 共享类型定义
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── api/                        # NestJS 后端
│       ├── src/
│       │   ├── translate/
│       │   │   ├── translate.module.ts
│       │   │   ├── translate.controller.ts
│       │   │   ├── translate.service.ts
│       │   │   └── dto/
│       │   │       └── translate.dto.ts
│       │   ├── agent/
│       │   │   ├── agent.module.ts
│       │   │   ├── agent.service.ts      # LangChain Agent 封装
│       │   │   └── tools/               # LangChain Tools
│       │   │       ├── detect-perspective.tool.ts
│       │   │       ├── translate-to-developer.tool.ts
│       │   │       ├── translate-to-product.tool.ts
│       │   │       ├── supplement-info.tool.ts
│       │   │       └── format-output.tool.ts
│       │   ├── prompts/                 # Prompt 模板（独立维护）
│       │   │   ├── detect-perspective.prompt.ts
│       │   │   ├── translate-to-developer.prompt.ts
│       │   │   ├── translate-to-product.prompt.ts
│       │   │   └── supplement-info.prompt.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       └── package.json
│
├── docs/                           # 项目文档
│   ├── requirements.md
│   ├── skills.md
│   └── technical.md
│
├── package.json                    # monorepo 根配置
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 3. 系统架构

```
用户浏览器（React）
    │
    │  POST /api/translate        （普通请求）
    │  GET  /api/translate/stream （SSE 流式）
    ▼
NestJS API（TranslateController）
    │
    ▼
TranslateService
    │  调用
    ▼
AgentService（LangChain Agent）
    │
    ├── Tool: detect_perspective
    ├── Tool: translate_to_developer
    ├── Tool: translate_to_product
    ├── Tool: supplement_missing_info
    └── Tool: format_output
    │
    ▼
大模型 API（Claude / OpenAI）
    │
    ▼
流式 Token → SSE → 前端实时渲染
```

---

## 4. 后端模块设计

### 4.1 TranslateModule

**Controller：`translate.controller.ts`**

```typescript
// POST /api/translate — 普通翻译（等待完整结果）
@Post()
async translate(@Body() dto: TranslateDto): Promise<TranslateResult>

// GET /api/translate/stream — SSE 流式翻译
@Sse('stream')
async translateStream(@Query() dto: TranslateStreamDto): Observable<MessageEvent>
```

**DTO：`translate.dto.ts`**

```typescript
export class TranslateDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsEnum(['PM_TO_DEV', 'DEV_TO_PM', 'AUTO'])
  direction: 'PM_TO_DEV' | 'DEV_TO_PM' | 'AUTO';

  @IsOptional()
  @IsString()
  context?: string;
}
```

**Service：`translate.service.ts`**

```typescript
// 普通翻译：等待 Agent 完整输出
async translate(dto: TranslateDto): Promise<TranslateResult>

// 流式翻译：返回 AsyncIterable<string>
async *translateStream(dto: TranslateDto): AsyncIterable<string>
```

### 4.2 AgentModule

**AgentService：`agent.service.ts`**

- 初始化 LangChain `ChatAnthropic` 或 `ChatOpenAI`（根据 `LLM_PROVIDER` 环境变量切换）
- 注册所有 Tools
- 提供 `invoke(input)` 和 `stream(input)` 两个方法

```typescript
@Injectable()
export class AgentService {
  private agent: AgentExecutor;

  constructor(private configService: ConfigService) {
    const llm = this.createLLM();
    const tools = this.createTools();
    this.agent = createReactAgent({ llm, tools, prompt });
  }

  async invoke(input: AgentInput): Promise<string>
  async *stream(input: AgentInput): AsyncIterable<string>
}
```

**Tools 注册：**

每个 Tool 实现 LangChain `DynamicStructuredTool`：

```typescript
// 示例：translate-to-developer.tool.ts
export const translateToDeveloperTool = new DynamicStructuredTool({
  name: 'translate_to_developer',
  description: '将 PM 业务需求翻译为开发工程师能理解的技术语言...',
  schema: z.object({
    content: z.string(),
    context: z.string().optional(),
  }),
  func: async ({ content, context }) => {
    // 调用 LLM 执行翻译 Prompt
  },
});
```

### 4.3 Prompts 目录

Prompt 模板与代码解耦，独立存放在 `src/prompts/`，使用 LangChain `PromptTemplate` 管理：

```typescript
// translate-to-developer.prompt.ts
export const translateToDeveloperPrompt = PromptTemplate.fromTemplate(`
你是一个资深技术架构师...
【产品需求输入】{content}
...
`);
```

---

## 5. 前端组件设计

### 5.1 TranslatePanel（主面板）

```
┌──────────────────────────────────────────┐
│  沟通翻译助手                              │
│                                          │
│  翻译方向：[PM→开发▼]                      │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 输入内容...                         │  │
│  │                                    │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                    [翻译]                 │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ## 技术实现方案                      │  │
│  │ ...（流式 Markdown 渲染）            │  │
│  └────────────────────────────────────┘  │
│                    [复制]                 │
└──────────────────────────────────────────┘
```

### 5.2 useStreamTranslate Hook

```typescript
export function useStreamTranslate() {
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = async (params: TranslateParams) => {
    setOutput('');
    setIsStreaming(true);

    const eventSource = new EventSource(
      `/api/translate/stream?${new URLSearchParams(params)}`
    );

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done) {
        eventSource.close();
        setIsStreaming(false);
      } else {
        setOutput(prev => prev + data.token);
      }
    };

    eventSource.onerror = () => {
      setError('翻译失败，请重试');
      setIsStreaming(false);
      eventSource.close();
    };
  };

  return { output, isStreaming, error, translate };
}
```

---

## 6. API 设计

### POST /api/translate

**Request：**

```json
{
  "content": "我们需要一个智能推荐功能...",
  "direction": "PM_TO_DEV",
  "context": "电商平台"
}
```

**Response：**

```json
{
  "result": "## 技术实现方案\n...",
  "direction": "PM_TO_DEV",
  "detectedPerspective": "PM",
  "missingInfo": ["冷启动用户策略", "推荐内容过滤规则"]
}
```

### GET /api/translate/stream

**Query Params：** `content`, `direction`, `context`（同上）

**SSE Event 格式：**

```
data: {"token": "##"}
data: {"token": " 技术"}
data: {"token": "实现方案"}
...
data: {"done": true, "missingInfo": [...]}
```

---

## 7. LangChain Agent 封装策略

### 方案选择

使用 **`createReactAgent` + `AgentExecutor`**（而非 OpenAI Functions Agent），原因：

- 支持多步骤推理（detect → translate → format）
- 模型无关，支持切换 Claude / GPT
- 调试链路清晰

### Agent 输入格式

```typescript
interface AgentInput {
  content: string;
  direction: 'PM_TO_DEV' | 'DEV_TO_PM' | 'AUTO';
  context?: string;
}
```

### System Prompt（Agent 层）

```
你是一个职能沟通翻译助手。你有以下工具可以使用：
- detect_perspective：识别输入视角
- translate_to_developer：翻译为技术语言
- translate_to_product：翻译为业务语言
- supplement_missing_info：补充缺失信息
- format_output：格式化输出

工作流程：
1. 若 direction 为 AUTO，先调用 detect_perspective 判断视角
2. 调用 supplement_missing_info 分析输入完整性
3. 根据方向调用对应翻译工具
4. 调用 format_output 统一格式化
5. 返回最终结果
```

---

## 8. 环境变量配置

```bash
# apps/api/.env

# 大模型提供商（anthropic | openai）
LLM_PROVIDER=anthropic

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-sonnet-4-6

# OpenAI（备选）
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4o

# 服务配置
PORT=3000
CORS_ORIGIN=http://localhost:3721
```

---

## 9. 本地运行

### 环境要求

- Node.js >= 20
- pnpm >= 9

### 安装与启动

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp apps/api/.env.example apps/api/.env
# 编辑 .env 填入 API Key

# 启动开发模式（前后端同时）
pnpm dev

# 单独启动
pnpm --filter api dev    # 后端 http://localhost:3000
pnpm --filter web dev    # 前端 http://localhost:3721
```

### 构建

```bash
pnpm build
```

---

## 10. Cloudflare 部署

### 架构

```text
Cloudflare Pages (apps/web)
    │  /api/* → 代理到 Worker
    ▼
Cloudflare Workers (apps/api/src/worker.ts)
    │  Hono 路由 + AgentCore
    ▼
OpenAI API
```

### 前端 — Cloudflare Pages

在 CF Pages 控制台新建项目，配置如下：

| 设置项 | 值 |
| --- | --- |
| Build command | `pnpm --filter web build` |
| Build output directory | `apps/web/dist` |
| Root directory | `/`（仓库根目录） |

SPA 路由回退已通过 `apps/web/public/_redirects` 配置。

### 后端 — Cloudflare Workers

#### 1. 登录并部署

```bash
cd apps/api

# 首次登录
pnpm wrangler login

# 设置 API Key（以 secret 形式，不入代码）
pnpm wrangler secret put OPENAI_API_KEY

# 部署 Worker
pnpm deploy
```

#### 2. 设置 CORS_ORIGIN

Worker 部署完成后，在 CF 控制台 → Workers → agents-translate-api → Settings → Variables 中添加：

```text
CORS_ORIGIN = https://<你的-Pages-域名>.pages.dev
```

#### 3. 前端配置 API 地址

在 CF Pages 项目的环境变量中添加，并在 `apps/web/vite.config.ts` 的生产环境中将 API 请求指向 Worker URL（或使用 Pages 的 `_routes.json` 代理）。

### 关键文件

| 文件 | 说明 |
| --- | --- |
| `apps/api/src/worker.ts` | CF Worker 入口（Hono） |
| `apps/api/wrangler.toml` | Worker 配置 |
| `apps/web/public/_redirects` | Pages SPA 路由回退 |

---

## 11. 关键技术决策说明

| 决策        | 选择               | 原因                                  |
| ----------- | ------------------ | ------------------------------------- |
| Agent 框架  | LangChain.js       | Tool 注册规范、流式支持完善、社区活跃 |
| 流式方案    | SSE 而非 WebSocket | 单向推送场景 SSE 更轻量，无需额外库   |
| Prompt 解耦 | 独立 prompts/ 目录 | 产品迭代时只改 Prompt，不触发代码变更 |
| 模型切换    | 环境变量配置       | 支持不同环境使用不同模型，降低成本    |
| monorepo    | pnpm + Turborepo   | 类型共享、统一依赖管理、并行构建      |
