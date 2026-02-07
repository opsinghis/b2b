import { IsString, IsObject, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteToolDto {
  @ApiProperty({ description: 'Name of the tool to execute' })
  @IsString()
  toolName!: string;

  @ApiPropertyOptional({ description: 'Parameters for the tool' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Execution context' })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Whether to run asynchronously' })
  @IsOptional()
  @IsBoolean()
  async?: boolean;
}

export class ExecuteMultipleToolsDto {
  @ApiProperty({ type: [ExecuteToolDto] })
  @ValidateNested({ each: true })
  @Type(() => ExecuteToolDto)
  tools!: ExecuteToolDto[];

  @ApiPropertyOptional({ description: 'Whether to run tools in parallel' })
  @IsOptional()
  @IsBoolean()
  parallel?: boolean;

  @ApiPropertyOptional({ description: 'Stop on first error' })
  @IsOptional()
  @IsBoolean()
  stopOnError?: boolean;
}
