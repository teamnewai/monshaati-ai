import { createAdminSupabaseClient } from '@/lib/supabase-server';
import type { TrialStatus } from '@/types/database';

const TRIAL_DAYS         = 14;
const TRIAL_MAX_GENS     = 3;   // Max free generations during trial

export async function getTrialStatus(org_id: string): Promise<TrialStatus> {
  const admin = await createAdminSupabaseClient();

  const { data: orgRaw } = await admin
    .from('organizations')
    .select('trial_ends_at, trial_started_at, trial_generation_count, is_trial_expired, subscription_plan')
    .eq('id', org_id)
    .single();
  const org = orgRaw as Record<string, unknown> | null;

  if (!org) {
    return { is_active: false, days_remaining: 0, expires_at: '', is_expired: true, generations_used: 0 };
  }

  // Paid plan — trial doesn't apply
  if (org.subscription_plan !== 'free_trial') {
    return { is_active: false, days_remaining: 0, expires_at: (org.trial_ends_at as string | null) ?? '', is_expired: false, generations_used: 0 };
  }

  const now       = new Date();
  const expiresAt = org.trial_ends_at ? new Date(org.trial_ends_at as string) : new Date(now.getTime() + TRIAL_DAYS * 86400000);
  const msLeft    = expiresAt.getTime() - now.getTime();
  const daysLeft  = Math.max(0, Math.ceil(msLeft / 86400000));
  const isExpired = now > expiresAt || !!(org.is_trial_expired as boolean | null);

  return {
    is_active:        !isExpired,
    days_remaining:   daysLeft,
    expires_at:       expiresAt.toISOString(),
    is_expired:       isExpired,
    generations_used: ((org.trial_generation_count as number | null) ?? 0),
  };
}

export async function checkTrialCanGenerate(org_id: string): Promise<{
  allowed: boolean;
  reason?: string;
  trial: TrialStatus;
}> {
  const trial = await getTrialStatus(org_id);

  if (trial.is_expired) {
    return { allowed: false, reason: 'trial_expired', trial };
  }
  if (trial.generations_used >= TRIAL_MAX_GENS) {
    return { allowed: false, reason: 'trial_limit_reached', trial };
  }

  return { allowed: true, trial };
}

export async function incrementTrialGeneration(org_id: string): Promise<void> {
  const admin = await createAdminSupabaseClient();
  const { data: org } = await admin
    .from('organizations')
    .select('trial_generation_count')
    .eq('id', org_id)
    .single();

  const current = ((org as Record<string, unknown> | null)?.trial_generation_count as number) ?? 0;
  await admin.from('organizations').update({
    trial_generation_count: current + 1,
  }).eq('id', org_id);
}

export async function expireTrial(org_id: string): Promise<void> {
  const admin = await createAdminSupabaseClient();
  await admin.from('organizations').update({
    is_trial_expired: true,
    trial_expired_at: new Date().toISOString(),
  }).eq('id', org_id);
}
