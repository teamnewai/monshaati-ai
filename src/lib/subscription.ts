import { createAdminSupabaseClient } from '@/lib/supabase-server';
import type { SubPlan } from '@/types/database';
import { PLAN_LIMITS } from '@/types/database';

// ----------------------------------------------------------------
// Check if org can perform an AI generation
// ----------------------------------------------------------------
export async function canGenerateAI(org_id: string): Promise<{
  allowed: boolean;
  reason?: string;
  plan: SubPlan;
  used: number;
  limit: number;
}> {
  const admin = await createAdminSupabaseClient();

  // Get current subscription
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('org_id', org_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan: SubPlan = (sub?.plan as SubPlan) ?? 'free_trial';
  const limits = PLAN_LIMITS[plan];

  // Check subscription active
  if (sub && sub.status !== 'active' && sub.status !== 'trialing') {
    return { allowed: false, reason: 'subscription_inactive', plan, used: 0, limit: limits.generations_per_month };
  }

  // Calculate current billing period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get or create usage record
  const { data: usage } = await admin
    .from('usage_tracking')
    .select('generations_used')
    .eq('org_id', org_id)
    .gte('period_start', periodStart.toISOString())
    .maybeSingle();

  const used  = (usage?.generations_used as number | null) ?? 0;
  const limit = limits.generations_per_month;

  if (used >= limit) {
    return {
      allowed: false,
      reason: 'generation_limit_reached',
      plan,
      used,
      limit,
    };
  }

  return { allowed: true, plan, used, limit };
}

// ----------------------------------------------------------------
// Increment usage counter after successful generation
// ----------------------------------------------------------------
export async function incrementGenerationUsage(org_id: string): Promise<void> {
  const admin = await createAdminSupabaseClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Upsert usage record
  const { data: existing } = await admin
    .from('usage_tracking')
    .select('id, generations_used')
    .eq('org_id', org_id)
    .gte('period_start', periodStart.toISOString())
    .maybeSingle();

  if (existing) {
    await admin
      .from('usage_tracking')
      .update({ generations_used: ((existing as {id: string; generations_used: number}).generations_used) + 1 })
      .eq('id', existing.id);
  } else {
    await admin.from('usage_tracking').insert({
      org_id,
      period_start: periodStart.toISOString(),
      period_end:   periodEnd.toISOString(),
      generations_used: 1,
    });
  }
}

// ----------------------------------------------------------------
// Get org subscription details
// ----------------------------------------------------------------
export async function getOrgSubscription(org_id: string) {
  const admin = await createAdminSupabaseClient();

  const [{ data: sub }, { data: org }] = await Promise.all([
    admin.from('subscriptions')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from('organizations')
      .select('subscription_plan, trial_ends_at')
      .eq('id', org_id)
      .single(),
  ]);

  const plan: SubPlan = (sub?.plan as SubPlan) ?? (org?.subscription_plan as SubPlan) ?? 'free_trial';
  const limits = PLAN_LIMITS[plan];

  // Current period usage
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: usage } = await admin
    .from('usage_tracking')
    .select('generations_used')
    .eq('org_id', org_id)
    .gte('period_start', periodStart.toISOString())
    .maybeSingle();

  return {
    subscription: sub,
    plan,
    limits,
    usage: {
      used:  usage?.generations_used ?? 0,
      limit: limits.generations_per_month,
    },
    trial_ends_at: org?.trial_ends_at,
  };
}
