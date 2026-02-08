/**
 * CFDI 4.0 (Comprobante Fiscal Digital por Internet) Types
 *
 * Core interfaces for Mexican electronic invoicing (facturacion electronica)
 * compliant with SAT CFDI 4.0 specification.
 *
 * @see https://www.sat.gob.mx/consultas/35025/formato-de-factura-electronica-(anexo-20)
 */

/**
 * CFDI Document Types (Tipo de Comprobante)
 */
export enum CfdiTipoComprobante {
  /** Ingreso - Regular income invoice */
  INGRESO = 'I',
  /** Egreso - Credit note / deduction */
  EGRESO = 'E',
  /** Traslado - Transfer (no payment) */
  TRASLADO = 'T',
  /** Nomina - Payroll */
  NOMINA = 'N',
  /** Pago - Payment receipt */
  PAGO = 'P',
}

/**
 * CFDI Export Types (Exportacion)
 */
export enum CfdiExportacion {
  /** No aplica */
  NO_APLICA = '01',
  /** Definitiva */
  DEFINITIVA = '02',
  /** Temporal */
  TEMPORAL = '03',
  /** Definitiva con clave distinta a A1 */
  DEFINITIVA_CLAVE_DISTINTA = '04',
}

/**
 * Payment Method (Metodo de Pago)
 */
export enum CfdiMetodoPago {
  /** Pago en una sola exhibicion */
  PUE = 'PUE',
  /** Pago en parcialidades o diferido */
  PPD = 'PPD',
}

/**
 * Payment Form (Forma de Pago) - c_FormaPago catalog
 */
export enum CfdiFormaPago {
  EFECTIVO = '01',
  CHEQUE_NOMINATIVO = '02',
  TRANSFERENCIA_ELECTRONICA = '03',
  TARJETA_CREDITO = '04',
  MONEDERO_ELECTRONICO = '05',
  DINERO_ELECTRONICO = '06',
  VALES_DESPENSA = '08',
  DACION_EN_PAGO = '12',
  PAGO_POR_SUBROGACION = '13',
  PAGO_POR_CONSIGNACION = '14',
  CONDONACION = '15',
  COMPENSACION = '17',
  NOVACION = '23',
  CONFUSION = '24',
  REMISION_DE_DEUDA = '25',
  PRESCRIPCION_O_CADUCIDAD = '26',
  A_SATISFACCION_DEL_ACREEDOR = '27',
  TARJETA_DEBITO = '28',
  TARJETA_SERVICIOS = '29',
  APLICACION_ANTICIPOS = '30',
  INTERMEDIARIO_PAGOS = '31',
  POR_DEFINIR = '99',
}

/**
 * Use of CFDI (Uso del CFDI) - c_UsoCFDI catalog
 */
export enum CfdiUsoCFDI {
  ADQUISICION_MERCANCIAS = 'G01',
  DEVOLUCIONES_DESCUENTOS_BONIFICACIONES = 'G02',
  GASTOS_EN_GENERAL = 'G03',
  CONSTRUCCIONES = 'I01',
  MOBILIARIO_EQUIPO_OFICINA = 'I02',
  EQUIPO_TRANSPORTE = 'I03',
  EQUIPO_COMPUTO = 'I04',
  DADOS_TROQUELES_MOLDES = 'I05',
  COMUNICACIONES_TELEFONICAS = 'I06',
  COMUNICACIONES_SATELITALES = 'I07',
  OTRA_MAQUINARIA_EQUIPO = 'I08',
  HONORARIOS_MEDICOS = 'D01',
  GASTOS_MEDICOS_INCAPACIDAD = 'D02',
  GASTOS_FUNERALES = 'D03',
  DONATIVOS = 'D04',
  INTERESES_CREDITOS_HIPOTECARIOS = 'D05',
  APORTACIONES_SAR = 'D06',
  PRIMAS_SEGUROS_GASTOS_MEDICOS = 'D07',
  GASTOS_TRANSPORTACION_ESCOLAR = 'D08',
  DEPOSITOS_CUENTAS_AHORRO = 'D09',
  PAGOS_SERVICIOS_EDUCATIVOS = 'D10',
  SIN_EFECTOS_FISCALES = 'S01',
  PAGOS = 'CP01',
  NOMINA = 'CN01',
}

/**
 * Tax Regime (Regimen Fiscal) - c_RegimenFiscal catalog
 */
export enum CfdiRegimenFiscal {
  GENERAL_LEY_PERSONAS_MORALES = '601',
  PERSONAS_MORALES_FINES_NO_LUCRATIVOS = '603',
  SUELDOS_SALARIOS = '605',
  ARRENDAMIENTO = '606',
  REGIMEN_ENAJENACION_ADQUISICION_BIENES = '607',
  DEMAS_INGRESOS = '608',
  RESIDENTES_EXTRANJERO_ESTABLECIMIENTO = '609',
  RESIDENTES_EXTRANJERO_SIN_ESTABLECIMIENTO = '610',
  INGRESOS_DIVIDENDOS = '611',
  PERSONAS_FISICAS_ACTIVIDADES_EMPRESARIALES = '612',
  INGRESOS_INTERESES = '614',
  REGIMEN_INGRESOS_PREMIOS = '615',
  SIN_OBLIGACIONES_FISCALES = '616',
  SOCIEDADES_COOPERATIVAS_PRODUCCION = '620',
  INCORPORACION_FISCAL = '621',
  ACTIVIDADES_AGRICOLAS_GANADERAS = '622',
  OPCIONAL_GRUPOS_SOCIEDADES = '623',
  COORDINADOS = '624',
  REGIMEN_ACTIVIDADES_EMPRESARIALES_PLATAFORMAS = '625',
  REGIMEN_SIMPLIFICADO_CONFIANZA = '626',
}

/**
 * Tax Type (Impuesto)
 */
export enum CfdiImpuesto {
  ISR = '001',
  IVA = '002',
  IEPS = '003',
}

/**
 * Tax Factor Type (TipoFactor)
 */
export enum CfdiTipoFactor {
  TASA = 'Tasa',
  CUOTA = 'Cuota',
  EXENTO = 'Exento',
}

/**
 * Object of Tax (ObjetoImp)
 */
export enum CfdiObjetoImp {
  NO_OBJETO_IMPUESTO = '01',
  SI_OBJETO_IMPUESTO = '02',
  SI_OBJETO_NO_OBLIGADO_DESGLOSE = '03',
  SI_OBJETO_NO_CAUSA_IMPUESTO = '04',
}

/**
 * CFDI Relationship Type (TipoRelacion)
 */
export enum CfdiTipoRelacion {
  NOTA_CREDITO = '01',
  NOTA_DEBITO = '02',
  DEVOLUCION_MERCANCIA = '03',
  SUSTITUCION_CFDI_PREVIOS = '04',
  TRASLADOS_MERCANCIAS_PREVIAMENTE = '05',
  FACTURA_TRASLADOS_PREVIOS = '06',
  CFDI_APLICACION_ANTICIPO = '07',
  FACTURA_PAGOS_DIFERIDO = '08',
  FACTURA_PARCIALIDADES = '09',
}

/**
 * Cancellation Reason (Motivo Cancelacion)
 */
export enum CfdiMotivoCancelacion {
  /** Comprobante emitido con errores con relacion */
  COMPROBANTE_ERRORES_CON_RELACION = '01',
  /** Comprobante emitido con errores sin relacion */
  COMPROBANTE_ERRORES_SIN_RELACION = '02',
  /** No se llevo a cabo la operacion */
  NO_SE_LLEVO_OPERACION = '03',
  /** Operacion nominativa relacionada en factura global */
  OPERACION_NOMINATIVA_FACTURA_GLOBAL = '04',
}

/**
 * CFDI Status
 */
export enum CfdiStatus {
  DRAFT = 'draft',
  SEALED = 'sealed',
  STAMPED = 'stamped',
  VALID = 'valid',
  CANCELLED = 'cancelled',
  CANCELLATION_PENDING = 'cancellation_pending',
  CANCELLATION_REJECTED = 'cancellation_rejected',
}

/**
 * Issuer (Emisor) - The entity issuing the CFDI
 */
export interface CfdiEmisor {
  /** RFC (Registro Federal de Contribuyentes) */
  rfc: string;
  /** Business/Legal name */
  nombre: string;
  /** Tax Regime */
  regimenFiscal: CfdiRegimenFiscal | string;
  /** Facility identifier (optional) */
  facAtrAdquirente?: string;
}

/**
 * Recipient (Receptor) - The entity receiving the CFDI
 */
export interface CfdiReceptor {
  /** RFC (Registro Federal de Contribuyentes) */
  rfc: string;
  /** Business/Legal name */
  nombre: string;
  /** Postal code of fiscal domicile */
  domicilioFiscalReceptor: string;
  /** Recipient's tax regime */
  regimenFiscalReceptor: CfdiRegimenFiscal | string;
  /** Use of CFDI */
  usoCFDI: CfdiUsoCFDI | string;
  /** Residence country (for foreign) */
  residenciaFiscal?: string;
  /** Tax ID number (for foreign) */
  numRegIdTrib?: string;
}

/**
 * Product/Service Unit (ClaveUnidad)
 */
export interface CfdiUnidad {
  /** SAT Unit code (c_ClaveUnidad) */
  claveUnidad: string;
  /** Unit name/description */
  unidad?: string;
}

/**
 * Product/Service (ClaveProdServ)
 */
export interface CfdiProductoServicio {
  /** SAT Product/Service code (c_ClaveProdServ) */
  claveProdServ: string;
  /** Product/service description */
  descripcion: string;
}

/**
 * Tax Detail (Impuesto)
 */
export interface CfdiImpuestoDetalle {
  /** Tax base amount */
  base: number;
  /** Tax type (IVA, ISR, IEPS) */
  impuesto: CfdiImpuesto | string;
  /** Factor type */
  tipoFactor: CfdiTipoFactor;
  /** Tax rate */
  tasaOCuota?: number;
  /** Tax amount */
  importe?: number;
}

/**
 * Transferred Taxes for a line item
 */
export interface CfdiTrasladosConcepto {
  traslados: CfdiImpuestoDetalle[];
}

/**
 * Withheld Taxes for a line item
 */
export interface CfdiRetencionesConcepto {
  retenciones: CfdiImpuestoDetalle[];
}

/**
 * Line Item Taxes
 */
export interface CfdiImpuestosConcepto {
  /** Transferred taxes (IVA, IEPS) */
  traslados?: CfdiTrasladosConcepto;
  /** Withheld taxes (ISR, IVA retention) */
  retenciones?: CfdiRetencionesConcepto;
}

/**
 * Customs Information (InformacionAduanera)
 */
export interface CfdiInformacionAduanera {
  /** Customs document number (pedimento) */
  numeroPedimento: string;
}

/**
 * Property Account (CuentaPredial)
 */
export interface CfdiCuentaPredial {
  /** Property account number */
  numero: string;
}

/**
 * Third Party Account Tax Information
 */
export interface CfdiACuentaTerceros {
  /** Third party RFC */
  rfcACuentaTerceros: string;
  /** Third party name */
  nombreACuentaTerceros: string;
  /** Third party tax regime */
  regimenFiscalACuentaTerceros: CfdiRegimenFiscal | string;
  /** Third party postal code */
  domicilioFiscalACuentaTerceros: string;
}

/**
 * Part/Component (Parte) for items with multiple components
 */
export interface CfdiParte {
  /** SAT Product/Service code */
  claveProdServ: string;
  /** Part identifier number */
  noIdentificacion?: string;
  /** Quantity */
  cantidad: number;
  /** SAT Unit code */
  claveUnidad?: string;
  /** Unit description */
  unidad?: string;
  /** Description */
  descripcion: string;
  /** Unit value */
  valorUnitario?: number;
  /** Total amount */
  importe?: number;
  /** Customs information */
  informacionAduanera?: CfdiInformacionAduanera[];
}

/**
 * Line Item (Concepto)
 */
export interface CfdiConcepto {
  /** SAT Product/Service code */
  claveProdServ: string;
  /** Internal product identifier */
  noIdentificacion?: string;
  /** Quantity */
  cantidad: number;
  /** SAT Unit code */
  claveUnidad: string;
  /** Unit description */
  unidad?: string;
  /** Description */
  descripcion: string;
  /** Unit value (price) */
  valorUnitario: number;
  /** Total line amount (before taxes) */
  importe: number;
  /** Discount amount */
  descuento?: number;
  /** Tax object indicator */
  objetoImp: CfdiObjetoImp | string;
  /** Taxes for this line */
  impuestos?: CfdiImpuestosConcepto;
  /** Third party account */
  aCuentaTerceros?: CfdiACuentaTerceros;
  /** Customs information */
  informacionAduanera?: CfdiInformacionAduanera[];
  /** Property account */
  cuentaPredial?: CfdiCuentaPredial[];
  /** Complement specific to this line */
  complementoConcepto?: any;
  /** Parts/components */
  parte?: CfdiParte[];
}

/**
 * Summary Transferred Tax
 */
export interface CfdiTrasladoResumen {
  /** Base amount */
  base: number;
  /** Tax type */
  impuesto: CfdiImpuesto | string;
  /** Factor type */
  tipoFactor: CfdiTipoFactor;
  /** Tax rate */
  tasaOCuota?: number;
  /** Tax amount */
  importe?: number;
}

/**
 * Summary Withheld Tax
 */
export interface CfdiRetencionResumen {
  /** Tax type */
  impuesto: CfdiImpuesto | string;
  /** Tax amount */
  importe: number;
}

/**
 * Document Level Taxes (Impuestos)
 */
export interface CfdiImpuestos {
  /** Total transferred taxes */
  totalImpuestosTrasladados?: number;
  /** Total withheld taxes */
  totalImpuestosRetenidos?: number;
  /** Transferred tax breakdown */
  traslados?: CfdiTrasladoResumen[];
  /** Withheld tax breakdown */
  retenciones?: CfdiRetencionResumen[];
}

/**
 * Related CFDI (CfdiRelacionado)
 */
export interface CfdiRelacionado {
  /** UUID of related CFDI */
  uuid: string;
}

/**
 * Related CFDIs Container
 */
export interface CfdisCfdiRelacionados {
  /** Relationship type */
  tipoRelacion: CfdiTipoRelacion | string;
  /** Related CFDI UUIDs */
  cfdiRelacionado: CfdiRelacionado[];
}

/**
 * Global Information for public sales (InformacionGlobal)
 */
export interface CfdiInformacionGlobal {
  /** Periodicity */
  periodicidad: '01' | '02' | '03' | '04' | '05';
  /** Months */
  meses: string;
  /** Year */
  año: number;
}

/**
 * Fiscal Stamp (TimbreFiscalDigital) - Added by PAC
 */
export interface CfdiTimbreFiscalDigital {
  /** Stamp version */
  version: '1.1';
  /** UUID assigned by SAT */
  uuid: string;
  /** Stamp date */
  fechaTimbrado: string;
  /** SAT certificate number */
  noCertificadoSAT: string;
  /** Original string seal for stamp */
  selloCFD: string;
  /** SAT seal */
  selloSAT: string;
  /** RFC of PAC that stamped */
  rfcProvCertif: string;
}

/**
 * Main CFDI 4.0 Document (Comprobante)
 */
export interface CfdiComprobante {
  /** Schema version (always "4.0") */
  version: '4.0';
  /** Invoice series (optional) */
  serie?: string;
  /** Invoice folio/number */
  folio?: string;
  /** Issue date (ISO format: 2024-01-15T10:30:00) */
  fecha: string;
  /** Issuer's digital seal */
  sello?: string;
  /** Payment form */
  formaPago?: CfdiFormaPago | string;
  /** Certificate number */
  noCertificado?: string;
  /** Base64 encoded certificate */
  certificado?: string;
  /** Payment conditions */
  condicionesDePago?: string;
  /** Subtotal (sum of concepts before taxes/discounts) */
  subTotal: number;
  /** Total discount */
  descuento?: number;
  /** Currency code (ISO 4217) */
  moneda: string;
  /** Exchange rate (when currency != MXN) */
  tipoCambio?: number;
  /** Grand total */
  total: number;
  /** Document type */
  tipoDeComprobante: CfdiTipoComprobante;
  /** Export type */
  exportacion: CfdiExportacion | string;
  /** Payment method (PUE/PPD) */
  metodoPago?: CfdiMetodoPago;
  /** Issuer's postal code */
  lugarExpedicion: string;
  /** Confirmation code (for high-value/negative invoices) */
  confirmacion?: string;
  /** Related CFDIs */
  cfdiRelacionados?: CfdisCfdiRelacionados[];
  /** Issuer information */
  emisor: CfdiEmisor;
  /** Recipient information */
  receptor: CfdiReceptor;
  /** Line items */
  conceptos: CfdiConcepto[];
  /** Document level taxes */
  impuestos?: CfdiImpuestos;
  /** Complements (Pagos, ComercioExterior, etc.) */
  complemento?: CfdiComplemento;
  /** Addenda (custom buyer data) */
  addenda?: CfdiAddenda;
  /** Global information (for public sales) */
  informacionGlobal?: CfdiInformacionGlobal;
}

/**
 * Complement Container
 */
export interface CfdiComplemento {
  /** Fiscal stamp (added by PAC) */
  timbreFiscalDigital?: CfdiTimbreFiscalDigital;
  /** Pagos 2.0 complement */
  pagos?: CfdiPagos20;
  /** Comercio Exterior complement */
  comercioExterior?: CfdiComercioExterior;
  /** Any other complements */
  otros?: any[];
}

/**
 * Addenda Container
 */
export interface CfdiAddenda {
  /** Amazon addenda */
  amazon?: CfdiAddendaAmazon;
  /** Walmart addenda */
  walmart?: CfdiAddendaWalmart;
  /** Liverpool addenda */
  liverpool?: CfdiAddendaLiverpool;
  /** Soriana addenda */
  soriana?: CfdiAddendaSoriana;
  /** Custom addenda (raw XML) */
  custom?: string;
}

// =============================================================================
// Pagos 2.0 Complement Types
// =============================================================================

/**
 * Pagos 2.0 Totales (Summary)
 */
export interface CfdiPagos20Totales {
  /** Total retained IVA */
  totalRetencionesIVA?: number;
  /** Total retained ISR */
  totalRetencionesISR?: number;
  /** Total retained IEPS */
  totalRetencionesIEPS?: number;
  /** Total transferred taxes at base 16% */
  totalTrasladosBaseIVA16?: number;
  /** Total transferred IVA at 16% */
  totalTrasladosImpuestoIVA16?: number;
  /** Total transferred taxes at base 8% */
  totalTrasladosBaseIVA8?: number;
  /** Total transferred IVA at 8% */
  totalTrasladosImpuestoIVA8?: number;
  /** Total transferred taxes at base 0% */
  totalTrasladosBaseIVA0?: number;
  /** Total transferred IVA at 0% */
  totalTrasladosImpuestoIVA0?: number;
  /** Total exempt base */
  totalTrasladosBaseIVAExento?: number;
  /** Total payments amount */
  montoTotalPagos: number;
}

/**
 * Related Document in Payment (DoctoRelacionado)
 */
export interface CfdiPagos20DoctoRelacionado {
  /** Related CFDI UUID */
  idDocumento: string;
  /** Series of related CFDI */
  serie?: string;
  /** Folio of related CFDI */
  folio?: string;
  /** Currency of related CFDI */
  monedaDR: string;
  /** Payment equivalence (exchange rate) */
  equivalenciaDR: number;
  /** Number of partial payment */
  numParcialidad: number;
  /** Previous balance */
  impSaldoAnt: number;
  /** Amount paid */
  impPagado: number;
  /** Remaining balance */
  impSaldoInsoluto: number;
  /** Object of tax */
  objetoImpDR: CfdiObjetoImp | string;
  /** Taxes for this payment portion */
  impuestosDR?: CfdiPagos20ImpuestosDR;
}

/**
 * Taxes for Document Related in Payment
 */
export interface CfdiPagos20ImpuestosDR {
  /** Retained taxes */
  retencionesDR?: CfdiPagos20RetencionDR[];
  /** Transferred taxes */
  trasladosDR?: CfdiPagos20TrasladoDR[];
}

/**
 * Retention in Document Related
 */
export interface CfdiPagos20RetencionDR {
  /** Base amount */
  baseDR: number;
  /** Tax type */
  impuestoDR: CfdiImpuesto | string;
  /** Factor type */
  tipoFactorDR: CfdiTipoFactor;
  /** Tax rate */
  tasaOCuotaDR: number;
  /** Tax amount */
  importeDR: number;
}

/**
 * Transfer in Document Related
 */
export interface CfdiPagos20TrasladoDR {
  /** Base amount */
  baseDR: number;
  /** Tax type */
  impuestoDR: CfdiImpuesto | string;
  /** Factor type */
  tipoFactorDR: CfdiTipoFactor;
  /** Tax rate */
  tasaOCuotaDR?: number;
  /** Tax amount */
  importeDR?: number;
}

/**
 * Payment Taxes Summary (ImpuestosP)
 */
export interface CfdiPagos20ImpuestosP {
  /** Retained taxes */
  retencionesP?: CfdiPagos20RetencionP[];
  /** Transferred taxes */
  trasladosP?: CfdiPagos20TrasladoP[];
}

/**
 * Retention in Payment
 */
export interface CfdiPagos20RetencionP {
  /** Tax type */
  impuestoP: CfdiImpuesto | string;
  /** Tax amount */
  importeP: number;
}

/**
 * Transfer in Payment
 */
export interface CfdiPagos20TrasladoP {
  /** Base amount */
  baseP: number;
  /** Tax type */
  impuestoP: CfdiImpuesto | string;
  /** Factor type */
  tipoFactorP: CfdiTipoFactor;
  /** Tax rate */
  tasaOCuotaP?: number;
  /** Tax amount */
  importeP?: number;
}

/**
 * Individual Payment (Pago)
 */
export interface CfdiPagos20Pago {
  /** Payment date */
  fechaPago: string;
  /** Payment form */
  formaDePagoP: CfdiFormaPago | string;
  /** Payment currency */
  monedaP: string;
  /** Exchange rate */
  tipoCambioP?: number;
  /** Payment amount */
  monto: number;
  /** Payer's bank RFC */
  rfcEmisorCtaOrd?: string;
  /** Foreign payer's bank name */
  nomBancoOrdExt?: string;
  /** Payer's account */
  ctaOrdenante?: string;
  /** Beneficiary's bank RFC */
  rfcEmisorCtaBen?: string;
  /** Beneficiary's account */
  ctaBeneficiario?: string;
  /** Payment type chain code */
  tipoCadPago?: '01';
  /** Payment certificate (for SPEI) */
  certPago?: string;
  /** Original string of payment */
  cadPago?: string;
  /** Seal of payment */
  selloPago?: string;
  /** Related documents */
  doctoRelacionado: CfdiPagos20DoctoRelacionado[];
  /** Payment taxes */
  impuestosP?: CfdiPagos20ImpuestosP;
}

/**
 * Pagos 2.0 Complement
 */
export interface CfdiPagos20 {
  /** Version (always "2.0") */
  version: '2.0';
  /** Totals summary */
  totales: CfdiPagos20Totales;
  /** Individual payments */
  pago: CfdiPagos20Pago[];
}

// =============================================================================
// Comercio Exterior Complement Types
// =============================================================================

/**
 * Propietario (Owner for temporary import)
 */
export interface CfdiComercioExteriorPropietario {
  /** Tax ID number */
  numRegIdTrib: string;
  /** Residence country (ISO 3166-1 alpha-3) */
  residenciaFiscal: string;
}

/**
 * Destinatario (Recipient for export)
 */
export interface CfdiComercioExteriorDestinatario {
  /** Tax ID number */
  numRegIdTrib?: string;
  /** Recipient name */
  nombre?: string;
  /** Address */
  domicilio?: CfdiComercioExteriorDomicilio;
}

/**
 * Domicilio (Address for Comercio Exterior)
 */
export interface CfdiComercioExteriorDomicilio {
  /** Street */
  calle: string;
  /** External number */
  numeroExterior?: string;
  /** Internal number */
  numeroInterior?: string;
  /** Neighborhood/Colony */
  colonia?: string;
  /** Locality */
  localidad?: string;
  /** Reference */
  referencia?: string;
  /** Municipality */
  municipio?: string;
  /** State */
  estado: string;
  /** Country (ISO 3166-1 alpha-3) */
  pais: string;
  /** Postal code */
  codigoPostal: string;
}

/**
 * Descripcion Especifica (Specific Description for merchandise)
 */
export interface CfdiComercioExteriorDescripcionEspecifica {
  /** Brand */
  marca: string;
  /** Model */
  modelo?: string;
  /** Submodel */
  subModelo?: string;
  /** Serial number */
  numeroSerie?: string;
}

/**
 * Mercancia (Merchandise for Comercio Exterior)
 */
export interface CfdiComercioExteriorMercancia {
  /** Internal number matching concept */
  noIdentificacion: string;
  /** Tariff fraction */
  fraccionArancelaria?: string;
  /** Customs quantity */
  cantidadAduana?: number;
  /** Customs unit */
  unidadAduana?: string;
  /** Dollar unit value */
  valorUnitarioAduana?: number;
  /** Dollar total value */
  valorDolares: number;
  /** Specific descriptions */
  descripcionesEspecificas?: CfdiComercioExteriorDescripcionEspecifica[];
}

/**
 * Comercio Exterior 2.0 Complement
 */
export interface CfdiComercioExterior {
  /** Version (always "2.0") */
  version: '2.0';
  /** Operation type */
  motivoTraslado?: '01' | '02' | '03' | '04' | '05';
  /** Operation key */
  claveDeOperacion?: string;
  /** CURP certification */
  certificadoOrigen?: 0 | 1;
  /** Certificate folio */
  numCertificadoOrigen?: string;
  /** Export number */
  numExportadorConfiable?: string;
  /** Incoterm */
  incoterm?: string;
  /** Split shipment */
  subdivision?: 0 | 1;
  /** Observations */
  observaciones?: string;
  /** Exchange rate USD */
  tipoCambioUSD: number;
  /** Total in USD */
  totalUSD: number;
  /** Issuer address */
  emisor?: {
    domicilio?: CfdiComercioExteriorDomicilio;
  };
  /** Owners (for temporary import) */
  propietario?: CfdiComercioExteriorPropietario[];
  /** Recipients */
  destinatario?: CfdiComercioExteriorDestinatario[];
  /** Merchandise list */
  mercancias?: CfdiComercioExteriorMercancia[];
}

// =============================================================================
// Common Addenda Types
// =============================================================================

/**
 * Amazon Mexico Addenda
 */
export interface CfdiAddendaAmazon {
  /** Vendor code */
  vendorCode: string;
  /** Ship-to location code */
  shipToLocationCode: string;
  /** Bill-to location code */
  billToLocationCode: string;
  /** Purchase order number */
  purchaseOrderNumber: string;
  /** Purchase order date */
  purchaseOrderDate: string;
  /** Delivery note number */
  deliveryNoteNumber?: string;
  /** ASN (Advance Shipment Notice) */
  asnNumber?: string;
}

/**
 * Walmart Mexico Addenda
 */
export interface CfdiAddendaWalmart {
  /** Provider number */
  providerNumber: string;
  /** Store number */
  storeNumber: string;
  /** Purchase order number */
  purchaseOrderNumber: string;
  /** Invoice type */
  invoiceType: 'Normal' | 'Devolucion';
  /** Delivery date */
  deliveryDate?: string;
  /** Reference number */
  reference?: string;
}

/**
 * Liverpool Mexico Addenda
 */
export interface CfdiAddendaLiverpool {
  /** Provider number */
  providerNumber: string;
  /** Purchase order number */
  purchaseOrderNumber: string;
  /** Delivery number */
  deliveryNumber?: string;
  /** Reference 1 */
  reference1?: string;
  /** Reference 2 */
  reference2?: string;
}

/**
 * Soriana Mexico Addenda
 */
export interface CfdiAddendaSoriana {
  /** Provider number */
  providerNumber: string;
  /** Purchase order number */
  orderNumber: string;
  /** Store number */
  storeNumber: string;
  /** Delivery folio */
  deliveryFolio?: string;
}

// =============================================================================
// Service Types
// =============================================================================

/**
 * CSD (Certificado de Sello Digital) Certificate
 */
export interface CfdiCsdCertificate {
  /** Certificate number (20 digits) */
  noCertificado: string;
  /** Certificate in base64 */
  certificado: string;
  /** Certificate expiration date */
  validTo: Date;
  /** Certificate issuer RFC */
  rfcEmisor: string;
  /** Private key (encrypted PEM) */
  privateKey: string;
  /** Private key password */
  password: string;
}

/**
 * PAC (Proveedor Autorizado de Certificacion) Configuration
 */
export interface CfdiPacConfig {
  /** PAC name identifier */
  pacName: 'finkok' | 'facturapi' | 'swsapien' | 'diverza' | 'formasdigitales';
  /** PAC API endpoint (production) */
  productionUrl: string;
  /** PAC API endpoint (sandbox) */
  sandboxUrl: string;
  /** API username */
  username: string;
  /** API password */
  password: string;
  /** Use sandbox mode */
  sandbox: boolean;
  /** RFC of the reseller (for multi-tenant) */
  rfcReseller?: string;
}

/**
 * Stamp (Timbrado) Request
 */
export interface CfdiStampRequest {
  /** Sealed XML (with sello attribute) */
  xml: string;
  /** Force stamp even if duplicate */
  allowDuplicates?: boolean;
}

/**
 * Stamp (Timbrado) Response
 */
export interface CfdiStampResponse {
  /** Success indicator */
  success: boolean;
  /** Stamped XML with TimbreFiscalDigital */
  xml?: string;
  /** Assigned UUID */
  uuid?: string;
  /** Stamp date */
  fechaTimbrado?: string;
  /** SAT certificate number */
  noCertificadoSAT?: string;
  /** SAT seal */
  selloSAT?: string;
  /** Original string (cadena original) */
  cadenaOriginal?: string;
  /** Error code */
  errorCode?: string;
  /** Error message */
  errorMessage?: string;
}

/**
 * Cancellation Request
 */
export interface CfdiCancelRequest {
  /** UUID to cancel */
  uuid: string;
  /** Issuer RFC */
  rfcEmisor: string;
  /** Recipient RFC */
  rfcReceptor: string;
  /** Total amount of CFDI */
  total: number;
  /** Cancellation reason */
  motivo: CfdiMotivoCancelacion;
  /** Replacement UUID (when motivo = '01') */
  folioSustitucion?: string;
}

/**
 * Cancellation Response
 */
export interface CfdiCancelResponse {
  /** Success indicator */
  success: boolean;
  /** Cancellation acknowledgment (acuse) XML */
  acuse?: string;
  /** Cancellation status */
  status?: 'cancelled' | 'pending' | 'rejected';
  /** Related status date */
  statusDate?: string;
  /** Error code */
  errorCode?: string;
  /** Error message */
  errorMessage?: string;
}

/**
 * SAT Validation Request
 */
export interface CfdiSatValidationRequest {
  /** CFDI UUID */
  uuid: string;
  /** Issuer RFC */
  rfcEmisor: string;
  /** Recipient RFC */
  rfcReceptor: string;
  /** Total amount */
  total: number;
}

/**
 * SAT Validation Response
 */
export interface CfdiSatValidationResponse {
  /** CFDI exists in SAT */
  valid: boolean;
  /** CFDI status */
  estado?: 'Vigente' | 'Cancelado' | 'No Encontrado';
  /** Cancellation status (if cancelled) */
  esCancelable?: 'Cancelable sin aceptacion' | 'Cancelable con aceptacion' | 'No cancelable';
  /** Cancellation status details */
  estatusCancelacion?: string;
  /** Validation date */
  fechaValidacion?: string;
  /** Error message */
  error?: string;
}

/**
 * PDF Generation Options
 */
export interface CfdiPdfOptions {
  /** CFDI document */
  comprobante: CfdiComprobante;
  /** Timbre fiscal (if stamped) */
  timbre?: CfdiTimbreFiscalDigital;
  /** Original string (cadena original) */
  cadenaOriginal?: string;
  /** Logo in base64 */
  logo?: string;
  /** Template name */
  template?: 'standard' | 'detailed' | 'compact';
  /** Custom colors */
  colors?: {
    primary?: string;
    secondary?: string;
  };
  /** Show QR code */
  showQr?: boolean;
  /** Additional notes */
  notes?: string;
}

/**
 * CFDI Document Envelope (for tracking)
 */
export interface CfdiDocument {
  /** Internal document ID */
  documentId: string;
  /** Tenant ID */
  tenantId: string;
  /** Current status */
  status: CfdiStatus;
  /** CFDI data */
  comprobante: CfdiComprobante;
  /** Sealed XML (before stamp) */
  sealedXml?: string;
  /** Stamped XML (after stamp) */
  stampedXml?: string;
  /** Timbre fiscal digital */
  timbre?: CfdiTimbreFiscalDigital;
  /** Original string */
  cadenaOriginal?: string;
  /** QR code string */
  qrString?: string;
  /** PDF representation (base64) */
  pdf?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Status history */
  statusHistory: Array<{
    status: CfdiStatus;
    timestamp: Date;
    message?: string;
    userId?: string;
  }>;
  /** Cancellation info */
  cancellation?: {
    motivo: CfdiMotivoCancelacion;
    folioSustitucion?: string;
    requestedAt: Date;
    processedAt?: Date;
    acuse?: string;
  };
  /** Validation errors */
  validationErrors?: CfdiValidationError[];
}

/**
 * Validation Error
 */
export interface CfdiValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field/path with error */
  field?: string;
  /** Severity */
  severity: 'error' | 'warning';
  /** SAT catalog reference */
  catalogReference?: string;
}

/**
 * Validation Result
 */
export interface CfdiValidationResult {
  /** Is valid */
  valid: boolean;
  /** Errors */
  errors: CfdiValidationError[];
  /** Warnings */
  warnings: CfdiValidationError[];
  /** Validated at */
  validatedAt: Date;
}

/**
 * CFDI Module Configuration
 */
export interface CfdiConfig {
  /** PAC configuration */
  pac: CfdiPacConfig;
  /** Default CSD certificate */
  defaultCsd?: CfdiCsdCertificate;
  /** SAT validation endpoint */
  satValidationUrl?: string;
  /** Enable automatic SAT validation */
  enableSatValidation?: boolean;
  /** Default export type */
  defaultExportacion?: CfdiExportacion;
  /** PDF generation enabled */
  enablePdf?: boolean;
  /** Sandbox/test mode */
  sandbox?: boolean;
}
