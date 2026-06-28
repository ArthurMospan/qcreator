import { NextResponse } from 'next/server';
import { db } from '../../../../../db';
import { getUserFromRequest } from '@/lib/auth';

async function ownProject(user: any, id: string) {
  const p = await db().getProject(id);
  return p && p.org_id === user.org_id ? p : null;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
    if (user.role !== 'designer') return NextResponse.json({ error: 'Лише дизайнер' }, { status: 403 });

    const t = await db().getTemplate(id);
    if (!t || !(await ownProject(user, t.project_id))) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const body = await req.json();
    const slots = body.slots ?? t.slots;
    if (body.layout) slots.layout = body.layout;

    const updated = await db().updateTemplate(t.id, {
      name: body.name ?? t.name,
      formats: body.formats ?? t.formats,
      brand: body.brand ?? t.brand,
      slots
    });

    return NextResponse.json({ template: updated }, { status: 200 });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
    if (user.role !== 'designer') return NextResponse.json({ error: 'Лише дизайнер' }, { status: 403 });

    const t = await db().getTemplate(id);
    if (!t || !(await ownProject(user, t.project_id))) return NextResponse.json({ error: 'not found' }, { status: 404 });

    await db().deleteTemplate(t.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
