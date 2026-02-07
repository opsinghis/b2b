import { ApiProperty } from '@nestjs/swagger';

export class ContractKpis {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty()
  pendingApproval!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  expired!: number;

  @ApiProperty()
  expiringThisMonth!: number;
}

export class QuoteKpis {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty()
  pendingApproval!: number;

  @ApiProperty()
  approved!: number;

  @ApiProperty()
  converted!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty()
  conversionRate!: number;
}

export class FinancialKpis {
  @ApiProperty()
  totalContractValue!: number;

  @ApiProperty()
  totalQuoteValue!: number;

  @ApiProperty()
  pendingApprovalValue!: number;

  @ApiProperty()
  currency!: string;
}

export class RecentActivity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty()
  entityName!: string;

  @ApiProperty()
  timestamp!: Date;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  userName!: string;
}

export class KpiResponseDto {
  @ApiProperty()
  contracts!: ContractKpis;

  @ApiProperty()
  quotes!: QuoteKpis;

  @ApiProperty()
  financial!: FinancialKpis;

  @ApiProperty({ type: [RecentActivity] })
  recentActivity!: RecentActivity[];

  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  cachedUntil!: Date;
}
