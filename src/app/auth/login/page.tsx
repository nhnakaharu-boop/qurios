'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, Brain, Star, UserCircle } from 'lucide-react';

const GUEST_EMAIL = 'guest@qurio.demo';
const GUEST_PASSWORD = 'GuestDemo2025!';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'auth_failed') toast.error('認証に失敗しました。もう一度お試しください。');
    const msg = searchParams.get('message');
    if (msg === 'confirm_email') toast('確認メールを送信しました。メールをご確認ください。', { icon: '📧' });
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('メールアドレスを入力してください'); return; }
    if (!password) { setError('パスワードを入力してください'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('メールアドレスの確認が完了していません。確認メールをご確認ください。');
        } else {
          setError(signInError.message);
        }
        return;
      }
      // After login, ensure profile exists
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            username: `user_${user.id.slice(0, 8)}`,
            display_name: user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'ユーザー',
            role: (user.user_metadata?.role as 'student' | 'tutor') ?? 'student',
            plan: 'free',
            birth_date: user.user_metadata?.birth_date ?? '2000-01-01',
          });
        }
      }
      toast.success('ログインしました！');
      const redirect = searchParams.get('redirect') ?? '/dashboard';
      router.push(redirect);
      router.refresh();
    } catch {
      setError('ネットワークエラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setGuestLoading(true);
    setError('');
    try {
      // First try sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: GUEST_EMAIL,
        password: GUEST_PASSWORD,
      });

      if (signInError) {
        // Guest account doesn't exist, create it
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: GUEST_EMAIL,
          password: GUEST_PASSWORD,
          options: {
            data: { display_name: 'ゲストユーザー', role: 'student', birth_date: '2000-01-01' },
          },
        });
        if (signUpError) throw new Error(signUpError.message);

        if (signUpData.user) {
          // Create profile
          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            username: 'guest_user',
            display_name: 'ゲストユーザー',
            role: 'student',
            plan: 'free',
            birth_date: '2000-01-01',
          });
          if (profileError && !profileError.message.includes('duplicate')) {
            console.warn('Profile insert warn:', profileError.message);
          }
          // If email confirmation is required, we can't sign in immediately
          if (!signUpData.session) {
            // Try signing in after creation
            const { error: retryError } = await supabase.auth.signInWithPassword({
              email: GUEST_EMAIL,
              password: GUEST_PASSWORD,
            });
            if (retryError) {
              setError('ゲストログインにはSupabaseの「Confirm email」設定をOFFにする必要があります。Supabase Dashboard > Authentication > Settings > Enable email confirmations をOFFにしてください。');
              return;
            }
          }
        }
      } else {
        // Sign in succeeded, ensure profile exists
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
          if (!profile) {
            await supabase.from('profiles').insert({
              id: user.id,
              username: 'guest_user',
              display_name: 'ゲストユーザー',
              role: 'student',
              plan: 'free',
              birth_date: '2000-01-01',
            });
          }
        }
      }

      toast.success('ゲストとしてログインしました');
      router.push('/dashboard');
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ゲストログインに失敗しました';
      setError(msg);
    } finally {
      setGuestLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex min-h-screen">
      {/* LEFT */}
      <div className="w-full max-w-[440px] flex-shrink-0 bg-[--surface] border-r border-[--border] flex flex-col p-10 overflow-y-auto">
        <Link href="/" className="text-xl font-bold text-[--blue] mb-10 tracking-tight no-underline">Qurios</Link>

        {/* Tab switcher */}
        <div className="flex border border-[--border] rounded-[12px] overflow-hidden mb-7">
          <div className="flex-1 py-3 text-center text-sm font-semibold bg-[--blue] text-white">ログイン</div>
          <Link href="/auth/register" className="flex-1 py-3 text-center text-sm font-medium text-[--text2] hover:bg-[--surface2] transition-colors no-underline">新規登録</Link>
        </div>

        <h1 className="text-[22px] font-bold tracking-tight mb-1">おかえりなさい</h1>
        <p className="text-sm text-[--text2] mb-6">アカウントにログインして学習を続けましょう。</p>

        {/* Google OAuth */}
        <button onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-[10px] border border-[--border] bg-[--surface] text-sm font-medium hover:bg-[--surface2] transition-colors mb-4 cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google でログイン
        </button>

        <div className="flex items-center gap-3 mb-5 text-xs text-[--text3]">
          <div className="flex-1 h-px bg-[--border]" /><span>または</span><div className="flex-1 h-px bg-[--border]" />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-[10px] mb-4 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium mb-1.5">メールアドレス</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" className="input" autoComplete="email" required />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1.5">パスワード</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="パスワードを入力" className="input pr-10" autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text3] border-none bg-transparent cursor-pointer">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="text-right -mt-1">
            <Link href="/auth/reset" className="text-sm text-[--blue] no-underline hover:underline">パスワードを忘れた方</Link>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[--blue] text-white border-none rounded-[10px] py-3.5 text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4 text-xs text-[--text3]">
          <div className="flex-1 h-px bg-[--border]" /><span>ゲストとして体験</span><div className="flex-1 h-px bg-[--border]" />
        </div>

        <button onClick={handleGuestLogin} disabled={guestLoading}
          className="w-full flex items-center justify-center gap-2 bg-[--surface2] border border-[--border2] text-[--text2] rounded-[10px] py-3 text-sm font-medium cursor-pointer hover:bg-[--surface] hover:border-[--blue] hover:text-[--blue] transition-all disabled:opacity-50">
          <UserCircle size={18} />
          {guestLoading ? 'ゲストログイン中...' : 'ゲストとしてログイン（登録不要）'}
        </button>
        <p className="text-[11px] text-[--text3] text-center mt-1.5">ゲストはデータの保存・投稿機能が制限されます</p>

        <p className="text-center text-sm text-[--text2] mt-6">
          アカウントをお持ちでない方は{' '}
          <Link href="/auth/register" className="text-[--blue] font-medium no-underline hover:underline">新規登録</Link>
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex-1 bg-[#0F1A30] hidden md:flex flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-teal-500/15 blur-[100px]" />
        <div className="relative z-10 text-center max-w-md">
          <div className="text-5xl font-extrabold text-blue-400 tracking-tighter mb-3">Qurios</div>
          <div className="text-xl font-light text-white/70 mb-14 leading-relaxed">5分で解決する<br />学習革命が始まる。</div>
          <div className="flex flex-col gap-3 text-left">
            {[
              { icon: Zap, title: '全国講師とリアルタイムマッチング', desc: '困った課題を投稿すると最短30秒で講師が来てくれる' },
              { icon: Brain, title: '脳科学が証明した5分授業', desc: 'ワーキングメモリに最適化された設計で確実に定着' },
              { icon: Star, title: 'Challengeで楽しく学習', desc: 'TikTok感覚で問題をスワイプ。AIが弱点を自動出題' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 items-center bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-[11px] bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-0.5">{title}</div>
                  <div className="text-xs text-white/50">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-[--text2]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
