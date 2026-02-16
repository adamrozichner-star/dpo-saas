// src/lib/cardcom.ts
// Cardcom Payment Gateway Integration for MyDPO

const CARDCOM_LOWPROFILE_URL = 'https://secure.cardcom.solutions/Interface/LowProfile.aspx';
const CARDCOM_INDICATOR_URL = 'https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx';
const CARDCOM_CHARGE_TOKEN_URL = 'https://secure.cardcom.solutions/Interface/ChargeToken.aspx';

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
  indicatorUrl: string;
  customerEmail?: string;
  customerName?: string;
  customFields?: Record<string, string>;
  createToken?: boolean;
  numOfPayments?: number;
}

export interface LowProfileResponse {
  success: boolean;
  url?: string;
  lowProfileCode?: string;
  error?: string;
  responseCode?: string;
}

export interface PaymentVerification {
  success: boolean;
  responseCode?: string;
  dealResponse?: string;
  transactionId?: string;
  approvalNumber?: string;
  token?: string;
  cardMask?: string;
  cardExpiry?: string;
  cardBrand?: string;
  invoiceNumber?: string;
  amount?: number;
  error?: string;
  rawResponse?: Record<string, string>;
}

export interface ChargeTokenParams {
  token: string;
  amount: number;
  productName: string;
  customerEmail?: string;
  numOfPayments?: number;
}

function getConfig(): CardcomConfig {
  return {
    terminalNumber: process.env.CARDCOM_TERMINAL_NUMBER || '',
    apiName: process.env.CARDCOM_API_NAME || '',
    apiPassword: process.env.CARDCOM_API_PASSWORD || '',
  };
}

/**
 * Create a LowProfile payment page
 * Returns URL to redirect user to Cardcom's secure payment page
 */
export async function createPaymentPage(params: CreatePaymentParams): Promise<LowProfileResponse> {
  const config = getConfig();
  
  if (!config.terminalNumber || !config.apiName || !config.apiPassword) {
    return {
      success: false,
      error: 'Cardcom not configured - missing credentials',
    };
  }

  try {
    const requestParams = new URLSearchParams({
      // Required credentials
      TerminalNumber: config.terminalNumber,
      ApiName: config.apiName,
      ApiPassword: config.apiPassword,
      
      // Payment details
      SumToBill: params.amount.toString(),
      CoinID: '1', // 1 = ILS
      Language: 'he',
      ProductName: params.productName,
      
      // URLs
      SuccessRedirectUrl: params.successUrl,
      ErrorRedirectUrl: params.errorUrl,
      IndicatorUrl: params.indicatorUrl,
      
      // Operation type:
      // 1 = Charge only
      // 2 = Charge + Create token (for recurring)
      // 3 = Create token only (no charge)
      Operation: params.createToken ? '2' : '1',
      
      // Number of payments (installments)
      MaxNumOfPayments: (params.numOfPayments || 1).toString(),
      
      // Encoding
      codepage: '65001', // UTF-8
      
      // UI settings
      ShowInvoiceHead: 'false',
      CancelType: '2', // Show cancel button
      HideCardOwnerName: 'false',
      
      // Customer info
      ...(params.customerEmail && { InvoiceHead_Email: params.customerEmail }),
      ...(params.customerName && { InvoiceHead_CustName: params.customerName }),
      
      // Custom fields (passed back in indicator)
      ...(params.customFields && { ReturnValue: JSON.stringify(params.customFields) }),
    });

    console.log('[Cardcom] Creating payment page:', {
      terminal: config.terminalNumber,
      amount: params.amount,
      product: params.productName,
    });

    const response = await fetch(CARDCOM_LOWPROFILE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestParams.toString(),
    });

    const responseText = await response.text();
    console.log('[Cardcom] LowProfile response:', responseText);

    // Parse response (format: ResponseCode=0&LowProfileCode=xxx&url=xxx)
    const responseParams = new URLSearchParams(responseText);
    const responseCode = responseParams.get('ResponseCode');
    
    if (responseCode === '0') {
      return {
        success: true,
        url: responseParams.get('url') || '',
        lowProfileCode: responseParams.get('LowProfileCode') || '',
        responseCode,
      };
    } else {
      return {
        success: false,
        error: responseParams.get('Description') || `Error code: ${responseCode}`,
        responseCode: responseCode || undefined,
      };
    }
  } catch (error) {
    console.error('[Cardcom] createPaymentPage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Verify payment status using LowProfileCode
 * Call after receiving indicator/webhook from Cardcom
 */
export async function verifyPayment(lowProfileCode: string): Promise<PaymentVerification> {
  const config = getConfig();
  
  if (!config.terminalNumber || !config.apiName) {
    return {
      success: false,
      error: 'Cardcom not configured',
    };
  }

  try {
    const params = new URLSearchParams({
      terminalnumber: config.terminalNumber,
      username: config.apiName,
      lowprofilecode: lowProfileCode,
    });

    const url = `${CARDCOM_INDICATOR_URL}?${params.toString()}`;
    console.log('[Cardcom] Verifying payment:', lowProfileCode);

    const response = await fetch(url);
    const responseText = await response.text();
    console.log('[Cardcom] Verification response:', responseText);

    // Parse response
    const responseParams = new URLSearchParams(responseText);
    const dealResponse = responseParams.get('DealResponse');
    
    // Convert to object for rawResponse
    const rawResponse: Record<string, string> = {};
    responseParams.forEach((value, key) => {
      rawResponse[key] = value;
    });

    // DealResponse 0 = success
    if (dealResponse === '0') {
      return {
        success: true,
        responseCode: responseParams.get('ResponseCode') || undefined,
        dealResponse,
        transactionId: responseParams.get('InternalDealNumber') || undefined,
        approvalNumber: responseParams.get('ApprovalNumber') || undefined,
        token: responseParams.get('Token') || undefined,
        cardMask: responseParams.get('CardMask') || responseParams.get('Last4CardDigits') || undefined,
        cardExpiry: formatCardExpiry(
          responseParams.get('CardValidityMonth'),
          responseParams.get('CardValidityYear')
        ),
        cardBrand: responseParams.get('CardBrand') || undefined,
        invoiceNumber: responseParams.get('InvoiceNumber') || undefined,
        amount: parseFloat(responseParams.get('SumToBill') || '0') || undefined,
        rawResponse,
      };
    } else {
      return {
        success: false,
        dealResponse,
        error: responseParams.get('DealResponseText') || responseParams.get('OperationResponse') || 'Payment failed',
        rawResponse,
      };
    }
  } catch (error) {
    console.error('[Cardcom] verifyPayment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Charge a saved token (for recurring monthly payments)
 */
export async function chargeToken(params: ChargeTokenParams): Promise<PaymentVerification> {
  const config = getConfig();
  
  if (!config.terminalNumber || !config.apiName) {
    return {
      success: false,
      error: 'Cardcom not configured',
    };
  }

  try {
    const requestParams = new URLSearchParams({
      TerminalNumber: config.terminalNumber,
      UserName: config.apiName,
      TokenToCharge: params.token,
      SumToBill: params.amount.toString(),
      CoinID: '1', // ILS
      Language: 'he',
      ProductName: params.productName,
      NumOfPayments: (params.numOfPayments || 1).toString(),
      ...(params.customerEmail && { InvoiceHead_Email: params.customerEmail }),
    });

    console.log('[Cardcom] Charging token:', {
      amount: params.amount,
      product: params.productName,
    });

    const response = await fetch(CARDCOM_CHARGE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestParams.toString(),
    });

    const responseText = await response.text();
    console.log('[Cardcom] ChargeToken response:', responseText);

    const responseParams = new URLSearchParams(responseText);
    const responseCode = responseParams.get('ResponseCode');
    
    if (responseCode === '0') {
      return {
        success: true,
        responseCode,
        transactionId: responseParams.get('InternalDealNumber') || undefined,
        approvalNumber: responseParams.get('ApprovalNumber') || undefined,
        invoiceNumber: responseParams.get('InvoiceNumber') || undefined,
      };
    } else {
      return {
        success: false,
        responseCode: responseCode || undefined,
        error: responseParams.get('Description') || responseParams.get('OperationResponse') || 'Charge failed',
      };
    }
  } catch (error) {
    console.error('[Cardcom] chargeToken error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Charge failed',
    };
  }
}

// Helper to format card expiry
function formatCardExpiry(month: string | null, year: string | null): string | undefined {
  if (!month || !year) return undefined;
  return `${month.padStart(2, '0')}/${year.slice(-2)}`;
}
