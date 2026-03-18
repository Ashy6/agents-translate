import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export type Direction = 'PM_TO_DEV' | 'DEV_TO_PM' | 'AUTO';

export class TranslateDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsEnum(['PM_TO_DEV', 'DEV_TO_PM', 'AUTO'])
  direction: Direction;

  @IsOptional()
  @IsString()
  context?: string;
}
