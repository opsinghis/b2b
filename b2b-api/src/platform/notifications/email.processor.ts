import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailJobData } from './dto';
import { EMAIL_QUEUE_NAME } from './notifications.service';

/**
 * Email processor that handles queued email jobs.
 *
 * In a production environment, this would integrate with an email service
 * like SendGrid, AWS SES, Mailgun, etc. For now, it logs the email details.
 */
@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Processing email job ${job.id}: ${job.data.subject} to ${job.data.to}`);

    const { to, subject, template, text, html, variables, tenantId } = job.data;

    try {
      // TODO: In production, integrate with actual email service
      // Example: await this.emailService.send({ to, subject, template, text, html, variables });

      // For now, simulate email sending
      await this.simulateSendEmail({
        to,
        subject,
        template,
        text,
        html,
        variables,
        tenantId,
      });

      this.logger.log(`Email sent successfully: ${job.id} to ${to}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email ${job.id}: ${message}`);
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Simulate sending email - replace with actual email service in production
   */
  private async simulateSendEmail(data: {
    to: string;
    subject: string;
    template?: string;
    text?: string;
    html?: string;
    variables?: Record<string, unknown>;
    tenantId: string;
  }): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Log the email details (in production, this would be the actual send)
    this.logger.debug(
      `[SIMULATED EMAIL] To: ${data.to}, Subject: ${data.subject}, ` +
        `Template: ${data.template || 'none'}, Tenant: ${data.tenantId}`,
    );

    // Simulate occasional failures for testing retry logic (commented out)
    // if (Math.random() < 0.1) {
    //   throw new Error('Simulated email send failure');
    // }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJobData>) {
    this.logger.debug(`Email job ${job.id} completed: ${job.data.to}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJobData>, error: Error) {
    this.logger.error(
      `Email job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job<EmailJobData>) {
    this.logger.debug(`Email job ${job.id} is now active`);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Email job ${jobId} has stalled`);
  }
}
