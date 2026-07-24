export interface DialerConfig {
  voiceboxBaseUrl: string;
  voiceboxProfileId: string;
  dialToNumber: string;
  greeting: string;
  sip: {
    domain: string;
    outboundProxy: string;
    username: string;
    password: string;
    authorizationId: string;
  };
  ringCentralDebug: boolean;
  mediaStartDelayMs: number;
  hangupAfterGreeting: boolean;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function booleanValue(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function nonNegativeInteger(name: string, fallback: number): number {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

export function loadConfig(): DialerConfig {
  return {
    voiceboxBaseUrl: (process.env.VOICEBOX_BASE_URL ?? "http://127.0.0.1:17493").replace(/\/$/, ""),
    voiceboxProfileId: required("VOICEBOX_PROFILE_ID"),
    dialToNumber: required("DIAL_TO_NUMBER"),
    greeting: process.env.DIAL_GREETING?.trim() || "Hello, this is a test call from Voicebox.",
    sip: {
      domain: required("SIP_DOMAIN"),
      outboundProxy: required("SIP_OUTBOUND_PROXY"),
      username: required("SIP_USERNAME"),
      password: required("SIP_PASSWORD"),
      authorizationId: required("SIP_AUTHORIZATION_ID"),
    },
    ringCentralDebug: booleanValue("RINGCENTRAL_DEBUG", false),
    mediaStartDelayMs: nonNegativeInteger("CALL_MEDIA_START_DELAY_MS", 5_000),
    hangupAfterGreeting: booleanValue("CALL_HANGUP_AFTER_GREETING", true),
  };
}
