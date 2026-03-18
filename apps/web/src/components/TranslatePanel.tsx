import { useState } from 'react';
import { Direction, DIRECTION_LABELS } from '../types/translate';
import { useStreamTranslate } from '../hooks/useStreamTranslate';
import { DirectionSelector } from './DirectionSelector';
import { InputArea } from './InputArea';
import { OutputArea } from './OutputArea';

const PLACEHOLDERS: Record<Direction, string> = {
  PM_TO_DEV: '输入产品需求描述...\n例如：我们需要一个智能推荐功能，提升用户停留时长。',
  DEV_TO_PM: '输入技术方案或技术结论...\n例如：我们优化了数据库查询，QPS 提升了 30%。',
  AUTO: '输入需求描述或技术方案，系统将自动识别...',
};

export function TranslatePanel() {
  const [direction, setDirection] = useState<Direction>('PM_TO_DEV');
  const [content, setContent] = useState('');
  const { output, isStreaming, error, translate, stop } = useStreamTranslate();

  const handleSubmit = () => {
    if (!content.trim() || isStreaming) return;
    translate({ content, direction });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-5">
      {/* 方向选择 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">翻译方向</span>
        <DirectionSelector value={direction} onChange={setDirection} />
      </div>

      {/* 输入区 */}
      <div onKeyDown={handleKeyDown}>
        <InputArea
          value={content}
          onChange={setContent}
          placeholder={PLACEHOLDERS[direction]}
          disabled={isStreaming}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">⌘ + Enter 快速翻译</span>
        <div className="flex gap-2">
          {isStreaming && (
            <button
              onClick={stop}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              停止
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isStreaming}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isStreaming ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                翻译中...
              </span>
            ) : (
              `翻译为${direction === 'PM_TO_DEV' ? '开发' : direction === 'DEV_TO_PM' ? '产品' : '对方'}语言`
            )}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 翻译结果 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {output || isStreaming
              ? `翻译结果（${direction === 'PM_TO_DEV' ? '产品 → 开发' : direction === 'DEV_TO_PM' ? '开发 → 产品' : DIRECTION_LABELS[direction]}）`
              : '翻译结果'}
          </span>
        </div>
        <OutputArea content={output} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
