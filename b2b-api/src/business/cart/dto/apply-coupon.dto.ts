import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ApplyCouponDto {
  @ApiProperty({
    description: 'Coupon code to apply',
    example: 'SAVE20',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  couponCode!: string;
}
