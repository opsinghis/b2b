import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToolParameterDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['string', 'number', 'boolean', 'object', 'array'] })
  type!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  required?: boolean;

  @ApiPropertyOptional({ type: [String] })
  enum?: string[];

  @ApiPropertyOptional()
  default?: unknown;
}

export class ToolExampleDto {
  @ApiProperty()
  input!: Record<string, unknown>;

  @ApiProperty()
  output!: string;
}

export class ToolResponseDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ type: [ToolParameterDto] })
  parameters!: ToolParameterDto[];

  @ApiPropertyOptional({ type: [String] })
  permissions?: string[];

  @ApiPropertyOptional({ type: [ToolExampleDto] })
  examples?: ToolExampleDto[];

  @ApiProperty()
  handler!: string;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  path!: string;
}

export class ToolsListResponseDto {
  @ApiProperty({ type: [ToolResponseDto] })
  tools!: ToolResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiPropertyOptional({ type: [String] })
  categories?: string[];
}
