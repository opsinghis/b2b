import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IO2CStepHandler,
  O2CStepType,
  O2CFlowInstance,
  O2CStepConfig,
  O2CStepContext,
  O2CStepResult,
} from '../../interfaces';

/**
 * Inventory Reservation Step - Reserves inventory for order items
 */
@Injectable()
export class O2CInventoryReservationStep implements IO2CStepHandler {
  readonly stepType = O2CStepType.INVENTORY_RESERVATION;
  private readonly logger = new Logger(O2CInventoryReservationStep.name);

  async execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult> {
    this.logger.log(`Executing inventory reservation for order ${flow.orderNumber}`);

    try {
      const items = flow.orderData.items;
      const reservations: Array<{
        sku: string;
        quantity: number;
        reservationId: string;
        status: string;
      }> = [];

      // Reserve inventory for each item
      for (const item of items) {
        const reservation = await this.reserveInventory(
          item.sku,
          item.quantity,
          flow.orderId,
          context,
        );
        reservations.push(reservation);

        if (reservation.status !== 'reserved') {
          return {
            success: false,
            error: `Failed to reserve inventory for ${item.sku}: ${reservation.status}`,
            errorCode: 'INVENTORY_RESERVATION_FAILED',
            retryable: reservation.status === 'unavailable' ? false : true,
          };
        }
      }

      return {
        success: true,
        output: {
          reservations,
          reservedAt: new Date().toISOString(),
          totalItemsReserved: items.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Inventory reservation failed: ${message}`);

      return {
        success: false,
        error: message,
        errorCode: 'INVENTORY_ERROR',
        retryable: true,
      };
    }
  }

  async validate(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean> {
    return flow.orderData?.items?.length > 0;
  }

  canRetry(error: string, attempt: number): boolean {
    // Don't retry if inventory is unavailable
    if (error.includes('unavailable')) {
      return false;
    }
    return attempt < 3;
  }

  private async reserveInventory(
    sku: string,
    quantity: number,
    orderId: string,
    context: O2CStepContext,
  ): Promise<{ sku: string; quantity: number; reservationId: string; status: string }> {
    // If connector configured, call external inventory system
    if (context.connectorContext) {
      return this.externalInventoryReservation(sku, quantity, orderId, context);
    }

    // Internal reservation simulation
    return this.internalInventoryReservation(sku, quantity, orderId);
  }

  private async internalInventoryReservation(
    sku: string,
    quantity: number,
    orderId: string,
  ): Promise<{ sku: string; quantity: number; reservationId: string; status: string }> {
    // Simulate inventory reservation
    const reservationId = `RES-${uuidv4().slice(0, 8)}`;

    this.logger.log(`Reserved ${quantity} units of ${sku} for order ${orderId}`);

    return {
      sku,
      quantity,
      reservationId,
      status: 'reserved',
    };
  }

  private async externalInventoryReservation(
    sku: string,
    quantity: number,
    orderId: string,
    context: O2CStepContext,
  ): Promise<{ sku: string; quantity: number; reservationId: string; status: string }> {
    // This would call external inventory service via connector
    this.logger.log(`Calling external inventory service for ${sku}`);

    const reservationId = `EXT-RES-${Date.now()}-${sku}`;

    return {
      sku,
      quantity,
      reservationId,
      status: 'reserved',
    };
  }
}
