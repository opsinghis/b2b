import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Req,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@core/auth';
import { PrismaService } from '@infrastructure/database';
import { WebhookReceiverService } from './services';
import { JsonPathMapperService } from './services';
import { WebhookConfig } from './interfaces';

/**
 * REST Connector Controller
 * Handles webhook callbacks and connector operations
 */
@ApiTags('Integrations - REST Connector')
@Controller('api/v1/integrations/webhooks')
export class RestConnectorController {
  private readonly logger = new Logger(RestConnectorController.name);
  private readonly webhookReceiverService: WebhookReceiverService;

  constructor(private readonly prisma: PrismaService) {
    // Initialize webhook receiver
    const jsonPathMapper = new JsonPathMapperService();
    this.webhookReceiverService = new WebhookReceiverService(jsonPathMapper);
  }

  /**
   * Receive webhook callback
   * Public endpoint - authentication via signature validation
   */
  @Post(':configId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive webhook callback',
    description: 'Receives and processes incoming webhook payloads. Authentication is done via signature validation.',
  })
  @ApiParam({ name: 'configId', description: 'Connector configuration ID' })
  @ApiHeader({ name: 'x-signature', description: 'Webhook signature', required: false })
  @ApiHeader({ name: 'x-timestamp', description: 'Webhook timestamp', required: false })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload or signature' })
  @ApiResponse({ status: 404, description: 'Connector configuration not found' })
  async receiveWebhook(
    @Param('configId') configId: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    this.logger.log(`Received webhook for config ${configId}`);

    try {
      // Get connector configuration with connector relation
      const config = await this.prisma.connectorConfig.findUnique({
        where: { id: configId },
        include: { connector: true },
      });

      if (!config) {
        throw new NotFoundException(`Connector configuration not found: ${configId}`);
      }

      // Get webhook config from connector config
      const configData = config.config as Record<string, unknown> | null;
      const webhookConfig = configData?.webhook as WebhookConfig | undefined;

      if (!webhookConfig?.enabled) {
        throw new BadRequestException('Webhooks are not enabled for this connector');
      }

      // Get raw body for signature validation
      const rawBody = request.rawBody?.toString('utf-8') || JSON.stringify(body);

      // Process webhook
      const result = await this.webhookReceiverService.processWebhook(
        webhookConfig,
        config.tenantId,
        configId,
        config.connector.code,
        rawBody,
        this.normalizeHeaders(headers),
      );

      if (!result.valid) {
        this.logger.warn(`Webhook validation failed for config ${configId}: ${result.error}`);
        return {
          success: false,
          error: result.error,
        };
      }

      this.logger.log(`Webhook processed successfully: ${result.event?.id}`);

      return {
        success: true,
        eventId: result.event?.id,
      };
    } catch (error) {
      this.logger.error(`Webhook processing failed for config ${configId}:`, error);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Receive webhook with custom path
   * Supports paths like /webhooks/:configId/:path
   */
  @Post(':configId/*')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive webhook with custom path',
    description: 'Receives webhooks with custom sub-paths',
  })
  async receiveWebhookWithPath(
    @Param('configId') configId: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    // Delegate to main webhook handler
    return this.receiveWebhook(configId, body, headers, request);
  }

  /**
   * Normalize headers to lowercase keys
   */
  private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        normalized[key.toLowerCase()] = value;
      }
    }
    return normalized;
  }
}
