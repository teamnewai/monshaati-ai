import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { validateCoupon } from '@/lib/coupon';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { code, order_amount_usd, applies_to } = await request.json() as {
      code: string; order_amount_usd: number; applies_to: string;
    };
    const result = await validateCoupon(code, order_amount_usd, applies_to ?? 'all');
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
