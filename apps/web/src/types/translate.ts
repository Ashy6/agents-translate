export type Direction = 'PM_TO_DEV' | 'DEV_TO_PM' | 'AUTO';

export interface TranslateParams {
  content: string;
  direction: Direction;
  context?: string;
}

export const DIRECTION_LABELS: Record<Direction, string> = {
  PM_TO_DEV: '产品 → 开发',
  DEV_TO_PM: '开发 → 产品',
  AUTO: '自动识别',
};
