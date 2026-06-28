import { NextResponse } from 'next/server';
import { db } from '../../../../../../db';
import { getUserFromRequest } from '@/lib/auth';

async function ownProject(user: any, id: string) {
  const p = await db().getProject(id);
  return p && p.org_id === user.org_id ? p : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

    if (!(await ownProject(user, id))) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({ templates: await db().listTemplates(id) }, { status: 200 });
  } catch (error) {
    console.error('List templates error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const p = await db().getProject(id);
    if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const user = await getUserFromRequest(req);
    // Optional auth logic from server.js
    if (user && user.role !== 'designer') return NextResponse.json({ error: 'Лише дизайнер створює шаблони' }, { status: 403 });
    if (user && p.org_id !== user.org_id) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const body = await req.json();
    if (!body.name || !Array.isArray(body.formats) || !body.formats.length) {
      return NextResponse.json({ error: 'Вкажи назву і хоча б один формат' }, { status: 400 });
    }

    const slots = body.slots || {};
    if (body.layout) slots.layout = body.layout;

    const t = await db().createTemplate({
      projectId: p.id,
      name: body.name.trim(),
      formats: body.formats,
      brand: body.brand || {},
      slots,
      createdBy: user ? user.id : p.created_by
    });

    return NextResponse.json({ template: t }, { status: 200 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
