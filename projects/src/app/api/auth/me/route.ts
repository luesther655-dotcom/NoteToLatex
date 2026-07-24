import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient(token);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
