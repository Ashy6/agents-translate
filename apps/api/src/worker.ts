import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { AgentCore, AgentInput } from './agent/agent.service';
import { Direction } from './translate/dto/translate.dto';

type Bindings = {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  CORS_ORIGIN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
  const origin = c.env.CORS_ORIGIN || '*';
  return cors({ origin })(c, next);
});

app.post('/api/translate', async (c) => {
  const body = await c.req.json<AgentInput>();
  const agent = new AgentCore(c.env.OPENAI_API_KEY, c.env.OPENAI_MODEL || 'gpt-4o');
  const result = await agent.invoke(body);
  return c.json({ result });
});

app.get('/api/translate/stream', async (c) => {
  const content = c.req.query('content') || '';
  const direction = (c.req.query('direction') || 'AUTO') as Direction;
  const context = c.req.query('context');

  const agent = new AgentCore(c.env.OPENAI_API_KEY, c.env.OPENAI_MODEL || 'gpt-4o');

  return streamSSE(c, async (stream) => {
    try {
      for await (const chunk of agent.stream({ content, direction, context })) {
        await stream.writeSSE({ data: JSON.stringify({ token: chunk }) });
      }
      await stream.writeSSE({ data: JSON.stringify({ done: true }) });
    } catch (err) {
      await stream.writeSSE({ data: JSON.stringify({ error: (err as Error).message }) });
    }
  });
});

export default app;
