// src/lib/cardcom.ts
// Cardcom v11 JSON API — exact endpoints from official docs
// Docs: https://secure.cardcom.solutions/Api/v11/Docs

// ============================================
// ENDPOINTS (from docs screenshots)
// ============================================
const BASE = 'https://secure.cardcom.solutions/api/v11';
const ENDPOINT_CREATE = `${BASE}/LowProfile/Create`;
const ENDPOINT_GET_RESULT = `${BASE}/LowProfile/GetLpResult`;
const ENDPOINT_TRANSACTION = `${BASE}/Transactions/DoTransaction`;

// ============================================
// TYPES
// ============================================
export interface CreatePaymentParams {
  amount: number;
  productName: string;
  successUrl: string;
  errorUrl: string;
  webhookUrl: string;
  cancelUrl?: string;
  customerEmail?: string;
  customerName?: string;
  returnValue?: string;
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
  maxPayments?: number;
  language?: string;
  coinId?: number;
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
  tokenExpiry: string;
  amount: number;
  productName: string;
  customerEmail?: string;
  numOfPayments?: number;
  approvalNumber?: string;
}

// ============================================
// CONFIG
// ============================================
function getTerminal(): number {
  return parseInt(process.env.CARDCOM_TERMINAL_NUMBER || '0', 10);
}
function getApiName(): string {
  return process.env.CARDCOM_API_NAME || '';
}
function getApiPassword(): string {
  return process.env.CARDCOM_API_PASSWORD || '';
}

// ============================================
// STEP 1: POST /api/v11/LowProfile/Create
// Creates a payment page (iframe/redirect)
//
// Required fields per docs:
//   TerminalNumber (int32), ApiName (string),
//   Amount (decimal), SuccessRedirectUrl, FailedRedirectUrl, WebHookUrl
//
// Optional: Operation, ReturnValue, ProductName, Language, 
//   ISOCoinId, MaxNumOfPayments, CancelRedirectUrl, Document, etc.
// ============================================
export async function createPaymentPage(params: CreatePaymentParams): Promise<LowProfileResponse> {
  const terminal = getTerminal();
  const apiName = getApiName();

  if (!terminal || !apiName) {
    return { success: false, error: 'Cardcom not configured — missing TerminalNumber or ApiName' };
  }

  // Build request body — only include fields the API expects
  const body: Record<string, any> = {
    TerminalNumber: terminal,
    ApiName: apiName,
    Amount: params.amount,
    SuccessRedirectUrl: params.successUrl,
    FailedRedirectUrl: params.errorUrl,
    WebHookUrl: params.webhookUrl,
  };

  // Optional fields
  if (params.operation) body.Operation = params.operation;
  if (params.returnValue) body.ReturnValue = params.returnValue;
  if (params.productName) body.ProductName = params.productName;
  if (params.language) body.Language = params.language;
  if (params.coinId) body.ISOCoinId = params.coinId;
  if (params.maxPayments) body.MaxNumOfPayments = params.maxPayments;
  if (params.cancelUrl) body.CancelRedirectUrl = params.cancelUrl;

  console.log('[Cardcom] POST /LowProfile/Create:', {
    terminal, amount: params.amount, operation: body.Operation, product: params.productName,
  });

  try {
    const res = await fetch(ENDPOINT_CREATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Check if response is JSON
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[Cardcom] Non-JSON response:', res.status, text.slice(0, 200));
      return { success: false, error: `Cardcom returned non-JSON (HTTP ${res.status})`, responseCode: res.status };
    }

    const data = await res.json();

    console.log('[Cardcom] Create response:', {
      ResponseCode: data.ResponseCode,
      Description: data.Description,
      LowProfileId: data.LowProfileId,
      Url: data.Url?.slice(0, 80),
    });

    if (data.ResponseCode === 0 && data.Url) {
      return {
        success: true,
        url: data.Url,
        lowProfileId: data.LowProfileId,
        responseCode: 0,
        description: data.Description,
      };
    } else {
      return {
        success: false,
        error: data.Description || `Cardcom error ${data.ResponseCode}`,
        responseCode: data.ResponseCode,
        description: data.Description,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cardcom] Create network error:', msg);
    return { success: false, error: `Network error: ${msg}` };
  }
}

// ============================================
// STEP 2: POST /api/v11/LowProfile/GetLpResult
// Get the result of a completed payment
//
// Required fields per docs:
//   TerminalNumber (int32), ApiName (string), LowProfileId (guid)
// ============================================
export async function verifyPayment(lowProfileId: string): Promise<PaymentVerification> {
  const terminal = getTerminal();
  const apiName = getApiName();

  if (!terminal || !apiName) {
    return { success: false, error: 'Cardcom not configured' };
  }

  const body = {
    TerminalNumber: terminal,
    ApiName: apiName,
    LowProfileId: lowProfileId,
  };

  console.log('[Cardcom] POST /LowProfile/GetLpResult:', { lowProfileId });

  try {
    const res = await fetch(ENDPOINT_GET_RESULT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.error('[Cardcom] GetLpResult non-JSON:', res.status, text.slice(0, 200));
      return { success: false, error: `Non-JSON response (HTTP ${res.status})` };
    }

    const data = await res.json();

    console.log('[Cardcom] GetLpResult response:', {
      ResponseCode: data.ResponseCode,
      Description: data.Description,
      TranzactionId: data.TranzactionId,
      Operation: data.Operation,
      ReturnValue: data.ReturnValue,
      hasToken: !!data.TokenInfo?.Token,
      hasTranzactionInfo: !!data.TranzactionInfo,
    });

    // ResponseCode 0 = success
    if (data.ResponseCode === 0) {
      // Extract data from the nested objects per v11 response schema
      const ui = data.UIValues || {};
      const token = data.TokenInfo || {};
      const txn = data.TranzactionInfo || {};
      const doc = data.DocumentInfo || {};

      return {
        success: true,
        responseCode: 0,
        description: data.Description,
        transactionId: data.TranzactionId || txn.TranzactionId,
        approvalNumber: txn.ApprovalNumber || token.TokenApprovalNumber,
        token: token.Token || undefined,
        tokenExpiry: token.TokenExDate || undefined,
        cardMask: txn.Last4CardDigitsString
          ? `xxxx-${txn.Last4CardDigitsString}`
          : txn.Last4CardDigits
            ? `xxxx-${txn.Last4CardDigits}`
            : undefined,
        cardOwnerName: ui.CardOwnerName || undefined,
        cardOwnerEmail: ui.CardOwnerEmail || undefined,
        invoiceNumber: doc.DocumentNumber || undefined,
        numOfPayments: ui.NumOfPayments || undefined,
        returnValue: data.ReturnValue || undefined,
        amount: txn.Amount || undefined,
        rawResponse: data,
      };
    } else {
      return {
        success: false,
        responseCode: data.ResponseCode,
        description: data.Description,
        error: data.Description || `Verification failed (code ${data.ResponseCode})`,
        returnValue: data.ReturnValue || undefined,
        rawResponse: data,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cardcom] GetLpResult error:', msg);
    return { success: false, error: `Network error: ${msg}` };
  }
}

// ============================================
// STEP 3: POST /api/v11/Transactions/DoTransaction
// Charge a saved token (for recurring billing)
// ============================================
export async function chargeToken(params: ChargeTokenParams): Promise<PaymentVerification> {
  const terminal = getTerminal();
  const apiName = getApiName();
  const apiPassword = getApiPassword();

  if (!terminal || !apiName || !apiPassword) {
    return { success: false, error: 'Cardcom not configured for token charge' };
  }

  const body: Record<string, any> = {
    TerminalNumber: terminal,
    ApiName: apiName,
    ApiPassword: apiPassword,
    Amount: params.amount,
    Token: params.token,
    TokenExDate: params.tokenExpiry,
    ProductName: params.productName,
    ISOCoinId: 1,
    NumOfPayments: params.numOfPayments || 1,
  };

  if (params.approvalNumber) body.ApprovalNumber = params.approvalNumber;

  console.log('[Cardcom] POST /Transactions/DoTransaction:', { amount: params.amount });

  try {
    const res = await fetch(ENDPOINT_TRANSACTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    console.log('[Cardcom] DoTransaction response:', {
      ResponseCode: data.ResponseCode,
      Description: data.Description,
      TranzactionId: data.TranzactionId,
    });

    if (data.ResponseCode === 0) {
      return {
        success: true,
        responseCode: 0,
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cardcom] DoTransaction error:', msg);
    return { success: false, error: `Network error: ${msg}` };
  }
}
