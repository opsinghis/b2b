import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecutionResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  toolName!: string;

  @ApiPropertyOptional()
  result?: unknown;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  executionTime!: number;

  @ApiProperty()
  timestamp!: Date;
}

export class MultipleExecutionResultDto {
  @ApiProperty({ type: [ExecutionResultDto] })
  results!: ExecutionResultDto[];

  @ApiProperty()
  totalExecutionTime!: number;

  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  failureCount!: number;

  @ApiProperty()
  timestamp!: Date;
}

export class RateLimitInfoDto {
  @ApiProperty()
  remaining!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  resetAt!: Date;
}
