import { Injectable, Logger } from '@nestjs/common';
import {
  O2CFlowConfig,
  O2CFlowFeatures,
  O2CStepConfig,
  O2CFlowSettings,
  O2CWebhookConfig,
  O2CStepType,
  DEFAULT_O2C_FLOW_CONFIG,
  RetryPolicyConfig,
} from '../interfaces';

/**
 * Service for managing O2C flow configurations per tenant
 */
@Injectable()
export class O2CFlowConfigService {
  private readonly logger = new Logger(O2CFlowConfigService.name);

  // In-memory storage for configurations (replace with DB in production)
  private readonly configs = new Map<string, O2CFlowConfig>();

  /**
   * Get configuration for a tenant
   */
  async getConfig(tenantId: string, configId?: string): Promise<O2CFlowConfig> {
    const key = configId || tenantId;
    let config = this.configs.get(key);

    if (!config) {
      // Return default config with tenant ID
      config = this.createDefaultConfig(tenantId);
      this.configs.set(tenantId, config);
    }

    return config;
  }

  /**
   * Create or update configuration for a tenant
   */
  async saveConfig(tenantId: string, config: Partial<O2CFlowConfig>): Promise<O2CFlowConfig> {
    const existing = await this.getConfig(tenantId);
    const updated: O2CFlowConfig = {
      ...existing,
      ...config,
      tenantId,
      updatedAt: new Date(),
    };

    this.configs.set(tenantId, updated);
    this.logger.log(`Saved O2C config for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Update specific features for a tenant
   */
  async updateFeatures(
    tenantId: string,
    features: Partial<O2CFlowFeatures>,
  ): Promise<O2CFlowConfig> {
    const config = await this.getConfig(tenantId);
    config.features = { ...config.features, ...features };
    config.updatedAt = new Date();

    this.configs.set(tenantId, config);
    return config;
  }

  /**
   * Update specific step configuration
   */
  async updateStepConfig(
    tenantId: string,
    stepType: O2CStepType,
    stepConfig: Partial<O2CStepConfig>,
  ): Promise<O2CFlowConfig> {
    const config = await this.getConfig(tenantId);
    const stepIndex = config.steps.findIndex((s) => s.stepType === stepType);

    if (stepIndex === -1) {
      throw new Error(`Step ${stepType} not found in configuration`);
    }

    config.steps[stepIndex] = { ...config.steps[stepIndex], ...stepConfig };
    config.updatedAt = new Date();

    this.configs.set(tenantId, config);
    return config;
  }

  /**
   * Enable or disable a step
   */
  async setStepEnabled(
    tenantId: string,
    stepType: O2CStepType,
    enabled: boolean,
  ): Promise<O2CFlowConfig> {
    return this.updateStepConfig(tenantId, stepType, { enabled });
  }

  /**
   * Set step retry policy
   */
  async setStepRetryPolicy(
    tenantId: string,
    stepType: O2CStepType,
    retryPolicy: RetryPolicyConfig,
  ): Promise<O2CFlowConfig> {
    return this.updateStepConfig(tenantId, stepType, { retryPolicy });
  }

  /**
   * Update flow settings
   */
  async updateSettings(
    tenantId: string,
    settings: Partial<O2CFlowSettings>,
  ): Promise<O2CFlowConfig> {
    const config = await this.getConfig(tenantId);
    config.settings = { ...config.settings, ...settings };
    config.updatedAt = new Date();

    this.configs.set(tenantId, config);
    return config;
  }

  /**
   * Update webhook configuration
   */
  async updateWebhooks(
    tenantId: string,
    webhooks: Partial<O2CWebhookConfig>,
  ): Promise<O2CFlowConfig> {
    const config = await this.getConfig(tenantId);
    config.webhooks = { ...config.webhooks, ...webhooks };
    config.updatedAt = new Date();

    this.configs.set(tenantId, config);
    return config;
  }

  /**
   * Set connector IDs for integration
   */
  async setConnectors(
    tenantId: string,
    connectors: {
      erpConnectorId?: string;
      paymentConnectorId?: string;
      shippingConnectorId?: string;
      invoicingConnectorId?: string;
    },
  ): Promise<O2CFlowConfig> {
    const config = await this.getConfig(tenantId);

    if (connectors.erpConnectorId !== undefined) {
      config.erpConnectorId = connectors.erpConnectorId;
    }
    if (connectors.paymentConnectorId !== undefined) {
      config.paymentConnectorId = connectors.paymentConnectorId;
    }
    if (connectors.shippingConnectorId !== undefined) {
      config.shippingConnectorId = connectors.shippingConnectorId;
    }
    if (connectors.invoicingConnectorId !== undefined) {
      config.invoicingConnectorId = connectors.invoicingConnectorId;
    }

    config.updatedAt = new Date();
    this.configs.set(tenantId, config);

    return config;
  }

  /**
   * Enable or disable the entire flow for a tenant
   */
  async setEnabled(tenantId: string, enabled: boolean): Promise<O2CFlowConfig> {
    const config = await this.getConfig(tenantId);
    config.enabled = enabled;
    config.updatedAt = new Date();

    this.configs.set(tenantId, config);
    this.logger.log(`O2C flow ${enabled ? 'enabled' : 'disabled'} for tenant ${tenantId}`);

    return config;
  }

  /**
   * Delete configuration for a tenant
   */
  async deleteConfig(tenantId: string): Promise<void> {
    this.configs.delete(tenantId);
    this.logger.log(`Deleted O2C config for tenant ${tenantId}`);
  }

  /**
   * List all configurations (admin)
   */
  async listConfigs(): Promise<O2CFlowConfig[]> {
    return Array.from(this.configs.values());
  }

  /**
   * Validate configuration
   */
  validateConfig(config: O2CFlowConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.tenantId) {
      errors.push('tenantId is required');
    }

    if (!config.name) {
      errors.push('name is required');
    }

    if (!config.steps || config.steps.length === 0) {
      errors.push('At least one step must be configured');
    }

    // Check for duplicate step orders
    const orders = config.steps.map((s) => s.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      errors.push('Step orders must be unique');
    }

    // Validate settings
    if (config.settings) {
      if (config.settings.defaultTimeoutMs < 1000) {
        errors.push('defaultTimeoutMs must be at least 1000ms');
      }
      if (config.settings.maxConcurrentFlows < 1) {
        errors.push('maxConcurrentFlows must be at least 1');
      }
    }

    // Validate approval threshold
    if (config.features?.requireApprovalAboveThreshold) {
      if (
        config.features.approvalThresholdAmount === undefined ||
        config.features.approvalThresholdAmount < 0
      ) {
        errors.push(
          'approvalThresholdAmount must be set when requireApprovalAboveThreshold is enabled',
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create default configuration for a tenant
   */
  private createDefaultConfig(tenantId: string): O2CFlowConfig {
    const now = new Date();
    return {
      ...DEFAULT_O2C_FLOW_CONFIG,
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
  }
}
