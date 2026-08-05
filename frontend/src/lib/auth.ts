export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'REP' | 'LEAD' | 'LINKEDIN_AGENT' | 'FREELANCER_AGENT';
  companyId?: string | null;
  assignedProfileId?: string;
  repId?: string | null;
  agentId?: string | null;
  freelancerAgentId?: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { signIn } = await import('./supabase-auth');
  const data = await signIn(email, password);
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function register(name: string, email: string, password: string, role = 'REP'): Promise<AuthResponse> {
  const { signUp } = await import('./supabase-auth');
  const data = await signUp(name, email, password, role as AuthUser['role']);
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function logout(): Promise<void> {
  const { supabase } = await import('./supabase');
  await supabase.auth.signOut();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}
