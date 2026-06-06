import { createAdminSupabaseClient } from '@/lib/supabase-server';

export async function getReferralCode(user_id: string): Promise<string | null> {
  const admin = await createAdminSupabaseClient();
  const { data } = await admin.from('profiles').select('referral_code').eq('id', user_id).single();
  return (data as any)?.referral_code ?? null;
}

export async function processReferral(referee_user_id: string, referral_code: string): Promise<void> {
  const admin = await createAdminSupabaseClient();
  // Find referrer
  const { data: referrerProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('referral_code', referral_code)
    .maybeSingle();

  if (!referrerProfile || (referrerProfile as any).id === referee_user_id) return;

  // Get orgs
  const [{ data: referrerOrg }, { data: refereeOrg }] = await Promise.all([
    admin.from('organizations').select('id').eq('owner_id', (referrerProfile as any).id).limit(1).maybeSingle(),
    admin.from('organizations').select('id').eq('owner_id', referee_user_id).limit(1).maybeSingle(),
  ]);

  // Check not already referred
  const { data: existing } = await admin
    .from('referrals')
    .select('id')
    .eq('referee_id', referee_user_id)
    .maybeSingle();
  if (existing) return;

  await admin.from('referrals').insert({
    referrer_id:     (referrerProfile as any).id,
    referrer_org_id: (referrerOrg as any)?.id ?? null,
    referee_id:      referee_user_id,
    referee_org_id:  (refereeOrg as any)?.id ?? null,
    referral_code,
    status:          'pending',
    reward_type:     'free_month',
    reward_value:    99.00,
  });
}

export async function getReferralStats(user_id: string) {
  const admin = await createAdminSupabaseClient();
  const [{ data: referrals }, { data: profile }] = await Promise.all([
    admin.from('referrals').select('*').eq('referrer_id', user_id),
    admin.from('profiles').select('referral_code').eq('id', user_id).single(),
  ]);
  const list = (referrals ?? []) as any[];
  return {
    referral_code: (profile as any)?.referral_code ?? null,
    total:     list.length,
    converted: list.filter(r => r.status === 'converted').length,
    rewarded:  list.filter(r => r.reward_applied).length,
    referrals: list,
  };
}
