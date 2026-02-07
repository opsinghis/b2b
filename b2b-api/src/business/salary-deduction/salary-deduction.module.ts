import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/database';
import { AuthorizationModule } from '@core/authorization';
import { SalaryDeductionService } from './salary-deduction.service';
import {
  SalaryDeductionController,
  AdminSalaryDeductionController,
} from './salary-deduction.controller';

@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [SalaryDeductionController, AdminSalaryDeductionController],
  providers: [SalaryDeductionService],
  exports: [SalaryDeductionService],
})
export class SalaryDeductionModule {}
