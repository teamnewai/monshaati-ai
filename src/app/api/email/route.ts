import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, LIMITS } from '@/lib/rate-limit';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';
import {
  sendWelcomeEmail,
  sendTrialStartedEmail,
  sendTrialExpiringEmail,
  sendPaymentSuccessEmail,
  sendBookingConfirmationEmail,
  sendPasswordResetEmail,
  sendAIGenerationCompletedEmail,
} from '@/lib/email';

type EmailType =
  | 'welcome' | 'trial_started' | 'trial_expiring'
  | 'payment_success' | 'booking_confirmation'
  | 'password_reset' | 'ai_generation_completed';

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    // Rate limit email sending
    const rl = rateLimit({ key: `email:${user.id}`, ...LIMITS.EMAIL });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'تجاوزت حد الإيميلات.' }, { status: 429 });
    }

    const body = await request.json() as { type: EmailType; payload: Record<string, unknown> };
    const { type, payload } = body;

    // Fetch user profile for name/email if not provided
    const admin = await createAdminSupabaseClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const name  = (payload.name as string) ?? (profile as Record<string,unknown>)?.full_name as string ?? 'عزيزي';
    const email = (payload.to as string) ?? (profile as Record<string,unknown>)?.email as string ?? user.email ?? '';

    if (!email) return NextResponse.json({ error: 'No email address' }, { status: 400 });

    let result;
    switch (type) {
      case 'welcome':
        result = await sendWelcomeEmail(email, name);
        break;
      case 'trial_started':
        result = await sendTrialStartedEmail(email, name, payload.trial_ends as string);
        break;
      case 'trial_expiring':
        result = await sendTrialExpiringEmail(email, name, Number(payload.days_left), payload.trial_ends as string);
        break;
      case 'payment_success':
        result = await sendPaymentSuccessEmail({
          to: email, name,
          plan:        payload.plan as string,
          amount_sar:  Number(payload.amount_sar),
          period_end:  payload.period_end as string,
          invoice_url: payload.invoice_url as string | undefined,
        });
        break;
      case 'booking_confirmation':
        result = await sendBookingConfirmationEmail({
          to: email, name,
          consultant_name: payload.consultant_name as string,
          duration:        payload.duration as string,
          scheduled_at:    payload.scheduled_at as string,
          meeting_url:     payload.meeting_url as string | undefined,
          meeting_type:    payload.meeting_type as string | undefined,
          price_sar:       Number(payload.price_sar),
        });
        break;
      case 'password_reset':
        result = await sendPasswordResetEmail(email, name, payload.reset_url as string);
        break;
      case 'ai_generation_completed':
        result = await sendAIGenerationCompletedEmail({
          to: email, name,
          org_name:   payload.org_name as string,
          result_url: payload.result_url as string,
          sections:   (payload.sections as string[]) ?? [],
        });
        break;
      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    }

    if (result.error) {
      console.error('[email]', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Email error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
