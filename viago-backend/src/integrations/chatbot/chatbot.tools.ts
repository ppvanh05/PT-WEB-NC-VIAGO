export interface ChatbotToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    strict: true;
    parameters: Record<string, unknown>;
  };
}

export interface ChatbotToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatbotToolkit {
  definitions: ChatbotToolDefinition[];
  execute(name: string, args: unknown): Promise<unknown>;
}

export interface ChatbotMemory {
  summary?: string;
  lastTripSearch?: Record<string, unknown>;
}
export interface KnowledgeSource {
  id: string;
  title: string;
  url: string;
  updatedAt?: string;
}
export function publicKnowledgeSources(value: unknown): KnowledgeSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is KnowledgeSource =>
        !!item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        item.id.length <= 150 &&
        typeof item.title === 'string' &&
        item.title.length <= 500 &&
        typeof item.url === 'string' &&
        item.url.startsWith('/customer/') &&
        !/[\\\r\n]/.test(item.url) &&
        item.url.length <= 1000,
    )
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      ...(typeof item.updatedAt === 'string'
        ? { updatedAt: item.updatedAt }
        : {}),
    }));
}

// Reassemble arguments across SSE chunks; tool arguments never enter chat text.
export async function readOpenAITurn(
  response: Response,
  delta: (text: string) => Promise<void>,
) {
  if (!response.body) throw new Error('Missing model stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const calls = new Map<number, ChatbotToolCall>();
  let buffer = '',
    content = '',
    finish = '',
    terminal = false;
  try {
    while (!terminal) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      if (buffer.length > 64000) throw new Error('Invalid model stream');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      if (chunk.done && buffer.trim()) lines.push(buffer);
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          terminal = true;
          break;
        }
        const data = JSON.parse(payload) as {
          error?: unknown;
          choices?: {
            finish_reason?: string | null;
            delta?: {
              content?: string | null;
              tool_calls?: {
                index: number;
                id?: string;
                type?: string;
                function?: { name?: string; arguments?: string };
              }[];
            };
          }[];
        };
        if (data.error) throw new Error('Model stream failed');
        const choice = data.choices?.[0];
        if (choice?.finish_reason) finish = choice.finish_reason;
        const text = choice?.delta?.content;
        if (text) {
          if (typeof text !== 'string' || content.length + text.length > 12000)
            throw new Error('Model response too long');
          content += text;
          await delta(text);
        }
        for (const fragment of choice?.delta?.tool_calls ?? []) {
          if (
            !Number.isInteger(fragment.index) ||
            fragment.index < 0 ||
            fragment.index > 3 ||
            (fragment.type && fragment.type !== 'function')
          )
            throw new Error('Invalid tool call');
          const call = calls.get(fragment.index) ?? {
            id: '',
            type: 'function',
            function: { name: '', arguments: '' },
          };
          call.id += fragment.id ?? '';
          call.function.name += fragment.function?.name ?? '';
          call.function.arguments += fragment.function?.arguments ?? '';
          if (
            call.id.length > 200 ||
            call.function.name.length > 80 ||
            call.function.arguments.length > 8000
          )
            throw new Error('Tool call too long');
          calls.set(fragment.index, call);
        }
      }
      if (chunk.done) break;
    }
    if (!terminal || !['stop', 'tool_calls'].includes(finish))
      throw new Error('Incomplete model response');
    const toolCalls = [...calls.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, call]) => call);
    if (
      finish === 'tool_calls' &&
      (!toolCalls.length ||
        toolCalls.some((call) => !call.id || !call.function.name))
    )
      throw new Error('Invalid tool call');
    if (finish === 'stop' && (toolCalls.length || !content.trim()))
      throw new Error('Incomplete model response');
    return { content, toolCalls };
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
