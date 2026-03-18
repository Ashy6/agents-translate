import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  isStreaming: boolean;
}

export function OutputArea({ content, isStreaming }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!content && !isStreaming) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
        翻译结果将在这里显示
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="markdown-output min-h-32 space-y-2 p-5 text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        {isStreaming && (
          <span className="inline-block h-4 w-0.5 animate-pulse bg-blue-500 align-middle" />
        )}
      </div>

      {content && !isStreaming && (
        <div className="flex justify-end border-t border-gray-100 px-5 py-2">
          <button
            onClick={handleCopy}
            className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
          >
            {copied ? '已复制 ✓' : '复制'}
          </button>
        </div>
      )}
    </div>
  );
}
