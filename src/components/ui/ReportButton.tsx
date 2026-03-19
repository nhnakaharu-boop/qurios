'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Flag, X } from 'lucide-react';

const REPORT_REASONS = [
  '授業内での不適切な発言',
  '課題外の内容への誘導',
  'プラットフォーム外への引き抜き',
  '嫌がらせ・ハラスメント',
  '不正行為・詐欺的行為',
  '公序良俗に反するコンテンツ',
  'その他',
];

interface Props {
  reportedUserId: string;
  reportedUserName?: string;
  lessonId?: string;
  size?: 'sm' | 'md';
  variant?: 'icon' | 'text';
}

export default function ReportButton({ reportedUserId, reportedUserName, lessonId, size = 'sm', variant = 'icon' }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleReport() {
    if (!reason) { toast.error('通報理由を選択してください'); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('ログインが必要です'); return; }
      await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        lesson_id: lessonId ?? null,
        reason,
        detail: detail.trim(),
        status: 'pending',
      });
      toast.success('通報を受け付けました。運営が確認します。');
      setOpen(false); setReason(''); setDetail('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '通報に失敗しました');
    } finally { setLoading(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="このユーザーを通報"
        className={`flex items-center gap-1 text-[--text3] hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer ${size === 'sm' ? 'text-xs py-1 px-2' : 'text-sm py-1.5 px-3'}`}
      >
        <Flag size={size === 'sm' ? 11 : 14} />
        {variant === 'text' && '通報'}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-[--surface] border border-[--border2] rounded-[18px] p-6 w-full max-w-[400px] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold">通報</h3>
                {reportedUserName && <p className="text-xs text-[--text3] mt-0.5">{reportedUserName}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="border-none bg-transparent cursor-pointer text-[--text3] hover:text-[--text]"><X size={18} /></button>
            </div>
            <p className="text-xs text-[--text2] mb-4 leading-relaxed bg-red-50 border border-red-100 rounded-[8px] p-3">
              ⚠️ 虚偽の通報は規約違反となります。事実に基づいた通報のみ送信してください。
            </p>
            <div className="mb-3">
              <label className="block text-xs font-medium mb-2">通報理由 <span className="text-red-500">*</span></label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map(r => (
                  <label key={r} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-[8px] hover:bg-[--surface2] transition-colors">
                    <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-red-500" />
                    <span className="text-sm">{r}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5">詳細（任意）</label>
              <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3}
                className="w-full bg-[--surface2] border border-[--border] rounded-[10px] px-3 py-2.5 text-sm text-[--text] outline-none resize-none focus:border-red-400"
                placeholder="具体的な状況を教えてください" maxLength={500} />
              <div className="text-right text-[11px] text-[--text3] mt-1">{detail.length}/500</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 bg-transparent border border-[--border2] text-[--text2] rounded-[9px] py-2.5 text-sm cursor-pointer">キャンセル</button>
              <button onClick={handleReport} disabled={loading || !reason}
                className="flex-1 bg-red-600 text-white border-none rounded-[9px] py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50 hover:bg-red-700 transition-colors">
                {loading ? '送信中...' : '通報する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
