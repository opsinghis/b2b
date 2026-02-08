/**
 * NF-e (Nota Fiscal Eletrônica) Types
 *
 * Core interfaces for Brazilian electronic invoicing
 * compliant with NF-e layout 4.0 specification.
 *
 * @see http://www.nfe.fazenda.gov.br/portal/principal.aspx
 * @see Manual de Integração - Contribuinte (versão 4.0.1)
 */

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Brazilian States (UF) - IBGE codes
 */
export enum NfeUf {
  AC = 12,
  AL = 27,
  AP = 16,
  AM = 13,
  BA = 29,
  CE = 23,
  DF = 53,
  ES = 32,
  GO = 52,
  MA = 21,
  MT = 51,
  MS = 50,
  MG = 31,
  PA = 15,
  PB = 25,
  PR = 41,
  PE = 26,
  PI = 22,
  RJ = 33,
  RN = 24,
  RS = 43,
  RO = 11,
  RR = 14,
  SC = 42,
  SP = 35,
  SE = 28,
  TO = 17,
}

/**
 * NF-e Model Type
 */
export enum NfeModelo {
  /** NF-e (55) */
  NFE = 55,
  /** NFC-e - Consumer (65) */
  NFCE = 65,
}

/**
 * NF-e Operation Type (Tipo de Operação)
 */
export enum NfeTipoOperacao {
  /** Entrada (incoming) */
  ENTRADA = 0,
  /** Saída (outgoing) */
  SAIDA = 1,
}

/**
 * NF-e Destination of Operation
 */
export enum NfeDestinoOperacao {
  /** Operação interna (same state) */
  INTERNA = 1,
  /** Operação interestadual (different state) */
  INTERESTADUAL = 2,
  /** Operação com exterior (export) */
  EXTERIOR = 3,
}

/**
 * Consumer Indicator (indFinal)
 */
export enum NfeIndicadorConsumidor {
  /** Normal - não é consumidor final */
  NAO_CONSUMIDOR_FINAL = 0,
  /** Consumidor final */
  CONSUMIDOR_FINAL = 1,
}

/**
 * Buyer Presence Indicator (indPres)
 */
export enum NfeIndicadorPresenca {
  /** Não se aplica */
  NAO_SE_APLICA = 0,
  /** Operação presencial */
  PRESENCIAL = 1,
  /** Operação não presencial, pela Internet */
  INTERNET = 2,
  /** Operação não presencial, Teleatendimento */
  TELEATENDIMENTO = 3,
  /** NFC-e em operação com entrega a domicílio */
  ENTREGA_DOMICILIO = 4,
  /** Operação presencial, fora do estabelecimento */
  PRESENCIAL_FORA_ESTABELECIMENTO = 5,
  /** Operação não presencial, outros */
  NAO_PRESENCIAL_OUTROS = 9,
}

/**
 * NF-e Purpose (Finalidade)
 */
export enum NfeFinalidade {
  /** NF-e normal */
  NORMAL = 1,
  /** NF-e complementar */
  COMPLEMENTAR = 2,
  /** NF-e de ajuste */
  AJUSTE = 3,
  /** Devolução/Retorno */
  DEVOLUCAO = 4,
}

/**
 * Issuer Type (Tipo do Emitente)
 */
export enum NfeTipoEmissao {
  /** Emissão normal */
  NORMAL = 1,
  /** Contingência FS-IA */
  CONTINGENCIA_FSIA = 2,
  /** Contingência SCAN (desativado) */
  CONTINGENCIA_SCAN = 3,
  /** Contingência EPEC */
  CONTINGENCIA_EPEC = 4,
  /** Contingência FS-DA */
  CONTINGENCIA_FSDA = 5,
  /** Contingência SVC-AN */
  CONTINGENCIA_SVC_AN = 6,
  /** Contingência SVC-RS */
  CONTINGENCIA_SVC_RS = 7,
  /** Contingência off-line NFC-e */
  CONTINGENCIA_OFFLINE_NFCE = 9,
}

/**
 * NF-e Status
 */
export enum NfeStatus {
  DRAFT = 'draft',
  SIGNED = 'signed',
  AUTHORIZED = 'authorized',
  DENIED = 'denied',
  CANCELLED = 'cancelled',
  CORRECTED = 'corrected',
  PENDING_AUTHORIZATION = 'pending_authorization',
  PENDING_CANCELLATION = 'pending_cancellation',
}

/**
 * SEFAZ Authorization Status
 */
export enum NfeSefazStatus {
  /** Autorizado o uso da NF-e */
  AUTORIZADO = 100,
  /** Cancelamento de NF-e homologado */
  CANCELADO = 101,
  /** Uso Denegado */
  DENEGADO = 110,
  /** Lote recebido com sucesso */
  LOTE_RECEBIDO = 103,
  /** Lote processado */
  LOTE_PROCESSADO = 104,
  /** Lote em processamento */
  LOTE_EM_PROCESSAMENTO = 105,
  /** Rejeição */
  REJEITADO = 999,
}

/**
 * Tax Situation Origin (Origem da Mercadoria)
 */
export enum NfeOrigemMercadoria {
  /** Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8 */
  NACIONAL = 0,
  /** Estrangeira - Importação direta */
  ESTRANGEIRA_IMPORTACAO = 1,
  /** Estrangeira - Adquirida no mercado interno */
  ESTRANGEIRA_MERCADO_INTERNO = 2,
  /** Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% */
  NACIONAL_IMPORTACAO_40 = 3,
  /** Nacional, produção em conformidade com processos produtivos básicos */
  NACIONAL_PPB = 4,
  /** Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40% */
  NACIONAL_IMPORTACAO_40_MENOS = 5,
  /** Estrangeira - Importação direta, sem similar nacional */
  ESTRANGEIRA_IMPORTACAO_SEM_SIMILAR = 6,
  /** Estrangeira - Adquirida no mercado interno, sem similar nacional */
  ESTRANGEIRA_MERCADO_INTERNO_SEM_SIMILAR = 7,
  /** Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70% */
  NACIONAL_IMPORTACAO_70 = 8,
}

/**
 * ICMS Tax Situation (CST)
 */
export enum NfeCstIcms {
  /** Tributada integralmente */
  CST_00 = '00',
  /** Tributada e com cobrança do ICMS por substituição tributária */
  CST_10 = '10',
  /** Com redução de base de cálculo */
  CST_20 = '20',
  /** Isenta ou não tributada e com cobrança do ICMS por substituição tributária */
  CST_30 = '30',
  /** Isenta */
  CST_40 = '40',
  /** Não tributada */
  CST_41 = '41',
  /** Suspensão */
  CST_50 = '50',
  /** Diferimento */
  CST_51 = '51',
  /** ICMS cobrado anteriormente por substituição tributária */
  CST_60 = '60',
  /** Com redução de base de cálculo e cobrança do ICMS por substituição tributária */
  CST_70 = '70',
  /** Outros */
  CST_90 = '90',
}

/**
 * CSOSN (Simples Nacional)
 */
export enum NfeCsosn {
  /** Tributada pelo Simples Nacional com permissão de crédito */
  CSOSN_101 = '101',
  /** Tributada pelo Simples Nacional sem permissão de crédito */
  CSOSN_102 = '102',
  /** Isenção do ICMS no Simples Nacional para faixa de receita bruta */
  CSOSN_103 = '103',
  /** Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por ST */
  CSOSN_201 = '201',
  /** Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por ST */
  CSOSN_202 = '202',
  /** Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por ST */
  CSOSN_203 = '203',
  /** Imune */
  CSOSN_300 = '300',
  /** Não tributada pelo Simples Nacional */
  CSOSN_400 = '400',
  /** ICMS cobrado anteriormente por substituição tributária */
  CSOSN_500 = '500',
  /** Outros */
  CSOSN_900 = '900',
}

/**
 * PIS Tax Situation (CST)
 */
export enum NfeCstPis {
  /** Operação Tributável com Alíquota Básica */
  CST_01 = '01',
  /** Operação Tributável com Alíquota Diferenciada */
  CST_02 = '02',
  /** Operação Tributável com Alíquota por Unidade de Medida de Produto */
  CST_03 = '03',
  /** Operação Tributável Monofásica - Revenda a Alíquota Zero */
  CST_04 = '04',
  /** Operação Tributável por Substituição Tributária */
  CST_05 = '05',
  /** Operação Tributável a Alíquota Zero */
  CST_06 = '06',
  /** Operação Isenta da Contribuição */
  CST_07 = '07',
  /** Operação sem Incidência da Contribuição */
  CST_08 = '08',
  /** Operação com Suspensão da Contribuição */
  CST_09 = '09',
  /** Outras Operações */
  CST_49 = '49',
  /** Operação com Direito a Crédito */
  CST_50 = '50',
  /** Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada */
  CST_51 = '51',
  /** Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Não Tributada */
  CST_52 = '52',
  /** Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas */
  CST_53 = '53',
  /** Operação com Direito a Crédito - Vinculada a Receitas Tributadas no Mercado Interno e de Exportação */
  CST_54 = '54',
  /** Operação com Direito a Crédito - Vinculada a Receitas Não-Tributadas no Mercado Interno e de Exportação */
  CST_55 = '55',
  /** Operação com Direito a Crédito - Vinculada a Receitas Tributadas e Não-Tributadas e de Exportação */
  CST_56 = '56',
  /** Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Tributada */
  CST_60 = '60',
  /** Crédito Presumido - Operação de Aquisição Vinculada Exclusivamente a Receita Não-Tributada */
  CST_61 = '61',
  /** Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas */
  CST_62 = '62',
  /** Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e de Exportação */
  CST_63 = '63',
  /** Crédito Presumido - Operação de Aquisição Vinculada a Receitas Não-Tributadas e de Exportação */
  CST_64 = '64',
  /** Crédito Presumido - Operação de Aquisição Vinculada a Receitas Tributadas e Não-Tributadas e de Exportação */
  CST_65 = '65',
  /** Crédito Presumido - Outras Operações */
  CST_66 = '66',
  /** Crédito Presumido - Operação de Aquisição a Alíquota Zero */
  CST_67 = '67',
  /** Operação de Aquisição sem Direito a Crédito */
  CST_70 = '70',
  /** Operação de Aquisição com Isenção */
  CST_71 = '71',
  /** Operação de Aquisição com Suspensão */
  CST_72 = '72',
  /** Operação de Aquisição a Alíquota Zero */
  CST_73 = '73',
  /** Operação de Aquisição sem Incidência da Contribuição */
  CST_74 = '74',
  /** Operação de Aquisição por Substituição Tributária */
  CST_75 = '75',
  /** Outras Operações de Entrada */
  CST_98 = '98',
  /** Outras Operações */
  CST_99 = '99',
}

/**
 * COFINS Tax Situation (CST)
 */
export enum NfeCstCofins {
  /** Operação Tributável com Alíquota Básica */
  CST_01 = '01',
  /** Operação Tributável com Alíquota Diferenciada */
  CST_02 = '02',
  /** Operação Tributável com Alíquota por Unidade de Medida de Produto */
  CST_03 = '03',
  /** Operação Tributável Monofásica - Revenda a Alíquota Zero */
  CST_04 = '04',
  /** Operação Tributável por Substituição Tributária */
  CST_05 = '05',
  /** Operação Tributável a Alíquota Zero */
  CST_06 = '06',
  /** Operação Isenta da Contribuição */
  CST_07 = '07',
  /** Operação sem Incidência da Contribuição */
  CST_08 = '08',
  /** Operação com Suspensão da Contribuição */
  CST_09 = '09',
  /** Outras Operações */
  CST_49 = '49',
  /** Operação com Direito a Crédito */
  CST_50 = '50',
  /** Outras Operações */
  CST_99 = '99',
}

/**
 * IPI Tax Situation (CST)
 */
export enum NfeCstIpi {
  /** Entrada com recuperação de crédito */
  CST_00 = '00',
  /** Entrada tributada com alíquota zero */
  CST_01 = '01',
  /** Entrada isenta */
  CST_02 = '02',
  /** Entrada não-tributada */
  CST_03 = '03',
  /** Entrada imune */
  CST_04 = '04',
  /** Entrada com suspensão */
  CST_05 = '05',
  /** Outras entradas */
  CST_49 = '49',
  /** Saída tributada */
  CST_50 = '50',
  /** Saída tributada com alíquota zero */
  CST_51 = '51',
  /** Saída isenta */
  CST_52 = '52',
  /** Saída não-tributada */
  CST_53 = '53',
  /** Saída imune */
  CST_54 = '54',
  /** Saída com suspensão */
  CST_55 = '55',
  /** Outras saídas */
  CST_99 = '99',
}

/**
 * Payment Indicator (indPag)
 */
export enum NfeIndicadorPagamento {
  /** Pagamento à vista */
  A_VISTA = 0,
  /** Pagamento a prazo */
  A_PRAZO = 1,
  /** Outros */
  OUTROS = 2,
}

/**
 * Payment Method (tPag)
 */
export enum NfeMeioPagamento {
  /** Dinheiro */
  DINHEIRO = '01',
  /** Cheque */
  CHEQUE = '02',
  /** Cartão de Crédito */
  CARTAO_CREDITO = '03',
  /** Cartão de Débito */
  CARTAO_DEBITO = '04',
  /** Crédito Loja */
  CREDITO_LOJA = '05',
  /** Vale Alimentação */
  VALE_ALIMENTACAO = '10',
  /** Vale Refeição */
  VALE_REFEICAO = '11',
  /** Vale Presente */
  VALE_PRESENTE = '12',
  /** Vale Combustível */
  VALE_COMBUSTIVEL = '13',
  /** Duplicata Mercantil */
  DUPLICATA_MERCANTIL = '14',
  /** Boleto Bancário */
  BOLETO = '15',
  /** Depósito Bancário */
  DEPOSITO = '16',
  /** Pagamento Instantâneo (PIX) */
  PIX = '17',
  /** Transferência bancária, Carteira Digital */
  TRANSFERENCIA = '18',
  /** Programa de fidelidade, Cashback, Crédito Virtual */
  FIDELIDADE = '19',
  /** Sem pagamento */
  SEM_PAGAMENTO = '90',
  /** Outros */
  OUTROS = '99',
}

/**
 * Freight Modality (modFrete)
 */
export enum NfeModalidadeFrete {
  /** Contratação do Frete por conta do Remetente (CIF) */
  CIF = 0,
  /** Contratação do Frete por conta do Destinatário (FOB) */
  FOB = 1,
  /** Contratação do Frete por conta de Terceiros */
  TERCEIROS = 2,
  /** Transporte Próprio por conta do Remetente */
  PROPRIO_REMETENTE = 3,
  /** Transporte Próprio por conta do Destinatário */
  PROPRIO_DESTINATARIO = 4,
  /** Sem Ocorrência de Transporte */
  SEM_FRETE = 9,
}

/**
 * Event Type Codes
 */
export enum NfeTipoEvento {
  /** Cancelamento */
  CANCELAMENTO = '110111',
  /** Carta de Correção Eletrônica */
  CARTA_CORRECAO = '110110',
  /** EPEC */
  EPEC = '110140',
  /** Manifestação do Destinatário - Ciência da Emissão */
  CIENCIA_OPERACAO = '210200',
  /** Manifestação do Destinatário - Confirmação da Operação */
  CONFIRMACAO_OPERACAO = '210200',
  /** Manifestação do Destinatário - Desconhecimento da Operação */
  DESCONHECIMENTO_OPERACAO = '210220',
  /** Manifestação do Destinatário - Operação não Realizada */
  OPERACAO_NAO_REALIZADA = '210240',
}

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * Issuer Identification (Emitente)
 */
export interface NfeEmitente {
  /** CNPJ (14 digits) or CPF (11 digits) */
  cnpjCpf: string;
  /** State Registration (Inscrição Estadual) */
  ie: string;
  /** Municipal Registration (optional) */
  im?: string;
  /** Legal Name (Razão Social) */
  razaoSocial: string;
  /** Trade Name (Nome Fantasia) */
  nomeFantasia?: string;
  /** CRT - Código de Regime Tributário (1=Simples Nacional, 2=SN Excesso, 3=Normal) */
  crt: 1 | 2 | 3;
  /** CNAE (optional) */
  cnae?: string;
  /** Address */
  endereco: NfeEndereco;
}

/**
 * Recipient Identification (Destinatário)
 */
export interface NfeDestinatario {
  /** CNPJ (14 digits), CPF (11 digits), or idEstrangeiro */
  cnpjCpf?: string;
  /** Foreign ID */
  idEstrangeiro?: string;
  /** State Registration (optional) */
  ie?: string;
  /** ISUF - Inscrição na SUFRAMA (optional) */
  isuf?: string;
  /** Email (optional) */
  email?: string;
  /** Legal/Full Name */
  razaoSocial: string;
  /** Address */
  endereco: NfeEndereco;
  /** Indicador de IE do destinatário */
  indIEDest: 1 | 2 | 9; // 1=Contribuinte, 2=Isento, 9=Não Contribuinte
}

/**
 * Address (Endereço)
 */
export interface NfeEndereco {
  /** Street (Logradouro) */
  logradouro: string;
  /** Number */
  numero: string;
  /** Complement */
  complemento?: string;
  /** Neighborhood (Bairro) */
  bairro: string;
  /** IBGE City Code (7 digits) */
  codigoMunicipio: string;
  /** City Name */
  municipio: string;
  /** State (UF) */
  uf: string;
  /** Postal Code (CEP) */
  cep: string;
  /** Country Code (default: 1058 = Brazil) */
  codigoPais?: string;
  /** Country Name */
  pais?: string;
  /** Phone */
  fone?: string;
}

/**
 * Product/Item (Produto)
 */
export interface NfeProduto {
  /** Item number (nItem) */
  nItem: number;
  /** Product Code (cProd) */
  codigo: string;
  /** EAN/GTIN barcode */
  cEAN?: string;
  /** Product Description */
  descricao: string;
  /** NCM Code (8 digits) */
  ncm: string;
  /** NVE Code (optional) */
  nve?: string[];
  /** CEST Code (optional) */
  cest?: string;
  /** CFOP Code */
  cfop: string;
  /** Commercial Unit */
  uCom: string;
  /** Commercial Quantity */
  qCom: number;
  /** Commercial Unit Value */
  vUnCom: number;
  /** Product Total Value */
  vProd: number;
  /** EAN for tax unit (cEANTrib) */
  cEANTrib?: string;
  /** Tax Unit (uTrib) */
  uTrib: string;
  /** Tax Quantity (qTrib) */
  qTrib: number;
  /** Tax Unit Value (vUnTrib) */
  vUnTrib: number;
  /** Freight Value */
  vFrete?: number;
  /** Insurance Value */
  vSeg?: number;
  /** Discount Value */
  vDesc?: number;
  /** Other costs */
  vOutro?: number;
  /** Indicates if total is included in NF-e total */
  indTot: 0 | 1;
  /** DI - Import Declaration */
  di?: NfeDeclaracaoImportacao[];
  /** Export Details */
  detExport?: NfeDetalheExportacao[];
  /** Product info */
  infProdNFF?: string;
  /** Additional info */
  infAdProd?: string;
  /** Tax Information */
  imposto: NfeImposto;
}

/**
 * Import Declaration (DI)
 */
export interface NfeDeclaracaoImportacao {
  /** DI Number */
  nDI: string;
  /** Registration Date */
  dDI: string;
  /** Clearance Location */
  xLocDesemb: string;
  /** Clearance State (UF) */
  ufDesemb: string;
  /** Clearance Date */
  dDesemb: string;
  /** Transport Route */
  tpViaTransp: string;
  /** AFRMM Value (optional) */
  vAFRMM?: number;
  /** Intermediate Form */
  tpIntermedio: string;
  /** CNPJ of Acquirer (optional) */
  cnpj?: string;
  /** State (UF) of Acquirer (optional) */
  ufTerceiro?: string;
  /** Exporter Code */
  cExportador: string;
  /** Additions */
  adi: NfeAdicao[];
}

/**
 * Addition for Import Declaration
 */
export interface NfeAdicao {
  /** Addition Number */
  nAdicao: number;
  /** Sequence Number */
  nSeqAdic: number;
  /** Manufacturer Code */
  cFabricante: string;
  /** Discount Value */
  vDescDI?: number;
  /** Drawback Number */
  nDraw?: string;
}

/**
 * Export Detail
 */
export interface NfeDetalheExportacao {
  /** Drawback Number */
  nDraw?: string;
  /** Export Note */
  exportInd?: {
    /** Registry Number */
    nRE: string;
    /** Export Key */
    chNFe: string;
    /** Quantity */
    qExport: number;
  };
}

/**
 * Tax Information (Imposto)
 */
export interface NfeImposto {
  /** Approximate Total Tax Value */
  vTotTrib?: number;
  /** ICMS */
  icms: NfeIcms;
  /** IPI (optional) */
  ipi?: NfeIpi;
  /** PIS */
  pis: NfePis;
  /** COFINS */
  cofins: NfeCofins;
  /** Import Tax II (optional) */
  ii?: NfeIi;
  /** ISSQN (optional, for services) */
  issqn?: NfeIssqn;
}

/**
 * ICMS Tax (simplified - full version has many CST variations)
 */
export interface NfeIcms {
  /** Origin */
  orig: NfeOrigemMercadoria;
  /** CST or CSOSN */
  cst?: NfeCstIcms | string;
  csosn?: NfeCsosn | string;
  /** Modality of BC calculation */
  modBC?: number;
  /** BC Value */
  vBC?: number;
  /** ICMS Rate */
  pICMS?: number;
  /** ICMS Value */
  vICMS?: number;
  /** FCP BC */
  vBCFCP?: number;
  /** FCP Rate */
  pFCP?: number;
  /** FCP Value */
  vFCP?: number;
  /** BC Reduction % */
  pRedBC?: number;
  /** ICMS ST fields */
  modBCST?: number;
  pMVAST?: number;
  pRedBCST?: number;
  vBCST?: number;
  pICMSST?: number;
  vICMSST?: number;
  vBCFCPST?: number;
  pFCPST?: number;
  vFCPST?: number;
  /** ICMS ST Retained (CST 60/500) */
  vBCSTRet?: number;
  pST?: number;
  vICMSSTRet?: number;
  /** Deferred ICMS */
  pDif?: number;
  vICMSDif?: number;
  vICMSOp?: number;
  /** Credit info for Simples Nacional */
  pCredSN?: number;
  vCredICMSSN?: number;
  /** ICMS effective */
  pBCEfet?: number;
  vBCEfet?: number;
  pICMSEfet?: number;
  vICMSEfet?: number;
  /** Interstate rate (UF destination) */
  vBCUFDest?: number;
  vBCFCPUFDest?: number;
  pFCPUFDest?: number;
  pICMSUFDest?: number;
  pICMSInter?: number;
  pICMSInterPart?: number;
  vFCPUFDest?: number;
  vICMSUFDest?: number;
  vICMSUFRemet?: number;
}

/**
 * IPI Tax
 */
export interface NfeIpi {
  /** Class code for tobacco */
  clEnq?: string;
  /** IPI Producer CNPJ */
  cnpjProd?: string;
  /** IPI Seal Code */
  cSelo?: string;
  /** IPI Seal Quantity */
  qSelo?: number;
  /** Tax classification code */
  cEnq: string;
  /** CST */
  cst: NfeCstIpi | string;
  /** BC Value (if rate-based) */
  vBC?: number;
  /** IPI Rate */
  pIPI?: number;
  /** Quantity (if unit-based) */
  qUnid?: number;
  /** Value per unit */
  vUnid?: number;
  /** IPI Value */
  vIPI?: number;
}

/**
 * PIS Tax
 */
export interface NfePis {
  /** CST */
  cst: NfeCstPis | string;
  /** BC Value */
  vBC?: number;
  /** PIS Rate */
  pPIS?: number;
  /** Quantity (for unit-based) */
  qBCProd?: number;
  /** Value per unit */
  vAliqProd?: number;
  /** PIS Value */
  vPIS?: number;
}

/**
 * COFINS Tax
 */
export interface NfeCofins {
  /** CST */
  cst: NfeCstCofins | string;
  /** BC Value */
  vBC?: number;
  /** COFINS Rate */
  pCOFINS?: number;
  /** Quantity (for unit-based) */
  qBCProd?: number;
  /** Value per unit */
  vAliqProd?: number;
  /** COFINS Value */
  vCOFINS?: number;
}

/**
 * Import Tax (II)
 */
export interface NfeIi {
  /** BC Value */
  vBC: number;
  /** Customs Expenses */
  vDespAdu: number;
  /** II Value */
  vII: number;
  /** IOF Value */
  vIOF: number;
}

/**
 * ISSQN Tax (for services)
 */
export interface NfeIssqn {
  /** BC Value */
  vBC: number;
  /** ISSQN Rate */
  vAliq: number;
  /** ISSQN Value */
  vISSQN: number;
  /** IBGE Municipality Code */
  cMunFG: string;
  /** Service List Item */
  cListServ: string;
  /** Deduction Value */
  vDeducao?: number;
  /** Other Retention */
  vOutro?: number;
  /** Unconditional Discount */
  vDescIncond?: number;
  /** Conditional Discount */
  vDescCond?: number;
  /** ISS Retention */
  vISSRet?: number;
  /** ISS Taxation Indicator */
  indISS: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Service Code */
  cServico?: string;
  /** IBGE Municipality for ISS */
  cMun?: string;
  /** Country Code for ISS */
  cPais?: string;
  /** Process Number */
  nProcesso?: string;
  /** Incentive Indicator */
  indIncentivo: 1 | 2;
}

/**
 * Total Values (ICMSTot)
 */
export interface NfeTotais {
  /** ICMS BC Total */
  vBC: number;
  /** ICMS Total */
  vICMS: number;
  /** ICMS Desonerated Total */
  vICMSDeson: number;
  /** FCP UF Destination */
  vFCPUFDest?: number;
  /** ICMS UF Destination */
  vICMSUFDest?: number;
  /** ICMS UF Remitter */
  vICMSUFRemet?: number;
  /** FCP Total */
  vFCP: number;
  /** ICMS ST BC Total */
  vBCST: number;
  /** ICMS ST Total */
  vST: number;
  /** FCP ST Total */
  vFCPST: number;
  /** FCP ST Retained Total */
  vFCPSTRet: number;
  /** Products Total */
  vProd: number;
  /** Freight Total */
  vFrete: number;
  /** Insurance Total */
  vSeg: number;
  /** Discount Total */
  vDesc: number;
  /** Import Tax Total */
  vII: number;
  /** IPI Total */
  vIPI: number;
  /** IPI Returned Total */
  vIPIDevol: number;
  /** PIS Total */
  vPIS: number;
  /** COFINS Total */
  vCOFINS: number;
  /** Other Costs Total */
  vOutro: number;
  /** NF-e Total */
  vNF: number;
  /** Approximate Tax Total */
  vTotTrib?: number;
}

/**
 * Transport Information (Transporte)
 */
export interface NfeTransporte {
  /** Freight Modality */
  modFrete: NfeModalidadeFrete;
  /** Transporter */
  transporta?: NfeTransportador;
  /** Retention (ICMS transport) */
  retTransp?: NfeRetencaoTransporte;
  /** Vehicle */
  veicTransp?: NfeVeiculo;
  /** Trailers */
  reboque?: NfeVeiculo[];
  /** Volumes */
  vol?: NfeVolume[];
}

/**
 * Transporter
 */
export interface NfeTransportador {
  /** CNPJ or CPF */
  cnpjCpf?: string;
  /** Name */
  xNome?: string;
  /** State Registration */
  ie?: string;
  /** Full Address */
  xEnder?: string;
  /** City Name */
  xMun?: string;
  /** State (UF) */
  uf?: string;
}

/**
 * Transport Retention (ICMS)
 */
export interface NfeRetencaoTransporte {
  /** Service Value */
  vServ: number;
  /** ICMS BC */
  vBCRet: number;
  /** ICMS Rate */
  pICMSRet: number;
  /** ICMS Value */
  vICMSRet: number;
  /** CFOP */
  cfop: string;
  /** City of Service */
  cMunFG: string;
}

/**
 * Vehicle Information
 */
export interface NfeVeiculo {
  /** License Plate */
  placa: string;
  /** State (UF) */
  uf: string;
  /** RNTC */
  rntc?: string;
}

/**
 * Volume Information
 */
export interface NfeVolume {
  /** Quantity of Volumes */
  qVol?: number;
  /** Species (Box, Pallet, etc.) */
  esp?: string;
  /** Brand */
  marca?: string;
  /** Numbering */
  nVol?: string;
  /** Net Weight (kg) */
  pesoL?: number;
  /** Gross Weight (kg) */
  pesoB?: number;
  /** Seals */
  lacres?: { nLacre: string }[];
}

/**
 * Billing Information (Cobrança)
 */
export interface NfeCobranca {
  /** Invoice (Fatura) */
  fat?: NfeFatura;
  /** Installments (Duplicatas) */
  dup?: NfeDuplicata[];
}

/**
 * Invoice (Fatura)
 */
export interface NfeFatura {
  /** Invoice Number */
  nFat?: string;
  /** Original Value */
  vOrig?: number;
  /** Discount Value */
  vDesc?: number;
  /** Net Value */
  vLiq?: number;
}

/**
 * Installment (Duplicata)
 */
export interface NfeDuplicata {
  /** Installment Number */
  nDup?: string;
  /** Due Date */
  dVenc?: string;
  /** Value */
  vDup: number;
}

/**
 * Payment Information (Pagamento)
 */
export interface NfePagamento {
  /** Payment Entries */
  detPag: NfeDetalhePagamento[];
  /** Change Value (for NFC-e) */
  vTroco?: number;
}

/**
 * Payment Detail
 */
export interface NfeDetalhePagamento {
  /** Payment Indicator */
  indPag?: NfeIndicadorPagamento;
  /** Payment Method */
  tPag: NfeMeioPagamento | string;
  /** Description */
  xPag?: string;
  /** Value */
  vPag: number;
  /** Card Information */
  card?: NfeCartao;
}

/**
 * Card Payment Info
 */
export interface NfeCartao {
  /** Card Flag/Brand */
  tpIntegra: 1 | 2;
  /** CNPJ of Payment Processor */
  cnpj?: string;
  /** Card Flag (01-99) */
  tBand?: string;
  /** Authorization Code */
  cAut?: string;
}

/**
 * Additional Information
 */
export interface NfeInformacoesAdicionais {
  /** Taxpayer Additional Info */
  infAdFisco?: string;
  /** Complementary Info */
  infCpl?: string;
}

/**
 * Referenced NF-e (NFe Referenciada)
 */
export interface NfeReferenciada {
  /** Referenced NF-e Key (44 digits) */
  refNFe?: string;
  /** Referenced NF (model 1/1A) */
  refNF?: {
    cUF: number;
    aamm: string;
    cnpj: string;
    mod: string;
    serie: number;
    nNF: number;
  };
  /** Referenced NF Producer */
  refNFP?: {
    cUF: number;
    aamm: string;
    cnpj?: string;
    cpf?: string;
    ie: string;
    mod: string;
    serie: number;
    nNF: number;
  };
  /** Referenced CT-e Key */
  refCTe?: string;
  /** Referenced ECF Coupon */
  refECF?: {
    mod: string;
    nECF: number;
    nCOO: number;
  };
}

/**
 * Main NF-e Document (infNFe)
 */
export interface NfeInfNfe {
  /** NF-e Version */
  versao: '4.00';
  /** NF-e ID (NFe + chave de acesso) */
  id?: string;
  /** Identification (ide) */
  ide: {
    /** UF Code */
    cUF: NfeUf | number;
    /** NF-e Code (8 random digits) */
    cNF: string;
    /** Operation Nature */
    natOp: string;
    /** Model (55=NF-e, 65=NFC-e) */
    mod: NfeModelo;
    /** Series */
    serie: number;
    /** NF-e Number */
    nNF: number;
    /** Issue Date/Time (YYYY-MM-DDTHH:mm:ss-03:00) */
    dhEmi: string;
    /** Exit Date/Time (optional) */
    dhSaiEnt?: string;
    /** Operation Type */
    tpNF: NfeTipoOperacao;
    /** Operation Destination */
    idDest: NfeDestinoOperacao;
    /** IBGE Municipality Code of Occurrence */
    cMunFG: string;
    /** DANFE Print Format */
    tpImp: 0 | 1 | 2 | 3 | 4 | 5;
    /** Issue Type */
    tpEmis: NfeTipoEmissao;
    /** Check Digit */
    cDV: number;
    /** Environment (1=Produção, 2=Homologação) */
    tpAmb: 1 | 2;
    /** Purpose */
    finNFe: NfeFinalidade;
    /** Final Consumer Indicator */
    indFinal: NfeIndicadorConsumidor;
    /** Buyer Presence Indicator */
    indPres: NfeIndicadorPresenca;
    /** Intermediary Process Indicator */
    procEmi: 0 | 1 | 2 | 3;
    /** Process Version */
    verProc: string;
    /** Contingency Date/Time */
    dhCont?: string;
    /** Contingency Justification */
    xJust?: string;
    /** Referenced NFes */
    NFref?: NfeReferenciada[];
  };
  /** Issuer */
  emit: NfeEmitente;
  /** Authorized Access CPF/CNPJ */
  autXML?: { cnpj?: string; cpf?: string }[];
  /** Recipient */
  dest?: NfeDestinatario;
  /** Withdrawal Location */
  retirada?: NfeEndereco & { cnpj?: string; cpf?: string; xNome?: string };
  /** Delivery Location */
  entrega?: NfeEndereco & { cnpj?: string; cpf?: string; xNome?: string };
  /** Intermediary */
  infIntermed?: {
    cnpj: string;
    idCadIntTran: string;
  };
  /** Products */
  det: NfeProduto[];
  /** Totals */
  total: {
    ICMSTot: NfeTotais;
    ISSQNtot?: {
      vServ?: number;
      vBC?: number;
      vISS?: number;
      vPIS?: number;
      vCOFINS?: number;
      dCompet?: string;
      vDeducao?: number;
      vOutro?: number;
      vDescIncond?: number;
      vDescCond?: number;
      vISSRet?: number;
      cRegTrib?: number;
    };
    retTrib?: {
      vRetPIS?: number;
      vRetCOFINS?: number;
      vRetCSLL?: number;
      vBCIRRF?: number;
      vIRRF?: number;
      vBCRetPrev?: number;
      vRetPrev?: number;
    };
  };
  /** Transport */
  transp: NfeTransporte;
  /** Billing */
  cobr?: NfeCobranca;
  /** Payment */
  pag: NfePagamento;
  /** Additional Info */
  infAdic?: NfeInformacoesAdicionais;
  /** Export Info */
  exporta?: {
    ufSaidaPais: string;
    xLocExporta: string;
    xLocDespacho?: string;
  };
  /** Purchase Info */
  compra?: {
    xNEmp?: string;
    xPed?: string;
    xCont?: string;
  };
  /** Sugar Cane Info */
  cana?: any;
  /** Responsible Technical */
  infRespTec?: {
    cnpj: string;
    xContato: string;
    email: string;
    fone: string;
    idCSRT?: number;
    hashCSRT?: string;
  };
  /** Supplement Info (for NFC-e) */
  infNFeSupl?: {
    qrCode: string;
    urlChave: string;
  };
}

/**
 * Protocol Authorization (protNFe)
 */
export interface NfeProtocolo {
  /** Protocol Version */
  versao: '4.00';
  /** Protocol Info */
  infProt: {
    /** Environment */
    tpAmb: 1 | 2;
    /** Application Version */
    verAplic: string;
    /** Access Key */
    chNFe: string;
    /** Reception Date/Time */
    dhRecbto: string;
    /** Protocol Number */
    nProt: string;
    /** Digest Value */
    digVal?: string;
    /** Status Code */
    cStat: number;
    /** Status Description */
    xMotivo: string;
  };
}

/**
 * Event (Evento)
 */
export interface NfeEvento {
  /** Event Version */
  versao: '1.00';
  /** Event Info */
  infEvento: {
    /** Event ID */
    id?: string;
    /** Environment */
    tpAmb: 1 | 2;
    /** Org Code (IBGE) */
    cOrgao: number;
    /** Author CNPJ/CPF */
    cnpj?: string;
    cpf?: string;
    /** Access Key */
    chNFe: string;
    /** Event Date/Time */
    dhEvento: string;
    /** Event Type */
    tpEvento: NfeTipoEvento | string;
    /** Event Sequence Number */
    nSeqEvento: number;
    /** Event Version */
    verEvento: '1.00';
    /** Event Detail */
    detEvento: {
      versao: '1.00';
      descEvento: string;
      /** For Cancellation */
      nProt?: string;
      xJust?: string;
      /** For Correction Letter */
      xCorrecao?: string;
      xCondUso?: string;
    };
  };
}

/**
 * Event Response (retEvento)
 */
export interface NfeRetornoEvento {
  /** Version */
  versao: '1.00';
  /** Event Info */
  infEvento: {
    /** Environment */
    tpAmb: 1 | 2;
    /** Application Version */
    verAplic: string;
    /** Org Code */
    cOrgao: number;
    /** Status Code */
    cStat: number;
    /** Status Description */
    xMotivo: string;
    /** Access Key */
    chNFe: string;
    /** Event Type */
    tpEvento: string;
    /** Event Description */
    xEvento?: string;
    /** Event Sequence */
    nSeqEvento: number;
    /** Author CNPJ/CPF */
    cnpjDest?: string;
    cpfDest?: string;
    /** Email Destination */
    emailDest?: string;
    /** Reception Date */
    dhRegEvento: string;
    /** Protocol Number */
    nProt?: string;
  };
}

/**
 * Complete NF-e Document
 */
export interface NfeDocument {
  /** Document ID */
  documentId: string;
  /** Tenant ID */
  tenantId: string;
  /** Current Status */
  status: NfeStatus;
  /** Access Key (44 digits) */
  chaveAcesso?: string;
  /** NF-e Data */
  nfe: NfeInfNfe;
  /** Signed XML (without protocol) */
  signedXml?: string;
  /** Authorization Protocol */
  protocolo?: NfeProtocolo;
  /** Authorized XML (with protocol - nfeProc) */
  authorizedXml?: string;
  /** DANFE PDF (base64) */
  danfe?: string;
  /** Events */
  eventos?: {
    tipo: NfeTipoEvento | string;
    sequencia: number;
    evento: NfeEvento;
    retorno?: NfeRetornoEvento;
    xml?: string;
  }[];
  /** Created Date */
  createdAt: Date;
  /** Updated Date */
  updatedAt: Date;
  /** Status History */
  statusHistory: Array<{
    status: NfeStatus;
    timestamp: Date;
    message?: string;
    userId?: string;
  }>;
  /** Validation Errors */
  validationErrors?: NfeValidationError[];
}

/**
 * Validation Error
 */
export interface NfeValidationError {
  /** Error Code */
  code: string;
  /** Error Message */
  message: string;
  /** Field/Path */
  field?: string;
  /** Severity */
  severity: 'error' | 'warning';
}

/**
 * Validation Result
 */
export interface NfeValidationResult {
  /** Is Valid */
  valid: boolean;
  /** Errors */
  errors: NfeValidationError[];
  /** Warnings */
  warnings: NfeValidationError[];
  /** Validated At */
  validatedAt: Date;
}

// =============================================================================
// Service Types
// =============================================================================

/**
 * Certificate Type
 */
export enum NfeCertificateType {
  /** A1 - Software Certificate (PFX/P12) */
  A1 = 'A1',
  /** A3 - Hardware Token/Smart Card */
  A3 = 'A3',
}

/**
 * Digital Certificate
 */
export interface NfeCertificate {
  /** Certificate Type */
  type: NfeCertificateType;
  /** PFX/P12 content (base64) - for A1 */
  pfx?: string;
  /** Password */
  password: string;
  /** Certificate Serial Number */
  serialNumber?: string;
  /** Valid From */
  validFrom?: Date;
  /** Valid To */
  validTo?: Date;
  /** Subject CNPJ */
  cnpj?: string;
  /** Subject Name */
  subjectName?: string;
}

/**
 * SEFAZ Configuration
 */
export interface NfeSefazConfig {
  /** Environment */
  ambiente: 1 | 2;
  /** UF */
  uf: NfeUf | number;
  /** Timeout (ms) */
  timeout?: number;
  /** Use Contingency */
  contingencia?: {
    tipo: NfeTipoEmissao;
    justificativa: string;
    dataHora: string;
  };
}

/**
 * Authorization Request
 */
export interface NfeAutorizacaoRequest {
  /** Signed XML */
  xml: string;
  /** Batch ID */
  idLote?: string;
  /** Synchronous Mode */
  sincrono?: boolean;
  /** Compress */
  compactar?: boolean;
}

/**
 * Authorization Response
 */
export interface NfeAutorizacaoResponse {
  /** Success */
  success: boolean;
  /** Protocol */
  protocolo?: NfeProtocolo;
  /** Authorized XML (nfeProc) */
  xml?: string;
  /** Batch Number */
  recibo?: string;
  /** Status Code */
  cStat?: number;
  /** Status Message */
  xMotivo?: string;
  /** Error */
  error?: string;
}

/**
 * Status Query Request
 */
export interface NfeConsultaRequest {
  /** Access Key or Protocol Number */
  chaveOuRecibo: string;
  /** Query Type */
  tipo: 'chave' | 'recibo';
}

/**
 * Cancellation Request
 */
export interface NfeCancelamentoRequest {
  /** Access Key */
  chNFe: string;
  /** Protocol Number of Authorization */
  nProt: string;
  /** Justification (min 15 chars) */
  xJust: string;
}

/**
 * Correction Letter Request
 */
export interface NfeCartaCorrecaoRequest {
  /** Access Key */
  chNFe: string;
  /** Correction Text (min 15 chars) */
  xCorrecao: string;
  /** Sequence Number (1-20) */
  nSeqEvento?: number;
}

/**
 * DANFE Generation Options
 */
export interface NfeDanfeOptions {
  /** NF-e Document */
  nfe: NfeInfNfe;
  /** Protocol */
  protocolo?: NfeProtocolo;
  /** Logo (base64) */
  logo?: string;
  /** Output Format */
  formato?: 'pdf' | 'html';
  /** Print Layout (1=Retrato, 2=Paisagem) */
  layout?: 1 | 2;
  /** Additional Messages */
  mensagens?: string[];
}

/**
 * NF-e Module Configuration
 */
export interface NfeConfig {
  /** Certificate */
  certificate: NfeCertificate;
  /** SEFAZ Config */
  sefaz: NfeSefazConfig;
  /** Auto-generate DANFE */
  generateDanfe?: boolean;
  /** Responsible Technical (infRespTec) */
  responsavelTecnico?: NfeInfNfe['infRespTec'];
  /** Application Version */
  versaoAplicativo?: string;
}
