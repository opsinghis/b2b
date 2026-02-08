import { Injectable } from '@nestjs/common';
import {
  EdifactMessage,
  EdifactSegment,
  Edifact_DESADV,
  EdifactDesadvPackage,
  EdifactDesadvLineItem,
  EdifactParty,
  EdifactReference,
  EdifactDateTime,
  EdifactProductId,
} from '../interfaces';

/**
 * EDIFACT DESADV Message Parser
 *
 * Parses DESADV (Despatch Advice / Ship Notice) messages into structured format.
 */
@Injectable()
export class EdifactDesadvParserService {
  /**
   * Parse DESADV message
   */
  parse(message: EdifactMessage): Edifact_DESADV {
    const segments = message.segments;
    const header = message.header;

    const desadv: Edifact_DESADV = {
      messageType: 'DESADV',
      messageReferenceNumber: header.messageReferenceNumber,
      despatchNumber: '',
      despatchDate: '',
      parties: [],
    };

    let currentParty: EdifactParty | null = null;
    let currentPackage: EdifactDesadvPackage | null = null;
    let currentLineItem: EdifactDesadvLineItem | null = null;
    let inCPS = false;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentId = segment.segmentId;

      switch (segmentId) {
        case 'BGM':
          const bgm = this.parseBGM(segment);
          desadv.despatchNumber = bgm.despatchNumber;
          desadv.messageFunction = bgm.messageFunction;
          break;

        case 'DTM':
          const dtm = this.parseDTM(segment);
          if (!desadv.dates) desadv.dates = [];
          desadv.dates.push(dtm);
          if (dtm.qualifier === '137') {
            desadv.despatchDate = this.formatDate(dtm.value, dtm.formatQualifier);
          } else if (dtm.qualifier === '132') {
            desadv.deliveryDate = this.formatDate(dtm.value, dtm.formatQualifier);
          }
          break;

        case 'RFF':
          const rff = this.parseRFF(segment);
          if (!desadv.references) desadv.references = [];
          desadv.references.push(rff);
          // Extract order references
          if (rff.referenceQualifier === 'ON') {
            if (!desadv.orderReferences) desadv.orderReferences = [];
            desadv.orderReferences.push({ orderNumber: rff.referenceNumber || '' });
          }
          break;

        case 'NAD':
          currentParty = this.parseNAD(segment);
          desadv.parties.push(currentParty);
          break;

        case 'CTA':
          if (currentParty) {
            const cta = this.parseCTA(segment, segments, i);
            if (!currentParty.contacts) currentParty.contacts = [];
            currentParty.contacts.push(cta.contact);
            i = cta.nextIndex - 1;
          }
          break;

        case 'TDT':
          const tdt = this.parseTDT(segment);
          desadv.transport = tdt;
          break;

        case 'CPS':
          // Consignment packing sequence
          inCPS = true;
          // If we have a current package with items, save it
          if (currentPackage && currentLineItem) {
            if (!currentPackage.items) currentPackage.items = [];
            currentPackage.items.push(currentLineItem);
            currentLineItem = null;
          }
          if (currentPackage) {
            if (!desadv.packages) desadv.packages = [];
            desadv.packages.push(currentPackage);
          }
          currentPackage = {
            hierarchicalLevel: this.getElement(segment, 1),
          };
          break;

        case 'PAC':
          if (currentPackage) {
            const pac = this.parsePAC(segment);
            currentPackage.numberOfPackages = pac.numberOfPackages;
            currentPackage.packageType = pac.packageType;
          }
          break;

        case 'PCI':
          if (currentPackage) {
            const pci = this.parsePCI(segment);
            if (pci.packageId) {
              currentPackage.packageId = pci.packageId;
            }
          }
          break;

        case 'GIN':
          if (currentPackage) {
            const gin = this.parseGIN(segment);
            if (gin.identifier) {
              currentPackage.packageId = gin.identifier;
            }
          }
          break;

        case 'MEA':
          if (currentPackage) {
            const mea = this.parseMEA(segment);
            if (mea.dimension === 'AAB' || mea.dimension === 'WT') {
              currentPackage.grossWeight = mea.value;
              currentPackage.weightUnit = mea.unit;
            } else if (mea.dimension) {
              if (!currentPackage.measurements) currentPackage.measurements = [];
              currentPackage.measurements.push(mea);
            }
          }
          break;

        case 'LIN':
          // Save previous line item
          if (currentLineItem) {
            if (currentPackage) {
              if (!currentPackage.items) currentPackage.items = [];
              currentPackage.items.push(currentLineItem);
            } else {
              if (!desadv.lineItems) desadv.lineItems = [];
              desadv.lineItems.push(currentLineItem);
            }
          }

          currentLineItem = this.parseLIN(segment);
          break;

        case 'PIA':
          if (currentLineItem) {
            const piaIds = this.parsePIA(segment);
            currentLineItem.productIds.push(...piaIds);
          }
          break;

        case 'IMD':
          if (currentLineItem) {
            const imd = this.parseIMD(segment);
            if (imd) {
              currentLineItem.description = imd;
            }
          }
          break;

        case 'QTY':
          const qty = this.parseQTY(segment);
          if (currentLineItem) {
            currentLineItem.quantity = qty.quantity;
            currentLineItem.unitOfMeasure = qty.unitOfMeasure;
          }
          break;

        case 'GIR':
          // Related identification numbers (batch, serial)
          if (currentLineItem) {
            const gir = this.parseGIR(segment);
            if (gir.batchNumber) {
              currentLineItem.batchNumber = gir.batchNumber;
            }
            if (gir.serialNumbers) {
              if (!currentLineItem.serialNumbers) currentLineItem.serialNumbers = [];
              currentLineItem.serialNumbers.push(...gir.serialNumbers);
            }
          }
          break;

        case 'CNT':
          const cnt = this.parseCNT(segment);
          if (!desadv.controlTotals) {
            desadv.controlTotals = {};
          }
          if (cnt.qualifier === '2') {
            desadv.controlTotals.lineItemCount = cnt.value;
          } else if (cnt.qualifier === '7' || cnt.qualifier === '52') {
            desadv.controlTotals.packageCount = cnt.value;
          }
          break;
      }
    }

    // Save final items
    if (currentLineItem) {
      if (currentPackage) {
        if (!currentPackage.items) currentPackage.items = [];
        currentPackage.items.push(currentLineItem);
      } else {
        if (!desadv.lineItems) desadv.lineItems = [];
        desadv.lineItems.push(currentLineItem);
      }
    }
    if (currentPackage) {
      if (!desadv.packages) desadv.packages = [];
      desadv.packages.push(currentPackage);
    }

    return desadv;
  }

  // Segment parsing helpers

  private parseBGM(segment: EdifactSegment): { despatchNumber: string; messageFunction?: string } {
    return {
      despatchNumber: this.getElement(segment, 2) || '',
      messageFunction: this.getElement(segment, 3),
    };
  }

  private parseDTM(segment: EdifactSegment): EdifactDateTime {
    return {
      qualifier: this.getComponent(segment, 1, 1) || '',
      value: this.getComponent(segment, 1, 2),
      formatQualifier: this.getComponent(segment, 1, 3),
    };
  }

  private parseRFF(segment: EdifactSegment): EdifactReference {
    return {
      referenceQualifier: this.getComponent(segment, 1, 1) || '',
      referenceNumber: this.getComponent(segment, 1, 2),
      documentNumber: this.getComponent(segment, 1, 3),
      lineNumber: this.getComponent(segment, 1, 4),
    };
  }

  private parseNAD(segment: EdifactSegment): EdifactParty {
    const partyId = this.getComponent(segment, 2, 1);
    return {
      partyFunctionQualifier: this.getElement(segment, 1) || '',
      partyIdentification: partyId
        ? {
            id: partyId,
            codeListQualifier: this.getComponent(segment, 2, 2),
            responsibleAgency: this.getComponent(segment, 2, 3),
          }
        : undefined,
      name: this.getComponent(segment, 4, 1),
      streetAddress: this.getComponent(segment, 5, 1),
      cityName: this.getElement(segment, 6),
      countrySubEntity: this.getElement(segment, 7),
      postalCode: this.getElement(segment, 8),
      countryCode: this.getElement(segment, 9),
    };
  }

  private parseCTA(
    segment: EdifactSegment,
    allSegments: EdifactSegment[],
    currentIndex: number,
  ): { contact: NonNullable<EdifactParty['contacts']>[0]; nextIndex: number } {
    const contact: NonNullable<EdifactParty['contacts']>[0] = {
      contactFunctionCode: this.getElement(segment, 1) || '',
      name: this.getComponent(segment, 2, 2),
      communications: [],
    };

    let nextIndex = currentIndex + 1;
    while (nextIndex < allSegments.length && allSegments[nextIndex].segmentId === 'COM') {
      const comSegment = allSegments[nextIndex];
      const number = this.getComponent(comSegment, 1, 1);
      const channelQualifier = this.getComponent(comSegment, 1, 2);
      if (number && channelQualifier) {
        contact.communications!.push({ number, channelQualifier });
      }
      nextIndex++;
    }

    return { contact, nextIndex };
  }

  private parseTDT(segment: EdifactSegment): Edifact_DESADV['transport'] {
    return {
      transportMode: this.getElement(segment, 3),
      transportMeansId: this.getComponent(segment, 8, 1),
      transportMeansNationality: this.getComponent(segment, 8, 3),
      carrierName: this.getComponent(segment, 5, 4),
    };
  }

  private parsePAC(segment: EdifactSegment): { numberOfPackages?: number; packageType?: string } {
    return {
      numberOfPackages: this.getElement(segment, 1)
        ? parseInt(this.getElement(segment, 1)!, 10)
        : undefined,
      packageType: this.getComponent(segment, 3, 1),
    };
  }

  private parsePCI(segment: EdifactSegment): { packageId?: string } {
    return {
      packageId: this.getComponent(segment, 2, 1),
    };
  }

  private parseGIN(segment: EdifactSegment): { identifier?: string } {
    return {
      identifier: this.getComponent(segment, 2, 1),
    };
  }

  private parseMEA(segment: EdifactSegment): { dimension: string; value: number; unit: string } {
    return {
      dimension: this.getElement(segment, 2) || '',
      value: parseFloat(this.getComponent(segment, 3, 2) || '0'),
      unit: this.getComponent(segment, 3, 3) || '',
    };
  }

  private parseLIN(segment: EdifactSegment): EdifactDesadvLineItem {
    const itemNumber = this.getComponent(segment, 3, 1);
    const productIds: EdifactProductId[] = [];
    if (itemNumber) {
      productIds.push({
        itemNumber,
        itemNumberType: this.getComponent(segment, 3, 2),
        responsibleAgency: this.getComponent(segment, 3, 3),
      });
    }

    return {
      lineNumber: this.getElement(segment, 1) || '',
      productIds,
      quantity: 0,
    };
  }

  private parsePIA(segment: EdifactSegment): EdifactProductId[] {
    const ids: EdifactProductId[] = [];
    for (let i = 2; i <= 5; i++) {
      const itemNumber = this.getComponent(segment, i, 1);
      if (itemNumber) {
        ids.push({
          itemNumber,
          itemNumberType: this.getComponent(segment, i, 2),
          responsibleAgency: this.getComponent(segment, i, 3),
        });
      }
    }
    return ids;
  }

  private parseIMD(segment: EdifactSegment): string | undefined {
    const freeText = this.getComponent(segment, 3, 4);
    const freeText2 = this.getComponent(segment, 3, 5);
    if (freeText) {
      return freeText2 ? `${freeText} ${freeText2}` : freeText;
    }
    return undefined;
  }

  private parseQTY(segment: EdifactSegment): { quantity: number; unitOfMeasure?: string } {
    return {
      quantity: parseFloat(this.getComponent(segment, 1, 2) || '0'),
      unitOfMeasure: this.getComponent(segment, 1, 3),
    };
  }

  private parseGIR(segment: EdifactSegment): { batchNumber?: string; serialNumbers?: string[] } {
    const result: { batchNumber?: string; serialNumbers?: string[] } = {};
    const qualifier = this.getElement(segment, 1);

    // Look at identification elements 2-6
    for (let i = 2; i <= 6; i++) {
      const idValue = this.getComponent(segment, i, 1);
      const idQualifier = this.getComponent(segment, i, 2);

      if (idValue) {
        if (idQualifier === 'BT' || idQualifier === 'BX') {
          // Batch number
          result.batchNumber = idValue;
        } else if (idQualifier === 'BN' || idQualifier === 'SE') {
          // Serial number
          if (!result.serialNumbers) result.serialNumbers = [];
          result.serialNumbers.push(idValue);
        }
      }
    }

    return result;
  }

  private parseCNT(segment: EdifactSegment): { qualifier: string; value: number } {
    return {
      qualifier: this.getComponent(segment, 1, 1) || '',
      value: parseFloat(this.getComponent(segment, 1, 2) || '0'),
    };
  }

  // Helper methods

  private getElement(segment: EdifactSegment, index: number): string | undefined {
    const element = segment.elements[index - 1];
    return element?.value || undefined;
  }

  private getComponent(
    segment: EdifactSegment,
    elementIndex: number,
    componentIndex: number,
  ): string | undefined {
    const element = segment.elements[elementIndex - 1];
    if (!element) return undefined;
    if (element.components && element.components.length >= componentIndex) {
      return element.components[componentIndex - 1] || undefined;
    }
    if (componentIndex === 1) {
      return element.value || undefined;
    }
    return undefined;
  }

  private formatDate(value?: string, formatQualifier?: string): string {
    if (!value) return '';
    switch (formatQualifier) {
      case '102':
        return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}`;
      default:
        return value;
    }
  }
}
