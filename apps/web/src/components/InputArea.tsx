interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export function InputArea({ value, onChange, placeholder, disabled }: Props) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={6}
        className="w-full resize-none rounded-xl border border-gray-200 bg-white p-4 text-gray-800 text-sm leading-relaxed shadow-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
      />
      <span className="absolute bottom-3 right-3 text-xs text-gray-400">
        {value.length} / 2000
      </span>
    </div>
  );
}
