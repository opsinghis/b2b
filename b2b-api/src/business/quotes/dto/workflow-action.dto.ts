import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsNumber, Min } from 'class-validator';

export class QuoteWorkflowActionDto {
  @ApiPropertyOptional({
    example: 'Approved after customer review',
    description: 'Comments for the workflow action',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}

export class QuoteApprovalThresholdDto {
  @ApiPropertyOptional({
    example: 'Approved with manager override',
    description: 'Comments for the approval',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Override approval threshold (for admins only)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overrideThreshold?: number;
}
