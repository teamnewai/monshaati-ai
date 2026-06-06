import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'], uid: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', uid).single();
  if ((data as Record<string,unknown>)?.role !== 'super_admin') throw new Error('FORBIDDEN');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    await requireAdmin(supabase, user.id);
    const { id } = await params;
    const admin   = await createAdminSupabaseClient();

    const [{ data: consultant }, { data: bookings }, { data: reviews }, { data: payouts }] = await Promise.all([
      admin.from('consultant_profiles').select('*, profiles(full_name, email)').eq('id', id).single(),
      admin.from('consultant_bookings').select('id, status, price_usd, scheduled_at, platform_fee_usd').eq('consultant_id', id).order('created_at', { ascending: false }).limit(20),
      admin.from('consultant_reviews').select('rating, title, created_at').eq('consultant_id', id).limit(10),
      admin.from('consultant_payouts').select('*').eq('consultant_id', id).order('created_at', { ascending: false }).limit(10),
    ]);

    if (!consultant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const completedBookings = (bookings ?? []).filter((b: Record<string,unknown>) => b.status === 'completed');
    const totalEarned = completedBookings.reduce((s: number, b: Record<string,unknown>) => s + Number(b.price_usd ?? 0) - Number(b.platform_fee_usd ?? 0), 0);
    const avgRating   = (reviews ?? []).length > 0
      ? (reviews ?? []).reduce((s: number, r: Record<string,unknown>) => s + Number(r.rating), 0) / (reviews ?? []).length
      : 0;

    return NextResponse.json({
      consultant,
      stats: {
        total_bookings:    (bookings ?? []).length,
        completed_sessions: completedBookings.length,
        pending_bookings:  (bookings ?? []).filter((b: Record<string,unknown>) => b.status === 'pending').length,
        total_earned_usd:  totalEarned,
        avg_rating:        avgRating,
        total_reviews:     (reviews ?? []).length,
      },
      recent_bookings: bookings ?? [],
      recent_reviews:  reviews ?? [],
      payouts: payouts ?? [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'FORBIDDEN' ? 403 : 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await requireAuth();
    await requireAdmin(supabase, user.id);
    const { id } = await params;
    const { action, notes, commission_pct } = await request.json() as {
      action: 'approve' | 'reject' | 'suspend' | 'activate';
      notes?: string;
      commission_pct?: number;
    };
    const admin = await createAdminSupabaseClient();

    const updates: Record<string, unknown> = {};

    if (action === 'approve') {
      updates.status       = 'active';
      updates.verified_at  = new Date().toISOString();
      updates.approved_by  = user.id;
      updates.verification_notes = notes ?? null;
    } else if (action === 'reject') {
      updates.status           = 'inactive';
      updates.rejected_at      = new Date().toISOString();
      updates.rejection_reason = notes ?? 'لا يستوفي المتطلبات';
    } else if (action === 'suspend') {
      updates.status = 'suspended';
      updates.verification_notes = notes ?? null;
    } else if (action === 'activate') {
      updates.status = 'active';
    }

    if (commission_pct !== undefined) {
      updates.platform_commission_pct = commission_pct;
    }

    const { data, error } = await admin.from('consultant_profiles').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    await admin.from('audit_log').insert({
      user_id:     user.id,
      action:      'consultant_' + action,
      entity_type: 'consultant_profiles',
      entity_id:   id,
      new_data:    { action, notes, status: updates.status },
    });

    return NextResponse.json({ consultant: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'FORBIDDEN' ? 403 : 500 });
  }
}
