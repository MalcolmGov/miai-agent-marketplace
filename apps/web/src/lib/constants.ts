export const WORKSPACE_ID = "demo-workspace";

/**
 * The consumer identity used on the Bearer-exempt consumer surface in mock/sandbox mode.
 * Fixed on purpose — NEVER derived from client input (no `?userId` / `x-user-id`) — so no caller
 * can impersonate another consumer's wallet or memory. In OIDC mode the identity is the verified
 * session subject instead.
 */
export const DEMO_CONSUMER_ID = "demo-user";

export const TIER_PRICES = {
  standard: 349,
  pro: 699,
  enterprise: 1199,
} as const;
