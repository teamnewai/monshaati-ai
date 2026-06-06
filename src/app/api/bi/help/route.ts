import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('help_definitions').select('*').order('field_key');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Return as a lookup object for easy access
    const lookup: Record<string, unknown> = {};
    for (const h of (data ?? [])) {
      const rec = h as Record<string, unknown>;
      lookup[rec.field_key as string] = rec;
    }
    return NextResponse.json({ help: lookup });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
