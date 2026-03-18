import { Direction, DIRECTION_LABELS } from '../types/translate';

interface Props {
  value: Direction;
  onChange: (d: Direction) => void;
  disabled?: boolean;
}

const DIRECTIONS: Direction[] = ['PM_TO_DEV', 'DEV_TO_PM', 'AUTO'];

export function DirectionSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-2">
      {DIRECTIONS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          disabled={disabled}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            value === d
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {DIRECTION_LABELS[d]}
        </button>
      ))}
    </div>
  );
}
