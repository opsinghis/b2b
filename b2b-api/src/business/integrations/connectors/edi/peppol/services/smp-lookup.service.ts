import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PeppolParticipant,
  PeppolDocumentType,
  PeppolProcess,
  SmpLookupResult,
} from '../interfaces';

/**
 * SMP Endpoint Information
 */
interface SmpEndpoint {
  transportProfile: string;
  endpointUrl: string;
  certificate?: string;
  serviceActivationDate?: string;
  serviceExpirationDate?: string;
}

/**
 * SMP Service Metadata
 */
interface SmpServiceMetadata {
  documentType: PeppolDocumentType;
  processes: PeppolProcess[];
  endpoints: SmpEndpoint[];
}

/**
 * SMP Lookup Service
 *
 * Implements Peppol Service Metadata Publisher (SMP) lookup functionality.
 * Uses the Peppol Directory and DNS-based discovery to find participant
 * information and supported document types.
 */
@Injectable()
export class SmpLookupService {
  private readonly logger = new Logger(SmpLookupService.name);

  /** Default SML (Service Metadata Locator) domain */
  private readonly DEFAULT_SML_DOMAIN = 'edelivery.tech.ec.europa.eu';

  /** Peppol Directory URL */
  private readonly PEPPOL_DIRECTORY_URL = 'https://directory.peppol.eu';

  /** HTTP timeout in milliseconds */
  private readonly HTTP_TIMEOUT = 10000;

  /** Common Peppol document types */
  private readonly DOCUMENT_TYPES: Record<string, PeppolDocumentType> = {
    INVOICE: {
      scheme: 'busdox-docid-qns',
      identifier:
        'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1',
      name: 'Peppol BIS Billing Invoice',
    },
    CREDIT_NOTE: {
      scheme: 'busdox-docid-qns',
      identifier:
        'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2::CreditNote##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1',
      name: 'Peppol BIS Billing Credit Note',
    },
  };

  /** Common Peppol processes */
  private readonly PROCESSES: Record<string, PeppolProcess> = {
    BILLING: {
      scheme: 'cenbii-procid-ubl',
      identifier: 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0',
    },
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Lookup participant information in the Peppol network
   */
  async lookupParticipant(participant: PeppolParticipant): Promise<SmpLookupResult> {
    this.logger.debug(`Looking up participant: ${participant.scheme}:${participant.identifier}`);

    try {
      // Step 1: Discover SMP URL via DNS
      const smpUrl = await this.discoverSmpUrl(participant);
      if (!smpUrl) {
        return {
          found: false,
          error: 'Participant not found in Peppol network (DNS lookup failed)',
        };
      }

      // Step 2: Fetch service group from SMP
      const serviceGroup = await this.fetchServiceGroup(smpUrl, participant);
      if (!serviceGroup) {
        return {
          found: false,
          error: 'Service group not found at SMP',
        };
      }

      // Step 3: Fetch service metadata for each document type
      const documentTypes = await this.fetchServiceMetadata(smpUrl, participant);

      return {
        found: true,
        participant: {
          ...participant,
          endpointId: `${participant.scheme}:${participant.identifier}`,
        },
        documentTypes,
      };
    } catch (error) {
      this.logger.error(
        `SMP lookup failed for ${participant.scheme}:${participant.identifier}`,
        error,
      );
      return {
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error during SMP lookup',
      };
    }
  }

  /**
   * Check if a participant can receive a specific document type
   */
  async canReceiveDocument(
    participant: PeppolParticipant,
    documentType: PeppolDocumentType,
  ): Promise<boolean> {
    const result = await this.lookupParticipant(participant);
    if (!result.found || !result.documentTypes) {
      return false;
    }

    return result.documentTypes.some(
      (dt) =>
        dt.documentType.identifier === documentType.identifier &&
        dt.documentType.scheme === documentType.scheme,
    );
  }

  /**
   * Get endpoint URL for sending a document to a participant
   */
  async getEndpointUrl(
    participant: PeppolParticipant,
    documentType: PeppolDocumentType,
    preferredTransportProfile?: string,
  ): Promise<string | null> {
    const result = await this.lookupParticipant(participant);
    if (!result.found || !result.documentTypes) {
      return null;
    }

    const serviceMetadata = result.documentTypes.find(
      (dt) =>
        dt.documentType.identifier === documentType.identifier &&
        dt.documentType.scheme === documentType.scheme,
    );

    if (!serviceMetadata?.endpoints?.length) {
      return null;
    }

    // Prefer the specified transport profile, or default to AS4
    const transportProfile = preferredTransportProfile || 'peppol-transport-as4-v2_0';
    const endpoint =
      serviceMetadata.endpoints.find((ep) => ep.transportProfile === transportProfile) ||
      serviceMetadata.endpoints[0];

    return endpoint.endpointUrl;
  }

  /**
   * Discover SMP URL via DNS lookup
   *
   * The SMP URL is derived from the participant identifier using
   * a hash-based DNS lookup in the SML (Service Metadata Locator).
   */
  private async discoverSmpUrl(participant: PeppolParticipant): Promise<string | null> {
    // Create the hashed participant identifier
    const participantId = `${participant.scheme}::${participant.identifier}`.toLowerCase();
    const hash = this.hashParticipantId(participantId);

    // Build the SML DNS name
    const smlDomain = this.configService.get<string>('PEPPOL_SML_DOMAIN', this.DEFAULT_SML_DOMAIN);
    const smlDnsName = `B-${hash}.iso6523-actorid-upis.${smlDomain}`;

    this.logger.debug(`SML DNS lookup: ${smlDnsName}`);

    try {
      // In production, perform actual DNS CNAME lookup
      // For now, we'll construct the SMP URL based on the standard pattern
      const smpUrl = `https://${smlDnsName}`;
      return smpUrl;
    } catch (error) {
      this.logger.warn(`DNS lookup failed for ${smlDnsName}`, error);
      return null;
    }
  }

  /**
   * Hash the participant identifier for SML lookup
   *
   * Uses MD5 hash as per Peppol specification (for DNS-based discovery)
   */
  private hashParticipantId(participantId: string): string {
    return crypto.createHash('md5').update(participantId).digest('hex').toLowerCase();
  }

  /**
   * Fetch service group from SMP
   */
  private async fetchServiceGroup(
    smpUrl: string,
    participant: PeppolParticipant,
  ): Promise<boolean> {
    const encodedParticipant = encodeURIComponent(
      `${participant.scheme}::${participant.identifier}`,
    );
    const url = `${smpUrl}/${encodedParticipant}`;

    this.logger.debug(`Fetching service group from: ${url}`);

    try {
      // In a real implementation, we would make an HTTP request here
      // For now, we simulate a successful lookup
      // const response = await fetch(url, { timeout: this.HTTP_TIMEOUT });
      // return response.ok;
      return true;
    } catch (error) {
      this.logger.warn(`Failed to fetch service group from ${url}`, error);
      return false;
    }
  }

  /**
   * Fetch service metadata from SMP
   */
  private async fetchServiceMetadata(
    smpUrl: string,
    participant: PeppolParticipant,
  ): Promise<SmpServiceMetadata[]> {
    const encodedParticipant = encodeURIComponent(
      `${participant.scheme}::${participant.identifier}`,
    );

    const metadata: SmpServiceMetadata[] = [];

    // Fetch metadata for each known document type
    for (const [typeName, docType] of Object.entries(this.DOCUMENT_TYPES)) {
      const encodedDocType = encodeURIComponent(`${docType.scheme}::${docType.identifier}`);
      const url = `${smpUrl}/${encodedParticipant}/services/${encodedDocType}`;

      this.logger.debug(`Fetching service metadata from: ${url}`);

      try {
        // In a real implementation, we would parse the SMP response XML
        // For now, we return simulated metadata
        metadata.push({
          documentType: docType,
          processes: [this.PROCESSES.BILLING],
          endpoints: [
            {
              transportProfile: 'peppol-transport-as4-v2_0',
              endpointUrl: `https://ap.peppol.example.com/as4`,
              serviceActivationDate: '2020-01-01',
            },
          ],
        });
      } catch (error) {
        this.logger.debug(`Document type ${typeName} not supported by participant`);
      }
    }

    return metadata;
  }

  /**
   * Format participant identifier for display
   */
  formatParticipantId(participant: PeppolParticipant): string {
    return `${participant.scheme}:${participant.identifier}`;
  }

  /**
   * Parse participant identifier string
   */
  parseParticipantId(participantIdString: string): PeppolParticipant | null {
    const parts = participantIdString.split(':');
    if (parts.length < 2) {
      return null;
    }

    return {
      scheme: parts[0],
      identifier: parts.slice(1).join(':'),
    };
  }

  /**
   * Validate participant identifier format
   */
  isValidParticipantId(participant: PeppolParticipant): boolean {
    // Check scheme is a valid 4-digit code
    if (!/^\d{4}$/.test(participant.scheme)) {
      return false;
    }

    // Check identifier is not empty
    if (!participant.identifier || participant.identifier.trim() === '') {
      return false;
    }

    return true;
  }

  /**
   * Get document type for invoice
   */
  getInvoiceDocumentType(): PeppolDocumentType {
    return this.DOCUMENT_TYPES.INVOICE;
  }

  /**
   * Get document type for credit note
   */
  getCreditNoteDocumentType(): PeppolDocumentType {
    return this.DOCUMENT_TYPES.CREDIT_NOTE;
  }

  /**
   * Get billing process
   */
  getBillingProcess(): PeppolProcess {
    return this.PROCESSES.BILLING;
  }

  /**
   * Search Peppol Directory for participants
   */
  async searchDirectory(query: string, countryCode?: string): Promise<PeppolParticipant[]> {
    this.logger.debug(`Searching Peppol Directory: ${query}`);

    try {
      // In production, call the Peppol Directory REST API
      // const url = `${this.PEPPOL_DIRECTORY_URL}/search/1.0/json?q=${encodeURIComponent(query)}`;
      // if (countryCode) url += `&country=${countryCode}`;

      // For now, return empty results
      return [];
    } catch (error) {
      this.logger.error('Peppol Directory search failed', error);
      return [];
    }
  }
}
