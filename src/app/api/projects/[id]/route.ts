import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

    const p = await db().getProject(id);
    if (!p || p.org_id !== user.org_id) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return NextResponse.json({ project: p }, { status: 200 });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
    if (user.role !== 'designer') return NextResponse.json({ error: 'Лише дизайнер' }, { status: 403 });

    const p = await db().getProject(id);
    if (!p || p.org_id !== user.org_id) return NextResponse.json({ error: 'not found' }, { status: 404 });

    await db().deleteProject(p.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
