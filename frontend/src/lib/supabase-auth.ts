import { supabase } from './supabase';
import type { AuthResponse, AuthUser } from './auth';

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: AuthUser['role'];
  companyId: string | null;
  assignedProfileId: string | null;
  activeStatus: boolean | null;
  repId?: string | null;
  agentId?: string | null;
  freelancerAgentId?: string | null;
};

function profileToAuthUser(profile: ProfileRow): AuthUser {
  return {
    id: profile.id,
    name: profile.name || profile.email || 'User',
    email: profile.email || '',
    role: profile.role,
    companyId: profile.companyId || null,
    assignedProfileId: profile.assignedProfileId || undefined,
    repId: profile.repId || null,
    agentId: profile.agentId || null,
    freelancerAgentId: profile.freelancerAgentId || null,
  };
}

export async function getProfileUser(userId: string): Promise<AuthUser> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,name,email,role,companyId,assignedProfileId,activeStatus,repId,agentId,freelancerAgentId')
    .eq('id', userId)
    .single<ProfileRow>();

  if (error) throw new Error(error.message);
  return profileToAuthUser(profile);
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session || !data.user) throw new Error('Supabase did not return a session.');

  const user = await getProfileUser(data.user.id);
  return {
    access_token: data.session.access_token,
    user,
  };
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  role: AuthUser['role'] = 'REP',
): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Supabase did not return a user.');

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    name,
    email,
    role,
    activeStatus: true,
  });

  if (profileError) throw new Error(profileError.message);

  const user = await getProfileUser(data.user.id);
  return {
    access_token: data.session?.access_token || '',
    user,
  };
}
