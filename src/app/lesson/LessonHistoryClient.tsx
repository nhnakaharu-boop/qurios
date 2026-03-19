'use client';
import Link from 'next/link';
import type { Lesson } from '@/types/database';
import { clsx } from 'clsx';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  completed: { label: '解決済み', cls: 'bg-green-50 text-green-700' },
  active:    { label: '授業中',   cls: 'bg-blue-50 text-blue-700' },
  waiting:   { label: '待機中',   cls: 'bg-amber-50 text-amber-700' },
  cancelled: { label: 'キャンセル', cls: 'bg-gray-100 text-gray-500' },
  matched:   { label: 'マッチ済み', cls: 'bg-blue-50 text-blue-700' },
};
const SUBJECT_LABELS: Record<string, string> = { math:'数学', english:'英語', chemistry:'化学', physics:'物理', biology:'生物', japanese:'国語', social:'社会', info:'情報', other:'その他' };

interface Props { lessons: any[]; userId: string; }

export default function LessonHistoryClient({ lessons, userId }: Props) {
  return (
    <div className="p-7 max-w-[800px]">
      <h1 className="text-[20px] font-bold mb-5 tracking-tight">授業履歴</h1>

      {lessons.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="text-4xl mb-4">📚</div>
          <div className="text-[--text2]">まだ授業がありません</div>
          <Link href="/post" className="inline-block mt-4 btn-primary text-sm py-2.5 px-6 no-underline">課題を投稿する</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[--border]">
                {['科目', '内容', '講師/生徒', '時間', '日時', '状態', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-[--text3] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lessons.map(l => {
                const isStudent = l.student_id === userId;
                const partner = isStudent ? l.tutor : l.student;
                const st = STATUS_MAP[l.status] ?? STATUS_MAP.completed;
                const duration = l.duration_sec ? `${Math.floor(l.duration_sec / 60)}分${l.duration_sec % 60}秒` : '—';
                return (
                  <tr key={l.id} className="border-b border-[--border] last:border-none hover:bg-[--bg] transition-colors">
                    <td className="py-3 px-4 text-sm">{SUBJECT_LABELS[l.subject] ?? l.subject}</td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="text-sm font-medium truncate">{l.content}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[--text2]">{partner?.display_name ?? '—'}</td>
                    <td className="py-3 px-4 text-xs font-mono text-[--text2]">{duration}</td>
                    <td className="py-3 px-4 text-xs text-[--text3]">{new Date(l.created_at).toLocaleDateString('ja')}</td>
                    <td className="py-3 px-4">
                      <span className={clsx('text-[11px] font-medium px-2.5 py-1 rounded-full', st.cls)}>{st.label}</span>
                    </td>
                    <td className="py-3 px-4">
                      {l.status === 'active' && (
                        <Link href={`/lesson/${l.id}`} className="text-xs text-[--blue] font-medium no-underline hover:underline">参加</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
