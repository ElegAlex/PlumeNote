// ===========================================
// PlumeNote API - Configuration Rate Limiting
// Différenciation par type d'utilisateur et d'opération
// ===========================================

export interface RateLimitConfig {
  enabled: boolean;
  public: {
    max: number;
    timeWindow: string;
  };
  authenticated: {
    read: {
      max: number;
      timeWindow: string;
    };
    write: {
      max: number;
      timeWindow: string;
    };
  };
  auth: {
    max: number;
    timeWindow: string;
  };
}

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;

export function isReadMethod(method: string): boolean {
  return READ_METHODS.includes(method as (typeof READ_METHODS)[number]);
}

export const rateLimitConfig: RateLimitConfig = {
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  public: {
    max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_PUBLIC_WINDOW || '1 minute',
  },
  authenticated: {
    read: {
      max: parseInt(process.env.RATE_LIMIT_AUTH_READ_MAX || '10000', 10),
      timeWindow: process.env.RATE_LIMIT_AUTH_READ_WINDOW || '1 minute',
    },
    write: {
      max: parseInt(process.env.RATE_LIMIT_AUTH_WRITE_MAX || '1000', 10),
      timeWindow: process.env.RATE_LIMIT_AUTH_WRITE_WINDOW || '1 minute',
    },
  },
  auth: {
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    timeWindow: process.env.RATE_LIMIT_AUTH_WINDOW || '1 minute',
  },
};
