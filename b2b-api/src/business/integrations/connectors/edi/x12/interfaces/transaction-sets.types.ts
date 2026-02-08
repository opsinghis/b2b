/**
 * Transaction Set Types
 * Canonical models for X12 transaction sets
 */

/**
 * 850 Purchase Order
 */
export interface X12_850_PurchaseOrder {
  transactionSetCode: '850';
  controlNumber: string;

  /** BEG - Beginning Segment for Purchase Order */
  beg: {
    purposeCode: string;
    orderTypeCode: string;
    purchaseOrderNumber: string;
    releaseNumber?: string;
    orderDate: string;
    contractNumber?: string;
  };

  /** CUR - Currency */
  currency?: {
    currencyCode: string;
    exchangeRate?: number;
  };

  /** REF - References */
  references?: Array<{
    referenceIdQualifier: string;
    referenceId: string;
    description?: string;
  }>;

  /** PER - Administrative Communications Contact */
  contacts?: Array<{
    contactFunctionCode: string;
    name?: string;
    communicationNumberQualifier?: string;
    communicationNumber?: string;
  }>;

  /** DTM - Date/Time Reference */
  dates?: Array<{
    dateTimeQualifier: string;
    date?: string;
    time?: string;
  }>;

  /** TD5 - Carrier Details */
  carrierDetails?: Array<{
    routingSequenceCode?: string;
    idCodeQualifier?: string;
    idCode?: string;
    transportationMethodCode?: string;
    routing?: string;
  }>;

  /** N1 Loop - Party Identification */
  parties?: Array<{
    entityIdCode: string;
    name?: string;
    idCodeQualifier?: string;
    idCode?: string;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      stateCode?: string;
      postalCode?: string;
      countryCode?: string;
    };
    contacts?: Array<{
      contactFunctionCode: string;
      name?: string;
      communicationNumberQualifier?: string;
      communicationNumber?: string;
    }>;
  }>;

  /** PO1 Loop - Line Items */
  lineItems: Array<{
    assignedId?: string;
    quantityOrdered: number;
    unitOfMeasure: string;
    unitPrice?: number;
    basisOfUnitPrice?: string;
    productIds: Array<{
      qualifier: string;
      id: string;
    }>;
    descriptions?: Array<{
      type: string;
      description: string;
    }>;
    dates?: Array<{
      dateTimeQualifier: string;
      date?: string;
    }>;
    taxes?: Array<{
      taxTypeCode: string;
      amount?: number;
      percent?: number;
    }>;
  }>;

  /** CTT - Transaction Totals */
  totals?: {
    numberOfLineItems: number;
    hashTotal?: number;
  };

  /** AMT - Monetary Amount */
  amounts?: Array<{
    amountQualifier: string;
    amount: number;
  }>;
}

/**
 * 855 Purchase Order Acknowledgment
 */
export interface X12_855_PurchaseOrderAck {
  transactionSetCode: '855';
  controlNumber: string;

  /** BAK - Beginning Segment for Purchase Order Acknowledgment */
  bak: {
    transactionSetPurposeCode: string;
    acknowledgmentType: string;
    purchaseOrderNumber: string;
    acknowledmentDate: string;
    releaseNumber?: string;
    requestReferenceNumber?: string;
    contractNumber?: string;
    acknowledgmentDate?: string;
  };

  /** CUR - Currency */
  currency?: {
    currencyCode: string;
    exchangeRate?: number;
  };

  /** REF - References */
  references?: Array<{
    referenceIdQualifier: string;
    referenceId: string;
  }>;

  /** PER - Administrative Communications Contact */
  contacts?: Array<{
    contactFunctionCode: string;
    name?: string;
    communicationNumberQualifier?: string;
    communicationNumber?: string;
  }>;

  /** DTM - Date/Time Reference */
  dates?: Array<{
    dateTimeQualifier: string;
    date?: string;
    time?: string;
  }>;

  /** N1 Loop - Party Identification */
  parties?: Array<{
    entityIdCode: string;
    name?: string;
    idCodeQualifier?: string;
    idCode?: string;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      stateCode?: string;
      postalCode?: string;
      countryCode?: string;
    };
  }>;

  /** PO1/ACK Loop - Line Item Acknowledgment */
  lineItems?: Array<{
    assignedId?: string;
    quantityOrdered?: number;
    unitOfMeasure?: string;
    unitPrice?: number;
    productIds?: Array<{
      qualifier: string;
      id: string;
    }>;
    acknowledgments?: Array<{
      lineItemStatusCode: string;
      quantityAcknowledged?: number;
      unitOfMeasure?: string;
      scheduledDate?: string;
    }>;
  }>;

  /** CTT - Transaction Totals */
  totals?: {
    numberOfLineItems: number;
    hashTotal?: number;
  };
}

/**
 * 856 Ship Notice / Manifest (ASN)
 */
export interface X12_856_ShipNotice {
  transactionSetCode: '856';
  controlNumber: string;

  /** BSN - Beginning Segment for Ship Notice */
  bsn: {
    transactionSetPurposeCode: string;
    shipmentIdNumber: string;
    shipmentDate: string;
    shipmentTime?: string;
    hierarchicalStructureCode?: string;
  };

  /** DTM - Date/Time Reference */
  dates?: Array<{
    dateTimeQualifier: string;
    date?: string;
    time?: string;
  }>;

  /** HL - Hierarchical Levels */
  hierarchicalLevels: Array<X12_856_HierarchicalLevel>;

  /** CTT - Transaction Totals */
  totals?: {
    numberOfLineItems: number;
    hashTotal?: number;
  };
}

/**
 * Hierarchical level for 856
 */
export interface X12_856_HierarchicalLevel {
  hierarchicalIdNumber: string;
  hierarchicalParentIdNumber?: string;
  hierarchicalLevelCode: string;
  hierarchicalChildCode?: string;

  /** Shipment level data */
  shipment?: {
    carrier?: {
      carrierCode?: string;
      transportationMethodCode?: string;
      routing?: string;
    };
    references?: Array<{
      referenceIdQualifier: string;
      referenceId: string;
    }>;
    dates?: Array<{
      dateTimeQualifier: string;
      date?: string;
    }>;
    parties?: Array<{
      entityIdCode: string;
      name?: string;
      idCodeQualifier?: string;
      idCode?: string;
      address?: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        stateCode?: string;
        postalCode?: string;
        countryCode?: string;
      };
    }>;
  };

  /** Order level data */
  order?: {
    purchaseOrderNumber?: string;
    references?: Array<{
      referenceIdQualifier: string;
      referenceId: string;
    }>;
  };

  /** Pack level data */
  pack?: {
    packaging?: {
      packagingCode?: string;
      numberOfPackages?: number;
      weight?: number;
      weightUnitCode?: string;
    };
    marks?: Array<{
      markCodeQualifier?: string;
      shipmentMarks?: string;
    }>;
  };

  /** Item level data */
  item?: {
    lineItemNumber?: string;
    productIds?: Array<{
      qualifier: string;
      id: string;
    }>;
    quantities?: Array<{
      quantityQualifier?: string;
      quantity: number;
      unitOfMeasure?: string;
    }>;
    descriptions?: Array<{
      description: string;
    }>;
    serialNumbers?: string[];
  };
}

/**
 * 810 Invoice
 */
export interface X12_810_Invoice {
  transactionSetCode: '810';
  controlNumber: string;

  /** BIG - Beginning Segment for Invoice */
  big: {
    invoiceDate: string;
    invoiceNumber: string;
    purchaseOrderDate?: string;
    purchaseOrderNumber?: string;
    releaseNumber?: string;
    changeOrderSequence?: string;
    transactionTypeCode?: string;
  };

  /** CUR - Currency */
  currency?: {
    currencyCode: string;
    exchangeRate?: number;
  };

  /** REF - References */
  references?: Array<{
    referenceIdQualifier: string;
    referenceId: string;
    description?: string;
  }>;

  /** N1 Loop - Party Identification */
  parties?: Array<{
    entityIdCode: string;
    name?: string;
    idCodeQualifier?: string;
    idCode?: string;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      stateCode?: string;
      postalCode?: string;
      countryCode?: string;
    };
    contacts?: Array<{
      contactFunctionCode: string;
      name?: string;
      communicationNumberQualifier?: string;
      communicationNumber?: string;
    }>;
  }>;

  /** ITD - Terms of Sale/Deferred Terms of Sale */
  paymentTerms?: {
    termsTypeCode?: string;
    termsBasisDateCode?: string;
    termsDiscountPercent?: number;
    termsDiscountDueDate?: string;
    termsDiscountDaysDue?: number;
    termsNetDueDate?: string;
    termsNetDays?: number;
    termsDiscountAmount?: number;
    description?: string;
  };

  /** DTM - Date/Time Reference */
  dates?: Array<{
    dateTimeQualifier: string;
    date?: string;
    time?: string;
  }>;

  /** IT1 Loop - Line Items */
  lineItems: Array<{
    assignedId?: string;
    quantityInvoiced: number;
    unitOfMeasure: string;
    unitPrice: number;
    basisOfUnitPrice?: string;
    productIds: Array<{
      qualifier: string;
      id: string;
    }>;
    descriptions?: Array<{
      type: string;
      description: string;
    }>;
    taxes?: Array<{
      taxTypeCode: string;
      amount?: number;
      percent?: number;
      taxExemptCode?: string;
    }>;
    charges?: Array<{
      chargeIndicator: string;
      chargeCode?: string;
      amount?: number;
      description?: string;
    }>;
  }>;

  /** TDS - Total Monetary Value Summary */
  totalSummary: {
    totalInvoiceAmount: number;
    amountSubjectToTermsDiscount?: number;
    discountedAmount?: number;
    termsDiscountAmount?: number;
  };

  /** TXI - Tax Information */
  taxes?: Array<{
    taxTypeCode: string;
    taxAmount?: number;
    taxPercent?: number;
    taxJurisdiction?: string;
    taxExemptCode?: string;
  }>;

  /** CAD - Carrier Detail */
  carrierDetails?: {
    transportationMethodCode?: string;
    equipmentCode?: string;
    routing?: string;
    shipmentOrderStatusCode?: string;
  };

  /** ISS - Invoice Shipment Summary */
  shipmentSummary?: {
    numberOfUnitsShipped?: number;
    unitOfMeasure?: string;
    weight?: number;
    weightUnitCode?: string;
  };

  /** CTT - Transaction Totals */
  totals?: {
    numberOfLineItems: number;
    hashTotal?: number;
  };
}

/**
 * 997 Functional Acknowledgment
 */
export interface X12_997_FunctionalAck {
  transactionSetCode: '997';
  controlNumber: string;

  /** AK1 - Functional Group Response Header */
  ak1: {
    functionalIdCode: string;
    groupControlNumber: string;
    versionCode?: string;
  };

  /** AK2 Loop - Transaction Set Response */
  transactionSetResponses?: Array<{
    transactionSetIdCode: string;
    transactionSetControlNumber: string;
    implementationConventionReference?: string;

    /** AK3 - Data Segment Note */
    segmentErrors?: Array<{
      segmentIdCode: string;
      segmentPositionInTransactionSet: number;
      loopIdCode?: string;
      segmentSyntaxErrorCode?: string;
      /** AK4 - Data Element Note */
      elementErrors?: Array<{
        elementPositionInSegment: number;
        componentDataElementPositionInComposite?: number;
        dataElementReferenceNumber?: number;
        dataElementSyntaxErrorCode: string;
        copyOfBadDataElement?: string;
      }>;
    }>;

    /** AK5 - Transaction Set Response Trailer */
    acknowledgmentCode: string;
    syntaxErrorCodes?: string[];
  }>;

  /** AK9 - Functional Group Response Trailer */
  ak9: {
    functionalGroupAcknowledgeCode: string;
    numberOfTransactionSetsIncluded: number;
    numberOfReceivedTransactionSets: number;
    numberOfAcceptedTransactionSets: number;
    syntaxErrorCodes?: string[];
  };
}

/**
 * Acknowledgment codes for 997
 */
export enum X12_997_AcknowledgmentCode {
  /** Accepted */
  A = 'A',
  /** Accepted, But Errors Were Noted */
  E = 'E',
  /** Partially Accepted */
  P = 'P',
  /** Rejected */
  R = 'R',
  /** Rejected, Message Authentication Code (MAC) Failed */
  M = 'M',
  /** Rejected, Security Validation Failed */
  W = 'W',
  /** Rejected, Message Integrity Check (MIC) Failed */
  X = 'X',
}

/**
 * Functional group acknowledgment codes
 */
export enum X12_997_GroupAckCode {
  /** Accepted */
  A = 'A',
  /** Partially Accepted */
  P = 'P',
  /** Rejected */
  R = 'R',
}

/**
 * Union of all transaction set types
 */
export type X12TransactionSetData =
  | X12_850_PurchaseOrder
  | X12_855_PurchaseOrderAck
  | X12_856_ShipNotice
  | X12_810_Invoice
  | X12_997_FunctionalAck;
