import { useState, useRef, useCallback } from 'react';
import { TranslateParams } from '../types/translate';

export function useStreamTranslate() {
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const stop = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setIsStreaming(false);
  }, []);

  const translate = useCallback((params: TranslateParams) => {
    esRef.current?.close();
    setOutput('');
    setError(null);
    setIsStreaming(true);

    const qs = new URLSearchParams({
      content: params.content,
      direction: params.direction,
      ...(params.context ? { context: params.context } : {}),
    });

    const apiBase = import.meta.env.VITE_API_BASE || '';
    const es = new EventSource(`${apiBase}/api/translate/stream?${qs}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as { token?: string; done?: boolean; error?: string };

      if (data.error) {
        setError(data.error);
        setIsStreaming(false);
        es.close();
        return;
      }

      if (data.done) {
        setIsStreaming(false);
        es.close();
        return;
      }

      if (data.token) {
        setOutput((prev) => prev + data.token);
      }
    };

    es.onerror = () => {
      setError('连接失败，请检查后端服务是否启动');
      setIsStreaming(false);
      es.close();
    };
  }, []);

  return { output, isStreaming, error, translate, stop };
}
