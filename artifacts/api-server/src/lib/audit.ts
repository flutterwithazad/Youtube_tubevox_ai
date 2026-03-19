import { createSupabaseAdmin } from './supabase-admin.js';

export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  beforeValue?: object;
  afterValue?: object;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from('admin_audit_log').insert({
      admin_id: params.adminId,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      before_value: params.beforeValue ?? {},
      after_value: params.afterValue ?? {},
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      notes: params.notes ?? null,
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}
