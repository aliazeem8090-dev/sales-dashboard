import { createClient } from '@supabase/supabase-js';

// Server-only. Never import this from a Client Component — it holds the secret key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function requireManager(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'Missing authorization header.' as const };

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return { error: 'Invalid or expired session.' as const };

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id,role,companyId')
    .eq('id', userData.user.id)
    .single();
  if (profileErr || !profile) return { error: 'Profile not found.' as const };
  if (profile.role !== 'MANAGER' && profile.role !== 'ADMIN') return { error: 'Forbidden.' as const };

  return { profile };
}
