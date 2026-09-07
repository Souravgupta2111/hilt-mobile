/**
 * Sandbox.co.in Live Aadhaar KYC & DigiLocker Client
 * Credentials come only from env. No hardcoded keys, no OTP bypass.
 */

const SANDBOX_BASE_URL = 'https://api.sandbox.co.in';
const API_KEY = process.env.EXPO_PUBLIC_SANDBOX_API_KEY;
const API_SECRET = process.env.SANDBOX_SECRET;

export interface AadhaarVerifyResult {
  success: boolean;
  referenceId?: string;
  name?: string;
  dob?: string;
  gender?: string;
  maskedAadhaar?: string;
  address?: string;
  error?: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

function requireSandboxConfig() {
  if (!API_KEY || !API_SECRET) {
    throw new Error('Aadhaar KYC is not configured on this device.');
  }
}

/**
 * Authenticate with Sandbox.co.in to acquire JWT Access Token
 */
export async function getSandboxToken(): Promise<string> {
  requireSandboxConfig();
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiry) {
    return cachedAccessToken;
  }

  const response = await fetch(`${SANDBOX_BASE_URL}/authenticate`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY as string,
      'x-api-secret': API_SECRET as string,
      'x-api-version': '1.0',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ secret: API_SECRET }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sandbox authentication failed: ${response.status} - ${errText}`);
  }

  const resJson = await response.json();
  const token = resJson.access_token || resJson.data?.access_token;
  if (!token) {
    throw new Error('No access_token returned by Sandbox API');
  }

  cachedAccessToken = token;
  // Tokens are valid for 24h; cache for 23h
  tokenExpiry = now + 23 * 60 * 60 * 1000;
  return token;
}

/**
 * Step 1: Request Aadhaar OTP via Sandbox OKYC
 */
export async function generateAadhaarOtp(
  aadhaarNumber: string
): Promise<{ success: boolean; referenceId?: string; message: string }> {
  try {
    const cleanNumber = aadhaarNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length !== 12) {
      return { success: false, message: 'Enter a valid 12-digit Aadhaar number.' };
    }

    const token = await getSandboxToken();

    const response = await fetch(`${SANDBOX_BASE_URL}/kyc/aadhaar/okyc/otp`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'x-api-key': API_KEY as string,
        'x-api-version': '2.0',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request',
        aadhaar_number: cleanNumber,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Could not send Aadhaar OTP. Try again.',
      };
    }

    const referenceId = data?.data?.reference_id || data?.reference_id;
    if (!referenceId) {
      return { success: false, message: 'Provider did not return a reference ID.' };
    }
    return {
      success: true,
      referenceId,
      message: 'OTP sent to the mobile linked with UIDAI.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error during Aadhaar OTP generation.',
    };
  }
}

/**
 * Step 2: Verify Aadhaar OTP and retrieve verified KYC identity
 */
export async function verifyAadhaarOtp(
  referenceId: string,
  otp: string
): Promise<AadhaarVerifyResult> {
  try {
    const token = await getSandboxToken();

    const response = await fetch(`${SANDBOX_BASE_URL}/kyc/aadhaar/okyc/otp/verify`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'x-api-key': API_KEY as string,
        'x-api-version': '2.0',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.verify.request',
        reference_id: referenceId,
        otp: otp.trim(),
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: result?.message || 'Invalid OTP. Check the code and try again.',
      };
    }

    const kycData = result?.data || {};
    return {
      success: true,
      referenceId,
      name: kycData.name || kycData.full_name,
      dob: kycData.dob,
      gender: kycData.gender,
      maskedAadhaar: `XXXX-XXXX-${kycData.aadhaar_last_four || 'XXXX'}`,
      address: kycData.address
        ? `${kycData.address.street || ''}, ${kycData.address.vtc || ''}, ${
            kycData.address.state || ''
          }`
        : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error during Aadhaar verification.',
    };
  }
}
