// src/lib/cardcom.ts
// Cardcom Payment Gateway — v11 JSON API Integration
// Docs: https://cardcomapi.zendesk.com/hc/he/articles/25264402497426

// ============================================
// ENDPOINTS
// ============================================
const CARDCOM_API_BASE = 'https://secure.cardcom.solutions/api/v11';
const ENDPOINT_CREATE_LP = `${CARDCOM_API_BASE}/LowProfile/LowProfileClearing`;
const ENDPOINT_GET_LP_RESULT = `${CARDCOM_API_BASE}/LowProfile/GetLowProfileIndicator`;
const ENDPOINT_DO_TRANSACTION = `${CARDCOM_API_BASE}/Transactions/DoTransaction`;

// ============================================
// TYPES
// ============================================
export interface CardcomConfig {
  terminalNumber: string;
  apiName: string;
  apiPassword: string;
}

export interface CreatePaymentParams {
  amount: number;
  productName: string;
  successUrl: string;
  errorUrl: string;
  webhookUrl: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  returnValue?: string;           // Custom data passed back in webhook
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
  maxPayments?: number;
  language?: string;
  coinId?: number;                // 1=ILS, 2=USD, 3=EUR
}

export interface LowProfileResponse {
  success: boolean;
  url?: string;
  lowProfileId?: string;
  error?: string;
  responseCode?: number;
  description?: string;
}

export interface PaymentVerification {
  success: boolean;
  responseCode?: number;
  description?: string;
  transactionId?: number;
  approvalNumber?: string;
  token?: string;
  tokenExpiry?: string;
  cardMask?: string;
  cardBrand?: string;
  cardOwnerName?: string;
  cardOwnerEmail?: string;
  invoiceNumber?: number;
  amount?: number;
  returnValue?: string;
  numOfPayments?: number;
  error?: string;
  rawResponse?: any;
}

export interface ChargeTokenParams {
  token: string;
  tokenExpiry: string;            // MMYY format e.g. "1227"
  amount: number;
  productName: string;
  customerEmail?: string;
  numOfPayments?: number;
  approvalNumber?: string;
}

// ============================================
// CONFIG
// ============================================
function getConfig(): CardcomConfig {
  return {
    terminalNumber: process.env.CARDCOM_TERMINAL_NUMBER || '',
    apiName: process.env.CARDCOM_API_NAME || '',
    apiPassword: process.env.CARDCOM_API_PASSWORD || '',
  };
}

function validateConfig(config: CardcomConfig): string | null {
  if (!config.terminalNumber) return 'Missing CARDCOM_TERMINAL_NUMBER';
  if (!config.apiName) return 'Missing CARDCOM_API_NAME';
  if (!config.apiPassword) return 'Missing CARDCOM_API_PASSWORD';
  return null;
}

// ============================================
// STEP 1: Create LowProfile payment page
// ============================================
export async function createPaymentPage(params: CreatePaymentParams): Promise<LowProfileResponse> {
  const config = getConfig();
  const configError = validateConfig(config);

  if (configError) {
    return { success: false, error: `Cardcom not configured: ${configError}` };
  }

  try {
    // Build the v11 JSON request body
    const requestBody: any = {
      TerminalNumber: parseInt(config.terminalNumber, 10),
      ApiName: config.apiName,
      ApiPassword: config.apiPassword,
      Amount: params.amount,
      SuccessRedirectUrl: params.successUrl,
      FailedRedirectUrl: params.errorUrl,
      WebHookUrl: params.webhookUrl,
      Operation: params.operation || 'ChargeAndCreateToken',
      Language: params.language || 'he',
      ProductName: params.productName,
      ISOCoinId: params.coinId || 1,  // 1 = ILS
      MaxNumOfPayments: params.maxPayments || 1,
    };

    // Optional: ReturnValue for custom data in webhook
    if (params.returnValue) {
      requestBody.ReturnValue = params.returnValue;
    }

    // Optional: Customer info for invoice
    if (params.customerEmail || params.customerName || params.customerPhone) {
      requestBody.InvoiceHead = {};
      if (params.customerEmail) requestBody.InvoiceHead.CustMobilPhone = params.customerPhone;
      if (params.customerEmail) requestBody.InvoiceHead.CustAddressLine1 = '';
      if (params.customerEmail) requestBody.InvoiceHead.Email = params.customerEmail;
      if (params.customerName) requestBody.InvoiceHead.CustName = params.customerName;
    }

    console.log('[Cardcom v11] Creating payment page:', {
      terminal: config.terminalNumber,
      amount: params.amount,
      operation: requestBody.Operation,
      product: params.productName,
    });

    const response = await fetch(ENDPOINT_CREATE_LP, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    console.log('[Cardcom v11] LowProfile response:', {
      ResponseCode: data.ResponseCode,
      Description: data.Description,
      LowProfileId: data.LowProfileId,
      Url: data.Url?.slice(0, 80),
    });

    // ResponseCode 0 = success
    if (data.ResponseCode === 0) {
      return {
        success: true,
        url: data.Url,
        lowProfileId: data.LowProfileId,
        responseCode: data.ResponseCode,
        description: data.Description,
      };
    } else {
      return {
        success: false,
        error: data.Description || `Cardcom error code: ${data.ResponseCode}`,
        responseCode: data.ResponseCode,
        description: data.Description,
      };
    }
  } catch (error) {
    console.error('[Cardcom v11] createPaymentPage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error connecting to Cardcom',
    };
  }
}

// ============================================
// STEP 2: Get payment result (webhook/verify)
// ============================================
export async function verifyPayment(lowProfileId: string): Promise<PaymentVerification> {
  const config = getConfig();
  const configError = validateConfig(config);

  if (configError) {
    return { success: false, error: `Cardcom not configured: ${configError}` };
  }

  try {
    const requestBody = {
      TerminalNumber: parseInt(config.terminalNumber, 10),
      ApiName: config.apiName,
      LowProfileId: lowProfileId,
    };

    console.log('[Cardcom v11] Verifying payment:', lowProfileId);

    const response = await fetch(ENDPOINT_GET_LP_RESULT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('[Cardcom v11] Verification response:', {
      ResponseCode: data.ResponseCode,
      Description: data.Description,
      TranzactionId: data.TranzactionId,
      Operation: data.Operation,
      ReturnValue: data.ReturnValue,
      TokenInfo: data.TokenInfo ? 'present' : 'none',
    });

    // ResponseCode 0 = success
    if (data.ResponseCode === 0) {
      return {
        success: true,
        responseCode: data.ResponseCode,
        description: data.Description,
        transactionId: data.TranzactionId,
        approvalNumber: data.UIValues?.ApprovalNumber || undefined,
        token: data.TokenInfo?.Token || undefined,
        tokenExpiry: data.TokenInfo?.TokenExDate || undefined,
        cardMask: data.UIValues?.Last4CardDigits 
          ? `xxxx-${data.UIValues.Last4CardDigits}` 
          : undefined,
        cardBrand: data.UIValues?.CardBrand || undefined,
        cardOwnerName: data.UIValues?.CardOwnerName || undefined,
        cardOwnerEmail: data.UIValues?.CardOwnerEmail || undefined,
        invoiceNumber: data.DocumentInfo?.DocumentNumber || undefined,
        numOfPayments: data.UIValues?.NumOfPayments || undefined,
        returnValue: data.ReturnValue || undefined,
        amount: data.Amount || undefined,
        rawResponse: data,
      };
    } else {
      return {
        success: false,
        responseCode: data.ResponseCode,
        description: data.Description,
        error: data.Description || `Payment verification failed (code ${data.ResponseCode})`,
        returnValue: data.ReturnValue || undefined,
        rawResponse: data,
      };
    }
  } catch (error) {
    console.error('[Cardcom v11] verifyPayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification network error',
    };
  }
}

// ============================================
// STEP 3: Charge a saved token (recurring)
// ============================================
export async function chargeToken(params: ChargeTokenParams): Promise<PaymentVerification> {
  const config = getConfig();
  const configError = validateConfig(config);

  if (configError) {
    return { success: false, error: `Cardcom not configured: ${configError}` };
  }

  try {
    const requestBody: any = {
      TerminalNumber: parseInt(config.terminalNumber, 10),
      ApiName: config.apiName,
      ApiPassword: config.apiPassword,
      Amount: params.amount,
      Token: params.token,
      TokenExDate: params.tokenExpiry,
      ApprovalNumber: params.approvalNumber || '',
      ProductName: params.productName,
      ISOCoinId: 1,  // ILS
      NumOfPayments: params.numOfPayments || 1,
    };

    if (params.customerEmail) {
      requestBody.InvoiceHead = { Email: params.customerEmail };
    }

    console.log('[Cardcom v11] Charging token:', {
      amount: params.amount,
      product: params.productName,
    });

    const response = await fetch(ENDPOINT_DO_TRANSACTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('[Cardcom v11] ChargeToken response:', {
      ResponseCode: data.ResponseCode,
      Description: data.Description,
      TranzactionId: data.TranzactionId,
    });

    if (data.ResponseCode === 0) {
      return {
        success: true,
        responseCode: data.ResponseCode,
        transactionId: data.TranzactionId,
        approvalNumber: data.ApprovalNumber,
        invoiceNumber: data.DocumentInfo?.DocumentNumber,
      };
    } else {
      return {
        success: false,
        responseCode: data.ResponseCode,
        error: data.Description || `Charge failed (code ${data.ResponseCode})`,
      };
    }
  } catch (error) {
    console.error('[Cardcom v11] chargeToken error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Charge network error',
    };
  }
}
