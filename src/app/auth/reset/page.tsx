'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/settings`,
    });
    if (error) { toast.error(error.message); } else { setSent(true); }
    setLoading(false);
  }
  return (
    <div className="min-h-screen bg-[--bg] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/auth/login" className="text-[--blue] no-underline text-sm font-medium">← ログインへ戻る</Link>
        <h1 className="text-2xl font-bold mt-6 mb-2">パスワードをリセット</h1>
        <p className="text-sm text-[--text2] mb-6">登録済みのメールアドレスにリセットリンクを送信します。</p>
        {sent ? (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-[12px] text-sm leading-relaxed">
            ✉️ {email} にリセットリンクを送信しました。メールをご確認ください。
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">メールアドレス</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="your@email.com" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[--blue] text-white border-none rounded-[10px] py-3 text-sm font-semibold cursor-pointer disabled:opacity-50">
              {loading ? '送信中...' : 'リセットリンクを送信'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
