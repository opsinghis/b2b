import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { EmailProcessor } from './email.processor';
import { EmailJobData } from './dto';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;

  const createMockJob = (data: Partial<EmailJobData> = {}): Job<EmailJobData> =>
    ({
      id: 'job-123',
      data: {
        to: 'test@example.com',
        subject: 'Test Subject',
        tenantId: 'tenant-123',
        template: 'welcome',
        text: 'Plain text content',
        html: '<p>HTML content</p>',
        variables: { name: 'John' },
        ...data,
      },
      attemptsMade: 1,
    }) as Job<EmailJobData>;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailProcessor],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('process', () => {
    it('should process email job successfully', async () => {
      const job = createMockJob();

      const processPromise = processor.process(job);

      // Fast-forward timer for simulated delay
      jest.advanceTimersByTime(100);

      await processPromise;
      // Should complete without error
    });

    it('should process email without template', async () => {
      const job = createMockJob({
        template: undefined,
        text: 'Just plain text',
      });

      const processPromise = processor.process(job);
      jest.advanceTimersByTime(100);

      await processPromise;
    });

    it('should process email without html', async () => {
      const job = createMockJob({
        html: undefined,
        text: 'Plain text only',
      });

      const processPromise = processor.process(job);
      jest.advanceTimersByTime(100);

      await processPromise;
    });

    it('should process email without variables', async () => {
      const job = createMockJob({
        variables: undefined,
      });

      const processPromise = processor.process(job);
      jest.advanceTimersByTime(100);

      await processPromise;
    });

    it('should throw error on send failure to trigger retry', async () => {
      // Override the simulateSendEmail to throw
      const originalMethod = (processor as any).simulateSendEmail;
      (processor as any).simulateSendEmail = jest.fn().mockRejectedValue(new Error('Send failed'));

      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow('Send failed');

      (processor as any).simulateSendEmail = originalMethod;
    });
  });

  describe('onCompleted', () => {
    it('should log completion', () => {
      const job = createMockJob();

      // Should not throw
      processor.onCompleted(job);
    });
  });

  describe('onFailed', () => {
    it('should log failure with error', () => {
      const job = createMockJob();
      const error = new Error('Test error');

      // Should not throw
      processor.onFailed(job, error);
    });

    it('should log attempt count', () => {
      const job = createMockJob();
      (job as any).attemptsMade = 3;
      const error = new Error('Multiple attempts failed');

      // Should not throw
      processor.onFailed(job, error);
    });
  });

  describe('onActive', () => {
    it('should log active job', () => {
      const job = createMockJob();

      // Should not throw
      processor.onActive(job);
    });
  });

  describe('onStalled', () => {
    it('should log stalled job', () => {
      // Should not throw
      processor.onStalled('job-456');
    });
  });

  describe('simulateSendEmail', () => {
    it('should simulate sending email with all fields', async () => {
      const simulateSendEmail = (processor as any).simulateSendEmail.bind(processor);

      const sendPromise = simulateSendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        template: 'order-confirmation',
        text: 'Plain text',
        html: '<p>HTML</p>',
        variables: { orderId: '12345' },
        tenantId: 'tenant-789',
      });

      jest.advanceTimersByTime(100);

      await sendPromise;
    });

    it('should simulate sending email without template', async () => {
      const simulateSendEmail = (processor as any).simulateSendEmail.bind(processor);

      const sendPromise = simulateSendEmail({
        to: 'recipient@example.com',
        subject: 'Test Email',
        tenantId: 'tenant-789',
      });

      jest.advanceTimersByTime(100);

      await sendPromise;
    });
  });
});
