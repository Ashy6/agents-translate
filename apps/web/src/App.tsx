import { TranslatePanel } from './components/TranslatePanel';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">沟通翻译助手</h1>
          <p className="mt-2 text-sm text-gray-500">
            帮助产品经理与开发工程师更好地相互理解
          </p>
        </div>

        {/* 主面板 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <TranslatePanel />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          翻译结果由 AI 生成，请结合实际情况判断
        </p>
      </div>
    </div>
  );
}
