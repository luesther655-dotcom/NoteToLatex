import { getSupabaseClient } from '../lib/supabase-client';
import type { ConversionHistory, InsertConversionHistory } from '../storage/database/shared/schema';

export async function createConversionHistory(
  data: Omit<InsertConversionHistory, 'id' | 'created_at' | 'updated_at'>,
  token?: string
): Promise<ConversionHistory | null> {
  const supabase = getSupabaseClient(token);
  const { data: result, error } = await supabase
    .from('conversion_history')
    .insert({
      user_id: data.user_id,
      title: data.title,
      source_image_url: data.source_image_url,
      markdown_content: data.markdown_content,
      latex_content: data.latex_content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversion history:', error);
    return null;
  }

  return result as ConversionHistory;
}

export async function getConversionHistories(
  userId: string,
  token?: string
): Promise<ConversionHistory[]> {
  const supabase = getSupabaseClient(token);
  const { data, error } = await supabase
    .from('conversion_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching conversion histories:', error);
    return [];
  }

  return (data as ConversionHistory[]) || [];
}

export async function getConversionHistoryById(
  id: string,
  userId: string,
  token?: string
): Promise<ConversionHistory | null> {
  const supabase = getSupabaseClient(token);
  const { data, error } = await supabase
    .from('conversion_history')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching conversion history:', error);
    return null;
  }

  return data as ConversionHistory;
}

export async function updateConversionHistory(
  id: string,
  userId: string,
  updates: Partial<Pick<InsertConversionHistory, 'title' | 'source_image_url' | 'markdown_content' | 'latex_content'>>,
  token?: string
): Promise<ConversionHistory | null> {
  const supabase = getSupabaseClient(token);
  const { data, error } = await supabase
    .from('conversion_history')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating conversion history:', error);
    return null;
  }

  return data as ConversionHistory;
}

export async function deleteConversionHistory(
  id: string,
  userId: string,
  token?: string
): Promise<boolean> {
  const supabase = getSupabaseClient(token);
  const { error } = await supabase
    .from('conversion_history')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting conversion history:', error);
    return false;
  }

  return true;
}
