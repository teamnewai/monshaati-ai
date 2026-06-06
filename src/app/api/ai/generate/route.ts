import { rateLimit, LIMITS, rateLimitHeaders } from '@/lib/rate-limit';
import { logSecurityEvent, getClientIP } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { generateOrgSystem } from '@/lib/openai';
import { canGenerateAI, incrementGenerationUsage } from '@/lib/subscription';
import { sendAIGenerationCompletedEmail } from '@/lib/email';
import { checkTrialCanGenerate, incrementTrialGeneration } from '@/lib/trial';
import type { GenerationInput } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    // Rate limiting — 10 generations per hour per user
    const rl = rateLimit({ key: `ai:generate:${user.id}`, ...LIMITS.AI_GENERATE });
    if (!rl.allowed) {
      await logSecurityEvent({
        event_type: 'rate_limit_exceeded',
        user_id: user.id,
        path: '/api/ai/generate',
        severity: 'medium',
        ip: getClientIP(request),
        metadata: { limit: LIMITS.AI_GENERATE.limit, window: LIMITS.AI_GENERATE.windowSecs },
      });
      return NextResponse.json(
        { error: 'تجاوزت الحد المسموح. حاول مرة أخرى بعد ساعة.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }
    const body = await request.json() as { org_id: string; input: GenerationInput };
    const { org_id, input } = body;

    if (!org_id || !input?.org_name) {
      return NextResponse.json({ error: 'Missing org_id or input' }, { status: 400 });
    }

    // Verify org ownership
    const { data: org } = await supabase
      .from('organizations')
      .select('id, owner_id, tenant_id')
      .eq('id', org_id)
      .single();

    if (!org || (org as Record<string,unknown>).owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Tenant isolation: check if tenant allows ai_generate feature
    const tenantId = (org as Record<string,unknown>).tenant_id as string | null;
    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('is_active, features_enabled, max_gens_per_month, suspended_at')
        .eq('id', tenantId)
        .single();
      const t = tenant as Record<string,unknown> | null;
      if (!t || !t.is_active || t.suspended_at) {
        return NextResponse.json({ error: 'tenant_suspended', message: 'حساب المنصة موقوف. تواصل مع المزود.' }, { status: 403 });
      }
      const features = t.features_enabled as string[] | null;
      if (features && !features.includes('ai_generate')) {
        return NextResponse.json({ error: 'feature_disabled', message: 'ميزة التوليد غير مفعّلة في هذه المنصة.' }, { status: 403 });
      }
    }

    // Check trial or subscription limits
    const usageCheck = await canGenerateAI(org_id);
    if (usageCheck.plan === 'free_trial') {
      const trialCheck = await checkTrialCanGenerate(org_id);
      if (!trialCheck.allowed) {
        return NextResponse.json({
          error: trialCheck.reason === 'trial_expired' ? 'trial_expired' : 'trial_limit_reached',
          message: trialCheck.reason === 'trial_expired'
            ? 'انتهت فترة التجربة المجانية. يرجى الاشتراك لمواصلة الاستخدام.'
            : `وصلت للحد المجاني (${trialCheck.trial.generations_used}/3). اشترك للحصول على المزيد.`,
          trial: trialCheck.trial,
          upgrade_url: '/pricing',
        }, { status: 402 });
      }
    } else if (!usageCheck.allowed) {
      if (usageCheck.reason === 'generation_limit_reached') {
        return NextResponse.json({
          error: 'generation_limit_reached',
          message: `لقد وصلت للحد الأقصى (${usageCheck.limit} توليدات) في الباقة الحالية. يرجى الترقية لمواصلة الاستخدام.`,
          plan:  usageCheck.plan,
          used:  usageCheck.used,
          limit: usageCheck.limit,
          upgrade_url: '/billing',
        }, { status: 402 });
      }
      return NextResponse.json({
        error: 'subscription_inactive',
        message: 'اشتراكك غير نشط. يرجى تجديد الاشتراك.',
        upgrade_url: '/billing',
      }, { status: 402 });
    }

    // Mark previous generations as not current
    await supabase
      .from('ai_generations')
      .update({ is_current: false })
      .eq('org_id', org_id);

    // Create generation record
    const { data: generation, error: genErr } = await supabase
      .from('ai_generations')
      .insert({
        org_id,
        created_by:  user.id,
        status:      'generating',
        input_data:  input,
        model_used:  'gpt-4o',
        language:    input.language ?? 'ar',
      })
      .select()
      .single();

    if (genErr || !generation) {
      return NextResponse.json({ error: 'Failed to create generation record' }, { status: 500 });
    }

    try {
      const { result, usage, timeMs } = await generateOrgSystem(input);

      // ── org_chart_nodes ───────────────────────────────────────
      const nodeIdMap: Record<string, string> = {};

      if (result.org_chart?.length) {
        const sorted = [...result.org_chart].sort((a, b) => a.level - b.level);
        for (const node of sorted) {
          const parentDbId = node.parent_temp_id ? nodeIdMap[node.parent_temp_id] : null;
          const { data: dbNode } = await supabase
            .from('org_chart_nodes')
            .insert({
              generation_id:  generation.id,
              org_id,
              parent_id:      parentDbId ?? null,
              title_ar:       node.title_ar,
              title_en:       node.title_en ?? null,
              department_ar:  node.department_ar ?? null,
              level:          node.level,
              position_order: node.position_order ?? 0,
              head_count:     node.head_count ?? 1,
              is_key_role:    node.is_key_role ?? false,
            })
            .select('id')
            .single();

          if (dbNode?.id && node.temp_id) {
            nodeIdMap[node.temp_id] = dbNode.id as string;
          }
        }
      }

      // ── job_descriptions ─────────────────────────────────────
      if (result.job_descriptions?.length) {
        await supabase.from('job_descriptions').insert(
          result.job_descriptions.map(jd => ({
            generation_id:    generation.id,
            org_id,
            title_ar:         jd.title_ar,
            title_en:         jd.title_en ?? null,
            department_ar:    jd.department_ar ?? null,
            reports_to_ar:    jd.reports_to_ar ?? null,
            summary_ar:       jd.summary_ar ?? null,
            responsibilities: jd.responsibilities ?? [],
            requirements:     jd.requirements ?? [],
            competencies:     jd.competencies ?? [],
            authorities:      jd.authorities ?? [],
            salary_min:       jd.salary_min ?? null,
            salary_max:       jd.salary_max ?? null,
            currency:         jd.currency ?? 'SAR',
            experience_years: jd.experience_years ?? null,
            education_level:  jd.education_level ?? null,
          }))
        );
      }

      // ── policies ─────────────────────────────────────────────
      if (result.policies?.length) {
        await supabase.from('policies').insert(
          result.policies.map(p => ({
            generation_id: generation.id,
            org_id,
            category:      p.category,
            title_ar:      p.title_ar,
            title_en:      p.title_en ?? null,
            content_ar:    p.content_ar,
          }))
        );
      }

      // ── kpis ─────────────────────────────────────────────────
      if (result.kpis?.length) {
        await supabase.from('kpis').insert(
          result.kpis.map(k => ({
            generation_id:  generation.id,
            org_id,
            department_ar:  k.department_ar ?? null,
            name_ar:        k.name_ar,
            name_en:        k.name_en ?? null,
            description_ar: k.description_ar ?? null,
            category:       k.category ?? null,
            target_value:   k.target_value ?? null,
            unit:           k.unit ?? null,
            frequency:      k.frequency ?? 'monthly',
            direction:      k.direction ?? 'increase',
          }))
        );
      }

      // ── hiring_plan ───────────────────────────────────────────
      if (result.hiring_plan?.length) {
        await supabase.from('hiring_plan').insert(
          result.hiring_plan.map(h => ({
            generation_id:   generation.id,
            org_id,
            phase:           h.phase ?? null,
            phase_order:     h.phase_order ?? 1,
            role_ar:         h.role_ar,
            role_en:         h.role_en ?? null,
            department_ar:   h.department_ar ?? null,
            priority:        h.priority ?? 'medium',
            timeline:        h.timeline ?? null,
            timeline_months: h.timeline_months ?? null,
            salary_min:      h.salary_min ?? null,
            salary_max:      h.salary_max ?? null,
            currency:        h.currency ?? 'SAR',
            requirements:    h.requirements ?? [],
          }))
        );
      }

      // ── update generation ─────────────────────────────────────
      await supabase
        .from('ai_generations')
        .update({
          status:             'completed',
          result_data:        result,
          prompt_tokens:      usage?.prompt_tokens ?? null,
          completion_tokens:  usage?.completion_tokens ?? null,
          total_tokens:       usage?.total_tokens ?? null,
          generation_time_ms: timeMs,
          completed_at:       new Date().toISOString(),
        })
        .eq('id', generation.id);

      // ── audit ─────────────────────────────────────────────────
      await supabase.from('audit_log').insert({
        org_id,
        user_id:     user.id,
        action:      'generation_completed',
        entity_type: 'ai_generations',
        entity_id:   generation.id,
        new_data:    { tokens: usage?.total_tokens, time_ms: timeMs },
      });

      // Increment usage counter
      await incrementGenerationUsage(org_id);

      // Send completion email (non-blocking)
      try {
        const { data: prof } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();
        const { data: org2 } = await supabase.from('organizations').select('name').eq('id', org_id).single();
        if (prof) {
          const p = prof as Record<string,unknown>;
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://monshaati.ai';
          await sendAIGenerationCompletedEmail({
            to:         p.email as string,
            name:       (p.full_name as string | null) ?? 'عزيزي',
            org_name:   (org2 as Record<string,unknown> | null)?.name as string ?? 'منشأتك',
            result_url: `${appUrl}/results/${generation.id}`,
            sections:   ['org_chart','job_descriptions','policies','kpis','hiring_plan'],
          });
        }
      } catch { /* email optional — never block the main response */ }

      return NextResponse.json({ generation_id: generation.id, success: true });

    } catch (aiError: unknown) {
      const msg = aiError instanceof Error ? aiError.message : 'AI error';
      await supabase
        .from('ai_generations')
        .update({ status: 'failed', error_message: msg })
        .eq('id', generation.id);
      throw aiError;
    }

  } catch (err: unknown) {
    console.error('[generate]', err);
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
