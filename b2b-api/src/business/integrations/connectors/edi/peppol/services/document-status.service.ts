import { Injectable, Logger } from '@nestjs/common';
import {
  PeppolDocument,
  PeppolDocumentStatus,
  UblInvoice,
  UblCreditNote,
  PeppolParticipant,
  PeppolValidationResult,
} from '../interfaces';
import { PeppolValidatorService } from './peppol-validator.service';
import { AccessPointService } from './access-point.service';

/**
 * Document Status Event
 */
export interface DocumentStatusEvent {
  documentId: string;
  previousStatus: PeppolDocumentStatus;
  newStatus: PeppolDocumentStatus;
  timestamp: Date;
  message?: string;
  actor?: string;
}

/**
 * Document Status Callback
 */
export type DocumentStatusCallback = (event: DocumentStatusEvent) => void | Promise<void>;

/**
 * Document Status Service
 *
 * Tracks and manages the lifecycle status of Peppol documents.
 * Provides status history, event notifications, and status transitions.
 */
@Injectable()
export class DocumentStatusService {
  private readonly logger = new Logger(DocumentStatusService.name);

  /** In-memory document store (in production, use database) */
  private documents: Map<string, PeppolDocument> = new Map();

  /** Status change callbacks */
  private statusCallbacks: DocumentStatusCallback[] = [];

  /** Valid status transitions */
  private readonly VALID_TRANSITIONS: Record<PeppolDocumentStatus, PeppolDocumentStatus[]> = {
    [PeppolDocumentStatus.DRAFT]: [PeppolDocumentStatus.VALIDATED, PeppolDocumentStatus.FAILED],
    [PeppolDocumentStatus.VALIDATED]: [
      PeppolDocumentStatus.SIGNED,
      PeppolDocumentStatus.SUBMITTED,
      PeppolDocumentStatus.FAILED,
    ],
    [PeppolDocumentStatus.SIGNED]: [PeppolDocumentStatus.SUBMITTED, PeppolDocumentStatus.FAILED],
    [PeppolDocumentStatus.SUBMITTED]: [
      PeppolDocumentStatus.DELIVERED,
      PeppolDocumentStatus.REJECTED,
      PeppolDocumentStatus.FAILED,
    ],
    [PeppolDocumentStatus.DELIVERED]: [
      PeppolDocumentStatus.ACCEPTED,
      PeppolDocumentStatus.REJECTED,
    ],
    [PeppolDocumentStatus.ACCEPTED]: [],
    [PeppolDocumentStatus.REJECTED]: [PeppolDocumentStatus.DRAFT],
    [PeppolDocumentStatus.FAILED]: [PeppolDocumentStatus.DRAFT],
  };

  constructor(
    private readonly validatorService: PeppolValidatorService,
    private readonly accessPointService: AccessPointService,
  ) {}

  /**
   * Create a new document and start tracking
   */
  createDocument(
    documentType: 'invoice' | 'creditNote',
    document: UblInvoice | UblCreditNote,
    sender: PeppolParticipant,
    receiver: PeppolParticipant,
  ): PeppolDocument {
    const documentId = this.generateDocumentId();
    const now = new Date();

    const peppolDocument: PeppolDocument = {
      documentId,
      documentType,
      peppolDocumentType:
        documentType === 'invoice'
          ? {
              scheme: 'busdox-docid-qns',
              identifier:
                'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1',
              name: 'Peppol BIS Billing Invoice',
            }
          : {
              scheme: 'busdox-docid-qns',
              identifier:
                'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2::CreditNote##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1',
              name: 'Peppol BIS Billing Credit Note',
            },
      peppolProcess: {
        scheme: 'cenbii-procid-ubl',
        identifier: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
      },
      sender,
      receiver,
      status: PeppolDocumentStatus.DRAFT,
      document,
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: PeppolDocumentStatus.DRAFT,
          timestamp: now,
          message: 'Document created',
        },
      ],
    };

    this.documents.set(documentId, peppolDocument);
    this.logger.log(`Document ${documentId} created in DRAFT status`);

    return peppolDocument;
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): PeppolDocument | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * Get all documents
   */
  getAllDocuments(): PeppolDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get documents by status
   */
  getDocumentsByStatus(status: PeppolDocumentStatus): PeppolDocument[] {
    return Array.from(this.documents.values()).filter((doc) => doc.status === status);
  }

  /**
   * Validate document and update status
   */
  async validateDocument(documentId: string): Promise<{
    valid: boolean;
    validationResult: PeppolValidationResult;
    document?: PeppolDocument;
  }> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Validate document
    const validationResult =
      document.documentType === 'invoice'
        ? this.validatorService.validateInvoice(document.document as UblInvoice)
        : this.validatorService.validateCreditNote(document.document as UblCreditNote);

    if (validationResult.valid) {
      await this.transitionStatus(
        documentId,
        PeppolDocumentStatus.VALIDATED,
        'Document validated successfully',
      );
    } else {
      document.validationErrors = validationResult.errors;
      document.updatedAt = new Date();
    }

    return {
      valid: validationResult.valid,
      validationResult,
      document: this.documents.get(documentId),
    };
  }

  /**
   * Submit document to Peppol network
   */
  async submitDocument(documentId: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    document?: PeppolDocument;
  }> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Check if document can be submitted
    if (
      document.status !== PeppolDocumentStatus.VALIDATED &&
      document.status !== PeppolDocumentStatus.SIGNED
    ) {
      return {
        success: false,
        error: `Document cannot be submitted from ${document.status} status. Must be VALIDATED or SIGNED.`,
      };
    }

    // Generate XML if not already generated
    if (!document.xml) {
      return {
        success: false,
        error: 'Document XML not generated. Call generateXml first.',
      };
    }

    // Send through Access Point
    const result =
      document.documentType === 'invoice'
        ? await this.accessPointService.sendInvoice(
            document.sender,
            document.receiver,
            document.xml,
          )
        : await this.accessPointService.sendCreditNote(
            document.sender,
            document.receiver,
            document.xml,
          );

    if (result.success) {
      document.accessPointMessageId = result.messageId;
      await this.transitionStatus(
        documentId,
        PeppolDocumentStatus.SUBMITTED,
        `Document submitted to Peppol network. Message ID: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
        document: this.documents.get(documentId),
      };
    } else {
      await this.transitionStatus(
        documentId,
        PeppolDocumentStatus.FAILED,
        `Submission failed: ${result.error?.message}`,
      );

      return {
        success: false,
        error: result.error?.message,
        document: this.documents.get(documentId),
      };
    }
  }

  /**
   * Update document status from Access Point
   */
  async refreshDocumentStatus(documentId: string): Promise<PeppolDocument | null> {
    const document = this.documents.get(documentId);
    if (!document) {
      return null;
    }

    if (!document.accessPointMessageId) {
      return document;
    }

    const previousStatus = document.status;
    const updatedDocument = await this.accessPointService.updateDocumentStatus(document);

    if (updatedDocument.status !== previousStatus) {
      await this.notifyStatusChange({
        documentId,
        previousStatus,
        newStatus: updatedDocument.status,
        timestamp: new Date(),
        message: 'Status updated from Access Point',
      });
    }

    return updatedDocument;
  }

  /**
   * Transition document status
   */
  async transitionStatus(
    documentId: string,
    newStatus: PeppolDocumentStatus,
    message?: string,
    actor?: string,
  ): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const currentStatus = document.status;

    // Check if transition is valid
    if (!this.isValidTransition(currentStatus, newStatus)) {
      this.logger.warn(
        `Invalid status transition for document ${documentId}: ${currentStatus} -> ${newStatus}`,
      );
      return false;
    }

    // Update status
    const previousStatus = document.status;
    document.status = newStatus;
    document.updatedAt = new Date();
    document.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      message,
    });

    this.logger.log(`Document ${documentId} status changed: ${previousStatus} -> ${newStatus}`);

    // Notify callbacks
    await this.notifyStatusChange({
      documentId,
      previousStatus,
      newStatus,
      timestamp: new Date(),
      message,
      actor,
    });

    return true;
  }

  /**
   * Check if status transition is valid
   */
  isValidTransition(from: PeppolDocumentStatus, to: PeppolDocumentStatus): boolean {
    const validTargets = this.VALID_TRANSITIONS[from] || [];
    return validTargets.includes(to);
  }

  /**
   * Register status change callback
   */
  onStatusChange(callback: DocumentStatusCallback): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Remove status change callback
   */
  offStatusChange(callback: DocumentStatusCallback): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index !== -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all status change callbacks
   */
  private async notifyStatusChange(event: DocumentStatusEvent): Promise<void> {
    for (const callback of this.statusCallbacks) {
      try {
        await callback(event);
      } catch (error) {
        this.logger.error('Error in status change callback', error);
      }
    }
  }

  /**
   * Set document XML
   */
  setDocumentXml(documentId: string, xml: string): void {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    document.xml = xml;
    document.updatedAt = new Date();
  }

  /**
   * Mark document as accepted
   */
  async acceptDocument(documentId: string, message?: string): Promise<boolean> {
    return this.transitionStatus(
      documentId,
      PeppolDocumentStatus.ACCEPTED,
      message || 'Document accepted by recipient',
    );
  }

  /**
   * Mark document as rejected
   */
  async rejectDocument(documentId: string, reason: string): Promise<boolean> {
    return this.transitionStatus(
      documentId,
      PeppolDocumentStatus.REJECTED,
      `Document rejected: ${reason}`,
    );
  }

  /**
   * Get document status history
   */
  getStatusHistory(documentId: string): Array<{
    status: PeppolDocumentStatus;
    timestamp: Date;
    message?: string;
  }> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    return document.statusHistory;
  }

  /**
   * Delete document
   */
  deleteDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `peppol-${timestamp}-${random}`;
  }

  /**
   * Get document statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<PeppolDocumentStatus, number>;
    byType: Record<string, number>;
  } {
    const documents = Array.from(this.documents.values());

    const byStatus: Record<PeppolDocumentStatus, number> = {
      [PeppolDocumentStatus.DRAFT]: 0,
      [PeppolDocumentStatus.VALIDATED]: 0,
      [PeppolDocumentStatus.SIGNED]: 0,
      [PeppolDocumentStatus.SUBMITTED]: 0,
      [PeppolDocumentStatus.DELIVERED]: 0,
      [PeppolDocumentStatus.ACCEPTED]: 0,
      [PeppolDocumentStatus.REJECTED]: 0,
      [PeppolDocumentStatus.FAILED]: 0,
    };

    const byType: Record<string, number> = {
      invoice: 0,
      creditNote: 0,
    };

    for (const doc of documents) {
      byStatus[doc.status]++;
      byType[doc.documentType]++;
    }

    return {
      total: documents.length,
      byStatus,
      byType,
    };
  }
}
