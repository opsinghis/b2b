import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateApprovalChainDto } from './create-approval-chain.dto';

export class UpdateApprovalChainDto extends PartialType(
  OmitType(CreateApprovalChainDto, ['entityType'] as const),
) {}
