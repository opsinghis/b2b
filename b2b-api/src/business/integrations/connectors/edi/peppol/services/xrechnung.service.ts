import { Injectable, Logger } from '@nestjs/common';
import {
  UblInvoice,
  UblCreditNote,
  XRechnungExtension,
  PeppolValidationResult,
  PeppolValidationError,
} from '../interfaces';

/**
 * XRechnung Route Type
 */
export enum XRechnungRouteType {
  /** Direct routing to public authority */
  DIRECT = 'direct',
  /** Routing via central invoice reception platform */
  CENTRAL = 'central',
  /** Routing via e-invoice portal */
  PORTAL = 'portal',
}

/**
 * XRechnung Configuration
 */
export interface XRechnungConfig {
  /** Leitweg-ID for routing */
  leitwegId: string;
  /** Route type */
  routeType?: XRechnungRouteType;
  /** Buyer reference */
  buyerReference?: string;
  /** Order reference */
  orderReference?: string;
  /** Contract reference */
  contractReference?: string;
}

/**
 * XRechnung Service
 *
 * Implements German XRechnung extension for Peppol BIS Billing.
 * XRechnung is the German CIUS (Core Invoice Usage Specification)
 * that extends EN 16931 with additional rules for German public sector.
 *
 * Key features:
 * - Leitweg-ID validation and routing
 * - German-specific business rules (BR-DE)
 * - Extended validation beyond Peppol BIS
 */
@Injectable()
export class XRechnungService {
  private readonly logger = new Logger(XRechnungService.name);

  /** XRechnung Customization ID */
  private readonly XRECHNUNG_CUSTOMIZATION_ID =
    'urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.3';

  /** XRechnung Profile ID */
  private readonly XRECHNUNG_PROFILE_ID = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';

  /** Leitweg-ID regex pattern */
  private readonly LEITWEG_ID_PATTERN = /^[0-9]{2,12}-[0-9A-Z]{1,30}-[0-9A-Z]{2}$/i;

  /** Valid German VAT ID prefix */
  private readonly GERMAN_VAT_PREFIX = 'DE';

  /**
   * Apply XRechnung extension to invoice
   */
  applyXRechnungExtension(invoice: UblInvoice, extension: XRechnungExtension): UblInvoice {
    this.logger.debug(`Applying XRechnung extension with Leitweg-ID: ${extension.leitwegId}`);

    // Update customization ID for XRechnung
    const updatedInvoice: UblInvoice = {
      ...invoice,
      customizationId: this.XRECHNUNG_CUSTOMIZATION_ID,
    };

    // Add Leitweg-ID as buyer reference if not already set
    if (extension.buyerReference) {
      updatedInvoice.buyerReference = extension.buyerReference;
    } else if (!updatedInvoice.buyerReference) {
      updatedInvoice.buyerReference = extension.leitwegId;
    }

    // Add Leitweg-ID to additional document reference
    if (!updatedInvoice.additionalDocumentReference) {
      updatedInvoice.additionalDocumentReference = [];
    }

    // Add Leitweg-ID reference with specific scheme
    const leitwegRef = {
      id: {
        schemeId: 'Leitweg-ID',
        value: extension.leitwegId,
      },
      documentTypeCode: '130', // Invoicing data sheet
    };

    // Check if Leitweg-ID reference already exists
    const existingRef = updatedInvoice.additionalDocumentReference.find(
      (ref) => ref.id.schemeId === 'Leitweg-ID',
    );

    if (!existingRef) {
      updatedInvoice.additionalDocumentReference.push(leitwegRef);
    }

    return updatedInvoice;
  }

  /**
   * Apply XRechnung extension to credit note
   */
  applyXRechnungExtensionToCreditNote(
    creditNote: UblCreditNote,
    extension: XRechnungExtension,
  ): UblCreditNote {
    this.logger.debug(
      `Applying XRechnung extension to credit note with Leitweg-ID: ${extension.leitwegId}`,
    );

    // Update customization ID for XRechnung
    const updatedCreditNote: UblCreditNote = {
      ...creditNote,
      customizationId: this.XRECHNUNG_CUSTOMIZATION_ID,
    };

    // Add Leitweg-ID as buyer reference if not already set
    if (extension.buyerReference) {
      updatedCreditNote.buyerReference = extension.buyerReference;
    } else if (!updatedCreditNote.buyerReference) {
      updatedCreditNote.buyerReference = extension.leitwegId;
    }

    // Add Leitweg-ID to additional document reference
    if (!updatedCreditNote.additionalDocumentReference) {
      updatedCreditNote.additionalDocumentReference = [];
    }

    const leitwegRef = {
      id: {
        schemeId: 'Leitweg-ID',
        value: extension.leitwegId,
      },
      documentTypeCode: '130',
    };

    const existingRef = updatedCreditNote.additionalDocumentReference.find(
      (ref) => ref.id.schemeId === 'Leitweg-ID',
    );

    if (!existingRef) {
      updatedCreditNote.additionalDocumentReference.push(leitwegRef);
    }

    return updatedCreditNote;
  }

  /**
   * Validate XRechnung-specific rules
   */
  validateXRechnung(document: UblInvoice | UblCreditNote): PeppolValidationResult {
    const errors: PeppolValidationError[] = [];
    const warnings: PeppolValidationError[] = [];
    const infos: PeppolValidationError[] = [];

    // BR-DE-1: Payment account (IBAN) required for credit transfer
    this.validatePaymentAccount(document, errors, warnings);

    // BR-DE-2: Buyer reference (Leitweg-ID) required for public sector
    this.validateBuyerReference(document, errors, warnings);

    // BR-DE-3: Seller contact telephone required
    this.validateSellerContact(document, errors, warnings);

    // BR-DE-4: Seller contact email required
    this.validateSellerEmail(document, errors, warnings);

    // BR-DE-5: Seller city required
    this.validateSellerAddress(document, errors, warnings);

    // BR-DE-6: Seller postal code required (already part of BR-DE-5)

    // BR-DE-7: Buyer city required
    this.validateBuyerAddress(document, errors, warnings);

    // BR-DE-8: Buyer postal code required (already part of BR-DE-7)

    // BR-DE-9: VAT breakdown required if tax category S
    this.validateVatBreakdown(document, errors, warnings);

    // BR-DE-10: Delivery date or period required
    this.validateDeliveryInfo(document, errors, warnings, infos);

    // BR-DE-17: Leitweg-ID format validation
    this.validateLeitwegId(document, errors, warnings);

    // BR-DE-21: Payment due date for certain payment means
    this.validatePaymentDueDate(document, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      infos,
      profile: 'XRechnung 2.3',
      validatedAt: new Date(),
    };
  }

  /**
   * Validate Leitweg-ID format
   */
  validateLeitwegId(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    // Find Leitweg-ID in buyer reference or document references
    let leitwegId: string | null = null;

    if (document.buyerReference) {
      // Check if buyer reference is a Leitweg-ID
      if (this.LEITWEG_ID_PATTERN.test(document.buyerReference)) {
        leitwegId = document.buyerReference;
      }
    }

    // Check additional document references
    const refs = document.additionalDocumentReference || [];
    for (const ref of refs) {
      if (ref.id.schemeId === 'Leitweg-ID') {
        leitwegId = ref.id.value;
        break;
      }
    }

    if (leitwegId && !this.LEITWEG_ID_PATTERN.test(leitwegId)) {
      errors.push({
        code: 'BR-DE-17',
        message: `Leitweg-ID "${leitwegId}" does not match required format: [0-9]{2,12}-[A-Z0-9]{1,30}-[A-Z0-9]{2}`,
        severity: 'error',
        location: 'cbc:BuyerReference or cac:AdditionalDocumentReference',
        ruleId: 'BR-DE-17',
      });
    }
  }

  /**
   * Validate payment account
   */
  private validatePaymentAccount(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    const paymentMeans = document.paymentMeans || [];

    for (const pm of paymentMeans) {
      // Credit transfer (30) requires IBAN
      if (pm.paymentMeansCode.value === '30' || pm.paymentMeansCode.value === '58') {
        if (!pm.payeeFinancialAccount?.id) {
          errors.push({
            code: 'BR-DE-1',
            message: 'Payment account (IBAN) is required for credit transfer payment',
            severity: 'error',
            location: 'cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:ID',
            ruleId: 'BR-DE-1',
          });
        }
      }
    }
  }

  /**
   * Validate buyer reference
   */
  private validateBuyerReference(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    if (!document.buyerReference) {
      warnings.push({
        code: 'BR-DE-2',
        message:
          'Buyer reference (Leitweg-ID) is recommended for XRechnung invoices to German public sector',
        severity: 'warning',
        location: 'cbc:BuyerReference',
        ruleId: 'BR-DE-2',
      });
    }
  }

  /**
   * Validate seller contact information
   */
  private validateSellerContact(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    const contact = document.accountingSupplierParty?.party?.contact;

    if (!contact?.telephone) {
      errors.push({
        code: 'BR-DE-3',
        message: 'Seller contact telephone number is required for XRechnung',
        severity: 'error',
        location: 'cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telephone',
        ruleId: 'BR-DE-3',
      });
    }
  }

  /**
   * Validate seller email
   */
  private validateSellerEmail(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    const contact = document.accountingSupplierParty?.party?.contact;

    if (!contact?.electronicMail) {
      errors.push({
        code: 'BR-DE-4',
        message: 'Seller contact email is required for XRechnung',
        severity: 'error',
        location: 'cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:ElectronicMail',
        ruleId: 'BR-DE-4',
      });
    }
  }

  /**
   * Validate seller address
   */
  private validateSellerAddress(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    const address = document.accountingSupplierParty?.party?.postalAddress;

    if (!address?.cityName) {
      errors.push({
        code: 'BR-DE-5',
        message: 'Seller city is required for XRechnung',
        severity: 'error',
        location: 'cac:AccountingSupplierParty/cac:Party/cac:PostalAddress/cbc:CityName',
        ruleId: 'BR-DE-5',
      });
    }

    if (!address?.postalZone) {
      errors.push({
        code: 'BR-DE-6',
        message: 'Seller postal code is required for XRechnung',
        severity: 'error',
        location: 'cac:AccountingSupplierParty/cac:Party/cac:PostalAddress/cbc:PostalZone',
        ruleId: 'BR-DE-6',
      });
    }
  }

  /**
   * Validate buyer address
   */
  private validateBuyerAddress(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    const address = document.accountingCustomerParty?.party?.postalAddress;

    if (!address?.cityName) {
      errors.push({
        code: 'BR-DE-7',
        message: 'Buyer city is required for XRechnung',
        severity: 'error',
        location: 'cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cbc:CityName',
        ruleId: 'BR-DE-7',
      });
    }

    if (!address?.postalZone) {
      errors.push({
        code: 'BR-DE-8',
        message: 'Buyer postal code is required for XRechnung',
        severity: 'error',
        location: 'cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cbc:PostalZone',
        ruleId: 'BR-DE-8',
      });
    }
  }

  /**
   * Validate VAT breakdown
   */
  private validateVatBreakdown(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    // Check if any line has tax category S
    const lines = 'invoiceLine' in document ? document.invoiceLine : document.creditNoteLine;
    const hasStandardRate = lines?.some((line) => line.item.classifiedTaxCategory.id === 'S');

    if (hasStandardRate) {
      const taxTotal = document.taxTotal?.[0];
      if (!taxTotal?.taxSubtotal?.length) {
        errors.push({
          code: 'BR-DE-9',
          message: 'VAT breakdown (TaxSubtotal) is required when standard VAT (S) is used',
          severity: 'error',
          location: 'cac:TaxTotal/cac:TaxSubtotal',
          ruleId: 'BR-DE-9',
        });
      }
    }
  }

  /**
   * Validate delivery information
   */
  private validateDeliveryInfo(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
    infos: PeppolValidationError[],
  ): void {
    const hasDeliveryDate = document.delivery?.some((d) => d.actualDeliveryDate);
    const hasInvoicePeriod = document.invoicePeriod?.startDate || document.invoicePeriod?.endDate;

    if (!hasDeliveryDate && !hasInvoicePeriod) {
      warnings.push({
        code: 'BR-DE-10',
        message: 'Delivery date or invoice period is recommended for XRechnung',
        severity: 'warning',
        location: 'cac:Delivery/cbc:ActualDeliveryDate or cac:InvoicePeriod',
        ruleId: 'BR-DE-10',
      });
    }
  }

  /**
   * Validate payment due date
   */
  private validatePaymentDueDate(
    document: UblInvoice | UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
  ): void {
    const paymentMeans = document.paymentMeans || [];

    // Payment codes requiring due date: 30 (credit transfer), 58 (SEPA)
    const requiresDueDate = paymentMeans.some(
      (pm) => pm.paymentMeansCode.value === '30' || pm.paymentMeansCode.value === '58',
    );

    if (requiresDueDate) {
      const hasDueDate = 'dueDate' in document && document.dueDate;
      const hasPaymentDueDate = paymentMeans.some((pm) => pm.paymentDueDate);

      if (!hasDueDate && !hasPaymentDueDate) {
        warnings.push({
          code: 'BR-DE-21',
          message: 'Payment due date is recommended for credit transfer payment',
          severity: 'warning',
          location: 'cbc:DueDate or cac:PaymentMeans/cbc:PaymentDueDate',
          ruleId: 'BR-DE-21',
        });
      }
    }
  }

  /**
   * Parse Leitweg-ID components
   */
  parseLeitwegId(leitwegId: string): {
    valid: boolean;
    coarseRouting?: string;
    fineRouting?: string;
    checkDigits?: string;
    error?: string;
  } {
    if (!this.LEITWEG_ID_PATTERN.test(leitwegId)) {
      return {
        valid: false,
        error: 'Invalid Leitweg-ID format',
      };
    }

    const parts = leitwegId.split('-');
    return {
      valid: true,
      coarseRouting: parts[0], // Municipality/authority code
      fineRouting: parts[1], // Internal routing
      checkDigits: parts[2], // Check digits
    };
  }

  /**
   * Generate Leitweg-ID check digits
   */
  generateCheckDigits(coarseRouting: string, fineRouting: string): string {
    // Simple checksum algorithm (97-10 mod 97)
    const combined = coarseRouting + fineRouting;
    const numericValue = parseInt(
      combined.replace(/[A-Z]/gi, (c) => {
        return (c.charCodeAt(0) - 55).toString();
      }),
      10,
    );

    const checksum = 98 - ((numericValue * 100) % 97);
    return checksum.toString().padStart(2, '0');
  }

  /**
   * Check if invoice is for German public sector
   */
  isGermanPublicSector(document: UblInvoice | UblCreditNote): boolean {
    const buyerCountry =
      document.accountingCustomerParty?.party?.postalAddress?.country?.identificationCode;
    const hasBuyerReference = !!document.buyerReference;
    const hasLeitwegId = document.additionalDocumentReference?.some(
      (ref) => ref.id.schemeId === 'Leitweg-ID',
    );

    return buyerCountry === 'DE' && (hasBuyerReference || hasLeitwegId || false);
  }

  /**
   * Get XRechnung customization ID
   */
  getCustomizationId(): string {
    return this.XRECHNUNG_CUSTOMIZATION_ID;
  }
}
