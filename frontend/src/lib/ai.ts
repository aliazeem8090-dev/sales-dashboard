import { supabase } from './supabase';

export async function invokeAi<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('ai', { body });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('AI function returned no data.');
  return data;
}
