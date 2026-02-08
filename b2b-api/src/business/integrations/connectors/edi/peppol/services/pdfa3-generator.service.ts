import { Injectable, Logger } from '@nestjs/common';
import { UblInvoice, UblCreditNote, PdfA3Options, UblAmount } from '../interfaces';

/**
 * PDF/A-3 Document Metadata
 */
interface PdfA3Metadata {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  creator: string;
  producer: string;
  creationDate: Date;
  modificationDate: Date;
}

/**
 * PDF/A-3 Embedded File
 */
interface EmbeddedFile {
  filename: string;
  mimeType: string;
  content: Buffer;
  relationship: 'Source' | 'Data' | 'Alternative';
  description?: string;
}

/**
 * PDF/A-3 Generation Result
 */
export interface PdfA3Result {
  success: boolean;
  pdf?: Buffer;
  error?: string;
  metadata?: PdfA3Metadata;
}

/**
 * Invoice Line for PDF rendering
 */
interface PdfInvoiceLine {
  lineNumber: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  lineTotal: string;
}

/**
 * PDF/A-3 Generator Service
 *
 * Generates PDF/A-3 compliant invoices with embedded UBL XML.
 * PDF/A-3 is the archiving-compliant PDF format that allows
 * embedded files of any type, making it ideal for e-invoicing
 * where the human-readable PDF contains the machine-readable XML.
 *
 * This implementation creates a simple PDF structure without
 * external dependencies. For production, consider using
 * libraries like pdf-lib, pdfkit, or pdfmake.
 */
@Injectable()
export class PdfA3GeneratorService {
  private readonly logger = new Logger(PdfA3GeneratorService.name);

  /** PDF version */
  private readonly PDF_VERSION = '1.7';

  /** PDF/A-3 conformance level */
  private readonly PDFA_CONFORMANCE = 'B'; // Basic conformance

  /**
   * Generate PDF/A-3 from invoice or credit note
   */
  async generatePdfA3(options: PdfA3Options): Promise<PdfA3Result> {
    this.logger.debug('Generating PDF/A-3 document');

    try {
      const isInvoice = 'invoiceLine' in options.document;
      const document = options.document;

      // Build metadata
      const metadata = this.buildMetadata(document, options.metadata);

      // Generate PDF content
      const pdfContent = this.generatePdfContent(document, isInvoice, options.logo);

      // Create the XML embedded file
      const xmlFile: EmbeddedFile = {
        filename: isInvoice ? 'invoice.xml' : 'creditnote.xml',
        mimeType: 'application/xml',
        content: Buffer.from(options.xmlContent, 'utf-8'),
        relationship: 'Source',
        description: isInvoice ? 'UBL Invoice XML' : 'UBL Credit Note XML',
      };

      // Build the complete PDF/A-3 document
      const pdf = this.buildPdfA3Document(pdfContent, metadata, [xmlFile]);

      return {
        success: true,
        pdf,
        metadata,
      };
    } catch (error) {
      this.logger.error('Failed to generate PDF/A-3', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build PDF metadata
   */
  private buildMetadata(
    document: UblInvoice | UblCreditNote,
    customMetadata?: {
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string[];
    },
  ): PdfA3Metadata {
    const isInvoice = 'invoiceLine' in document;
    const now = new Date();

    return {
      title: customMetadata?.title || `${isInvoice ? 'Invoice' : 'Credit Note'} ${document.id}`,
      author:
        customMetadata?.author ||
        document.accountingSupplierParty?.party?.partyLegalEntity?.[0]?.registrationName ||
        'Unknown',
      subject:
        customMetadata?.subject ||
        `${isInvoice ? 'Invoice' : 'Credit Note'} for ${document.accountingCustomerParty?.party?.partyLegalEntity?.[0]?.registrationName || 'Customer'}`,
      keywords: customMetadata?.keywords || [
        'e-invoice',
        'peppol',
        'ubl',
        isInvoice ? 'invoice' : 'credit-note',
      ],
      creator: 'B2B API Peppol Module',
      producer: 'B2B API PDF/A-3 Generator',
      creationDate: now,
      modificationDate: now,
    };
  }

  /**
   * Generate PDF content stream
   */
  private generatePdfContent(
    document: UblInvoice | UblCreditNote,
    isInvoice: boolean,
    logo?: string,
  ): string {
    const lines: string[] = [];
    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    const margin = 50;
    let yPos = pageHeight - margin;

    // Start content stream
    lines.push('BT'); // Begin text

    // Title
    yPos -= 30;
    lines.push(`/F1 18 Tf`);
    lines.push(`${margin} ${yPos} Td`);
    lines.push(`(${isInvoice ? 'INVOICE' : 'CREDIT NOTE'}) Tj`);

    // Document number and date
    yPos -= 25;
    lines.push(`/F1 12 Tf`);
    lines.push(`${margin} ${yPos} Td`);
    lines.push(
      `(${isInvoice ? 'Invoice' : 'Credit Note'} No: ${this.escapePdfString(document.id)}) Tj`,
    );

    yPos -= 15;
    lines.push(`${margin} ${yPos} Td`);
    lines.push(`(Date: ${document.issueDate}) Tj`);

    if ('dueDate' in document && document.dueDate) {
      yPos -= 15;
      lines.push(`${margin} ${yPos} Td`);
      lines.push(`(Due Date: ${document.dueDate}) Tj`);
    }

    // Seller information
    yPos -= 30;
    lines.push(`/F1 11 Tf`);
    lines.push(`${margin} ${yPos} Td`);
    lines.push(`(FROM:) Tj`);

    const seller = document.accountingSupplierParty?.party;
    if (seller) {
      yPos -= 15;
      lines.push(`/F1 10 Tf`);
      const sellerName =
        seller.partyLegalEntity?.[0]?.registrationName || seller.partyName?.[0]?.name || '';
      lines.push(`${margin} ${yPos} Td`);
      lines.push(`(${this.escapePdfString(sellerName)}) Tj`);

      if (seller.postalAddress) {
        const addr = seller.postalAddress;
        if (addr.streetName) {
          yPos -= 12;
          lines.push(`${margin} ${yPos} Td`);
          lines.push(`(${this.escapePdfString(addr.streetName)}) Tj`);
        }
        if (addr.cityName || addr.postalZone) {
          yPos -= 12;
          lines.push(`${margin} ${yPos} Td`);
          lines.push(
            `(${this.escapePdfString([addr.postalZone, addr.cityName].filter(Boolean).join(' '))}) Tj`,
          );
        }
        if (addr.country?.identificationCode) {
          yPos -= 12;
          lines.push(`${margin} ${yPos} Td`);
          lines.push(`(${addr.country.identificationCode}) Tj`);
        }
      }

      if (seller.partyTaxScheme?.[0]?.companyId) {
        yPos -= 12;
        lines.push(`${margin} ${yPos} Td`);
        lines.push(`(VAT: ${seller.partyTaxScheme[0].companyId}) Tj`);
      }
    }

    // Buyer information
    const buyerX = pageWidth / 2;
    yPos = pageHeight - margin - 55 - 30;
    lines.push(`/F1 11 Tf`);
    lines.push(`${buyerX} ${yPos} Td`);
    lines.push(`(TO:) Tj`);

    const buyer = document.accountingCustomerParty?.party;
    if (buyer) {
      yPos -= 15;
      lines.push(`/F1 10 Tf`);
      const buyerName =
        buyer.partyLegalEntity?.[0]?.registrationName || buyer.partyName?.[0]?.name || '';
      lines.push(`${buyerX} ${yPos} Td`);
      lines.push(`(${this.escapePdfString(buyerName)}) Tj`);

      if (buyer.postalAddress) {
        const addr = buyer.postalAddress;
        if (addr.streetName) {
          yPos -= 12;
          lines.push(`${buyerX} ${yPos} Td`);
          lines.push(`(${this.escapePdfString(addr.streetName)}) Tj`);
        }
        if (addr.cityName || addr.postalZone) {
          yPos -= 12;
          lines.push(`${buyerX} ${yPos} Td`);
          lines.push(
            `(${this.escapePdfString([addr.postalZone, addr.cityName].filter(Boolean).join(' '))}) Tj`,
          );
        }
        if (addr.country?.identificationCode) {
          yPos -= 12;
          lines.push(`${buyerX} ${yPos} Td`);
          lines.push(`(${addr.country.identificationCode}) Tj`);
        }
      }
    }

    // Line items header
    yPos = pageHeight - margin - 200;
    lines.push(`/F1 10 Tf`);
    lines.push(`${margin} ${yPos} Td`);
    lines.push(`(Line) Tj`);
    lines.push(`${margin + 40} ${yPos} Td`);
    lines.push(`(Description) Tj`);
    lines.push(`${margin + 250} ${yPos} Td`);
    lines.push(`(Qty) Tj`);
    lines.push(`${margin + 310} ${yPos} Td`);
    lines.push(`(Price) Tj`);
    lines.push(`${margin + 380} ${yPos} Td`);
    lines.push(`(VAT) Tj`);
    lines.push(`${margin + 430} ${yPos} Td`);
    lines.push(`(Total) Tj`);

    // Draw header line
    yPos -= 5;
    lines.push('ET'); // End text
    lines.push(`${margin} ${yPos} m`);
    lines.push(`${pageWidth - margin} ${yPos} l`);
    lines.push('S'); // Stroke
    lines.push('BT'); // Begin text again

    // Line items
    const docLines = isInvoice
      ? (document as UblInvoice).invoiceLine
      : (document as UblCreditNote).creditNoteLine;

    yPos -= 15;
    lines.push(`/F1 9 Tf`);

    for (const line of docLines || []) {
      if (yPos < margin + 100) break; // Stop if too close to bottom

      const qty = isInvoice ? (line as any).invoicedQuantity : (line as any).creditedQuantity;

      lines.push(`${margin} ${yPos} Td`);
      lines.push(`(${this.escapePdfString(line.id)}) Tj`);

      const itemName = line.item.name.substring(0, 35);
      lines.push(`${margin + 40} ${yPos} Td`);
      lines.push(`(${this.escapePdfString(itemName)}) Tj`);

      lines.push(`${margin + 250} ${yPos} Td`);
      lines.push(`(${qty?.value || 0} ${qty?.unitCode || ''}) Tj`);

      lines.push(`${margin + 310} ${yPos} Td`);
      lines.push(`(${this.formatAmount(line.price.priceAmount)}) Tj`);

      lines.push(`${margin + 380} ${yPos} Td`);
      lines.push(`(${line.item.classifiedTaxCategory.percent || 0}%) Tj`);

      lines.push(`${margin + 430} ${yPos} Td`);
      lines.push(`(${this.formatAmount(line.lineExtensionAmount)}) Tj`);

      yPos -= 15;
    }

    // Totals section
    yPos -= 20;
    lines.push('ET');
    lines.push(`${margin + 300} ${yPos} m`);
    lines.push(`${pageWidth - margin} ${yPos} l`);
    lines.push('S');
    lines.push('BT');

    const lmt = document.legalMonetaryTotal;
    yPos -= 15;

    lines.push(`/F1 10 Tf`);
    lines.push(`${margin + 300} ${yPos} Td`);
    lines.push(`(Subtotal:) Tj`);
    lines.push(`${margin + 430} ${yPos} Td`);
    lines.push(`(${this.formatAmount(lmt.lineExtensionAmount)}) Tj`);

    if (lmt.allowanceTotalAmount?.value) {
      yPos -= 15;
      lines.push(`${margin + 300} ${yPos} Td`);
      lines.push(`(Allowances:) Tj`);
      lines.push(`${margin + 430} ${yPos} Td`);
      lines.push(`(-${this.formatAmount(lmt.allowanceTotalAmount)}) Tj`);
    }

    if (lmt.chargeTotalAmount?.value) {
      yPos -= 15;
      lines.push(`${margin + 300} ${yPos} Td`);
      lines.push(`(Charges:) Tj`);
      lines.push(`${margin + 430} ${yPos} Td`);
      lines.push(`(${this.formatAmount(lmt.chargeTotalAmount)}) Tj`);
    }

    yPos -= 15;
    lines.push(`${margin + 300} ${yPos} Td`);
    lines.push(`(Tax Exclusive:) Tj`);
    lines.push(`${margin + 430} ${yPos} Td`);
    lines.push(`(${this.formatAmount(lmt.taxExclusiveAmount)}) Tj`);

    // Tax breakdown
    const taxTotal = document.taxTotal?.[0];
    if (taxTotal?.taxSubtotal?.length) {
      for (const subtotal of taxTotal.taxSubtotal) {
        yPos -= 15;
        const rate = subtotal.taxCategory.percent || 0;
        lines.push(`${margin + 300} ${yPos} Td`);
        lines.push(`(VAT ${rate}%:) Tj`);
        lines.push(`${margin + 430} ${yPos} Td`);
        lines.push(`(${this.formatAmount(subtotal.taxAmount)}) Tj`);
      }
    }

    yPos -= 15;
    lines.push(`/F1 11 Tf`);
    lines.push(`${margin + 300} ${yPos} Td`);
    lines.push(`(TOTAL:) Tj`);
    lines.push(`${margin + 430} ${yPos} Td`);
    lines.push(`(${this.formatAmount(lmt.taxInclusiveAmount)}) Tj`);

    if (lmt.prepaidAmount?.value) {
      yPos -= 15;
      lines.push(`/F1 10 Tf`);
      lines.push(`${margin + 300} ${yPos} Td`);
      lines.push(`(Prepaid:) Tj`);
      lines.push(`${margin + 430} ${yPos} Td`);
      lines.push(`(-${this.formatAmount(lmt.prepaidAmount)}) Tj`);
    }

    yPos -= 15;
    lines.push(`/F1 12 Tf`);
    lines.push(`${margin + 300} ${yPos} Td`);
    lines.push(`(AMOUNT DUE:) Tj`);
    lines.push(`${margin + 430} ${yPos} Td`);
    lines.push(`(${this.formatAmount(lmt.payableAmount)}) Tj`);

    // Payment information
    const paymentMeans = document.paymentMeans?.[0];
    if (paymentMeans?.payeeFinancialAccount) {
      yPos -= 40;
      lines.push(`/F1 10 Tf`);
      lines.push(`${margin} ${yPos} Td`);
      lines.push(`(Payment Information:) Tj`);

      yPos -= 15;
      lines.push(`/F1 9 Tf`);
      lines.push(`${margin} ${yPos} Td`);
      lines.push(`(IBAN: ${paymentMeans.payeeFinancialAccount.id}) Tj`);

      if (paymentMeans.payeeFinancialAccount.financialInstitutionBranch?.id) {
        yPos -= 12;
        lines.push(`${margin} ${yPos} Td`);
        lines.push(`(BIC: ${paymentMeans.payeeFinancialAccount.financialInstitutionBranch.id}) Tj`);
      }

      if (paymentMeans.paymentId?.length) {
        yPos -= 12;
        lines.push(`${margin} ${yPos} Td`);
        lines.push(`(Payment Reference: ${this.escapePdfString(paymentMeans.paymentId[0])}) Tj`);
      }
    }

    // Footer
    yPos = margin + 30;
    lines.push(`/F1 8 Tf`);
    lines.push(`${margin} ${yPos} Td`);
    lines.push(`(This document contains embedded XML invoice data \\(PDF/A-3\\)) Tj`);

    yPos -= 12;
    lines.push(`${margin} ${yPos} Td`);
    lines.push(`(Generated: ${new Date().toISOString()}) Tj`);

    lines.push('ET'); // End text

    return lines.join('\n');
  }

  /**
   * Build complete PDF/A-3 document
   */
  private buildPdfA3Document(
    content: string,
    metadata: PdfA3Metadata,
    embeddedFiles: EmbeddedFile[],
  ): Buffer {
    // Note: This is a simplified PDF structure for demonstration.
    // In production, use a proper PDF library like pdf-lib or pdfkit
    // that supports PDF/A-3 compliance with XMP metadata and embedded files.

    const objects: string[] = [];
    let objectCount = 0;

    const nextObject = () => {
      objectCount++;
      return objectCount;
    };

    // PDF Header
    const header = `%PDF-${this.PDF_VERSION}\n%\xE2\xE3\xCF\xD3\n`;

    // Catalog (object 1)
    const catalogObj = nextObject();
    objects.push(
      `${catalogObj} 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n/MarkInfo << /Marked true >>\n/Lang (en)\n>>\nendobj\n`,
    );

    // Pages (object 2)
    const pagesObj = nextObject();
    objects.push(`${pagesObj} 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n`);

    // Page (object 3)
    const pageObj = nextObject();
    objects.push(
      `${pageObj} 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 595 842]\n/Contents 4 0 R\n/Resources << /Font << /F1 5 0 R >> >>\n>>\nendobj\n`,
    );

    // Content stream (object 4)
    const contentObj = nextObject();
    const contentStream = `${content}`;
    objects.push(
      `${contentObj} 0 obj\n<<\n/Length ${contentStream.length}\n>>\nstream\n${contentStream}\nendstream\nendobj\n`,
    );

    // Font (object 5) - Simple Helvetica reference
    const fontObj = nextObject();
    objects.push(
      `${fontObj} 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n/Encoding /WinAnsiEncoding\n>>\nendobj\n`,
    );

    // Info dictionary (object 6)
    const infoObj = nextObject();
    objects.push(
      `${infoObj} 0 obj\n<<\n` +
        `/Title (${this.escapePdfString(metadata.title)})\n` +
        `/Author (${this.escapePdfString(metadata.author)})\n` +
        `/Subject (${this.escapePdfString(metadata.subject)})\n` +
        `/Keywords (${metadata.keywords.join(', ')})\n` +
        `/Creator (${metadata.creator})\n` +
        `/Producer (${metadata.producer})\n` +
        `/CreationDate (D:${this.formatPdfDate(metadata.creationDate)})\n` +
        `/ModDate (D:${this.formatPdfDate(metadata.modificationDate)})\n` +
        `>>\nendobj\n`,
    );

    // Embedded file streams (simplified - in production, proper AF dictionary needed)
    for (const file of embeddedFiles) {
      const fileObj = nextObject();
      const fileContent = file.content.toString('base64');
      objects.push(
        `${fileObj} 0 obj\n<<\n` +
          `/Type /EmbeddedFile\n` +
          `/Subtype /${file.mimeType.replace('/', '#2F')}\n` +
          `/Length ${fileContent.length}\n` +
          `/Filter /ASCIIHexDecode\n` +
          `>>\nstream\n${fileContent}\nendstream\nendobj\n`,
      );
    }

    // Build PDF
    let pdf = header;
    let xrefOffset = header.length;
    const xrefEntries: string[] = ['0000000000 65535 f \n'];

    for (const obj of objects) {
      xrefEntries.push(`${xrefOffset.toString().padStart(10, '0')} 00000 n \n`);
      pdf += obj;
      xrefOffset += obj.length;
    }

    // Cross-reference table
    pdf += `xref\n0 ${objectCount + 1}\n`;
    pdf += xrefEntries.join('');

    // Trailer
    pdf += `trailer\n<<\n/Size ${objectCount + 1}\n/Root 1 0 R\n/Info ${infoObj} 0 R\n>>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'latin1');
  }

  /**
   * Escape string for PDF
   */
  private escapePdfString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\x00-\x1f]/g, '');
  }

  /**
   * Format amount for display
   */
  private formatAmount(amount: UblAmount): string {
    if (!amount) return '0.00';
    return `${amount.value.toFixed(2)} ${amount.currencyId}`;
  }

  /**
   * Format date for PDF
   */
  private formatPdfDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  /**
   * Check if PDF/A-3 generation is supported
   */
  isSupported(): boolean {
    return true;
  }
}
