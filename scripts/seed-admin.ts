import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env['VITE_SUPABASE_URL'] ?? '';
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seed() {
  const email = process.argv[2] ?? 'admin@yourdomain.com';
  const password = process.argv[3] ?? 'Admin@123456';
  const fullName = process.argv[4] ?? 'Super Admin';

  console.log(`Seeding admin: ${email}`);

  // Check if super_admin role exists, create if not
  let { data: role } = await supabase
    .from('admin_roles')
    .select('id')
    .eq('name', 'super_admin')
    .single();

  if (!role) {
    console.log('Creating super_admin role...');
    const { data: newRole, error: roleErr } = await supabase.from('admin_roles').insert({
      name: 'super_admin',
      description: 'Full access to all admin features',
      can_view_users: true,
      can_suspend_users: true,
      can_delete_users: true,
      can_change_user_plan: true,
      can_add_credits: true,
      can_view_payments: true,
      can_issue_refunds: true,
      can_manage_plans: true,
      can_view_jobs: true,
      can_kill_jobs: true,
      can_manage_api_keys: true,
      can_edit_settings: true,
      can_manage_announcements: true,
      can_manage_ip_blocklist: true,
      can_manage_admins: true,
      can_view_audit_log: true,
    }).select('id').single();

    if (roleErr) { console.error('Failed to create role:', roleErr.message); process.exit(1); }
    role = newRole!;
    console.log(`Created super_admin role: ${role.id}`);
  } else {
    console.log(`Found existing super_admin role: ${role.id}`);
  }

  // Check if admin already exists
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .single();

  const password_hash = await bcrypt.hash(password, 12);

  if (existing) {
    // Update existing admin
    const { error } = await supabase.from('admin_users').update({ password_hash, role_id: role.id, is_active: true }).eq('id', existing.id);
    if (error) { console.error('Failed to update admin:', error.message); process.exit(1); }
    console.log(`Updated existing admin: ${email}`);
  } else {
    // Create new admin
    const { data: newAdmin, error } = await supabase.from('admin_users').insert({
      email,
      full_name: fullName,
      password_hash,
      role_id: role.id,
      is_active: true,
      is_2fa_enabled: false,
    }).select('id').single();

    if (error) { console.error('Failed to create admin:', error.message); process.exit(1); }
    console.log(`Created admin user: ${newAdmin?.id}`);
  }

  console.log(`\n✅ Admin ready!`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`\n⚠️  Please change the password after first login!`);
}

seed().catch(err => { console.error(err); process.exit(1); });
