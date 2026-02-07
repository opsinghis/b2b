import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;

  @ApiProperty()
  bucket!: string;

  @ApiProperty()
  key!: string;

  @ApiPropertyOptional()
  entityType?: string;

  @ApiPropertyOptional()
  entityId?: string;

  @ApiProperty()
  isPublic!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Signed URL for downloading the file' })
  downloadUrl?: string;
}

export class FileUploadResponseDto {
  @ApiProperty()
  file!: FileResponseDto;

  @ApiProperty()
  message!: string;
}

export class SignedUrlResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  expiresIn!: number;
}
