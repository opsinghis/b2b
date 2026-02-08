import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@infrastructure/database';

// Services
import {
  P2PService,
  P2PFlowOrchestratorService,
  P2PFlowConfigService,
  P2PFlowLogService,
  P2PEventHandlerService,
} from './services';

// Step handlers
import {
  P2PPOReceiptStep,
  P2PPOValidationStep,
  P2PPOAcknowledgmentStep,
  P2PGoodsReceiptStep,
  P2PInvoiceCreationStep,
  P2PThreeWayMatchStep,
  P2PInvoiceSubmissionStep,
  P2PPaymentTrackingStep,
  P2PFlowCompletionStep,
} from './services/steps';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    // Core services
    P2PService,
    P2PFlowOrchestratorService,
    P2PFlowConfigService,
    P2PFlowLogService,
    P2PEventHandlerService,

    // Step handlers
    P2PPOReceiptStep,
    P2PPOValidationStep,
    P2PPOAcknowledgmentStep,
    P2PGoodsReceiptStep,
    P2PInvoiceCreationStep,
    P2PThreeWayMatchStep,
    P2PInvoiceSubmissionStep,
    P2PPaymentTrackingStep,
    P2PFlowCompletionStep,
  ],
  exports: [
    P2PService,
    P2PFlowOrchestratorService,
    P2PFlowConfigService,
    P2PFlowLogService,
    P2PEventHandlerService,
  ],
})
export class P2PModule {}
