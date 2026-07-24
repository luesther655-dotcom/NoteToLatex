import { NextResponse } from 'next/server';
import { getSupabaseCredentials } from '@/lib/supabase-client';

export async function GET() {
  try {
    const { url, anonKey } = getSupabaseCredentials();
    return NextResponse.json({ url, anonKey });
  } catch {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 404 }
    );
  }
}