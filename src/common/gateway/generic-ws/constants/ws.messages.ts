export const WsMessages = {
  SUCCESS: {},
  ERROR: {
    MISSING_TOKEN: 'Authentication token missing.',
    EXPIRED_TOKEN: 'Authentication token expired.',
    INVALID_TOKEN: 'Invalid authentication token',
    TOO_MANY_CONNECTIONS: 'Too many connections.',
    UNAUTHORIZED: 'Unauthorized',
  },
} as const;
