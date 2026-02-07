import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Engineering Department', description: 'Organization name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'ENG',
    description: 'Unique code within the tenant',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Code must be uppercase alphanumeric with underscores or hyphens',
  })
  code!: string;

  @ApiPropertyOptional({
    example: 'Responsible for all engineering activities',
    description: 'Organization description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 'clx1234567890',
    description: 'Parent organization ID for hierarchy',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
