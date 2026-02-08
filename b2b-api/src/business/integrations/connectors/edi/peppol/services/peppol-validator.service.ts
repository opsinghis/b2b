import { Injectable, Logger } from '@nestjs/common';
import {
  UblInvoice,
  UblCreditNote,
  PeppolValidationResult,
  PeppolValidationError,
} from '../interfaces';

/**
 * Peppol BIS Billing 3.0 Validation Rules
 */
interface ValidationRule {
  id: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: (doc: UblInvoice | UblCreditNote) => boolean;
  location?: string;
}

/**
 * Peppol Validator Service
 *
 * Validates UBL 2.1 Invoice and Credit Note documents against:
 * - EN 16931 (European Standard)
 * - Peppol BIS Billing 3.0 business rules
 * - Schematron validation rules
 */
@Injectable()
export class PeppolValidatorService {
  private readonly logger = new Logger(PeppolValidatorService.name);

  /** Peppol BIS Billing 3.0 customization ID */
  private readonly BIS_CUSTOMIZATION_ID =
    'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0';

  /** Peppol BIS Billing profile ID */
  private readonly BIS_PROFILE_ID = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';

  /** Valid invoice type codes */
  private readonly VALID_INVOICE_TYPES = ['380', '381', '384', '389', '751'];

  /** Valid credit note type codes */
  private readonly VALID_CREDIT_NOTE_TYPES = ['381', '396'];

  /** Valid tax category codes */
  private readonly VALID_TAX_CATEGORIES = ['S', 'Z', 'E', 'AE', 'K', 'G', 'O', 'L', 'M'];

  /** Valid currency codes (ISO 4217) */
  private readonly VALID_CURRENCY_CODES = [
    'EUR',
    'USD',
    'GBP',
    'SEK',
    'NOK',
    'DKK',
    'CHF',
    'PLN',
    'CZK',
    'HUF',
    'RON',
    'BGN',
    'HRK',
    'ISK',
    'ALL',
    'BAM',
    'MKD',
    'RSD',
    'UAH',
  ];

  /** Valid endpoint schemes */
  private readonly VALID_ENDPOINT_SCHEMES = [
    '0002', // FR:SIRENE
    '0007', // SE:ORGNR
    '0009', // FR:SIRET
    '0037', // FI:OVT
    '0060', // DUNS
    '0088', // GLN
    '0096', // DK:P
    '0106', // NL:KVK
    '0130', // EU:NAL
    '0135', // IT:IVA
    '0142', // SE:ORGNR
    '0151', // AU:ABN
    '0183', // CH:UIDB
    '0184', // DE:LWID
    '0190', // NL:OINO
    '0191', // EE:CC
    '0192', // NO:ORG
    '0193', // UBLBE
    '0195', // SG:UEN
    '0196', // IS:KTNR
    '0198', // DK:ERST
    '0199', // LEI
    '0200', // LT:LEI
    '0201', // IT:CUUO
    '0202', // DE:LWID
    '0204', // DE:LWID
    '0208', // BE:EN
    '0209', // GS1
    '0210', // IT:CFI
    '0211', // IT:IVA
    '0212', // FI:ORG
    '0213', // FI:VAT
    '9901', // DK:CPR
    '9902', // DK:CVR
    '9904', // DK:P
    '9905', // IT:FTI
    '9906', // IT:SIA
    '9907', // IT:SECETI
    '9908', // NO:ORGNR
    '9909', // NO:VAT
    '9910', // HU:VAT
    '9913', // EE:CC
    '9914', // AT:VAT
    '9915', // AT:GOV
    '9917', // NL:OIN
    '9918', // IBAN
    '9919', // PAYPAL
    '9920', // AT:KUR
    '9921', // IT:CUUO
    '9922', // IT:IPA
    '9923', // IT:PEC
    '9925', // HR:OIB
    '9926', // SI:DDV
    '9927', // SI:TIN
    '9928', // SK:DIC
    '9929', // CY:VAT
    '9930', // SM:VAT
    '9931', // PT:VAT
    '9932', // AD:VAT
    '9933', // AL:VAT
    '9934', // BA:VAT
    '9935', // BE:VAT
    '9936', // BG:VAT
    '9937', // CH:VAT
    '9938', // CZ:VAT
    '9939', // DE:VAT
    '9940', // DK:VAT
    '9941', // ES:VAT
    '9942', // FI:VAT
    '9943', // FR:VAT
    '9944', // GB:VAT
    '9945', // GR:VAT
    '9946', // HR:VAT
    '9947', // HU:VAT
    '9948', // IE:VAT
    '9949', // IS:VAT
    '9950', // IT:VAT
    '9951', // LI:VAT
    '9952', // LT:VAT
    '9953', // LU:VAT
    '9954', // LV:VAT
    '9955', // MC:VAT
    '9956', // ME:VAT
    '9957', // MK:VAT
    '9958', // MT:VAT
    '9959', // NL:VAT
    '9960', // NO:VAT
    '9961', // PL:VAT
    '9962', // PT:VAT
    '9963', // RO:VAT
    '9964', // RS:VAT
    '9965', // SE:VAT
    '9966', // SI:VAT
    '9967', // SK:VAT
    '9968', // SM:VAT
    '9969', // TR:VAT
    '9970', // UA:VAT
    '9971', // VA:VAT
    '9972', // XK:VAT
  ];

  /**
   * Validate UBL Invoice document
   */
  validateInvoice(invoice: UblInvoice): PeppolValidationResult {
    const errors: PeppolValidationError[] = [];
    const warnings: PeppolValidationError[] = [];
    const infos: PeppolValidationError[] = [];

    const rules = this.getInvoiceValidationRules();

    for (const rule of rules) {
      try {
        const isValid = rule.validate(invoice);
        if (!isValid) {
          const error: PeppolValidationError = {
            code: rule.id,
            message: rule.description,
            severity: rule.severity,
            location: rule.location,
            ruleId: rule.id,
          };

          switch (rule.severity) {
            case 'error':
              errors.push(error);
              break;
            case 'warning':
              warnings.push(error);
              break;
            case 'info':
              infos.push(error);
              break;
          }
        }
      } catch (e) {
        errors.push({
          code: 'VALIDATION_ERROR',
          message: `Error validating rule ${rule.id}: ${e instanceof Error ? e.message : String(e)}`,
          severity: 'error',
          ruleId: rule.id,
        });
      }
    }

    // Run additional Schematron-like rules
    this.validateSchematronRules(invoice, errors, warnings, infos);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      infos,
      profile: 'Peppol BIS Billing 3.0',
      validatedAt: new Date(),
    };
  }

  /**
   * Validate UBL Credit Note document
   */
  validateCreditNote(creditNote: UblCreditNote): PeppolValidationResult {
    const errors: PeppolValidationError[] = [];
    const warnings: PeppolValidationError[] = [];
    const infos: PeppolValidationError[] = [];

    const rules = this.getCreditNoteValidationRules();

    for (const rule of rules) {
      try {
        const isValid = rule.validate(creditNote);
        if (!isValid) {
          const error: PeppolValidationError = {
            code: rule.id,
            message: rule.description,
            severity: rule.severity,
            location: rule.location,
            ruleId: rule.id,
          };

          switch (rule.severity) {
            case 'error':
              errors.push(error);
              break;
            case 'warning':
              warnings.push(error);
              break;
            case 'info':
              infos.push(error);
              break;
          }
        }
      } catch (e) {
        errors.push({
          code: 'VALIDATION_ERROR',
          message: `Error validating rule ${rule.id}: ${e instanceof Error ? e.message : String(e)}`,
          severity: 'error',
          ruleId: rule.id,
        });
      }
    }

    // Run additional Schematron-like rules for credit notes
    this.validateCreditNoteSchematronRules(creditNote, errors, warnings, infos);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      infos,
      profile: 'Peppol BIS Billing 3.0',
      validatedAt: new Date(),
    };
  }

  /**
   * Get Invoice validation rules
   */
  private getInvoiceValidationRules(): ValidationRule[] {
    return [
      // BR-01: Invoice number is mandatory
      {
        id: 'BR-01',
        description: 'An Invoice shall have an Invoice number (BT-1).',
        severity: 'error',
        validate: (doc) => !!(doc as UblInvoice).id && (doc as UblInvoice).id.trim() !== '',
        location: 'cbc:ID',
      },

      // BR-02: Invoice issue date is mandatory
      {
        id: 'BR-02',
        description: 'An Invoice shall have an Invoice issue date (BT-2).',
        severity: 'error',
        validate: (doc) => !!(doc as UblInvoice).issueDate,
        location: 'cbc:IssueDate',
      },

      // BR-04: Invoice type code is mandatory
      {
        id: 'BR-04',
        description: 'An Invoice shall have an Invoice type code (BT-3).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return (
            !!invoice.invoiceTypeCode && this.VALID_INVOICE_TYPES.includes(invoice.invoiceTypeCode)
          );
        },
        location: 'cbc:InvoiceTypeCode',
      },

      // BR-05: Document currency code is mandatory
      {
        id: 'BR-05',
        description: 'An Invoice shall have an Invoice currency code (BT-5).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return (
            !!invoice.documentCurrencyCode &&
            this.VALID_CURRENCY_CODES.includes(invoice.documentCurrencyCode)
          );
        },
        location: 'cbc:DocumentCurrencyCode',
      },

      // BR-06: Seller name is mandatory
      {
        id: 'BR-06',
        description: 'An Invoice shall contain the Seller name (BT-27).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return !!(
            invoice.accountingSupplierParty?.party?.partyLegalEntity?.[0]?.registrationName ||
            invoice.accountingSupplierParty?.party?.partyName?.[0]?.name
          );
        },
        location: 'cac:AccountingSupplierParty/cac:Party',
      },

      // BR-07: Buyer name is mandatory
      {
        id: 'BR-07',
        description: 'An Invoice shall contain the Buyer name (BT-44).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return !!(
            invoice.accountingCustomerParty?.party?.partyLegalEntity?.[0]?.registrationName ||
            invoice.accountingCustomerParty?.party?.partyName?.[0]?.name
          );
        },
        location: 'cac:AccountingCustomerParty/cac:Party',
      },

      // BR-08: Seller postal address is mandatory
      {
        id: 'BR-08',
        description: 'An Invoice shall contain the Seller postal address (BG-5).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return !!invoice.accountingSupplierParty?.party?.postalAddress;
        },
        location: 'cac:AccountingSupplierParty/cac:Party/cac:PostalAddress',
      },

      // BR-09: Seller country code is mandatory
      {
        id: 'BR-09',
        description: 'The Seller postal address shall contain a Seller country code (BT-40).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return !!invoice.accountingSupplierParty?.party?.postalAddress?.country
            ?.identificationCode;
        },
        location:
          'cac:AccountingSupplierParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode',
      },

      // BR-10: Buyer postal address is mandatory
      {
        id: 'BR-10',
        description: 'An Invoice shall contain the Buyer postal address (BG-8).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return !!invoice.accountingCustomerParty?.party?.postalAddress;
        },
        location: 'cac:AccountingCustomerParty/cac:Party/cac:PostalAddress',
      },

      // BR-11: Buyer country code is mandatory
      {
        id: 'BR-11',
        description: 'The Buyer postal address shall contain a Buyer country code (BT-55).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return !!invoice.accountingCustomerParty?.party?.postalAddress?.country
            ?.identificationCode;
        },
        location:
          'cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode',
      },

      // BR-13: Invoice shall have at least one line
      {
        id: 'BR-13',
        description: 'An Invoice shall have at least one Invoice line (BG-25).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return Array.isArray(invoice.invoiceLine) && invoice.invoiceLine.length > 0;
        },
        location: 'cac:InvoiceLine',
      },

      // BR-14: Invoice shall have legal monetary total
      {
        id: 'BR-14',
        description: 'An Invoice shall have the Invoice total amount without VAT (BT-109).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.legalMonetaryTotal?.taxExclusiveAmount !== undefined;
        },
        location: 'cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount',
      },

      // BR-15: Invoice total with VAT
      {
        id: 'BR-15',
        description: 'An Invoice shall have the Invoice total amount with VAT (BT-112).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.legalMonetaryTotal?.taxInclusiveAmount !== undefined;
        },
        location: 'cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount',
      },

      // BR-16: Amount due
      {
        id: 'BR-16',
        description: 'An Invoice shall have the Amount due for payment (BT-115).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.legalMonetaryTotal?.payableAmount !== undefined;
        },
        location: 'cac:LegalMonetaryTotal/cbc:PayableAmount',
      },

      // BR-21: Each invoice line shall have identifier
      {
        id: 'BR-21',
        description: 'Each Invoice line shall have an Invoice line identifier (BT-126).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.invoiceLine?.every((line) => !!line.id);
        },
        location: 'cac:InvoiceLine/cbc:ID',
      },

      // BR-22: Each invoice line shall have invoiced quantity
      {
        id: 'BR-22',
        description: 'Each Invoice line shall have an Invoiced quantity (BT-129).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.invoiceLine?.every((line) => line.invoicedQuantity?.value !== undefined);
        },
        location: 'cac:InvoiceLine/cbc:InvoicedQuantity',
      },

      // BR-23: Each invoice line shall have invoiced quantity unit
      {
        id: 'BR-23',
        description:
          'An Invoice line shall have an Invoiced quantity unit of measure code (BT-130).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.invoiceLine?.every((line) => !!line.invoicedQuantity?.unitCode);
        },
        location: 'cac:InvoiceLine/cbc:InvoicedQuantity/@unitCode',
      },

      // BR-24: Each invoice line shall have net amount
      {
        id: 'BR-24',
        description: 'Each Invoice line shall have an Invoice line net amount (BT-131).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.invoiceLine?.every(
            (line) => line.lineExtensionAmount?.value !== undefined,
          );
        },
        location: 'cac:InvoiceLine/cbc:LineExtensionAmount',
      },

      // BR-25: Each invoice line item shall have a name
      {
        id: 'BR-25',
        description: 'Each Invoice line shall contain the Item name (BT-153).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.invoiceLine?.every((line) => !!line.item?.name);
        },
        location: 'cac:InvoiceLine/cac:Item/cbc:Name',
      },

      // BR-26: Each invoice line item shall have price
      {
        id: 'BR-26',
        description: 'Each Invoice line shall contain the Item net price (BT-146).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.invoiceLine?.every((line) => line.price?.priceAmount?.value !== undefined);
        },
        location: 'cac:InvoiceLine/cac:Price/cbc:PriceAmount',
      },

      // BR-27: Each invoice line shall have tax category
      {
        id: 'BR-27',
        description: 'Each Invoice line shall contain the tax category (BT-151).',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return invoice.invoiceLine?.every((line) => !!line.item?.classifiedTaxCategory?.id);
        },
        location: 'cac:InvoiceLine/cac:Item/cac:ClassifiedTaxCategory/cbc:ID',
      },

      // PEPPOL-EN16931-R001: Customization ID
      {
        id: 'PEPPOL-EN16931-R001',
        description: 'Customization ID must match Peppol BIS Billing 3.0',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return (
            invoice.customizationId === this.BIS_CUSTOMIZATION_ID ||
            invoice.customizationId?.includes('peppol.eu:2017:poacc:billing:3.0')
          );
        },
        location: 'cbc:CustomizationID',
      },

      // PEPPOL-EN16931-R002: Profile ID
      {
        id: 'PEPPOL-EN16931-R002',
        description: 'Profile ID must match Peppol BIS Billing',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          return (
            invoice.profileId === this.BIS_PROFILE_ID || invoice.profileId?.includes('peppol.eu')
          );
        },
        location: 'cbc:ProfileID',
      },

      // PEPPOL-EN16931-R003: Seller endpoint ID
      {
        id: 'PEPPOL-EN16931-R003',
        description: 'Seller electronic address must have valid scheme',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          const schemeId = invoice.accountingSupplierParty?.party?.endpointId?.schemeId;
          return !schemeId || this.VALID_ENDPOINT_SCHEMES.includes(schemeId);
        },
        location: 'cac:AccountingSupplierParty/cac:Party/cbc:EndpointID/@schemeID',
      },

      // PEPPOL-EN16931-R004: Buyer endpoint ID
      {
        id: 'PEPPOL-EN16931-R004',
        description: 'Buyer electronic address must have valid scheme',
        severity: 'error',
        validate: (doc) => {
          const invoice = doc as UblInvoice;
          const schemeId = invoice.accountingCustomerParty?.party?.endpointId?.schemeId;
          return !schemeId || this.VALID_ENDPOINT_SCHEMES.includes(schemeId);
        },
        location: 'cac:AccountingCustomerParty/cac:Party/cbc:EndpointID/@schemeID',
      },
    ];
  }

  /**
   * Get Credit Note validation rules
   */
  private getCreditNoteValidationRules(): ValidationRule[] {
    return [
      // BR-01: Credit note number is mandatory
      {
        id: 'BR-01',
        description: 'A Credit Note shall have a Credit Note number (BT-1).',
        severity: 'error',
        validate: (doc) => !!(doc as UblCreditNote).id && (doc as UblCreditNote).id.trim() !== '',
        location: 'cbc:ID',
      },

      // BR-02: Credit note issue date is mandatory
      {
        id: 'BR-02',
        description: 'A Credit Note shall have an issue date (BT-2).',
        severity: 'error',
        validate: (doc) => !!(doc as UblCreditNote).issueDate,
        location: 'cbc:IssueDate',
      },

      // BR-04: Credit note type code is mandatory
      {
        id: 'BR-04',
        description: 'A Credit Note shall have a Credit Note type code (BT-3).',
        severity: 'error',
        validate: (doc) => {
          const cn = doc as UblCreditNote;
          return (
            !!cn.creditNoteTypeCode && this.VALID_CREDIT_NOTE_TYPES.includes(cn.creditNoteTypeCode)
          );
        },
        location: 'cbc:CreditNoteTypeCode',
      },

      // BR-05: Document currency code is mandatory
      {
        id: 'BR-05',
        description: 'A Credit Note shall have a currency code (BT-5).',
        severity: 'error',
        validate: (doc) => {
          const cn = doc as UblCreditNote;
          return (
            !!cn.documentCurrencyCode && this.VALID_CURRENCY_CODES.includes(cn.documentCurrencyCode)
          );
        },
        location: 'cbc:DocumentCurrencyCode',
      },

      // BR-06: Seller name is mandatory
      {
        id: 'BR-06',
        description: 'A Credit Note shall contain the Seller name (BT-27).',
        severity: 'error',
        validate: (doc) => {
          const cn = doc as UblCreditNote;
          return !!(
            cn.accountingSupplierParty?.party?.partyLegalEntity?.[0]?.registrationName ||
            cn.accountingSupplierParty?.party?.partyName?.[0]?.name
          );
        },
        location: 'cac:AccountingSupplierParty/cac:Party',
      },

      // BR-07: Buyer name is mandatory
      {
        id: 'BR-07',
        description: 'A Credit Note shall contain the Buyer name (BT-44).',
        severity: 'error',
        validate: (doc) => {
          const cn = doc as UblCreditNote;
          return !!(
            cn.accountingCustomerParty?.party?.partyLegalEntity?.[0]?.registrationName ||
            cn.accountingCustomerParty?.party?.partyName?.[0]?.name
          );
        },
        location: 'cac:AccountingCustomerParty/cac:Party',
      },

      // BR-13: Credit note shall have at least one line
      {
        id: 'BR-13',
        description: 'A Credit Note shall have at least one Credit Note line (BG-25).',
        severity: 'error',
        validate: (doc) => {
          const cn = doc as UblCreditNote;
          return Array.isArray(cn.creditNoteLine) && cn.creditNoteLine.length > 0;
        },
        location: 'cac:CreditNoteLine',
      },

      // BR-55: Credit note shall reference invoice
      {
        id: 'BR-55',
        description: 'A Credit Note shall contain a reference to the invoiced document (BG-3).',
        severity: 'warning',
        validate: (doc) => {
          const cn = doc as UblCreditNote;
          return !!(
            cn.billingReference?.length && cn.billingReference[0]?.invoiceDocumentReference?.id
          );
        },
        location: 'cac:BillingReference/cac:InvoiceDocumentReference',
      },

      // PEPPOL-EN16931-R001: Customization ID
      {
        id: 'PEPPOL-EN16931-R001',
        description: 'Customization ID must match Peppol BIS Billing 3.0',
        severity: 'error',
        validate: (doc) => {
          const cn = doc as UblCreditNote;
          return (
            cn.customizationId === this.BIS_CUSTOMIZATION_ID ||
            cn.customizationId?.includes('peppol.eu:2017:poacc:billing:3.0')
          );
        },
        location: 'cbc:CustomizationID',
      },

      // PEPPOL-EN16931-R002: Profile ID
      {
        id: 'PEPPOL-EN16931-R002',
        description: 'Profile ID must match Peppol BIS Billing',
        severity: 'error',
        validate: (doc) => {
          const cn = doc as UblCreditNote;
          return cn.profileId === this.BIS_PROFILE_ID || cn.profileId?.includes('peppol.eu');
        },
        location: 'cbc:ProfileID',
      },
    ];
  }

  /**
   * Additional Schematron-like validation rules for Invoice
   */
  private validateSchematronRules(
    invoice: UblInvoice,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
    infos: PeppolValidationError[],
  ): void {
    // BR-CO-10: Sum of line amounts
    const lineExtensionSum =
      invoice.invoiceLine?.reduce((sum, line) => sum + (line.lineExtensionAmount?.value || 0), 0) ||
      0;

    if (invoice.legalMonetaryTotal?.lineExtensionAmount) {
      const diff = Math.abs(
        lineExtensionSum - invoice.legalMonetaryTotal.lineExtensionAmount.value,
      );
      if (diff > 0.01) {
        errors.push({
          code: 'BR-CO-10',
          message: `Sum of Invoice line net amounts (${lineExtensionSum.toFixed(2)}) does not match Line extension amount (${invoice.legalMonetaryTotal.lineExtensionAmount.value.toFixed(2)})`,
          severity: 'error',
          location: 'cac:LegalMonetaryTotal/cbc:LineExtensionAmount',
        });
      }
    }

    // BR-CO-13: Tax exclusive = line extension - allowances + charges
    if (invoice.legalMonetaryTotal) {
      const lineExt = invoice.legalMonetaryTotal.lineExtensionAmount?.value || 0;
      const allowances = invoice.legalMonetaryTotal.allowanceTotalAmount?.value || 0;
      const charges = invoice.legalMonetaryTotal.chargeTotalAmount?.value || 0;
      const expected = lineExt - allowances + charges;
      const actual = invoice.legalMonetaryTotal.taxExclusiveAmount?.value || 0;

      if (Math.abs(expected - actual) > 0.01) {
        errors.push({
          code: 'BR-CO-13',
          message: `Tax exclusive amount (${actual.toFixed(2)}) does not match calculation: line extension (${lineExt.toFixed(2)}) - allowances (${allowances.toFixed(2)}) + charges (${charges.toFixed(2)}) = ${expected.toFixed(2)}`,
          severity: 'error',
          location: 'cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount',
        });
      }
    }

    // BR-CO-15: Tax inclusive = Tax exclusive + Tax amount
    if (invoice.legalMonetaryTotal && invoice.taxTotal?.length) {
      const taxExclusive = invoice.legalMonetaryTotal.taxExclusiveAmount?.value || 0;
      const taxAmount = invoice.taxTotal[0].taxAmount?.value || 0;
      const expected = taxExclusive + taxAmount;
      const actual = invoice.legalMonetaryTotal.taxInclusiveAmount?.value || 0;

      if (Math.abs(expected - actual) > 0.01) {
        errors.push({
          code: 'BR-CO-15',
          message: `Tax inclusive amount (${actual.toFixed(2)}) does not match calculation: tax exclusive (${taxExclusive.toFixed(2)}) + tax amount (${taxAmount.toFixed(2)}) = ${expected.toFixed(2)}`,
          severity: 'error',
          location: 'cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount',
        });
      }
    }

    // BR-CO-16: Payable amount = Tax inclusive - Prepaid + Rounding
    if (invoice.legalMonetaryTotal) {
      const taxInclusive = invoice.legalMonetaryTotal.taxInclusiveAmount?.value || 0;
      const prepaid = invoice.legalMonetaryTotal.prepaidAmount?.value || 0;
      const rounding = invoice.legalMonetaryTotal.payableRoundingAmount?.value || 0;
      const expected = taxInclusive - prepaid + rounding;
      const actual = invoice.legalMonetaryTotal.payableAmount?.value || 0;

      if (Math.abs(expected - actual) > 0.01) {
        errors.push({
          code: 'BR-CO-16',
          message: `Payable amount (${actual.toFixed(2)}) does not match calculation: tax inclusive (${taxInclusive.toFixed(2)}) - prepaid (${prepaid.toFixed(2)}) + rounding (${rounding.toFixed(2)}) = ${expected.toFixed(2)}`,
          severity: 'error',
          location: 'cac:LegalMonetaryTotal/cbc:PayableAmount',
        });
      }
    }

    // BR-S-08: Tax rate must be non-negative for category S
    for (const line of invoice.invoiceLine || []) {
      const taxCategory = line.item?.classifiedTaxCategory;
      if (
        taxCategory?.id === 'S' &&
        (taxCategory.percent === undefined || taxCategory.percent < 0)
      ) {
        errors.push({
          code: 'BR-S-08',
          message: `Invoice line ${line.id}: Standard rated (S) items must have a non-negative tax rate`,
          severity: 'error',
          location: `cac:InvoiceLine[cbc:ID='${line.id}']/cac:Item/cac:ClassifiedTaxCategory`,
        });
      }
    }

    // BR-Z-08: Tax rate must be 0 for category Z
    for (const line of invoice.invoiceLine || []) {
      const taxCategory = line.item?.classifiedTaxCategory;
      if (taxCategory?.id === 'Z' && taxCategory.percent !== 0) {
        errors.push({
          code: 'BR-Z-08',
          message: `Invoice line ${line.id}: Zero rated (Z) items must have a tax rate of 0`,
          severity: 'error',
          location: `cac:InvoiceLine[cbc:ID='${line.id}']/cac:Item/cac:ClassifiedTaxCategory`,
        });
      }
    }

    // Check for duplicate line IDs
    const lineIds = invoice.invoiceLine?.map((l) => l.id) || [];
    const duplicateIds = lineIds.filter((id, index) => lineIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push({
        code: 'BR-CO-21',
        message: `Duplicate Invoice line identifiers found: ${duplicateIds.join(', ')}`,
        severity: 'error',
        location: 'cac:InvoiceLine/cbc:ID',
      });
    }

    // UBL-CR-001: UBL version should be 2.1
    if (invoice.ublVersionId && invoice.ublVersionId !== '2.1') {
      warnings.push({
        code: 'UBL-CR-001',
        message: `UBL version is ${invoice.ublVersionId}, expected 2.1`,
        severity: 'warning',
        location: 'cbc:UBLVersionID',
      });
    }

    // Info: Check for recommended fields
    if (!invoice.buyerReference) {
      infos.push({
        code: 'PEPPOL-INFO-001',
        message: 'Buyer reference is recommended for easier payment reconciliation',
        severity: 'info',
        location: 'cbc:BuyerReference',
      });
    }

    if (!invoice.paymentMeans?.length) {
      infos.push({
        code: 'PEPPOL-INFO-002',
        message: 'Payment means information is recommended',
        severity: 'info',
        location: 'cac:PaymentMeans',
      });
    }
  }

  /**
   * Additional Schematron-like validation rules for Credit Note
   */
  private validateCreditNoteSchematronRules(
    creditNote: UblCreditNote,
    errors: PeppolValidationError[],
    warnings: PeppolValidationError[],
    infos: PeppolValidationError[],
  ): void {
    // BR-CO-10: Sum of line amounts
    const lineExtensionSum =
      creditNote.creditNoteLine?.reduce(
        (sum, line) => sum + (line.lineExtensionAmount?.value || 0),
        0,
      ) || 0;

    if (creditNote.legalMonetaryTotal?.lineExtensionAmount) {
      const diff = Math.abs(
        lineExtensionSum - creditNote.legalMonetaryTotal.lineExtensionAmount.value,
      );
      if (diff > 0.01) {
        errors.push({
          code: 'BR-CO-10',
          message: `Sum of Credit Note line net amounts (${lineExtensionSum.toFixed(2)}) does not match Line extension amount (${creditNote.legalMonetaryTotal.lineExtensionAmount.value.toFixed(2)})`,
          severity: 'error',
          location: 'cac:LegalMonetaryTotal/cbc:LineExtensionAmount',
        });
      }
    }

    // Check for duplicate line IDs
    const lineIds = creditNote.creditNoteLine?.map((l) => l.id) || [];
    const duplicateIds = lineIds.filter((id, index) => lineIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push({
        code: 'BR-CO-21',
        message: `Duplicate Credit Note line identifiers found: ${duplicateIds.join(', ')}`,
        severity: 'error',
        location: 'cac:CreditNoteLine/cbc:ID',
      });
    }
  }
}
