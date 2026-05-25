/**
 * Premium theme free-trial helpers.
 * A merchant who picks a premium theme gets 14 days of free access.
 * After that, the Customiser locks and a storefront ticker urges payment.
 */
export const PREMIUM_THEME_TRIAL_DAYS = 14;

export interface PendingPremiumTheme {
  theme_id: string;
  selected_at?: string;
  trial_started_at?: string;
  trial_ends_at?: string;
}

export interface TrialStatus {
  active: boolean;
  expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  endsAt: Date | null;
}

export function getPremiumTrialStatus(pending?: PendingPremiumTheme | null): TrialStatus {
  if (!pending) return { active: false, expired: false, daysLeft: 0, hoursLeft: 0, endsAt: null };
  const startIso = pending.trial_started_at || pending.selected_at;
  let endsAt: Date | null = pending.trial_ends_at ? new Date(pending.trial_ends_at) : null;
  if (!endsAt && startIso) {
    endsAt = new Date(new Date(startIso).getTime() + PREMIUM_THEME_TRIAL_DAYS * 86400_000);
  }
  if (!endsAt) return { active: false, expired: false, daysLeft: 0, hoursLeft: 0, endsAt: null };
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return { active: false, expired: true, daysLeft: 0, hoursLeft: 0, endsAt };
  return {
    active: true,
    expired: false,
    daysLeft: Math.ceil(ms / 86400_000),
    hoursLeft: Math.ceil(ms / 3600_000),
    endsAt,
  };
}

export function buildPendingPremiumTheme(themeId: string): PendingPremiumTheme {
  const now = new Date();
  return {
    theme_id: themeId,
    selected_at: now.toISOString(),
    trial_started_at: now.toISOString(),
    trial_ends_at: new Date(now.getTime() + PREMIUM_THEME_TRIAL_DAYS * 86400_000).toISOString(),
  };
}
