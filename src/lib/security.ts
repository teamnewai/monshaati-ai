import { createAdminSupabaseClient } from '@/lib/supabase-server';

export type SecurityEventType =
  | 'rate_limit_exceeded'
  | 'export_download'
  | 'suspicious_request'
  | 'auth_failure'
  | 'api_abuse'
  | 'bot_detected'
  | 'invalid_token'
  | 'mass_download';

interface SecurityEvent {
  event_type:   SecurityEventType;
  user_id?:     string | null;
  org_id?:      string | null;
  ip?:          string;
  user_agent?:  string;
  path?:        string;
  metadata?:    Record<string, unknown>;
  severity:     'low' | 'medium' | 'high' | 'critical';
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const admin = await createAdminSupabaseClient();
    await admin.from('audit_log').insert({
      user_id:     event.user_id ?? null,
      action:      event.event_type,
      entity_type: 'security',
      entity_id:   null,
      new_data: {
        org_id:     event.org_id ?? null,
        ip:         event.ip,
        user_agent: event.user_agent,
        path:       event.path,
        severity:   event.severity,
        ...event.metadata,
      },
    });
  } catch {
    // Never block request due to logging failure
    console.error('[security] Failed to log security event:', event.event_type);
  }
}

export async function logExportDownload(params: {
  user_id:       string;
  org_id:        string;
  generation_id: string;
  format:        string;
  export_id:     string;
  ip?:           string;
  sections?:     string[];
}): Promise<void> {
  try {
    const admin = await createAdminSupabaseClient();
    await admin.from('audit_log').insert({
      user_id:     params.user_id,
      action:      'export_download',
      entity_type: 'exports',
      entity_id:   params.generation_id,
      new_data: {
        org_id:       params.org_id,
        format:       params.format,
        export_id:    params.export_id,
        sections:     params.sections ?? [],
        ip:           params.ip ?? null,
        downloaded_at: new Date().toISOString(),
      },
    });
  } catch {
    console.error('[security] Export log failed');
  }
}

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  const botPatterns = /bot|crawler|spider|scraper|headless|phantom|selenium|puppeteer|playwright|curl|wget|python-requests|java|go-http/i;
  return botPatterns.test(userAgent);
}

export function isSuspiciousRequest(req: {
  userAgent: string | null;
  referer:   string | null;
  path:      string;
}): boolean {
  if (isBot(req.userAgent)) return true;
  // Requests to API without proper referer (direct API scraping)
  if (req.path.startsWith('/api/') && !req.referer && !req.userAgent?.includes('monshaati')) {
    return false; // Normal (mobile apps, etc.) — don't flag
  }
  return false;
}

export function getClientIP(request: { headers: { get(name: string): string | null } }): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
