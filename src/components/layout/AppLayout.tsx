'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types/database';
import {
  LayoutDashboard, Clock, Star, BookOpen, Users, Trophy,
  FileText, BarChart2, User, Settings, LogOut, Bell,
  ChevronRight, Zap, Crown, Infinity, Award, Heart, Menu, X,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavGroup {
  section: string;
  tutorOnly?: boolean;
  premiumOnly?: boolean;
  items: { href: string; label: string; icon: React.ElementType; badge?: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  { section: 'メイン', items: [
    { href: '/dashboard',     label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/post',          label: '課題を投稿',     icon: Clock },
    { href: '/challenge',     label: 'Challenge',      icon: Star },
    { href: '/lesson',        label: '授業履歴',        icon: BookOpen },
    { href: '/endless-study', label: '25分エンドレス', icon: Infinity, badge: 'NEW' },
  ]},
  { section: 'コミュニティ', items: [
    { href: '/social',           label: 'フレンド・グループ', icon: Users },
    { href: '/ranking',          label: 'ランキング',          icon: Trophy },
    { href: '/ranking/tutors',   label: '講師ランキング',      icon: Crown },
    { href: '/membership',       label: 'メンバーシップ',      icon: Heart },
  ]},
  { section: '実績', items: [
    { href: '/achievements', label: '実績・バッジ',    icon: Award },
    { href: '/study-plan',   label: 'スタディプラン', icon: LayoutDashboard },
  ]},
  { section: 'アカウント', items: [
    { href: '/profile',  label: 'プロフィール', icon: User },
    { href: '/settings', label: '設定',         icon: Settings },
  ]},
  { section: '講師専用', tutorOnly: true, items: [
    { href: '/post?tab=challenge', label: '自作課題を投稿',     icon: FileText },
    { href: '/earnings',           label: '収益ダッシュボード', icon: BarChart2 },
    { href: '/membership',         label: 'メンバーシップ管理', icon: Heart },
  ]},
];

const BOTTOM_NAV = [
  { href: '/dashboard', label: 'ホーム',   icon: LayoutDashboard },
  { href: '/post',      label: '投稿',     icon: Clock },
  { href: '/challenge', label: 'Challenge', icon: Star },
  { href: '/lesson',    label: '履歴',     icon: BookOpen },
  { href: '/profile',   label: 'マイページ', icon: User },
];

interface Props { profile: Profile | null; children: React.ReactNode; }

export default function AppLayout({ profile, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [notifCount, setNotifCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();
  const isTutor  = profile?.role === 'tutor' || profile?.role === 'admin';
  const isGuest  = profile?.username === 'guest_user';
  const canEndless = ['student_premium', 'student_premium_all', 'tutor_premium'].includes(profile?.plan ?? '');

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', profile.id);
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id).eq('is_read', false)
      .then(({ count }) => setNotifCount(count ?? 0));
  }, [profile?.id]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  function NavLink({ href, label, icon: Icon, badge }: { href: string; label: string; icon: React.ElementType; badge?: string }) {
    const basePath = href.split('?')[0];
    const active = pathname === basePath || (basePath.length > 1 && pathname.startsWith(basePath));
    const isLocked = href.startsWith('/endless-study') && !canEndless;
    return (
      <Link href={isLocked ? '/dashboard?upgrade=endless' : href}
        onClick={() => setMobileMenuOpen(false)}
        className={clsx(
          'flex items-center gap-2.5 px-3 py-[8px] rounded-[8px] text-[13px] mb-[1px] no-underline transition-all',
          active ? 'bg-[--blue-lt] text-[--blue] font-medium' : 'text-[--text2] hover:bg-[--surface2] hover:text-[--text]',
          isLocked && 'opacity-60'
        )}>
        <Icon size={15} className="shrink-0" style={{ opacity: active ? 1 : 0.7 }} />
        <span className="flex-1 truncate">{label}</span>
        {badge && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">{badge}</span>}
        {isLocked && <span className="text-[10px] text-[--text3]">🔒</span>}
      </Link>
    );
  }

  const pageTitle = NAV_GROUPS.flatMap(g => g.items).find(i => {
    const base = i.href.split('?')[0];
    return pathname === base || (base.length > 1 && pathname.startsWith(base));
  })?.label ?? 'Qurios';

  const SidebarContent = () => (
    <>
      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}
        className="flex items-center h-14 px-5 border-b border-[--border] no-underline gap-2 shrink-0">
        <span className="text-[18px] font-bold text-[--blue] tracking-tight">Qurios</span>
        {isGuest && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">ゲスト</span>}
        {profile?.is_verified_tutor && <Crown size={13} className="text-blue-500" />}
      </Link>
      <nav className="flex-1 p-3 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          if (group.tutorOnly && !isTutor) return null;
          return (
            <div key={group.section}>
              <div className="text-[10px] font-semibold text-[--text3] px-2.5 py-2 uppercase tracking-widest mt-1">{group.section}</div>
              {group.items.map(item => <NavLink key={item.href} {...item} />)}
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[--border] shrink-0">
        {isGuest && (
          <div className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-[8px] text-[11px] text-amber-700 leading-relaxed">
            ゲストモード中。<Link href="/auth/register" className="text-[--blue] no-underline font-medium">登録</Link>で全機能が使えます。
          </div>
        )}
        {profile?.plan === 'student_premium_all' && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-[8px] px-2.5 py-2 text-blue-700 font-medium">
            <Star size={11} />完全プレミアム（広告なし）
          </div>
        )}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] hover:bg-[--surface2] cursor-pointer group"
          onClick={() => { router.push('/profile'); setMobileMenuOpen(false); }}>
          <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[--blue] to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile?.display_name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile?.display_name ?? 'ユーザー'}</div>
            <div className="text-[11px] text-[--text3] truncate">
              {isGuest ? 'ゲスト' : (profile?.achievement_points ?? 0) + 'pt · ' + (profile?.plan ?? 'free').replace(/_/g, ' ')}
            </div>
          </div>
          <ChevronRight size={13} className="text-[--text3] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-[--text3] hover:text-red-500 w-full rounded-[8px] hover:bg-red-50 dark:hover:bg-red-950 transition-all mt-0.5 border-none bg-transparent cursor-pointer">
          <LogOut size={14} />{isGuest ? 'ゲストを終了' : 'ログアウト'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[--bg]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 bg-[--surface] border-r border-[--border] flex-col sticky top-0 h-screen overflow-y-auto z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[--surface] border-r border-[--border] flex flex-col overflow-y-auto md:hidden">
            <div className="flex items-center justify-between h-14 px-5 border-b border-[--border] shrink-0">
              <span className="text-[18px] font-bold text-[--blue] tracking-tight">Qurios</span>
              <button onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-[6px] border border-[--border] bg-transparent cursor-pointer text-[--text2]">
                <X size={16} />
              </button>
            </div>
            <nav className="flex-1 p-3 overflow-y-auto">
              {NAV_GROUPS.map(group => {
                if (group.tutorOnly && !isTutor) return null;
                return (
                  <div key={group.section}>
                    <div className="text-[10px] font-semibold text-[--text3] px-2.5 py-2 uppercase tracking-widest mt-1">{group.section}</div>
                    {group.items.map(item => <NavLink key={item.href} {...item} />)}
                  </div>
                );
              })}
            </nav>
            <div className="p-3 border-t border-[--border] shrink-0">
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-[12.5px] text-[--text3] hover:text-red-500 w-full rounded-[8px] hover:bg-red-50 dark:hover:bg-red-950 transition-all border-none bg-transparent cursor-pointer">
                <LogOut size={14} />{isGuest ? 'ゲストを終了' : 'ログアウト'}
              </button>
            </div>
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-[--surface] border-b border-[--border] flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-[6px] border border-[--border] bg-transparent cursor-pointer text-[--text2]">
              <Menu size={18} />
            </button>
            <div className="text-[15px] font-semibold">{pageTitle}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative w-9 h-9 rounded-[8px] border border-[--border] flex items-center justify-center hover:bg-[--surface2] transition-colors no-underline text-[--text2]">
              <Bell size={16} />
              {notifCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />}
            </Link>
            {canEndless && (
              <Link href="/endless-study"
                className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-3 py-[7px] rounded-[8px] hover:opacity-90 transition-opacity no-underline whitespace-nowrap">
                <Infinity size={13} />25分学習
              </Link>
            )}
            {isGuest ? (
              <Link href="/auth/register" className="bg-amber-500 text-white text-xs md:text-sm font-medium px-3 md:px-4 py-[7px] rounded-[8px] hover:opacity-90 transition-opacity no-underline whitespace-nowrap">
                無料登録
              </Link>
            ) : (
              <Link href="/post" className="bg-[--blue] text-white text-xs md:text-sm font-medium px-3 md:px-4 py-[7px] rounded-[8px] hover:opacity-90 transition-opacity no-underline whitespace-nowrap flex items-center gap-1">
                <Zap size={13} />課題投稿
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[--surface] border-t border-[--border] flex">
          {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href.length > 1 && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 no-underline transition-colors',
                  active ? 'text-[--blue]' : 'text-[--text3]'
                )}>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
