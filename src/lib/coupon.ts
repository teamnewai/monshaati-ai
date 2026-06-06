import { createAdminSupabaseClient, requireAuth } from '@/lib/supabase-server';
import type { Coupon } from '@/types/database';

export async function validateCoupon(code: string, order_amount_usd: number, applies_to: string): Promise<{
  valid: boolean;
  coupon?: Coupon;
  discount_amount: number;
  error?: string;
}> {
  const admin = await createAdminSupabaseClient();

  const { data: coupon } = await admin
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .filter('code', 'ilike', code)
    .maybeSingle();

  if (!coupon) return { valid: false, discount_amount: 0, error: 'كوبون غير صالح' };

  const now = new Date();

  // Check expiry
  if (coupon.valid_until && new Date(coupon.valid_until as string) < now) {
    return { valid: false, discount_amount: 0, error: 'انتهت صلاحية الكوبون' };
  }

  // Check usage limit
  if (coupon.max_uses && (coupon.uses_count as number) >= (coupon.max_uses as number)) {
    return { valid: false, discount_amount: 0, error: 'تم استخدام الكوبون بالحد الأقصى' };
  }

  // Check applies_to
  if ((coupon.applies_to as string) !== 'all' && (coupon.applies_to as string) !== applies_to) {
    return { valid: false, discount_amount: 0, error: 'هذا الكوبون لا ينطبق على هذا الطلب' };
  }

  // Check minimum order
  if ((coupon.min_order_usd as number) > 0 && order_amount_usd < (coupon.min_order_usd as number)) {
    return { valid: false, discount_amount: 0, error: `الحد الأدنى للطلب $${coupon.min_order_usd}` };
  }

  // Calculate discount
  let discount = 0;
  if ((coupon.discount_type as string) === 'percentage') {
    discount = order_amount_usd * ((coupon.discount_value as number) / 100);
  } else {
    discount = coupon.discount_value as number;
  }
  discount = Math.min(discount, order_amount_usd);

  return { valid: true, coupon: coupon as unknown as Coupon, discount_amount: discount };
}

export async function applyCoupon(coupon_id: string, user_id: string, org_id: string, order_type: string, discount_applied: number): Promise<void> {
  const admin = await createAdminSupabaseClient();
  await admin.from('coupon_uses').insert({ coupon_id, user_id, org_id, order_type, discount_applied });
  // Increment use count
  const { data: c } = await admin.from('coupons').select('uses_count').eq('id', coupon_id).single();
  await admin.from('coupons').update({ uses_count: ((c as any)?.uses_count ?? 0) + 1 }).eq('id', coupon_id);
}
