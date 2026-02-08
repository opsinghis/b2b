import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@infrastructure/database';

// Services
import {
  O2CService,
  O2CFlowOrchestratorService,
  O2CFlowConfigService,
  O2CFlowLogService,
  O2CEventHandlerService,
} from './services';

// Step handlers
import {
  O2COrderSyncStep,
  O2CCreditCheckStep,
  O2COrderConfirmationStep,
  O2CInventoryReservationStep,
  O2CFulfillmentStep,
  O2CShipmentSyncStep,
  O2CAsnGenerationStep,
  O2CInvoiceGenerationStep,
  O2CInvoiceSyncStep,
  O2CPaymentProcessingStep,
  O2CPaymentStatusSyncStep,
  O2COrderCompletionStep,
} from './services/steps';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    // Core services
    O2CService,
    O2CFlowOrchestratorService,
    O2CFlowConfigService,
    O2CFlowLogService,
    O2CEventHandlerService,

    // Step handlers
    O2COrderSyncStep,
    O2CCreditCheckStep,
    O2COrderConfirmationStep,
    O2CInventoryReservationStep,
    O2CFulfillmentStep,
    O2CShipmentSyncStep,
    O2CAsnGenerationStep,
    O2CInvoiceGenerationStep,
    O2CInvoiceSyncStep,
    O2CPaymentProcessingStep,
    O2CPaymentStatusSyncStep,
    O2COrderCompletionStep,
  ],
  exports: [
    O2CService,
    O2CFlowOrchestratorService,
    O2CFlowConfigService,
    O2CFlowLogService,
    O2CEventHandlerService,
  ],
})
export class O2CModule {}
