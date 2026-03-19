import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { lessonId?: string; useTicket?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { lessonId, useTicket } = body;
  if (!lessonId) return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 });

  const { data: lesson } = await supabase.from('lessons').select('student_id, status, extended_count').eq('id', lessonId).single();
  if (!lesson || lesson.student_id !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (lesson.status !== 'active') return NextResponse.json({ error: 'Lesson not active' }, { status: 400 });

  if (useTicket) {
    const { data: profile } = await supabase.from('profiles').select('ticket_count').eq('id', session.user.id).single();
    if (!profile || profile.ticket_count <= 0) return NextResponse.json({ error: 'No tickets' }, { status: 402 });
    await supabase.from('profiles').update({ ticket_count: profile.ticket_count - 1 }).eq('id', session.user.id);
  }

  await supabase.from('lessons').update({ extended_count: (lesson.extended_count ?? 0) + 1 }).eq('id', lessonId);

  return NextResponse.json({ success: true });
}
