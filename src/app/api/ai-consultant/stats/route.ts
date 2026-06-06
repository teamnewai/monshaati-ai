import { NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();

    // Super admin only
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if ((profile as Record<string, unknown>)?.role !== 'super_admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = await createAdminSupabaseClient();

    const [
      { count: totalConversations },
      { count: totalMessages },
      { count: escalations },
      { data: recentConvs },
      { data: topicBreakdown },
    ] = await Promise.all([
      admin.from('consultant_conversations').select('*', { count: 'exact', head: true }),
      admin.from('consultant_messages').select('*', { count: 'exact', head: true }).eq('role', 'assistant'),
      admin.from('consultant_conversations').select('*', { count: 'exact', head: true }).eq('status', 'escalated'),
      admin.from('consultant_conversations')
        .select('id, status, messages_count, satisfaction_score, topic, created_at')
        .order('created_at', { ascending: false }).limit(10),
      admin.from('consultant_conversations')
        .select('topic')
        .not('topic', 'is', null),
    ]);

    // Aggregate topics
    const topics: Record<string, number> = {};
    for (const row of (topicBreakdown ?? [])) {
      const t = (row as Record<string, unknown>).topic as string;
      topics[t] = (topics[t] ?? 0) + 1;
    }

    // Avg satisfaction from conversations with scores
    const { data: rated } = await admin
      .from('consultant_conversations')
      .select('satisfaction_score')
      .not('satisfaction_score', 'is', null);

    const avgSatisfaction = rated?.length
      ? (rated as Record<string, unknown>[]).reduce((s, r) => s + Number(r.satisfaction_score ?? 0), 0) / rated.length
      : null;

    // Avg confidence from messages
    const { data: confidenceData } = await admin
      .from('consultant_messages')
      .select('confidence_score')
      .eq('role', 'assistant')
      .not('confidence_score', 'is', null)
      .limit(100);

    const avgConfidence = confidenceData?.length
      ? (confidenceData as Record<string, unknown>[]).reduce((s, r) => s + Number(r.confidence_score ?? 0), 0) / confidenceData.length
      : null;

    // Total recommendations
    const { data: recData } = await admin
      .from('consultant_messages')
      .select('recommendations')
      .eq('role', 'assistant')
      .not('recommendations', 'eq', '[]');

    const totalRecommendations = (recData ?? []).reduce((s, r) => {
      const recs = (r as Record<string, unknown>).recommendations;
      return s + (Array.isArray(recs) ? recs.length : 0);
    }, 0);

    return NextResponse.json({
      overview: {
        total_conversations:   totalConversations ?? 0,
        total_messages:        totalMessages ?? 0,
        total_recommendations: totalRecommendations,
        total_escalations:     escalations ?? 0,
        avg_satisfaction:      avgSatisfaction ? Number(avgSatisfaction.toFixed(2)) : null,
        avg_confidence:        avgConfidence ? Number(avgConfidence.toFixed(1)) : null,
        escalation_rate:       totalConversations
          ? Number(((escalations ?? 0) / totalConversations * 100).toFixed(1))
          : 0,
      },
      topics_breakdown:  topics,
      recent_conversations: recentConvs ?? [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
