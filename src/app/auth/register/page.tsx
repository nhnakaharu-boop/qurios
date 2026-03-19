'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserCircle } from 'lucide-react';

const GUEST_EMAIL = 'guest@qurio.demo';
const GUEST_PASSWORD = 'GuestDemo2025!';

function pwStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return {
    score: s,
    label: ['', '弱い', '普通', '強い', 'とても強い'][s],
    color: ['', 'bg-red-500', 'bg-amber-500', 'bg-green-500', 'bg-green-600'][s],
  };
}

function isMinor(birth: string) {
  return birth && (Date.now() - new Date(birth).getTime()) / (365.25 * 86400000) < 13;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    lastName: '', firstName: '', email: '', password: '',
    birthDate: '', role: 'student', terms: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const pw = pwStrength(form.password);
  const minor = isMinor(form.birthDate);

  function set(k: string, v: string | boolean) { setForm(p => ({ ...p, [k]: v })); }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.lastName || !form.firstName) { setError('氏名を入力してください'); return; }
    if (!form.email) { setError('メールアドレスを入力してください'); return; }
    if (form.password.length < 8) { setError('パスワードは8文字以上で入力してください'); return; }
    if (!form.birthDate) { setError('生年月日を入力してください'); return; }
    if (!form.terms) { setError('利用規約に同意してください'); return; }

    setLoading(true);
    try {
      const displayName = `${form.lastName} ${form.firstName}`;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
          data: {
            display_name: displayName,
            role: form.role,
            birth_date: form.birthDate,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          setError('このメールアドレスはすでに登録されています');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (signUpData.user) {
        const baseUsername = form.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 15);
        const username = `${baseUsername}_${signUpData.user.id.slice(0, 4)}`;

        const { error: profileError } = await supabase.from('profiles').insert({
          id: signUpData.user.id,
          username,
          display_name: displayName,
          role: form.role as 'student' | 'tutor',
          plan: form.role === 'tutor' ? 'tutor_free' : 'free',
          birth_date: form.birthDate,
        });

        if (profileError && !profileError.message.includes('duplicate') && !profileError.message.includes('unique')) {
          console.warn('Profile insert warning:', profileError.message);
        }
      }

      if (signUpData.session) {
        // Email confirmation is disabled — user is logged in immediately
        toast.success('アカウントを作成しました！');
        router.push('/dashboard');
        router.refresh();
      } else {
        // Email confirmation is enabled — send to login with message
        toast.success('確認メールを送信しました！');
        router.push('/auth/login?message=confirm_email');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登録に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setGuestLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: GUEST_EMAIL,
        password: GUEST_PASSWORD,
      });

      if (signInError) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: GUEST_EMAIL,
          password: GUEST_PASSWORD,
          options: { data: { display_name: 'ゲストユーザー', role: 'student' } },
        });
        if (signUpError) throw new Error(signUpError.message);
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            username: 'guest_user',
            display_name: 'ゲストユーザー',
            role: 'student',
            plan: 'free',
            birth_date: '2000-01-01',
          });
        }
        if (!data.session) {
          const { error: retryError } = await supabase.auth.signInWithPassword({ email: GUEST_EMAIL, password: GUEST_PASSWORD });
          if (retryError) throw new Error('ゲストログインにはSupabaseのメール確認設定をOFFにしてください');
        }
      }

      toast.success('ゲストとしてログインしました');
      router.push('/dashboard');
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ゲストログインに失敗しました');
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-full max-w-[460px] flex-shrink-0 bg-[--surface] border-r border-[--border] flex flex-col p-6 md:p-10 overflow-y-auto">
        <Link href="/" className="text-xl font-bold text-[--blue] mb-8 tracking-tight no-underline">Qurios</Link>

        <div className="flex border border-[--border] rounded-[12px] overflow-hidden mb-6">
          <Link href="/auth/login" className="flex-1 py-3 text-center text-sm font-medium text-[--text2] hover:bg-[--surface2] transition-colors no-underline">ログイン</Link>
          <div className="flex-1 py-3 text-center text-sm font-semibold bg-[--blue] text-white">新規登録</div>
        </div>

        <h1 className="text-[20px] font-bold tracking-tight mb-1">アカウント作成</h1>
        <p className="text-sm text-[--text2] mb-5">無料でアカウントを作成して学習を始めましょう。</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-[10px] mb-4 leading-relaxed">{error}</div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1">姓</label>
              <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className="input" placeholder="山田" required />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1">名</label>
              <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className="input" placeholder="太郎" required />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1">メールアドレス</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" placeholder="your@email.com" required />
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1">生年月日</label>
            <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className="input" required />
          </div>

          {minor && (
            <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-3 text-xs text-amber-800 leading-relaxed">
              ⚠️ <strong>保護者の同意が必要です。</strong>13歳未満の方は保護者の同意後にアカウントが有効になります。
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium mb-1">パスワード（8文字以上）</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)}
                className="input pr-10" placeholder="8文字以上" required minLength={8} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text3] border-none bg-transparent cursor-pointer">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= pw.score ? pw.color : 'bg-[--border]'}`} />
                ))}
                <span className="text-[11px] text-[--text3] ml-1 min-w-[56px]">{pw.label}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium mb-1.5">ロール</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'student', label: '生徒', sub: '授業を受ける' },
                { v: 'tutor', label: '講師', sub: '授業を教える' },
              ].map(r => (
                <label key={r.v} className={`flex items-center gap-2 p-3 border-2 rounded-[10px] cursor-pointer transition-colors ${form.role === r.v ? 'border-[--blue] bg-[--blue-lt]' : 'border-[--border] hover:bg-[--surface2]'}`}>
                  <input type="radio" name="role" value={r.v} checked={form.role === r.v}
                    onChange={() => set('role', r.v)} className="accent-[--blue]" />
                  <div>
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="text-[11px] text-[--text3]">{r.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={form.terms} onChange={e => set('terms', e.target.checked)}
              className="mt-0.5 accent-[--blue]" />
            <span className="text-xs text-[--text2] leading-relaxed">
              <Link href="/terms" className="text-[--blue] no-underline hover:underline">利用規約</Link>および
              <Link href="/privacy" className="text-[--blue] no-underline hover:underline">プライバシーポリシー</Link>に同意します
            </span>
          </label>

          <button type="submit" disabled={loading}
            className="w-full bg-[--blue] text-white border-none rounded-[10px] py-3.5 text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'アカウント作成中...' : 'アカウントを作成'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-3 text-xs text-[--text3]">
          <div className="flex-1 h-px bg-[--border]" /><span>または</span><div className="flex-1 h-px bg-[--border]" />
        </div>

        <button onClick={handleGuestLogin} disabled={guestLoading}
          className="w-full flex items-center justify-center gap-2 bg-[--surface2] border border-[--border2] text-[--text2] rounded-[10px] py-3 text-sm font-medium cursor-pointer hover:border-[--blue] hover:text-[--blue] transition-all disabled:opacity-50">
          <UserCircle size={18} />
          {guestLoading ? 'ゲストログイン中...' : 'ゲストとしてログイン（登録不要）'}
        </button>

        <p className="text-center text-sm text-[--text2] mt-5">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="text-[--blue] font-medium no-underline hover:underline">ログイン</Link>
        </p>
      </div>

      <div className="flex-1 bg-[#0F1A30] hidden md:flex items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="relative z-10 text-center text-white">
          <div className="text-5xl font-bold text-blue-400 tracking-tighter mb-4">Qurios</div>
          <div className="text-lg font-light text-white/70 leading-relaxed">全国の講師があなたの質問を<br />待っています。</div>
        </div>
      </div>
    </div>
  );
}
