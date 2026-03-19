'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import type { Profile } from '@/types/database';

interface Props {
  lessonId: string;
  tutor: Partial<Profile>;
  onClose: () => void;
  onSubmit?: () => void;
}

const RATING_LABELS = ['', '非常に悪い', '悪い', '普通', '良い', '非常に良い'];

export default function RatingModal({ lessonId, tutor, onClose, onSubmit }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit() {
    if (rating === 0) { toast.error('評価を選択してください'); return; }
    setLoading(true);
    try {
      await supabase.from('lessons').update({
        tutor_rating: rating,
        rating_comment: comment.trim() || null,
      }).eq('id', lessonId);
      // Update tutor avg rating
      const { data: ratings } = await supabase.from('lessons').select('tutor_rating').eq('tutor_id', tutor.id ?? '').not('tutor_rating', 'is', null);
      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((s, r) => s + (r.tutor_rating ?? 0), 0) / ratings.length;
        await supabase.from('profiles').update({ avg_rating: avg, rating_count: ratings.length }).eq('id', tutor.id ?? '');
      }
      toast.success('評価を送信しました！');
      onSubmit?.();
      onClose();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : '送信に失敗しました'); }
    finally { setLoading(false); }
  }

  const display = hovered || rating;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[--surface] border border-[--border2] rounded-[20px] p-7 w-full max-w-[400px] shadow-2xl">
        {/* Tutor */}
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[--border]">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
            {tutor.display_name?.[0] ?? '?'}
          </div>
          <div>
            <div className="font-semibold">{tutor.display_name}</div>
            <div className="text-xs text-[--text3]">授業お疲れ様でした！評価をお願いします</div>
          </div>
        </div>

        {/* Stars */}
        <div className="text-center mb-5">
          <div className="flex justify-center gap-2 mb-2">
            {[1,2,3,4,5].map(n => (
              <button key={n}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                className="border-none bg-transparent cursor-pointer transition-transform hover:scale-110 active:scale-95 p-0.5">
                <Star size={36} className={n <= display ? 'text-amber-400 fill-amber-400' : 'text-[--border2]'} />
              </button>
            ))}
          </div>
          <div className={`text-sm font-medium transition-all ${display ? 'text-amber-600' : 'text-[--text3]'}`}>
            {display ? RATING_LABELS[display] : '星をタップして評価'}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-5">
          <label className="block text-xs font-medium mb-2">コメント（任意）</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
            className="w-full bg-[--surface2] border border-[--border] rounded-[10px] px-3.5 py-3 text-sm text-[--text] outline-none resize-none focus:border-[--blue] transition-colors"
            placeholder="授業の感想、改善点などをお書きください" maxLength={300} />
          <div className="text-right text-[11px] text-[--text3] mt-1">{comment.length}/300</div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 border border-[--border2] text-[--text2] bg-transparent rounded-[10px] py-3 text-sm cursor-pointer hover:bg-[--surface2] transition-colors">
            後で評価
          </button>
          <button onClick={handleSubmit} disabled={loading || rating === 0}
            className="flex-1 bg-[--blue] text-white border-none rounded-[10px] py-3 text-sm font-semibold cursor-pointer disabled:opacity-50 hover:opacity-90 transition-opacity">
            {loading ? '送信中...' : '評価を送信'}
          </button>
        </div>
      </div>
    </div>
  );
}
