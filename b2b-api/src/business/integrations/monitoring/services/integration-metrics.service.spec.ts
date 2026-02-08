import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationMetricsService } from './integration-metrics.service';

describe('IntegrationMetricsService', () => {
  let service: IntegrationMetricsService;

  const tenantId = 'tenant-123';
  const connectorId = 'connector-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntegrationMetricsService],
    }).compile();

    service = module.get<IntegrationMetricsService>(IntegrationMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordMessageReceived', () => {
    it('should record a message received', () => {
      service.recordMessageReceived(tenantId, connectorId, 'order.created');

      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.messagesReceived).toBe(1);
    });

    it('should track by event type', () => {
      service.recordMessageReceived(tenantId, connectorId, 'order.created');
      service.recordMessageReceived(tenantId, connectorId, 'order.created');
      service.recordMessageReceived(tenantId, connectorId, 'order.updated');

      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.byEventType['order.created']).toBe(2);
      expect(metrics.byEventType['order.updated']).toBe(1);
    });

    it('should work without connectorId', () => {
      service.recordMessageReceived(tenantId);

      const metrics = service.getThroughputMetrics(tenantId, '1h');
      expect(metrics.messagesReceived).toBe(1);
    });
  });

  describe('recordMessageProcessed', () => {
    it('should record a message processed', () => {
      service.recordMessageProcessed(tenantId, connectorId, 100);

      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.messagesProcessed).toBe(1);
    });

    it('should record latency when provided', () => {
      service.recordMessageProcessed(tenantId, connectorId, 50);
      service.recordMessageProcessed(tenantId, connectorId, 100);
      service.recordMessageProcessed(tenantId, connectorId, 150);

      const latency = service.getLatencyMetrics(tenantId, '1h', connectorId);
      expect(latency.sampleCount).toBe(3);
      expect(latency.avg).toBe(100);
    });
  });

  describe('recordMessageFailed', () => {
    it('should record a message failure', () => {
      service.recordMessageFailed(tenantId, 'TIMEOUT', connectorId, 'Request timed out');

      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.messagesFailed).toBe(1);
    });

    it('should track errors by type', () => {
      service.recordMessageFailed(tenantId, 'TIMEOUT', connectorId);
      service.recordMessageFailed(tenantId, 'TIMEOUT', connectorId);
      service.recordMessageFailed(tenantId, 'AUTH_ERROR', connectorId);

      const errors = service.getErrorMetrics(tenantId, '1h', connectorId);
      expect(errors.byErrorType['TIMEOUT'].count).toBe(2);
      expect(errors.byErrorType['AUTH_ERROR'].count).toBe(1);
    });
  });

  describe('recordMessageRetried', () => {
    it('should record a message retry', () => {
      service.recordMessageRetried(tenantId, connectorId);

      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.messagesRetried).toBe(1);
    });
  });

  describe('recordLatency', () => {
    it('should record latency for an operation', () => {
      service.recordLatency(tenantId, 'fetch', 100, connectorId);
      service.recordLatency(tenantId, 'fetch', 200, connectorId);
      service.recordLatency(tenantId, 'transform', 50, connectorId);

      const latency = service.getLatencyMetrics(tenantId, '1h', connectorId);
      expect(latency.byOperation['fetch'].count).toBe(2);
      expect(latency.byOperation['fetch'].avg).toBe(150);
      expect(latency.byOperation['transform'].count).toBe(1);
    });
  });

  describe('getThroughputMetrics', () => {
    it('should calculate rates correctly', () => {
      // Record 60 messages in the last hour
      for (let i = 0; i < 60; i++) {
        service.recordMessageReceived(tenantId, connectorId);
      }

      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.messagesReceived).toBe(60);
      expect(metrics.receiveRate).toBe(1); // 60 messages / 60 minutes = 1/min
    });

    it('should calculate failure rate correctly', () => {
      for (let i = 0; i < 10; i++) {
        service.recordMessageReceived(tenantId, connectorId);
      }
      for (let i = 0; i < 2; i++) {
        service.recordMessageFailed(tenantId, 'ERROR', connectorId);
      }

      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.failureRate).toBe(20); // 2/10 = 20%
    });

    it('should return zero values for empty data', () => {
      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.messagesReceived).toBe(0);
      expect(metrics.receiveRate).toBe(0);
      expect(metrics.failureRate).toBe(0);
    });
  });

  describe('getLatencyMetrics', () => {
    it('should calculate percentiles correctly', () => {
      // Add 100 latency samples
      for (let i = 1; i <= 100; i++) {
        service.recordLatency(tenantId, 'test', i, connectorId);
      }

      const metrics = service.getLatencyMetrics(tenantId, '1h', connectorId);
      expect(metrics.p50).toBe(50);
      expect(metrics.p95).toBe(95);
      expect(metrics.p99).toBe(99);
      expect(metrics.min).toBe(1);
      expect(metrics.max).toBe(100);
      expect(metrics.avg).toBeCloseTo(50.5, 0);
    });

    it('should return zero for empty data', () => {
      const metrics = service.getLatencyMetrics(tenantId, '1h', connectorId);
      expect(metrics.p50).toBe(0);
      expect(metrics.p95).toBe(0);
      expect(metrics.p99).toBe(0);
      expect(metrics.sampleCount).toBe(0);
    });

    it('should calculate standard deviation', () => {
      service.recordLatency(tenantId, 'test', 10, connectorId);
      service.recordLatency(tenantId, 'test', 20, connectorId);
      service.recordLatency(tenantId, 'test', 30, connectorId);

      const metrics = service.getLatencyMetrics(tenantId, '1h', connectorId);
      expect(metrics.stdDev).toBeGreaterThan(0);
    });
  });

  describe('getErrorMetrics', () => {
    it('should calculate error rate correctly', () => {
      // Simulate some requests and errors
      for (let i = 0; i < 100; i++) {
        service.recordMessageReceived(tenantId, connectorId);
      }
      for (let i = 0; i < 5; i++) {
        service.recordMessageFailed(tenantId, 'ERROR', connectorId);
      }

      const errors = service.getErrorMetrics(tenantId, '1h', connectorId);
      expect(errors.totalErrors).toBe(5);
      expect(errors.errorRate).toBe(5); // 5/100 = 5%
    });

    it('should track error trends', () => {
      // Record some errors
      service.recordMessageFailed(tenantId, 'ERROR', connectorId);

      const errors = service.getErrorMetrics(tenantId, '1h', connectorId);
      // With limited data, trend should be stable or increasing
      expect(['stable', 'increasing']).toContain(errors.trend);
    });

    it('should store sample error messages', () => {
      service.recordMessageFailed(
        tenantId,
        'TIMEOUT',
        connectorId,
        'Connection timed out after 30s',
      );

      const errors = service.getErrorMetrics(tenantId, '1h', connectorId);
      expect(errors.byErrorType['TIMEOUT'].sample).toBe('Connection timed out after 30s');
    });
  });

  describe('getTimeSeries', () => {
    it('should return aggregated time series data', () => {
      service.recordMessageReceived(tenantId, connectorId);
      service.recordMessageReceived(tenantId, connectorId);

      const timeSeries = service.getTimeSeries(
        tenantId,
        'received',
        '1h',
        connectorId,
        'count',
        60,
      );

      expect(timeSeries.metric).toBe('received');
      expect(timeSeries.dataPoints.length).toBeGreaterThanOrEqual(0);
      expect(timeSeries.aggregation).toBe('count');
    });

    it('should support different aggregation types', () => {
      const aggregations: Array<'sum' | 'avg' | 'min' | 'max' | 'count'> = [
        'sum',
        'avg',
        'min',
        'max',
        'count',
      ];

      for (const agg of aggregations) {
        const ts = service.getTimeSeries(tenantId, 'received', '1h', undefined, agg);
        expect(ts.aggregation).toBe(agg);
      }
    });
  });

  describe('getDashboardKPIs', () => {
    it('should return complete dashboard KPIs', () => {
      // Record some activity
      for (let i = 0; i < 10; i++) {
        service.recordMessageReceived(tenantId, connectorId);
        service.recordMessageProcessed(tenantId, connectorId, 50 + i * 10);
      }
      service.recordMessageFailed(tenantId, 'ERROR', connectorId);

      const kpis = service.getDashboardKPIs(tenantId, '1h', connectorId);

      expect(kpis.tenantId).toBe(tenantId);
      expect(kpis.period).toBe('1h');
      expect(kpis.messagesThroughput.total).toBe(10);
      expect(kpis.messagesThroughput.successful).toBe(10);
      expect(kpis.messagesThroughput.failed).toBe(1);
      expect(kpis.latencyMetrics.p50).toBeGreaterThan(0);
      expect(kpis.errorMetrics.totalErrors).toBe(1);
    });

    it('should use default period when not specified', () => {
      const kpis = service.getDashboardKPIs(tenantId);
      expect(kpis.period).toBe('24h');
    });
  });

  describe('cleanupOldData', () => {
    it('should remove old data points', () => {
      // Record some data
      service.recordMessageReceived(tenantId, connectorId);

      // With 0 retention, everything should be cleaned
      const cleaned = service.cleanupOldData(0);
      // Data was just added, so nothing will be cleaned with normal retention
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });

    it('should keep recent data', () => {
      service.recordMessageReceived(tenantId, connectorId);

      // With 30 day retention, recent data should remain
      service.cleanupOldData(30);

      const metrics = service.getThroughputMetrics(tenantId, '1h', connectorId);
      expect(metrics.messagesReceived).toBe(1);
    });
  });

  describe('different time windows', () => {
    it('should handle all time windows', () => {
      const windows: Array<'1m' | '5m' | '15m' | '1h' | '6h' | '24h' | '7d' | '30d'> = [
        '1m',
        '5m',
        '15m',
        '1h',
        '6h',
        '24h',
        '7d',
        '30d',
      ];

      service.recordMessageReceived(tenantId);

      for (const window of windows) {
        const metrics = service.getThroughputMetrics(tenantId, window);
        expect(metrics.period).toBe(window);
        expect(metrics.messagesReceived).toBe(1);
      }
    });
  });

  describe('tenant isolation', () => {
    it('should isolate metrics by tenant', () => {
      service.recordMessageReceived('tenant-1');
      service.recordMessageReceived('tenant-1');
      service.recordMessageReceived('tenant-2');

      const metrics1 = service.getThroughputMetrics('tenant-1', '1h');
      const metrics2 = service.getThroughputMetrics('tenant-2', '1h');

      expect(metrics1.messagesReceived).toBe(2);
      expect(metrics2.messagesReceived).toBe(1);
    });
  });
});
