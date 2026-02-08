import { Injectable } from '@nestjs/common';
import { EdifactGeneratorService } from '../services/edifact-generator.service';
import { EdifactLexerService } from '../services/edifact-lexer.service';
import {
  EdifactMessage,
  EdifactSegment,
  EdifactElement,
  EdifactDelimiters,
  DEFAULT_EDIFACT_DELIMITERS,
  Edifact_ORDERS,
  EdifactOrdersLineItem,
  EdifactParty,
  EdifactReference,
  EdifactDateTime,
  EdifactMonetaryAmount,
  EdifactQuantity,
  EdifactPrice,
  EdifactTax,
  EdifactAllowanceCharge,
  EdifactProductId,
  EdifactFreeText,
} from '../interfaces';

/**
 * EDIFACT ORDERS Message Generator
 *
 * Generates ORDERS (Purchase Order) messages from structured format.
 */
@Injectable()
export class EdifactOrdersGeneratorService {
  constructor(
    private readonly generatorService: EdifactGeneratorService,
    private readonly lexer: EdifactLexerService,
  ) {}

  /**
   * Generate ORDERS message
   */
  generate(orders: Edifact_ORDERS, version: string = 'D', release: string = '96A'): EdifactMessage {
    const segments: EdifactSegment[] = [];
    const messageRef =
      orders.messageReferenceNumber || this.generatorService.generateMessageReference();

    // BGM - Beginning of message
    segments.push(this.generateBGM(orders));

    // DTM - Date/time/period (document date)
    segments.push(this.generateDTM('137', this.formatDateForEdifact(orders.orderDate), '102'));

    // Add additional header dates
    if (orders.dates) {
      for (const dtm of orders.dates) {
        if (dtm.qualifier !== '137') {
          segments.push(this.generateDTM(dtm.qualifier, dtm.value, dtm.formatQualifier));
        }
      }
    }

    // FTX - Free text at header level
    if (orders.freeText) {
      for (const ftx of orders.freeText) {
        segments.push(this.generateFTX(ftx));
      }
    }

    // RFF - References at header level
    if (orders.references) {
      for (const rff of orders.references) {
        segments.push(this.generateRFF(rff));
      }
    }

    // NAD - Name and address (parties)
    for (const party of orders.parties) {
      segments.push(this.generateNAD(party));

      // RFF - References for party
      if (party.references) {
        for (const rff of party.references) {
          segments.push(this.generateRFF(rff));
        }
      }

      // CTA/COM - Contact information
      if (party.contacts) {
        for (const contact of party.contacts) {
          segments.push(this.generateCTA(contact));
          if (contact.communications) {
            for (const com of contact.communications) {
              segments.push(this.generateCOM(com));
            }
          }
        }
      }
    }

    // CUX - Currencies
    if (orders.currency) {
      segments.push(this.generateCUX(orders.currency));
    }

    // PAT - Payment terms
    if (orders.paymentTerms) {
      segments.push(this.generatePAT(orders.paymentTerms));
    }

    // TOD - Terms of delivery
    if (orders.deliveryTerms) {
      segments.push(this.generateTOD(orders.deliveryTerms));
    }

    // TDT - Transport information
    if (orders.transport) {
      segments.push(this.generateTDT(orders.transport));
    }

    // ALC - Allowances/charges at header level
    if (orders.allowancesCharges) {
      for (const alc of orders.allowancesCharges) {
        segments.push(this.generateALC(alc));
      }
    }

    // TAX - Tax at header level
    if (orders.taxes) {
      for (const tax of orders.taxes) {
        segments.push(this.generateTAX(tax));
      }
    }

    // LIN - Line items
    for (const lineItem of orders.lineItems) {
      segments.push(...this.generateLineItem(lineItem));
    }

    // UNS - Section control (start of summary)
    segments.push(this.createSegment('UNS', ['S']));

    // MOA - Monetary amounts at summary level
    if (orders.amounts) {
      for (const moa of orders.amounts) {
        segments.push(this.generateMOA(moa));
      }
    }

    // CNT - Control totals
    if (orders.controlTotals) {
      if (orders.controlTotals.lineItemCount !== undefined) {
        segments.push(this.generateCNT('2', orders.controlTotals.lineItemCount));
      }
      if (orders.controlTotals.totalAmount !== undefined) {
        segments.push(this.generateCNT('39', orders.controlTotals.totalAmount));
      }
    }

    return {
      header: this.generatorService.createUNHSegment(messageRef, 'ORDERS', version, release, 'UN'),
      segments,
      trailer: this.generatorService.createUNTSegment(
        segments.length + 2, // Include UNH and UNT
        messageRef,
      ),
    };
  }

  // Segment generators

  private generateBGM(orders: Edifact_ORDERS): EdifactSegment {
    const elements: EdifactElement[] = [];

    // Element 1: Document/message name
    if (orders.documentTypeCode) {
      elements.push({ value: orders.documentTypeCode });
    } else {
      elements.push({ value: '220' }); // Default: Order
    }

    // Element 2: Document/message identification
    elements.push({ value: orders.orderNumber });

    // Element 3: Message function code
    if (orders.messageFunction) {
      elements.push({ value: orders.messageFunction });
    } else {
      elements.push({ value: '9' }); // Default: Original
    }

    return { segmentId: 'BGM', elements };
  }

  private generateDTM(qualifier: string, value?: string, formatQualifier?: string): EdifactSegment {
    return {
      segmentId: 'DTM',
      elements: [
        {
          value: qualifier,
          components: [qualifier, value || '', formatQualifier || '102'],
        },
      ],
    };
  }

  private generateFTX(ftx: EdifactFreeText): EdifactSegment {
    const components = [ftx.text[0] || ''];
    for (let i = 1; i < ftx.text.length && i < 5; i++) {
      components.push(ftx.text[i]);
    }

    return {
      segmentId: 'FTX',
      elements: [
        { value: ftx.subjectQualifier },
        { value: ftx.functionCode || '' },
        { value: '' }, // Text reference
        { value: components[0], components },
      ],
    };
  }

  private generateRFF(rff: EdifactReference): EdifactSegment {
    const components = [rff.referenceQualifier, rff.referenceNumber || ''];
    if (rff.documentNumber) components.push(rff.documentNumber);
    if (rff.lineNumber) components.push(rff.lineNumber);

    return {
      segmentId: 'RFF',
      elements: [{ value: rff.referenceQualifier, components }],
    };
  }

  private generateNAD(party: EdifactParty): EdifactSegment {
    const elements: EdifactElement[] = [{ value: party.partyFunctionQualifier }];

    // Party identification
    if (party.partyIdentification) {
      elements.push({
        value: party.partyIdentification.id,
        components: [
          party.partyIdentification.id,
          party.partyIdentification.codeListQualifier || '',
          party.partyIdentification.responsibleAgency || '9',
        ],
      });
    } else {
      elements.push({ value: '' });
    }

    // Name in code (skip)
    elements.push({ value: '' });

    // Party name
    if (party.name) {
      elements.push({
        value: party.name,
        components: party.partyNameContinuation
          ? [party.name, party.partyNameContinuation]
          : undefined,
      });
    } else {
      elements.push({ value: '' });
    }

    // Street address
    elements.push({ value: party.streetAddress || '' });

    // City
    elements.push({ value: party.cityName || '' });

    // Country sub-entity
    elements.push({ value: party.countrySubEntity || '' });

    // Postal code
    elements.push({ value: party.postalCode || '' });

    // Country
    elements.push({ value: party.countryCode || '' });

    return { segmentId: 'NAD', elements };
  }

  private generateCTA(contact: NonNullable<EdifactParty['contacts']>[0]): EdifactSegment {
    return {
      segmentId: 'CTA',
      elements: [
        { value: contact.contactFunctionCode },
        { value: contact.name || '', components: ['', contact.name || ''] },
      ],
    };
  }

  private generateCOM(com: { number: string; channelQualifier: string }): EdifactSegment {
    return {
      segmentId: 'COM',
      elements: [{ value: com.number, components: [com.number, com.channelQualifier] }],
    };
  }

  private generateCUX(currency: string): EdifactSegment {
    return {
      segmentId: 'CUX',
      elements: [{ value: '2', components: ['2', currency, '4'] }], // 2=Reference currency, 4=Invoicing currency
    };
  }

  private generatePAT(terms: NonNullable<Edifact_ORDERS['paymentTerms']>): EdifactSegment {
    const elements: EdifactElement[] = [{ value: terms.termsType || '1' }];

    if (terms.termsPeriodType || terms.termsPeriodCount) {
      elements.push({
        value: terms.termsPeriodType || '',
        components: [terms.termsPeriodType || '', terms.termsPeriodCount?.toString() || ''],
      });
    }

    if (terms.termsDescription) {
      elements.push({ value: '' }); // Skip element 2 if not already added
      elements.push({
        value: '',
        components: ['', '', '', '', terms.termsDescription],
      });
    }

    return { segmentId: 'PAT', elements };
  }

  private generateTOD(terms: NonNullable<Edifact_ORDERS['deliveryTerms']>): EdifactSegment {
    return {
      segmentId: 'TOD',
      elements: [
        { value: '' }, // Method of payment
        { value: '' }, // Transport charges
        {
          value: terms.deliveryTermsCode || '',
          components: [
            terms.deliveryTermsCode || '',
            terms.deliveryTermsCodeQualifier || '',
            '',
            terms.deliveryTermsLocation || '',
          ],
        },
      ],
    };
  }

  private generateTDT(transport: NonNullable<Edifact_ORDERS['transport']>): EdifactSegment {
    return {
      segmentId: 'TDT',
      elements: [
        { value: transport.transportStageQualifier || '20' }, // Main carriage
        { value: '' }, // Conveyance reference
        { value: transport.transportMode || '' },
        { value: transport.transportMeansDescription || '' },
        {
          value: transport.carrierIdentification || '',
          components: [transport.carrierIdentification || '', '', '', transport.carrierName || ''],
        },
      ],
    };
  }

  private generateALC(alc: EdifactAllowanceCharge): EdifactSegment {
    return {
      segmentId: 'ALC',
      elements: [
        { value: alc.indicator },
        { value: alc.sequenceNumber || '' },
        { value: alc.calculationSequence || '' },
        { value: '' }, // Settlement
        { value: alc.type || '', components: [alc.type || ''] },
      ],
    };
  }

  private generateTAX(tax: EdifactTax): EdifactSegment {
    return {
      segmentId: 'TAX',
      elements: [
        { value: tax.functionQualifier },
        { value: tax.type || '', components: [tax.type || ''] },
        { value: '' }, // Tax account detail
        { value: '' }, // Tax assessment
        { value: tax.rate?.toString() || '' },
        { value: tax.category || '' },
      ],
    };
  }

  private generateMOA(moa: EdifactMonetaryAmount): EdifactSegment {
    const components = [moa.typeQualifier, moa.amount.toString()];
    if (moa.currency) components.push(moa.currency);

    return {
      segmentId: 'MOA',
      elements: [{ value: moa.typeQualifier, components }],
    };
  }

  private generateCNT(qualifier: string, value: number): EdifactSegment {
    return {
      segmentId: 'CNT',
      elements: [{ value: qualifier, components: [qualifier, value.toString()] }],
    };
  }

  private generateLineItem(lineItem: EdifactOrdersLineItem): EdifactSegment[] {
    const segments: EdifactSegment[] = [];

    // LIN - Line item
    const linElements: EdifactElement[] = [{ value: lineItem.lineNumber }];

    if (lineItem.actionCode) {
      linElements.push({ value: lineItem.actionCode });
    } else {
      linElements.push({ value: '' });
    }

    // First product ID in LIN
    if (lineItem.productIds.length > 0) {
      const pid = lineItem.productIds[0];
      linElements.push({
        value: pid.itemNumber,
        components: [pid.itemNumber, pid.itemNumberType || 'SRV', pid.responsibleAgency || '9'],
      });
    }

    segments.push({ segmentId: 'LIN', elements: linElements });

    // PIA - Additional product identification
    if (lineItem.productIds.length > 1) {
      const piaElements: EdifactElement[] = [{ value: '5' }]; // 5 = Product identification
      for (let i = 1; i < lineItem.productIds.length && i < 5; i++) {
        const pid = lineItem.productIds[i];
        piaElements.push({
          value: pid.itemNumber,
          components: [pid.itemNumber, pid.itemNumberType || 'IN', pid.responsibleAgency || '9'],
        });
      }
      segments.push({ segmentId: 'PIA', elements: piaElements });
    }

    // IMD - Item description
    if (lineItem.description) {
      segments.push({
        segmentId: 'IMD',
        elements: [
          { value: 'F' }, // Free-form
          { value: '' },
          { value: '', components: ['', '', '', lineItem.description] },
        ],
      });
    }

    // QTY - Quantity
    for (const qty of lineItem.quantities) {
      segments.push({
        segmentId: 'QTY',
        elements: [
          {
            value: qty.qualifier,
            components: [qty.qualifier, qty.quantity.toString(), qty.unitOfMeasure || 'PCE'],
          },
        ],
      });
    }

    // DTM - Dates at line level
    if (lineItem.dates) {
      for (const dtm of lineItem.dates) {
        segments.push(this.generateDTM(dtm.qualifier, dtm.value, dtm.formatQualifier));
      }
    }

    // PRI - Price
    if (lineItem.prices) {
      for (const pri of lineItem.prices) {
        const components = [pri.qualifier, pri.amount.toString()];
        if (pri.priceType) components.push(pri.priceType);
        if (pri.specificationCode) components.push(pri.specificationCode);
        if (pri.unitPriceBasis) components.push(pri.unitPriceBasis.toString());
        if (pri.unitOfMeasure) components.push(pri.unitOfMeasure);

        segments.push({
          segmentId: 'PRI',
          elements: [{ value: pri.qualifier, components }],
        });
      }
    }

    // RFF - References at line level
    if (lineItem.references) {
      for (const rff of lineItem.references) {
        segments.push(this.generateRFF(rff));
      }
    }

    // MOA - Amounts at line level
    if (lineItem.amounts) {
      for (const moa of lineItem.amounts) {
        segments.push(this.generateMOA(moa));
      }
    }

    // TAX - Tax at line level
    if (lineItem.taxes) {
      for (const tax of lineItem.taxes) {
        segments.push(this.generateTAX(tax));
      }
    }

    // ALC - Allowances/charges at line level
    if (lineItem.allowancesCharges) {
      for (const alc of lineItem.allowancesCharges) {
        segments.push(this.generateALC(alc));
      }
    }

    // PAC - Package
    if (lineItem.packages) {
      for (const pac of lineItem.packages) {
        segments.push({
          segmentId: 'PAC',
          elements: [
            { value: pac.numberOfPackages?.toString() || '' },
            { value: pac.packagingLevel || '' },
            { value: pac.packageType || '', components: [pac.packageType || ''] },
          ],
        });
      }
    }

    return segments;
  }

  // Helper methods

  private createSegment(segmentId: string, values: string[]): EdifactSegment {
    return {
      segmentId,
      elements: values.map((v) => ({ value: v })),
    };
  }

  private formatDateForEdifact(isoDate: string): string {
    // Convert ISO date to CCYYMMDD
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
