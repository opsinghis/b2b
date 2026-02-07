import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WorkflowActionDto {
  @ApiPropertyOptional({
    example: 'Approved after legal review',
    description: 'Comments for the workflow action',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}
