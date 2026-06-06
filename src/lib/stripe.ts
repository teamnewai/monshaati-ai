import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Plan → Stripe Price ID mapping (set in environment)
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter:      process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
  business:     process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
  professional: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
};

// Format amount from cents to display
export function formatAmount(amount: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

// Get plan from Stripe Price ID
export function getPlanFromPriceId(priceId: string): string {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return plan;
  }
  return 'free_trial';
}
