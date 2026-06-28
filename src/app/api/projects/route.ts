import { NextResponse } from 'next/server';
import { db } from '../../../../db';
import { getUserFromRequest } from '@/lib/auth';
import { optionsResponse, withCors } from '@/lib/cors';

export async function OPTIONS() { return optionsResponse(); }

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

    const projects = await db().listProjects(user.org_id);
    const list = [];
    for (const p of projects) {
      const templates = await db().listTemplates(p.id);
      const designs = await db().listDesigns(p.id);
      list.push({ ...p, templates: templates.length, designs: designs.length });
    }
    
    return withCors(NextResponse.json({ projects: list }, { status: 200 }));
  } catch (error) {
    console.error('List projects error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
    if (user.role !== 'designer') {
      return NextResponse.json({ error: 'Лише дизайнер може створювати проєкти' }, { status: 403 });
    }

    const body = await req.json();
    const name = (body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Вкажи назву' }, { status: 400 });

    const hues = ['linear-gradient(135deg,#2D1B3D,#7A5C8E)', 'linear-gradient(135deg,#0f5e7a,#2bb5c9)', 'linear-gradient(135deg,#6d5ef6,#9b8cff)', 'linear-gradient(135deg,#e0588a,#ffb199)', 'linear-gradient(135deg,#16a34a,#7ee2a8)'];
    const projectsList = await db().listProjects(user.org_id);
    const n = projectsList.length;
    
    const project = await db().createProject({ 
      orgId: user.org_id, 
      name, 
      hue: hues[n % hues.length], 
      createdBy: user.id 
    });
    
    return withCors(NextResponse.json({ project }, { status: 200 }));
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
