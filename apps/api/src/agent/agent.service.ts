import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Direction } from '../translate/dto/translate.dto';
import {
  DETECT_PERSPECTIVE_SYSTEM,
  detectPerspectiveUserPrompt,
} from '../prompts/detect-perspective.prompt';
import {
  TRANSLATE_TO_DEVELOPER_SYSTEM,
  translateToDeveloperUserPrompt,
} from '../prompts/translate-to-developer.prompt';
import {
  TRANSLATE_TO_PRODUCT_SYSTEM,
  translateToProductUserPrompt,
} from '../prompts/translate-to-product.prompt';

export interface AgentInput {
  content: string;
  direction: Direction;
  context?: string;
}

export interface DetectResult {
  perspective: 'PM' | 'DEV';
  confidence: number;
  reason: string;
}

// 框架无关的核心实现，同时支持 NestJS 和 Cloudflare Workers
export class AgentCore {
  private llm: ChatOpenAI;
  private llmStream: ChatOpenAI;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    if (!apiKey) throw new Error('OPENAI_API_KEY is required');
    this.llm = new ChatOpenAI({ apiKey, model, temperature: 0.3 });
    this.llmStream = new ChatOpenAI({ apiKey, model, temperature: 0.3, streaming: true });
  }

  async detectPerspective(content: string): Promise<DetectResult> {
    const response = await this.llm.invoke([
      new SystemMessage(DETECT_PERSPECTIVE_SYSTEM),
      new HumanMessage(detectPerspectiveUserPrompt(content)),
    ]);

    try {
      const text = response.content as string;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]) as DetectResult;
    } catch {
      // fallback
    }
    return { perspective: 'PM', confidence: 0.5, reason: '无法识别，默认为 PM 视角' };
  }

  resolveDirection(direction: Direction, detected?: DetectResult): 'PM_TO_DEV' | 'DEV_TO_PM' {
    if (direction !== 'AUTO') return direction;
    return detected?.perspective === 'DEV' ? 'DEV_TO_PM' : 'PM_TO_DEV';
  }

  async *stream(input: AgentInput): AsyncGenerator<string> {
    let resolvedDirection: 'PM_TO_DEV' | 'DEV_TO_PM';

    if (input.direction === 'AUTO') {
      const detected = await this.detectPerspective(input.content);
      resolvedDirection = this.resolveDirection('AUTO', detected);
    } else {
      resolvedDirection = input.direction;
    }

    const [systemPrompt, userPrompt] =
      resolvedDirection === 'PM_TO_DEV'
        ? [TRANSLATE_TO_DEVELOPER_SYSTEM, translateToDeveloperUserPrompt(input.content, input.context)]
        : [TRANSLATE_TO_PRODUCT_SYSTEM, translateToProductUserPrompt(input.content, input.context)];

    const stream = await this.llmStream.stream([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    for await (const chunk of stream) {
      const text = chunk.content;
      if (typeof text === 'string' && text) yield text;
    }
  }

  async invoke(input: AgentInput): Promise<string> {
    let chunks = '';
    for await (const chunk of this.stream(input)) chunks += chunk;
    return chunks;
  }
}

// NestJS Injectable 包装，供本地开发使用
@Injectable()
export class AgentService extends AgentCore {
  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY') ?? '';
    const model = config.get<string>('OPENAI_MODEL') ?? 'gpt-4o';
    super(apiKey, model);
  }
}
