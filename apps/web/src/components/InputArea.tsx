interface Props {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder: string;
  disabled?: boolean;
}

export function InputArea({ value, onChange, onClear, placeholder, disabled }: Props) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={6}
        className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 pr-8 text-gray-800 text-sm leading-relaxed shadow-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
      />
      {value && !disabled && (
        <button
          onClick={onClear}
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
          aria-label="清空"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          </svg>
        </button>
      )}
      <span className="absolute bottom-3 right-3 text-xs text-gray-400">
        {value.length} / 2000
      </span>
    </div>
  );
}
