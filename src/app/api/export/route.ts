import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, LIMITS, rateLimitHeaders } from '@/lib/rate-limit';
import { logExportDownload, getClientIP } from '@/lib/security';
import { requireAuth } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    // Rate limit exports — 30/hour
    const rl = rateLimit({ key: `export:${user.id}`, ...LIMITS.EXPORT });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'تجاوزت حد التصدير. حاول مرة أخرى لاحقاً.' }, { status: 429 });
    }

    const { generation_id, org_id, format, sections } = await request.json() as {
      generation_id: string;
      org_id: string;
      format: string;
      sections?: string[];
    };

    const { data, error } = await supabase
      .from('exports')
      .insert({
        generation_id,
        org_id,
        created_by: user.id,
        format,
        sections: sections ?? [],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Track download in audit log
    const exportRecord = data as Record<string,unknown>;
    await logExportDownload({
      user_id:       user.id,
      org_id,
      generation_id,
      format,
      export_id:     exportRecord.id as string,
      ip:            getClientIP(request as unknown as Request),
      sections:      sections ?? [],
    });

    return NextResponse.json({ export: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
