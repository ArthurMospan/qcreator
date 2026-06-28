import { NextResponse } from 'next/server';
import { getUserFromRequest, publicUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
    }
    
    return NextResponse.json({ user: publicUser(user) }, { status: 200 });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
