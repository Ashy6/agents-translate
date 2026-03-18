# Skills 定义：沟通翻译助手 Agent

本文件定义了翻译助手 Agent 所具备的所有 Skills（对应 LangChain Tool / Function Call）。

每个 Skill 的格式：

- `name`：唯一标识符，用于 LangChain Tool 注册
- `description`：Agent 决策时依赖的 Tool 描述，需清晰准确
- `input_schema`：输入参数 JSON Schema
- `output_schema`：输出结构定义
- `prompt_template`：核心提示词模板

---

## Skill 1：detect_perspective

```yaml
name: detect_perspective
description: >
  分析用户输入的文本内容，判断其属于"产品经理视角（PM）"还是"开发工程师视角（DEV）"。
  当用户未手动选择翻译方向时调用此 Skill，自动决策后续翻译方向。
input_schema:
  type: object
  required: [content]
  properties:
    content:
      type: string
      description: 用户输入的原始文本
output_schema:
  type: object
  properties:
    perspective:
      type: string
      enum: [PM, DEV, UNKNOWN]
      description: 识别出的输入视角
    confidence:
      type: number
      description: 置信度 0-1
    reason:
      type: string
      description: 判断依据的简短说明
```

**Prompt Template：**

```
你是一个企业沟通分析专家。请分析以下文本，判断它来自"产品经理（PM）"还是"开发工程师（DEV）"视角。

判断规则：
- PM 视角：关注用户价值、业务目标、功能描述、用户体验，语言偏业务/运营
- DEV 视角：包含技术术语（QPS、延迟、算法、数据库、API等）、工作量评估、技术实现方案

输入文本：
{{content}}

请以 JSON 格式返回：
{"perspective": "PM|DEV|UNKNOWN", "confidence": 0.95, "reason": "判断原因"}
```

---

## Skill 2：translate_to_developer

```yaml
name: translate_to_developer
description: >
  将产品经理（PM）输入的业务需求描述翻译为开发工程师能直接理解和使用的技术语言。
  输出应包含技术实现建议、数据需求、性能要求、工作量预估和待确认事项。
  当翻译方向为 PM→DEV 时调用。
input_schema:
  type: object
  required: [content]
  properties:
    content:
      type: string
      description: PM 输入的业务需求描述
    context:
      type: string
      description: 补充上下文信息（可选，如行业、技术栈等）
output_schema:
  type: object
  properties:
    technical_solution:
      type: string
      description: 推荐的技术实现方案
    data_requirements:
      type: string
      description: 数据来源与处理方式
    performance_requirements:
      type: string
      description: 性能与实时性要求
    effort_estimation:
      type: string
      description: 预估工作量
    missing_info:
      type: array
      items:
        type: string
      description: 缺失的关键信息列表
    clarification_needed:
      type: array
      items:
        type: string
      description: 需要 PM 进一步确认的问题
```

**Prompt Template：**

```
你是一个资深技术架构师，同时具备产品经理思维。你的任务是将产品需求翻译为开发工程师能直接理解的技术语言。

【产品需求输入】
{{content}}

{{#if context}}【背景信息】{{context}}{{/if}}

请从以下维度进行技术分析，以 Markdown 格式输出：

## 技术实现方案
（推荐的架构/算法/技术选型，给出 2-3 个可选方案及其取舍）

## 数据需求
（需要哪些数据、数据来源、数据质量要求、数据处理方式）

## 性能与实时性要求
（响应时间、并发量、数据一致性、实时/离线处理建议）

## 工作量预估
（使用 T 恤尺码：XS/S/M/L/XL，并说明主要工作项）

## 缺失信息 & 待确认事项
（列出产品描述中缺失的关键信息，需要 PM 进一步明确的决策点）

注意：
- 使用开发工程师熟悉的技术术语
- 给出具体的、可执行的建议，避免模糊表述
- 如果需求存在技术风险，需明确指出
```

---

## Skill 3：translate_to_product

```yaml
name: translate_to_product
description: >
  将开发工程师输入的技术方案、技术结论或技术术语翻译为产品经理和业务方能理解的业务语言。
  输出应包含用户体验影响、业务价值、增长空间和风险提示。
  当翻译方向为 DEV→PM 时调用。
input_schema:
  type: object
  required: [content]
  properties:
    content:
      type: string
      description: 开发工程师输入的技术方案或技术结论
    context:
      type: string
      description: 补充上下文信息（可选，如业务背景等）
output_schema:
  type: object
  properties:
    user_experience_impact:
      type: string
      description: 对最终用户体验的实际影响
    business_value:
      type: string
      description: 商业价值和业务收益
    growth_potential:
      type: string
      description: 支持的业务增长空间
    risks_and_attention:
      type: string
      description: 潜在风险和需要关注的点
    missing_info:
      type: array
      items:
        type: string
      description: 缺失的关键信息列表
```

**Prompt Template：**

```
你是一个既懂技术又懂业务的产品总监。你的任务是将技术内容翻译为产品经理和业务方能理解的语言。

【技术内容输入】
{{content}}

{{#if context}}【背景信息】{{context}}{{/if}}

请从以下维度进行业务分析，以 Markdown 格式输出：

## 用户体验影响
（这个技术变化对最终用户有什么直接感知？速度/稳定性/功能？用具体数字或类比描述）

## 业务价值
（对公司/产品的商业价值：成本节省、收入增长、风险降低等，尽量量化）

## 增长潜力
（这个技术能力能支撑哪些新的业务可能性？未来 3-6 个月内可以做什么？）

## 风险与注意事项
（有哪些潜在风险？业务方需要提前了解什么？是否有需要做决策的地方？）

## 缺失信息
（如果技术描述中缺少关键信息，列出需要开发补充说明的内容）

注意：
- 避免使用技术术语，用业务方熟悉的语言表达
- 用类比或具体场景帮助非技术人员理解
- 关注"这对我（业务方）意味着什么"而非"技术是怎么做的"
```

---

## Skill 4：supplement_missing_info

```yaml
name: supplement_missing_info
description: >
  分析用户输入内容，识别翻译时缺失的关键信息，并生成追问列表或合理假设。
  在翻译前或翻译后调用，用于提升翻译质量。
input_schema:
  type: object
  required: [content, perspective]
  properties:
    content:
      type: string
      description: 用户输入的原始文本
    perspective:
      type: string
      enum: [PM, DEV]
      description: 输入来源的视角
output_schema:
  type: object
  properties:
    missing_items:
      type: array
      items:
        type: object
        properties:
          field:
            type: string
            description: 缺失信息的类别
          question:
            type: string
            description: 追问问题
          assumed_value:
            type: string
            description: 如无法追问时的合理默认假设
    completeness_score:
      type: number
      description: 输入完整度评分 0-10
```

**Prompt Template：**

```
你是一个经验丰富的需求分析师。请分析以下输入内容的完整性。

【输入视角】{{perspective}}（PM=产品经理 / DEV=开发工程师）
【输入内容】{{content}}

请识别翻译时关键的缺失信息：

对于 PM 输入，关键信息包括：
- 目标用户群体
- 业务规模/数据量
- 性能/实时性期望
- 与现有系统的关系
- 优先级和上线时间

对于 DEV 输入，关键信息包括：
- 影响范围（哪些功能/用户受影响）
- 变更前后的对比基线
- 是否有业务风险或不可用窗口
- 后续计划

以 JSON 格式返回：
{
  "missing_items": [
    {"field": "缺失类别", "question": "追问问题", "assumed_value": "默认假设"}
  ],
  "completeness_score": 7
}
```

---

## Skill 5：format_output

```yaml
name: format_output
description: >
  将翻译结果格式化为统一的 Markdown 结构化输出，确保输出一致性和可读性。
  在其他翻译 Skill 输出后调用，作为最终输出格式化步骤。
input_schema:
  type: object
  required: [raw_content, direction]
  properties:
    raw_content:
      type: string
      description: 翻译 Skill 的原始输出内容
    direction:
      type: string
      enum: [PM_TO_DEV, DEV_TO_PM]
      description: 翻译方向
    missing_info:
      type: array
      items:
        type: string
      description: 需要补充的信息列表（可选）
output_schema:
  type: object
  properties:
    formatted_content:
      type: string
      description: 格式化后的 Markdown 内容
    summary:
      type: string
      description: 一句话摘要
```

**Prompt Template：**

```
请将以下翻译内容整理为清晰、专业的 Markdown 格式，确保：
1. 使用清晰的 ## 二级标题分段
2. 关键数字/术语用 **加粗** 标注
3. 列表项使用 - 符号
4. 结尾附上一句话摘要

翻译方向：{{direction}}（PM_TO_DEV=产品→开发 / DEV_TO_PM=开发→产品）

原始内容：
{{raw_content}}

{{#if missing_info}}
补充说明：以下信息缺失，请在输出末尾以"⚠️ 待确认"区块列出：
{{missing_info}}
{{/if}}
```

---

## Agent 工作流

```
用户输入
    │
    ▼
[detect_perspective]  ← 若用户未手动选择方向
    │
    ▼
[supplement_missing_info]  ← 分析输入完整性
    │
    ├─ PM 视角 → [translate_to_developer]
    └─ DEV 视角 → [translate_to_product]
                        │
                        ▼
                 [format_output]  ← 统一格式化
                        │
                        ▼
                   流式返回用户
```

---

## 使用规范

1. **Tool 描述必须准确**：Agent 依赖 description 决策，描述不准确会导致工具误用
2. **Prompt 模板独立维护**：Prompt 变更不应触发代码重新部署
3. **输出 Schema 强制校验**：使用 Zod 对 LangChain Tool 的输出进行 Schema 验证
4. **流式兼容**：`translate_to_developer` 和 `translate_to_product` 的输出支持流式 Token 传输
