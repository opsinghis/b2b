import { Injectable, Logger } from '@nestjs/common';
import {
  SapConnectionConfig,
  SapCredentials,
  SapODataServicePaths,
  SapAtpCheckRequest,
  SapAtpCheckResponse,
  SapAtpScheduleLine,
  SapConnectorResult,
} from '../interfaces';
import { SapODataClientService } from './sap-odata-client.service';

/**
 * ATP check scope
 */
export enum SapAtpCheckScope {
  PLANT = '01',
  STORAGE_LOCATION = '02',
  CUSTOMER = '03',
}

/**
 * ATP confirmation type
 */
export enum SapAtpConfirmationType {
  DELIVERY_DATE = 'D',
  QUANTITY = 'Q',
  BOTH = 'B',
}

/**
 * SAP ATP (Available-to-Promise) Service
 * Handles inventory availability checks
 */
@Injectable()
export class SapAtpService {
  private readonly logger = new Logger(SapAtpService.name);
  private readonly servicePath = SapODataServicePaths.ATP_CHECK;

  constructor(private readonly odataClient: SapODataClientService) {}

  /**
   * Check ATP for a single material
   */
  async checkAvailability(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    request: SapAtpCheckRequest,
  ): Promise<SapConnectorResult<SapAtpCheckResponse>> {
    this.logger.log(`Checking ATP for material: ${request.Material}, plant: ${request.Plant}`);

    // SAP ATP check is typically done via a function import
    const atpRequestData = this.buildAtpRequest(request);

    const result = await this.odataClient.post<any>(
      config,
      credentials,
      this.servicePath,
      'CheckMaterialAvailability',
      atpRequestData,
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        metadata: result.metadata,
      };
    }

    const atpResponse = this.mapAtpResponse(request, result.data);

    return {
      success: true,
      data: atpResponse,
      metadata: result.metadata,
    };
  }

  /**
   * Check ATP for multiple materials (batch)
   */
  async checkAvailabilityBatch(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    requests: SapAtpCheckRequest[],
  ): Promise<SapConnectorResult<SapAtpCheckResponse[]>> {
    this.logger.log(`Checking ATP for ${requests.length} materials`);

    const results: SapAtpCheckResponse[] = [];
    const errors: string[] = [];

    // Process in parallel with limited concurrency
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((req) => this.checkAvailability(config, credentials, req)),
      );

      for (const result of batchResults) {
        if (result.success && result.data) {
          results.push(result.data);
        } else {
          errors.push(result.error?.message || 'Unknown error');
        }
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return {
        success: false,
        error: {
          code: 'ATP_BATCH_FAILED',
          message: `All ATP checks failed: ${errors.join(', ')}`,
          retryable: true,
        },
      };
    }

    return {
      success: true,
      data: results,
      metadata: {
        requestId: '',
        durationMs: 0,
      },
    };
  }

  /**
   * Get stock level for material/plant
   * Uses Product API to get warehouse stock
   */
  async getStockLevel(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    material: string,
    plant: string,
    storageLocation?: string,
  ): Promise<
    SapConnectorResult<{
      material: string;
      plant: string;
      storageLocation?: string;
      totalStock: number;
      availableStock: number;
      reservedStock: number;
      blockedStock: number;
      qualityInspectionStock: number;
      unit: string;
    }>
  > {
    this.logger.log(`Getting stock level for material: ${material}, plant: ${plant}`);

    // SAP stock data is typically retrieved via A_MaterialStock or custom API
    // This is a simplified implementation using Plant Segment API
    const entitySet = 'A_MaterialStock';
    let key: Record<string, string> = {
      Material: material,
      Plant: plant,
    };

    if (storageLocation) {
      key = {
        ...key,
        StorageLocation: storageLocation,
      };
    }

    const result = await this.odataClient.getByKey<any>(
      config,
      credentials,
      '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV',
      entitySet,
      key,
    );

    if (!result.success || !result.data) {
      // If specific API not available, return simulated data
      // In production, handle this appropriately
      return {
        success: true,
        data: {
          material,
          plant,
          storageLocation,
          totalStock: 0,
          availableStock: 0,
          reservedStock: 0,
          blockedStock: 0,
          qualityInspectionStock: 0,
          unit: 'EA',
        },
        metadata: result.metadata,
      };
    }

    const stockData = result.data;

    return {
      success: true,
      data: {
        material,
        plant,
        storageLocation,
        totalStock: parseFloat(stockData.TotalStock || '0'),
        availableStock: parseFloat(stockData.AvailableStock || '0'),
        reservedStock: parseFloat(stockData.ReservedStock || '0'),
        blockedStock: parseFloat(stockData.BlockedStock || '0'),
        qualityInspectionStock: parseFloat(stockData.QualityInspectionStock || '0'),
        unit: stockData.MaterialBaseUnit || 'EA',
      },
      metadata: result.metadata,
    };
  }

  /**
   * Check if quantity is available on a specific date
   */
  async isAvailableOnDate(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    material: string,
    plant: string,
    quantity: number,
    unit: string,
    requestedDate: Date,
  ): Promise<
    SapConnectorResult<{
      isAvailable: boolean;
      requestedQuantity: number;
      availableQuantity: number;
      requestedDate: string;
      confirmedDate?: string;
      partiallyAvailable: boolean;
    }>
  > {
    this.logger.log(
      `Checking availability for ${quantity} ${unit} of ${material} on ${requestedDate.toISOString()}`,
    );

    const atpResult = await this.checkAvailability(config, credentials, {
      Material: material,
      Plant: plant,
      RequestedQuantity: quantity,
      RequestedQuantityUnit: unit,
      RequestedDeliveryDate: requestedDate.toISOString().split('T')[0],
    });

    if (!atpResult.success || !atpResult.data) {
      return {
        success: false,
        error: atpResult.error,
        metadata: atpResult.metadata,
      };
    }

    const atp = atpResult.data;
    const isFullyAvailable = atp.ConfirmedQuantity >= quantity;
    const isPartiallyAvailable = atp.ConfirmedQuantity > 0 && atp.ConfirmedQuantity < quantity;

    return {
      success: true,
      data: {
        isAvailable: isFullyAvailable,
        requestedQuantity: quantity,
        availableQuantity: atp.ConfirmedQuantity,
        requestedDate: requestedDate.toISOString().split('T')[0],
        confirmedDate: atp.AvailabilityDate,
        partiallyAvailable: isPartiallyAvailable,
      },
      metadata: atpResult.metadata,
    };
  }

  /**
   * Get available dates for a quantity
   */
  async getAvailableDates(
    config: SapConnectionConfig,
    credentials: SapCredentials,
    material: string,
    plant: string,
    quantity: number,
    unit: string,
    fromDate: Date,
    toDate: Date,
    options?: {
      maxResults?: number;
    },
  ): Promise<
    SapConnectorResult<
      Array<{
        date: string;
        availableQuantity: number;
        unit: string;
      }>
    >
  > {
    this.logger.log(
      `Getting available dates for ${material} between ${fromDate.toISOString()} and ${toDate.toISOString()}`,
    );

    const results: Array<{
      date: string;
      availableQuantity: number;
      unit: string;
    }> = [];

    // Check availability at weekly intervals
    const checkDates: Date[] = [];
    const currentDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const maxResults = options?.maxResults || 10;

    while (currentDate <= endDate && checkDates.length < maxResults * 2) {
      checkDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7); // Weekly intervals
    }

    for (const checkDate of checkDates) {
      if (results.length >= maxResults) break;

      const atpResult = await this.checkAvailability(config, credentials, {
        Material: material,
        Plant: plant,
        RequestedQuantity: quantity,
        RequestedQuantityUnit: unit,
        RequestedDeliveryDate: checkDate.toISOString().split('T')[0],
      });

      if (atpResult.success && atpResult.data && atpResult.data.ConfirmedQuantity >= quantity) {
        results.push({
          date: atpResult.data.AvailabilityDate,
          availableQuantity: atpResult.data.ConfirmedQuantity,
          unit: atpResult.data.QuantityUnit,
        });
      }
    }

    return {
      success: true,
      data: results,
      metadata: {
        requestId: '',
        durationMs: 0,
      },
    };
  }

  /**
   * Build ATP request in SAP format
   */
  private buildAtpRequest(request: SapAtpCheckRequest): Record<string, unknown> {
    return {
      Material: request.Material,
      Plant: request.Plant,
      RequestedQuantity: request.RequestedQuantity.toString(),
      RequestedQuantityUnit: request.RequestedQuantityUnit,
      RequestedDeliveryDate: request.RequestedDeliveryDate,
      ...(request.Customer && { Customer: request.Customer }),
      ...(request.SalesOrganization && { SalesOrganization: request.SalesOrganization }),
      ...(request.DistributionChannel && { DistributionChannel: request.DistributionChannel }),
    };
  }

  /**
   * Map SAP ATP response to our format
   */
  private mapAtpResponse(request: SapAtpCheckRequest, sapResponse: any): SapAtpCheckResponse {
    const confirmedQuantity = parseFloat(sapResponse.ConfirmedQuantity || '0');
    const availableQuantity = parseFloat(sapResponse.AvailableQuantity || '0');

    const scheduleLines: SapAtpScheduleLine[] = [];
    if (sapResponse.to_ScheduleLine) {
      for (const line of sapResponse.to_ScheduleLine) {
        scheduleLines.push({
          ScheduleLine: line.ScheduleLine || '',
          DeliveryDate: line.DeliveryDate || '',
          ConfirmedQuantity: parseFloat(line.ConfirmedQuantity || '0'),
          QuantityUnit: line.QuantityUnit || request.RequestedQuantityUnit,
        });
      }
    }

    return {
      Material: request.Material,
      Plant: request.Plant,
      AvailableQuantity: availableQuantity,
      QuantityUnit: sapResponse.QuantityUnit || request.RequestedQuantityUnit,
      AvailabilityDate: sapResponse.AvailabilityDate || request.RequestedDeliveryDate,
      IsAvailable: confirmedQuantity >= request.RequestedQuantity,
      ConfirmedQuantity: confirmedQuantity,
      ScheduleLines: scheduleLines.length > 0 ? scheduleLines : undefined,
    };
  }
}
