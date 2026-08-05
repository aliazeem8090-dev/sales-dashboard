import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireManager } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  const auth = await requireManager(request);
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: 401 });

  const body = await request.json();
  const { name, email, password, role, companyId } = body || {};
  if (!name || !email || !password || !role) {
    return NextResponse.json({ message: 'name, email, password, and role are required.' }, { status: 400 });
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });
  if (createErr || !created?.user) {
    return NextResponse.json({ message: createErr?.message || 'Failed to create user.' }, { status: 400 });
  }

  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id: created.user.id,
    name,
    email,
    role,
    companyId: companyId || auth.profile.companyId || null,
    activeStatus: true,
  });
  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ message: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: created.user.id, name, email, role, companyId: companyId || auth.profile.companyId || null });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireManager(request);
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id is required.' }, { status: 400 });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
