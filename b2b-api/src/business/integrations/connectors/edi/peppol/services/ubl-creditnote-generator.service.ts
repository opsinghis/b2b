import { Injectable } from '@nestjs/common';
import {
  UblCreditNote,
  UblParty,
  UblAddress,
  UblTaxTotal,
  UblTaxSubtotal,
  UblTaxCategory,
  UblCreditNoteLine,
  UblLegalMonetaryTotal,
  UblPaymentMeans,
  UblAllowanceCharge,
  UblDocumentReference,
  UblAmount,
  UblItem,
  UblPrice,
} from '../interfaces';

/**
 * UBL 2.1 Credit Note Generator Service
 *
 * Generates UBL 2.1 compliant Credit Note XML documents
 * following Peppol BIS Billing 3.0 specification.
 */
@Injectable()
export class UblCreditNoteGeneratorService {
  /** Peppol BIS Billing 3.0 Customization ID */
  private readonly CUSTOMIZATION_ID =
    'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0';

  /** Peppol BIS Billing Profile ID */
  private readonly PROFILE_ID = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';

  /** UBL 2.1 namespace */
  private readonly UBL_NS = 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2';
  private readonly CBC_NS = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
  private readonly CAC_NS =
    'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';

  /**
   * Generate UBL 2.1 Credit Note XML
   */
  generateCreditNote(creditNote: UblCreditNote): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      this.openTag('CreditNote', {
        xmlns: this.UBL_NS,
        'xmlns:cbc': this.CBC_NS,
        'xmlns:cac': this.CAC_NS,
      }),
    );

    // Header elements
    lines.push(
      this.cbcElement('CustomizationID', creditNote.customizationId || this.CUSTOMIZATION_ID),
    );
    lines.push(this.cbcElement('ProfileID', creditNote.profileId || this.PROFILE_ID));
    lines.push(this.cbcElement('ID', creditNote.id));
    lines.push(this.cbcElement('IssueDate', creditNote.issueDate));
    lines.push(this.cbcElement('CreditNoteTypeCode', creditNote.creditNoteTypeCode));

    if (creditNote.note?.length) {
      for (const note of creditNote.note) {
        lines.push(this.cbcElement('Note', this.escapeXml(note)));
      }
    }

    if (creditNote.taxPointDate) {
      lines.push(this.cbcElement('TaxPointDate', creditNote.taxPointDate));
    }

    lines.push(this.cbcElement('DocumentCurrencyCode', creditNote.documentCurrencyCode));

    if (creditNote.taxCurrencyCode) {
      lines.push(this.cbcElement('TaxCurrencyCode', creditNote.taxCurrencyCode));
    }

    if (creditNote.accountingCost) {
      lines.push(this.cbcElement('AccountingCost', this.escapeXml(creditNote.accountingCost)));
    }

    if (creditNote.buyerReference) {
      lines.push(this.cbcElement('BuyerReference', this.escapeXml(creditNote.buyerReference)));
    }

    // Credit Note Period
    if (creditNote.invoicePeriod) {
      lines.push(this.generatePeriod(creditNote.invoicePeriod));
    }

    // Order Reference
    if (creditNote.orderReference) {
      lines.push(this.openTag('cac:OrderReference'));
      lines.push(this.cbcElement('ID', creditNote.orderReference.id));
      if (creditNote.orderReference.salesOrderId) {
        lines.push(this.cbcElement('SalesOrderID', creditNote.orderReference.salesOrderId));
      }
      lines.push(this.closeTag('cac:OrderReference'));
    }

    // Billing Reference (required for credit notes - reference to original invoice)
    if (creditNote.billingReference?.length) {
      for (const ref of creditNote.billingReference) {
        lines.push(this.generateBillingReference(ref));
      }
    }

    // Document References
    if (creditNote.despatchDocumentReference) {
      lines.push(
        this.generateDocumentReference(
          'DespatchDocumentReference',
          creditNote.despatchDocumentReference,
        ),
      );
    }
    if (creditNote.receiptDocumentReference) {
      lines.push(
        this.generateDocumentReference(
          'ReceiptDocumentReference',
          creditNote.receiptDocumentReference,
        ),
      );
    }
    if (creditNote.originatorDocumentReference) {
      lines.push(
        this.generateDocumentReference(
          'OriginatorDocumentReference',
          creditNote.originatorDocumentReference,
        ),
      );
    }
    if (creditNote.contractDocumentReference) {
      lines.push(
        this.generateDocumentReference(
          'ContractDocumentReference',
          creditNote.contractDocumentReference,
        ),
      );
    }
    if (creditNote.additionalDocumentReference?.length) {
      for (const ref of creditNote.additionalDocumentReference) {
        lines.push(this.generateDocumentReference('AdditionalDocumentReference', ref));
      }
    }

    // Project Reference
    if (creditNote.projectReference) {
      lines.push(this.openTag('cac:ProjectReference'));
      lines.push(this.cbcElement('ID', creditNote.projectReference.id));
      lines.push(this.closeTag('cac:ProjectReference'));
    }

    // Accounting Supplier Party (Seller)
    lines.push(this.openTag('cac:AccountingSupplierParty'));
    lines.push(this.generateParty(creditNote.accountingSupplierParty.party));
    lines.push(this.closeTag('cac:AccountingSupplierParty'));

    // Accounting Customer Party (Buyer)
    lines.push(this.openTag('cac:AccountingCustomerParty'));
    lines.push(this.generateParty(creditNote.accountingCustomerParty.party));
    lines.push(this.closeTag('cac:AccountingCustomerParty'));

    // Payee Party
    if (creditNote.payeeParty) {
      lines.push(this.openTag('cac:PayeeParty'));
      lines.push(this.generatePartyContent(creditNote.payeeParty));
      lines.push(this.closeTag('cac:PayeeParty'));
    }

    // Tax Representative Party
    if (creditNote.taxRepresentativeParty) {
      lines.push(this.openTag('cac:TaxRepresentativeParty'));
      lines.push(this.generatePartyContent(creditNote.taxRepresentativeParty));
      lines.push(this.closeTag('cac:TaxRepresentativeParty'));
    }

    // Delivery
    if (creditNote.delivery?.length) {
      for (const delivery of creditNote.delivery) {
        lines.push(this.generateDelivery(delivery));
      }
    }

    // Payment Means
    if (creditNote.paymentMeans?.length) {
      for (const pm of creditNote.paymentMeans) {
        lines.push(this.generatePaymentMeans(pm));
      }
    }

    // Payment Terms
    if (creditNote.paymentTerms) {
      lines.push(this.openTag('cac:PaymentTerms'));
      if (creditNote.paymentTerms.note?.length) {
        for (const note of creditNote.paymentTerms.note) {
          lines.push(this.cbcElement('Note', this.escapeXml(note)));
        }
      }
      lines.push(this.closeTag('cac:PaymentTerms'));
    }

    // Document Level Allowance/Charge
    if (creditNote.allowanceCharge?.length) {
      for (const ac of creditNote.allowanceCharge) {
        lines.push(this.generateAllowanceCharge(ac, false));
      }
    }

    // Tax Total
    for (const taxTotal of creditNote.taxTotal) {
      lines.push(this.generateTaxTotal(taxTotal));
    }

    // Legal Monetary Total
    lines.push(this.generateLegalMonetaryTotal(creditNote.legalMonetaryTotal));

    // Credit Note Lines
    for (const line of creditNote.creditNoteLine) {
      lines.push(this.generateCreditNoteLine(line));
    }

    lines.push(this.closeTag('CreditNote'));

    return lines.join('\n');
  }

  /**
   * Generate cbc element
   */
  private cbcElement(
    name: string,
    value: string | number,
    attributes?: Record<string, string>,
  ): string {
    const attrs = this.formatAttributes(attributes);
    return `  <cbc:${name}${attrs}>${value}</cbc:${name}>`;
  }

  /**
   * Generate cac opening tag
   */
  private openTag(name: string, attributes?: Record<string, string>): string {
    const attrs = this.formatAttributes(attributes);
    return `<${name}${attrs}>`;
  }

  /**
   * Generate closing tag
   */
  private closeTag(name: string): string {
    return `</${name}>`;
  }

  /**
   * Format attributes for XML tag
   */
  private formatAttributes(attributes?: Record<string, string>): string {
    if (!attributes) return '';
    return Object.entries(attributes)
      .map(([key, value]) => ` ${key}="${this.escapeXml(value)}"`)
      .join('');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate Period element
   */
  private generatePeriod(period: {
    startDate?: string;
    endDate?: string;
    descriptionCode?: string;
  }): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:InvoicePeriod'));
    if (period.startDate) {
      lines.push(this.cbcElement('StartDate', period.startDate));
    }
    if (period.endDate) {
      lines.push(this.cbcElement('EndDate', period.endDate));
    }
    if (period.descriptionCode) {
      lines.push(this.cbcElement('DescriptionCode', period.descriptionCode));
    }
    lines.push(this.closeTag('cac:InvoicePeriod'));
    return lines.join('\n');
  }

  /**
   * Generate Billing Reference
   */
  private generateBillingReference(ref: {
    invoiceDocumentReference?: { id: string; issueDate?: string };
    creditNoteDocumentReference?: { id: string; issueDate?: string };
  }): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:BillingReference'));

    if (ref.invoiceDocumentReference) {
      lines.push(this.openTag('cac:InvoiceDocumentReference'));
      lines.push(this.cbcElement('ID', ref.invoiceDocumentReference.id));
      if (ref.invoiceDocumentReference.issueDate) {
        lines.push(this.cbcElement('IssueDate', ref.invoiceDocumentReference.issueDate));
      }
      lines.push(this.closeTag('cac:InvoiceDocumentReference'));
    }

    if (ref.creditNoteDocumentReference) {
      lines.push(this.openTag('cac:CreditNoteDocumentReference'));
      lines.push(this.cbcElement('ID', ref.creditNoteDocumentReference.id));
      if (ref.creditNoteDocumentReference.issueDate) {
        lines.push(this.cbcElement('IssueDate', ref.creditNoteDocumentReference.issueDate));
      }
      lines.push(this.closeTag('cac:CreditNoteDocumentReference'));
    }

    lines.push(this.closeTag('cac:BillingReference'));
    return lines.join('\n');
  }

  /**
   * Generate Document Reference
   */
  private generateDocumentReference(elementName: string, ref: UblDocumentReference): string {
    const lines: string[] = [];
    lines.push(this.openTag(`cac:${elementName}`));

    if (ref.id.schemeId) {
      lines.push(this.cbcElement('ID', ref.id.value, { schemeID: ref.id.schemeId }));
    } else {
      lines.push(this.cbcElement('ID', ref.id.value));
    }

    if (ref.issueDate) {
      lines.push(this.cbcElement('IssueDate', ref.issueDate));
    }

    if (ref.documentTypeCode) {
      lines.push(this.cbcElement('DocumentTypeCode', ref.documentTypeCode));
    }

    if (ref.documentDescription?.length) {
      for (const desc of ref.documentDescription) {
        lines.push(this.cbcElement('DocumentDescription', this.escapeXml(desc)));
      }
    }

    if (ref.attachment) {
      lines.push(this.openTag('cac:Attachment'));
      if (ref.attachment.embeddedDocumentBinaryObject) {
        const obj = ref.attachment.embeddedDocumentBinaryObject;
        lines.push(
          `  <cbc:EmbeddedDocumentBinaryObject mimeCode="${obj.mimeCode}" filename="${this.escapeXml(obj.filename)}">${obj.content}</cbc:EmbeddedDocumentBinaryObject>`,
        );
      }
      if (ref.attachment.externalReference) {
        lines.push(this.openTag('cac:ExternalReference'));
        lines.push(this.cbcElement('URI', ref.attachment.externalReference.uri));
        lines.push(this.closeTag('cac:ExternalReference'));
      }
      lines.push(this.closeTag('cac:Attachment'));
    }

    lines.push(this.closeTag(`cac:${elementName}`));
    return lines.join('\n');
  }

  /**
   * Generate Party element (wrapper)
   */
  private generateParty(party: UblParty): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:Party'));
    lines.push(this.generatePartyContent(party));
    lines.push(this.closeTag('cac:Party'));
    return lines.join('\n');
  }

  /**
   * Generate Party content (without wrapper)
   */
  private generatePartyContent(party: UblParty): string {
    const lines: string[] = [];

    // Endpoint ID
    lines.push(
      this.cbcElement('EndpointID', party.endpointId.value, {
        schemeID: party.endpointId.schemeId,
      }),
    );

    // Party Identification
    if (party.partyIdentification?.length) {
      for (const pi of party.partyIdentification) {
        lines.push(this.openTag('cac:PartyIdentification'));
        if (pi.id.schemeId) {
          lines.push(this.cbcElement('ID', pi.id.value, { schemeID: pi.id.schemeId }));
        } else {
          lines.push(this.cbcElement('ID', pi.id.value));
        }
        lines.push(this.closeTag('cac:PartyIdentification'));
      }
    }

    // Party Name
    if (party.partyName?.length) {
      for (const pn of party.partyName) {
        lines.push(this.openTag('cac:PartyName'));
        lines.push(this.cbcElement('Name', this.escapeXml(pn.name)));
        lines.push(this.closeTag('cac:PartyName'));
      }
    }

    // Postal Address
    if (party.postalAddress) {
      lines.push(this.generateAddress(party.postalAddress));
    }

    // Party Tax Scheme
    if (party.partyTaxScheme?.length) {
      for (const pts of party.partyTaxScheme) {
        lines.push(this.openTag('cac:PartyTaxScheme'));
        if (pts.companyId) {
          lines.push(this.cbcElement('CompanyID', pts.companyId));
        }
        lines.push(this.openTag('cac:TaxScheme'));
        lines.push(this.cbcElement('ID', pts.taxScheme.id));
        lines.push(this.closeTag('cac:TaxScheme'));
        lines.push(this.closeTag('cac:PartyTaxScheme'));
      }
    }

    // Party Legal Entity
    if (party.partyLegalEntity?.length) {
      for (const ple of party.partyLegalEntity) {
        lines.push(this.openTag('cac:PartyLegalEntity'));
        lines.push(this.cbcElement('RegistrationName', this.escapeXml(ple.registrationName)));
        if (ple.companyId) {
          if (ple.companyId.schemeId) {
            lines.push(
              this.cbcElement('CompanyID', ple.companyId.value, {
                schemeID: ple.companyId.schemeId,
              }),
            );
          } else {
            lines.push(this.cbcElement('CompanyID', ple.companyId.value));
          }
        }
        if (ple.companyLegalForm) {
          lines.push(this.cbcElement('CompanyLegalForm', this.escapeXml(ple.companyLegalForm)));
        }
        lines.push(this.closeTag('cac:PartyLegalEntity'));
      }
    }

    // Contact
    if (party.contact) {
      lines.push(this.openTag('cac:Contact'));
      if (party.contact.name) {
        lines.push(this.cbcElement('Name', this.escapeXml(party.contact.name)));
      }
      if (party.contact.telephone) {
        lines.push(this.cbcElement('Telephone', party.contact.telephone));
      }
      if (party.contact.electronicMail) {
        lines.push(this.cbcElement('ElectronicMail', party.contact.electronicMail));
      }
      lines.push(this.closeTag('cac:Contact'));
    }

    return lines.join('\n');
  }

  /**
   * Generate Address element
   */
  private generateAddress(address: UblAddress): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:PostalAddress'));

    if (address.streetName) {
      lines.push(this.cbcElement('StreetName', this.escapeXml(address.streetName)));
    }
    if (address.additionalStreetName) {
      lines.push(
        this.cbcElement('AdditionalStreetName', this.escapeXml(address.additionalStreetName)),
      );
    }
    if (address.cityName) {
      lines.push(this.cbcElement('CityName', this.escapeXml(address.cityName)));
    }
    if (address.postalZone) {
      lines.push(this.cbcElement('PostalZone', address.postalZone));
    }
    if (address.countrySubentity) {
      lines.push(this.cbcElement('CountrySubentity', this.escapeXml(address.countrySubentity)));
    }
    if (address.addressLine?.length) {
      for (const al of address.addressLine) {
        lines.push(this.openTag('cac:AddressLine'));
        lines.push(this.cbcElement('Line', this.escapeXml(al.line)));
        lines.push(this.closeTag('cac:AddressLine'));
      }
    }
    lines.push(this.openTag('cac:Country'));
    lines.push(this.cbcElement('IdentificationCode', address.country.identificationCode));
    lines.push(this.closeTag('cac:Country'));

    lines.push(this.closeTag('cac:PostalAddress'));
    return lines.join('\n');
  }

  /**
   * Generate Delivery element
   */
  private generateDelivery(delivery: {
    actualDeliveryDate?: string;
    deliveryLocation?: {
      id?: { schemeId?: string; value: string };
      address?: UblAddress;
    };
    deliveryParty?: { partyName?: Array<{ name: string }> };
  }): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:Delivery'));

    if (delivery.actualDeliveryDate) {
      lines.push(this.cbcElement('ActualDeliveryDate', delivery.actualDeliveryDate));
    }

    if (delivery.deliveryLocation) {
      lines.push(this.openTag('cac:DeliveryLocation'));
      if (delivery.deliveryLocation.id) {
        if (delivery.deliveryLocation.id.schemeId) {
          lines.push(
            this.cbcElement('ID', delivery.deliveryLocation.id.value, {
              schemeID: delivery.deliveryLocation.id.schemeId,
            }),
          );
        } else {
          lines.push(this.cbcElement('ID', delivery.deliveryLocation.id.value));
        }
      }
      if (delivery.deliveryLocation.address) {
        lines.push(this.generateAddressElement(delivery.deliveryLocation.address, 'Address'));
      }
      lines.push(this.closeTag('cac:DeliveryLocation'));
    }

    if (delivery.deliveryParty) {
      lines.push(this.openTag('cac:DeliveryParty'));
      if (delivery.deliveryParty.partyName?.length) {
        for (const pn of delivery.deliveryParty.partyName) {
          lines.push(this.openTag('cac:PartyName'));
          lines.push(this.cbcElement('Name', this.escapeXml(pn.name)));
          lines.push(this.closeTag('cac:PartyName'));
        }
      }
      lines.push(this.closeTag('cac:DeliveryParty'));
    }

    lines.push(this.closeTag('cac:Delivery'));
    return lines.join('\n');
  }

  /**
   * Generate Address with custom element name
   */
  private generateAddressElement(address: UblAddress, elementName: string): string {
    const lines: string[] = [];
    lines.push(this.openTag(`cac:${elementName}`));

    if (address.streetName) {
      lines.push(this.cbcElement('StreetName', this.escapeXml(address.streetName)));
    }
    if (address.additionalStreetName) {
      lines.push(
        this.cbcElement('AdditionalStreetName', this.escapeXml(address.additionalStreetName)),
      );
    }
    if (address.cityName) {
      lines.push(this.cbcElement('CityName', this.escapeXml(address.cityName)));
    }
    if (address.postalZone) {
      lines.push(this.cbcElement('PostalZone', address.postalZone));
    }
    if (address.countrySubentity) {
      lines.push(this.cbcElement('CountrySubentity', this.escapeXml(address.countrySubentity)));
    }
    if (address.addressLine?.length) {
      for (const al of address.addressLine) {
        lines.push(this.openTag('cac:AddressLine'));
        lines.push(this.cbcElement('Line', this.escapeXml(al.line)));
        lines.push(this.closeTag('cac:AddressLine'));
      }
    }
    lines.push(this.openTag('cac:Country'));
    lines.push(this.cbcElement('IdentificationCode', address.country.identificationCode));
    lines.push(this.closeTag('cac:Country'));

    lines.push(this.closeTag(`cac:${elementName}`));
    return lines.join('\n');
  }

  /**
   * Generate Payment Means
   */
  private generatePaymentMeans(pm: UblPaymentMeans): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:PaymentMeans'));

    if (pm.paymentMeansCode.name) {
      lines.push(
        this.cbcElement('PaymentMeansCode', pm.paymentMeansCode.value, {
          name: pm.paymentMeansCode.name,
        }),
      );
    } else {
      lines.push(this.cbcElement('PaymentMeansCode', pm.paymentMeansCode.value));
    }

    if (pm.paymentDueDate) {
      lines.push(this.cbcElement('PaymentDueDate', pm.paymentDueDate));
    }

    if (pm.paymentId?.length) {
      for (const id of pm.paymentId) {
        lines.push(this.cbcElement('PaymentID', id));
      }
    }

    if (pm.cardAccount) {
      lines.push(this.openTag('cac:CardAccount'));
      lines.push(this.cbcElement('PrimaryAccountNumberID', pm.cardAccount.primaryAccountNumberId));
      lines.push(this.cbcElement('NetworkID', pm.cardAccount.networkId));
      if (pm.cardAccount.holderName) {
        lines.push(this.cbcElement('HolderName', this.escapeXml(pm.cardAccount.holderName)));
      }
      lines.push(this.closeTag('cac:CardAccount'));
    }

    if (pm.payeeFinancialAccount) {
      lines.push(this.openTag('cac:PayeeFinancialAccount'));
      lines.push(this.cbcElement('ID', pm.payeeFinancialAccount.id));
      if (pm.payeeFinancialAccount.name) {
        lines.push(this.cbcElement('Name', this.escapeXml(pm.payeeFinancialAccount.name)));
      }
      if (pm.payeeFinancialAccount.financialInstitutionBranch) {
        lines.push(this.openTag('cac:FinancialInstitutionBranch'));
        lines.push(this.cbcElement('ID', pm.payeeFinancialAccount.financialInstitutionBranch.id));
        if (pm.payeeFinancialAccount.financialInstitutionBranch.name) {
          lines.push(
            this.cbcElement(
              'Name',
              this.escapeXml(pm.payeeFinancialAccount.financialInstitutionBranch.name),
            ),
          );
        }
        lines.push(this.closeTag('cac:FinancialInstitutionBranch'));
      }
      lines.push(this.closeTag('cac:PayeeFinancialAccount'));
    }

    if (pm.paymentMandate) {
      lines.push(this.openTag('cac:PaymentMandate'));
      lines.push(this.cbcElement('ID', pm.paymentMandate.id));
      if (pm.paymentMandate.payerFinancialAccount) {
        lines.push(this.openTag('cac:PayerFinancialAccount'));
        lines.push(this.cbcElement('ID', pm.paymentMandate.payerFinancialAccount.id));
        lines.push(this.closeTag('cac:PayerFinancialAccount'));
      }
      lines.push(this.closeTag('cac:PaymentMandate'));
    }

    lines.push(this.closeTag('cac:PaymentMeans'));
    return lines.join('\n');
  }

  /**
   * Generate Allowance/Charge
   */
  private generateAllowanceCharge(ac: UblAllowanceCharge, isLine: boolean): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:AllowanceCharge'));

    lines.push(this.cbcElement('ChargeIndicator', ac.chargeIndicator.toString()));

    if (ac.allowanceChargeReasonCode) {
      lines.push(this.cbcElement('AllowanceChargeReasonCode', ac.allowanceChargeReasonCode));
    }

    if (ac.allowanceChargeReason) {
      lines.push(
        this.cbcElement('AllowanceChargeReason', this.escapeXml(ac.allowanceChargeReason)),
      );
    }

    if (ac.multiplierFactorNumeric !== undefined) {
      lines.push(this.cbcElement('MultiplierFactorNumeric', ac.multiplierFactorNumeric.toString()));
    }

    lines.push(this.generateAmount('Amount', ac.amount));

    if (ac.baseAmount) {
      lines.push(this.generateAmount('BaseAmount', ac.baseAmount));
    }

    if (ac.taxCategory && !isLine) {
      lines.push(this.generateTaxCategory(ac.taxCategory));
    }

    lines.push(this.closeTag('cac:AllowanceCharge'));
    return lines.join('\n');
  }

  /**
   * Generate Amount element
   */
  private generateAmount(elementName: string, amount: UblAmount): string {
    return `  <cbc:${elementName} currencyID="${amount.currencyId}">${amount.value.toFixed(2)}</cbc:${elementName}>`;
  }

  /**
   * Generate Tax Category
   */
  private generateTaxCategory(tc: UblTaxCategory): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:TaxCategory'));

    lines.push(this.cbcElement('ID', tc.id));

    if (tc.percent !== undefined) {
      lines.push(this.cbcElement('Percent', tc.percent.toString()));
    }

    if (tc.taxExemptionReasonCode) {
      lines.push(this.cbcElement('TaxExemptionReasonCode', tc.taxExemptionReasonCode));
    }

    if (tc.taxExemptionReason) {
      lines.push(this.cbcElement('TaxExemptionReason', this.escapeXml(tc.taxExemptionReason)));
    }

    lines.push(this.openTag('cac:TaxScheme'));
    lines.push(this.cbcElement('ID', tc.taxScheme.id));
    lines.push(this.closeTag('cac:TaxScheme'));

    lines.push(this.closeTag('cac:TaxCategory'));
    return lines.join('\n');
  }

  /**
   * Generate Tax Total
   */
  private generateTaxTotal(taxTotal: UblTaxTotal): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:TaxTotal'));

    lines.push(this.generateAmount('TaxAmount', taxTotal.taxAmount));

    if (taxTotal.taxSubtotal?.length) {
      for (const subtotal of taxTotal.taxSubtotal) {
        lines.push(this.generateTaxSubtotal(subtotal));
      }
    }

    lines.push(this.closeTag('cac:TaxTotal'));
    return lines.join('\n');
  }

  /**
   * Generate Tax Subtotal
   */
  private generateTaxSubtotal(subtotal: UblTaxSubtotal): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:TaxSubtotal'));

    lines.push(this.generateAmount('TaxableAmount', subtotal.taxableAmount));
    lines.push(this.generateAmount('TaxAmount', subtotal.taxAmount));
    lines.push(this.generateTaxCategory(subtotal.taxCategory));

    lines.push(this.closeTag('cac:TaxSubtotal'));
    return lines.join('\n');
  }

  /**
   * Generate Legal Monetary Total
   */
  private generateLegalMonetaryTotal(lmt: UblLegalMonetaryTotal): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:LegalMonetaryTotal'));

    lines.push(this.generateAmount('LineExtensionAmount', lmt.lineExtensionAmount));
    lines.push(this.generateAmount('TaxExclusiveAmount', lmt.taxExclusiveAmount));
    lines.push(this.generateAmount('TaxInclusiveAmount', lmt.taxInclusiveAmount));

    if (lmt.allowanceTotalAmount) {
      lines.push(this.generateAmount('AllowanceTotalAmount', lmt.allowanceTotalAmount));
    }

    if (lmt.chargeTotalAmount) {
      lines.push(this.generateAmount('ChargeTotalAmount', lmt.chargeTotalAmount));
    }

    if (lmt.prepaidAmount) {
      lines.push(this.generateAmount('PrepaidAmount', lmt.prepaidAmount));
    }

    if (lmt.payableRoundingAmount) {
      lines.push(this.generateAmount('PayableRoundingAmount', lmt.payableRoundingAmount));
    }

    lines.push(this.generateAmount('PayableAmount', lmt.payableAmount));

    lines.push(this.closeTag('cac:LegalMonetaryTotal'));
    return lines.join('\n');
  }

  /**
   * Generate Credit Note Line
   */
  private generateCreditNoteLine(line: UblCreditNoteLine): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:CreditNoteLine'));

    lines.push(this.cbcElement('ID', line.id));

    if (line.note?.length) {
      for (const note of line.note) {
        lines.push(this.cbcElement('Note', this.escapeXml(note)));
      }
    }

    lines.push(
      `  <cbc:CreditedQuantity unitCode="${line.creditedQuantity.unitCode}">${line.creditedQuantity.value}</cbc:CreditedQuantity>`,
    );
    lines.push(this.generateAmount('LineExtensionAmount', line.lineExtensionAmount));

    if (line.accountingCost) {
      lines.push(this.cbcElement('AccountingCost', this.escapeXml(line.accountingCost)));
    }

    if (line.invoicePeriod) {
      lines.push(this.generatePeriod(line.invoicePeriod));
    }

    if (line.orderLineReference) {
      lines.push(this.openTag('cac:OrderLineReference'));
      lines.push(this.cbcElement('LineID', line.orderLineReference.lineId));
      lines.push(this.closeTag('cac:OrderLineReference'));
    }

    if (line.documentReference?.length) {
      for (const ref of line.documentReference) {
        lines.push(this.generateDocumentReference('DocumentReference', ref));
      }
    }

    if (line.allowanceCharge?.length) {
      for (const ac of line.allowanceCharge) {
        lines.push(this.generateAllowanceCharge(ac, true));
      }
    }

    lines.push(this.generateItem(line.item));
    lines.push(this.generatePrice(line.price));

    lines.push(this.closeTag('cac:CreditNoteLine'));
    return lines.join('\n');
  }

  /**
   * Generate Item
   */
  private generateItem(item: UblItem): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:Item'));

    if (item.description?.length) {
      for (const desc of item.description) {
        lines.push(this.cbcElement('Description', this.escapeXml(desc)));
      }
    }

    lines.push(this.cbcElement('Name', this.escapeXml(item.name)));

    if (item.buyersItemIdentification) {
      lines.push(this.openTag('cac:BuyersItemIdentification'));
      lines.push(this.cbcElement('ID', item.buyersItemIdentification.id));
      lines.push(this.closeTag('cac:BuyersItemIdentification'));
    }

    if (item.sellersItemIdentification) {
      lines.push(this.openTag('cac:SellersItemIdentification'));
      lines.push(this.cbcElement('ID', item.sellersItemIdentification.id));
      lines.push(this.closeTag('cac:SellersItemIdentification'));
    }

    if (item.standardItemIdentification) {
      lines.push(this.openTag('cac:StandardItemIdentification'));
      lines.push(
        this.cbcElement('ID', item.standardItemIdentification.id.value, {
          schemeID: item.standardItemIdentification.id.schemeId,
        }),
      );
      lines.push(this.closeTag('cac:StandardItemIdentification'));
    }

    if (item.originCountry) {
      lines.push(this.openTag('cac:OriginCountry'));
      lines.push(this.cbcElement('IdentificationCode', item.originCountry.identificationCode));
      lines.push(this.closeTag('cac:OriginCountry'));
    }

    if (item.commodityClassification?.length) {
      for (const cc of item.commodityClassification) {
        lines.push(this.openTag('cac:CommodityClassification'));
        lines.push(
          this.cbcElement('ItemClassificationCode', cc.itemClassificationCode.value, {
            listID: cc.itemClassificationCode.listId,
          }),
        );
        lines.push(this.closeTag('cac:CommodityClassification'));
      }
    }

    lines.push(this.generateClassifiedTaxCategory(item.classifiedTaxCategory));

    if (item.additionalItemProperty?.length) {
      for (const prop of item.additionalItemProperty) {
        lines.push(this.openTag('cac:AdditionalItemProperty'));
        lines.push(this.cbcElement('Name', this.escapeXml(prop.name)));
        lines.push(this.cbcElement('Value', this.escapeXml(prop.value)));
        lines.push(this.closeTag('cac:AdditionalItemProperty'));
      }
    }

    lines.push(this.closeTag('cac:Item'));
    return lines.join('\n');
  }

  /**
   * Generate Classified Tax Category
   */
  private generateClassifiedTaxCategory(tc: UblTaxCategory): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:ClassifiedTaxCategory'));

    lines.push(this.cbcElement('ID', tc.id));

    if (tc.percent !== undefined) {
      lines.push(this.cbcElement('Percent', tc.percent.toString()));
    }

    lines.push(this.openTag('cac:TaxScheme'));
    lines.push(this.cbcElement('ID', tc.taxScheme.id));
    lines.push(this.closeTag('cac:TaxScheme'));

    lines.push(this.closeTag('cac:ClassifiedTaxCategory'));
    return lines.join('\n');
  }

  /**
   * Generate Price
   */
  private generatePrice(price: UblPrice): string {
    const lines: string[] = [];
    lines.push(this.openTag('cac:Price'));

    lines.push(this.generateAmount('PriceAmount', price.priceAmount));

    if (price.baseQuantity) {
      lines.push(
        `  <cbc:BaseQuantity unitCode="${price.baseQuantity.unitCode}">${price.baseQuantity.value}</cbc:BaseQuantity>`,
      );
    }

    if (price.allowanceCharge) {
      lines.push(this.generateAllowanceCharge(price.allowanceCharge, true));
    }

    lines.push(this.closeTag('cac:Price'));
    return lines.join('\n');
  }
}
