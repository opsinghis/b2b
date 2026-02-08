import { Injectable, Logger } from '@nestjs/common';
import {
  P2PFlowConfig,
  P2PFlowFeatures,
  P2PStepConfig,
  P2PFlowSettings,
  P2PStepType,
  MatchTolerances,
  DEFAULT_P2P_FLOW_CONFIG,
  RetryPolicyConfig,
} from '../interfaces';

/**
 * Service for managing P2P flow configurations per tenant
 */
@Injectable()
export class P2PFlowConfigService {
  private readonly logger = new Logger(P2PFlowConfigService.name);

  // In-memory storage for configurations (replace with DB in production)
  private readonly configs = new Map<string, P2PFlowConfig>();

  /**
   * Get configuration for a tenant
   */
  async getConfig(tenantId: string, configId?: string): Promise<P2PFlowConfig> {
    const key = configId || tenantId;
    let config = this.configs.get(key);

    if (!config) {
      config = this.createDefaultConfig(tenantId);
      this.configs.set(tenantId, config);
    }

    return config;
  }

  /**
   * Create or update configuration for a tenant
   */
  async saveConfig(tenantId: string, config: Partial<P2PFlowConfig>): Promise<P2PFlowConfig> {
    const existing = await this.getConfig(tenantId);
    const updated: P2PFlowConfig = {
      ...existing,
      ...config,
      tenantId,
      updatedAt: new Date(),
    };

    this.configs.set(tenantId, updated);
    this.logger.log(`Saved P2P config for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Update specific features for a tenant
   */
  async updateFeatures(
    tenantId: string,
    features: Partial<P2PFlowFeatures>,
  ): Promise<P2PFlowConfig> {
    const config = await this.getConfig(tenantId);
    config.features = { ...config.features, ...features };
    config.updatedAt = new Date();

    this.configs.set(tenantId, config);
    return config;
  }

  /**
   * Update match tolerances
   */
  async updateMatchTolerances(
    tenantId: string,
    tolerances: Partial<MatchTolerances>,
  ): Promise<P2PFlowConfig> {
    const config = await this.getConfig(tenantId);
    config.matchTolerances = { ...config.matchTolerances, ...tolerances };
    config.updatedAt = new Date();

    this.configs.set(tenantId, config);
    return config;
  }

  /**
   * Update specific step configuration
   */
  async updateStepConfig(
    tenantId: string,
    stepType: P2PStepType,
    stepConfig: Partial<P2PStepConfig>,
  ): Promise<P2PFlowConfig> {
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
    stepType: P2PStepType,
    enabled: boolean,
  ): Promise<P2PFlowConfig> {
    return this.updateStepConfig(tenantId, stepType, { enabled });
  }

  /**
   * Set step retry policy
   */
  async setStepRetryPolicy(
    tenantId: string,
    stepType: P2PStepType,
    retryPolicy: RetryPolicyConfig,
  ): Promise<P2PFlowConfig> {
    return this.updateStepConfig(tenantId, stepType, { retryPolicy });
  }

  /**
   * Update flow settings
   */
  async updateSettings(
    tenantId: string,
    settings: Partial<P2PFlowSettings>,
  ): Promise<P2PFlowConfig> {
    const config = await this.getConfig(tenantId);
    config.settings = { ...config.settings, ...settings };
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
      apConnectorId?: string;
      bankingConnectorId?: string;
    },
  ): Promise<P2PFlowConfig> {
    const config = await this.getConfig(tenantId);

    if (connectors.erpConnectorId !== undefined) {
      config.erpConnectorId = connectors.erpConnectorId;
    }
    if (connectors.apConnectorId !== undefined) {
      config.apConnectorId = connectors.apConnectorId;
    }
    if (connectors.bankingConnectorId !== undefined) {
      config.bankingConnectorId = connectors.bankingConnectorId;
    }

    config.updatedAt = new Date();
    this.configs.set(tenantId, config);

    return config;
  }

  /**
   * Enable or disable the entire flow for a tenant
   */
  async setEnabled(tenantId: string, enabled: boolean): Promise<P2PFlowConfig> {
    const config = await this.getConfig(tenantId);
    config.enabled = enabled;
    config.updatedAt = new Date();

    this.configs.set(tenantId, config);
    this.logger.log(`P2P flow ${enabled ? 'enabled' : 'disabled'} for tenant ${tenantId}`);

    return config;
  }

  /**
   * Delete configuration for a tenant
   */
  async deleteConfig(tenantId: string): Promise<void> {
    this.configs.delete(tenantId);
    this.logger.log(`Deleted P2P config for tenant ${tenantId}`);
  }

  /**
   * Validate configuration
   */
  validateConfig(config: P2PFlowConfig): { valid: boolean; errors: string[] } {
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

    // Validate match tolerances
    if (config.matchTolerances) {
      if (
        config.matchTolerances.quantityTolerancePercent < 0 ||
        config.matchTolerances.quantityTolerancePercent > 100
      ) {
        errors.push('quantityTolerancePercent must be between 0 and 100');
      }
      if (
        config.matchTolerances.priceTolerancePercent < 0 ||
        config.matchTolerances.priceTolerancePercent > 100
      ) {
        errors.push('priceTolerancePercent must be between 0 and 100');
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
  private createDefaultConfig(tenantId: string): P2PFlowConfig {
    const now = new Date();
    return {
      ...DEFAULT_P2P_FLOW_CONFIG,
      tenantId,
      createdAt: now,
      updatedAt: now,
    };
  }
}
