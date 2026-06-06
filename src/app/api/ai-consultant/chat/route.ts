import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createAdminSupabaseClient } from '@/lib/supabase-server';
import { rateLimit, LIMITS, rateLimitHeaders } from '@/lib/rate-limit';
import { getClientIP } from '@/lib/security';
import {
  loadOrgContext,
  buildSystemPrompt,
  detectTopic,
  requiresDisclaimer,
  runAIConsultant,
} from '@/lib/ai-consultant';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    // Rate limiting — 30 AI consultant messages per hour
    const rl = rateLimit({ key: `ai:consultant:${user.id}`, ...LIMITS.AI_CONSULTANT });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'تجاوزت حد الرسائل. حاول مرة أخرى بعد ساعة.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const {
      conversation_id,
      org_id,
      message,
      history = [],
    } = await request.json() as {
      conversation_id: string;
      org_id:          string;
      message:         string;
      history?:        { role: 'user' | 'assistant'; content: string }[];
    };

    // Validate conversation ownership
    const { data: conv } = await supabase
      .from('consultant_conversations')
      .select('id, org_id, disclaimer_accepted, status, messages_count, topic')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    const c = conv as Record<string, unknown>;
    if (c.status === 'closed') return NextResponse.json({ error: 'Conversation is closed' }, { status: 400 });

    // Detect topic
    const topic = detectTopic(message);
    const needsDisclaimer = requiresDisclaimer(topic, message);

    // Check disclaimer for sensitive topics
    if (needsDisclaimer && !c.disclaimer_accepted) {
      return NextResponse.json({
        error:            'disclaimer_required',
        requires_disclaimer: true,
        disclaimer_topics:   [topic],
        message:          'يجب قبول إخلاء المسؤولية قبل الاستمرار في هذا النوع من الاستشارات.',
      }, { status: 402 });
    }

    // Save user message
    await supabase.from('consultant_messages').insert({
      conversation_id,
      role:    'user',
      content: message,
      topic,
    });

    // Load full org context (cached by loading once)
    const ctx      = await loadOrgContext(org_id);
    const sysPrompt = buildSystemPrompt(ctx);

    // Find relevant human consultants for potential escalation
    const { data: humanConsultants } = await supabase
      .from('consultant_profiles')
      .select('id, display_name_ar, display_name, specializations, price_60min_sar, avg_rating')
      .eq('status', 'active')
      .order('avg_rating', { ascending: false })
      .limit(3);

    // Build conversation history for context
    const fullHistory: { role: 'user' | 'assistant'; content: string }[] = [
      ...history.slice(-10), // Keep last 10 exchanges for context window
      { role: 'user', content: message },
    ];

    // Run AI
    const aiResult = await runAIConsultant({
      messages:   fullHistory,
      systemPrompt: sysPrompt,
      topic,
    });

    // Enrich suggested consultants with actual DB data
    let suggestedConsultants = aiResult.suggested_consultants;
    if (aiResult.escalation_suggested && humanConsultants?.length) {
      suggestedConsultants = (humanConsultants ?? []).slice(0, 2).map((hc: Record<string, unknown>) => ({
        id:              hc.id,
        name:            hc.display_name_ar ?? hc.display_name,
        specialization:  ((hc.specializations as string[]) ?? [])[0] ?? 'استشارات إدارية',
        reason:          aiResult.escalation_reason ?? 'هذه الاستشارة تستدعي خبرة متخصصة',
        price_60min_sar: hc.price_60min_sar,
        rating:          hc.avg_rating,
      }));
    }

    // Save assistant message with all metadata
    const admin = await createAdminSupabaseClient();
    const { data: savedMsg } = await admin.from('consultant_messages').insert({
      conversation_id,
      role:                 'assistant',
      content:              aiResult.content,
      topic,
      confidence_score:     aiResult.confidence_score,
      risk_level:           aiResult.risk_level,
      impact_level:         aiResult.impact_level,
      recommendations:      aiResult.recommendations,
      data_sources:         aiResult.data_sources,
      escalation_suggested: aiResult.escalation_suggested,
      suggested_consultants: suggestedConsultants,
      disclaimer_shown:     needsDisclaimer,
      input_tokens:         aiResult.input_tokens,
      output_tokens:        aiResult.output_tokens,
    }).select().single();

    // Update conversation topic if first message
    if ((c.messages_count as number) === 0) {
      await admin.from('consultant_conversations').update({
        topic,
        title: message.slice(0, 80),
        total_tokens: aiResult.input_tokens + aiResult.output_tokens,
      }).eq('id', conversation_id);
    } else {
      // Accumulate tokens
      await admin.from('consultant_conversations').update({
        total_tokens: (c.total_tokens as number ?? 0) + aiResult.input_tokens + aiResult.output_tokens,
      }).eq('id', conversation_id);
    }

    // Update escalation if needed
    if (aiResult.escalation_suggested) {
      await admin.from('consultant_conversations').update({
        status:            'escalated',
        escalation_reason: aiResult.escalation_reason,
        escalated_at:      new Date().toISOString(),
      }).eq('id', conversation_id);
    }

    return NextResponse.json({
      message:  savedMsg,
      response: {
        content:              aiResult.content,
        confidence_score:     aiResult.confidence_score,
        risk_level:           aiResult.risk_level,
        impact_level:         aiResult.impact_level,
        recommendations:      aiResult.recommendations,
        data_sources:         aiResult.data_sources,
        escalation_suggested: aiResult.escalation_suggested,
        escalation_reason:    aiResult.escalation_reason,
        suggested_consultants: suggestedConsultants,
        requires_disclaimer:  aiResult.requires_disclaimer,
        topic,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return NextResponse.json({ error: msg }, { status: msg === 'UNAUTHORIZED' ? 401 : 500 });
  }
}
