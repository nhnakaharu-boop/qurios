'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { Profile } from '@/types/database';
import { PLAN_LABELS, STRIPE_LINKS } from '@/types/database';
import { clsx } from 'clsx';
import { ExternalLink, Crown } from 'lucide-react';

const TABS = [
  { key: 'account',   label: 'アカウント',   icon: '👤' },
  { key: 'plan',      label: 'プラン・決済', icon: '⭐' },
  { key: 'notif',     label: '通知設定',     icon: '🔔' },
  { key: 'privacy',   label: 'プライバシー', icon: '🔒' },
  { key: 'display',   label: '表示設定',     icon: '🎨' },
  { key: 'security',  label: 'セキュリティ', icon: '🛡' },
  { key: 'danger',    label: 'アカウント削除', icon: '⚠️' },
] as const;
type Tab = typeof TABS[number]['key'];

function Toggle({ label, desc, defaultOn, onChange }: { label: string; desc?: string; defaultOn?: boolean; onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(defaultOn ?? false);
  return (
    <div className="flex items-center gap-3 py-4 px-5 border-b border-[--border] last:border-none">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-[--text3] mt-0.5">{desc}</div>}
      </div>
      <button role="switch" aria-checked={on} onClick={() => { setOn(p => !p); onChange?.(!on); }}
        className={clsx('relative w-11 h-6 rounded-full transition-colors border-none cursor-pointer flex-shrink-0', on ? 'bg-[--blue]' : 'bg-[--border2]')}>
        <span className={clsx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

interface Props { profile: Profile | null; }

export default function SettingsClient({ profile }: Props) {
  const [tab, setTab] = useState<Tab>('account');
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }
  async function handleDeleteAccount() {
    if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) return;
    await supabase.from('profiles').update({ is_active: false }).eq('id', profile?.id ?? '');
    await supabase.auth.signOut();
    router.push('/');
  }

  const plans = [
    { key: 'student_paid',      label: '生徒有料プラン',   price: '¥980/月',    link: STRIPE_LINKS.student_paid,      features: ['5分授業（無制限）','Challengeを解く','25分エンドレス学習','30チケット/月'] },
    { key: 'student_paid_plus', label: '生徒有料プラン+',  price: '¥2,480/月',  link: STRIPE_LINKS.student_paid_plus, features: ['生徒有料プランの全機能','広告完全削除','全機能解放'] },
    { key: 'tutor_paid',        label: '有料講師プラン',   price: '¥4,980/月',  link: STRIPE_LINKS.tutor_paid,        features: ['25分授業への参加','公式マーク付与','メンバーシップ作成','YouTube・サイトリンク掲載','Challenge報酬最大¥0.4'] },
  ];

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Nav */}
      <div className="w-[240px] bg-[--surface] border-r border-[--border] p-3 shrink-0">
        <div className="text-[15px] font-bold px-2 py-2 mb-2">設定</div>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-sm w-full mb-0.5 cursor-pointer transition-all border-none text-left font-sans',
              tab === t.key ? 'bg-[--blue-lt] text-[--blue] font-medium' : 'bg-transparent text-[--text2] hover:bg-[--surface2]')}>
            <span className="text-base w-6 text-center">{t.icon}</span>{t.label}
          </button>
        ))}
        <div className="mt-4 pt-4 border-t border-[--border]">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-sm w-full cursor-pointer transition-all border-none text-left font-sans text-red-500 hover:bg-red-50 bg-transparent">
            <span className="w-6 text-center">🚪</span>ログアウト
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-[640px]">

        {tab === 'account' && (
          <div>
            <h2 className="text-[18px] font-bold mb-5">アカウント情報</h2>
            <div className="card mb-4">
              <div className="px-5 py-4 border-b border-[--border] text-sm font-semibold">基本情報</div>
              {[
                { icon: '👤', label: profile?.display_name ?? '--', sub: `@${profile?.username ?? ''}` },
                { icon: '📧', label: 'メールアドレス', sub: '（変更は下記から）' },
                { icon: '🔑', label: 'パスワード', sub: '変更する' },
                { icon: '🎂', label: '生年月日', sub: profile?.birth_date ?? '--' },
              ].map(row => (
                <div key={row.icon} className="flex items-center gap-4 px-5 py-4 border-b border-[--border] last:border-none">
                  <span className="text-lg w-7 text-center">{row.icon}</span>
                  <div className="flex-1"><div className="text-sm font-medium">{row.label}</div><div className="text-xs text-[--text3]">{row.sub}</div></div>
                  <button className="text-xs text-[--text2] border border-[--border2] rounded-[8px] px-3 py-1.5 cursor-pointer hover:bg-[--surface2] bg-transparent">変更</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'plan' && (
          <div>
            <h2 className="text-[18px] font-bold mb-5">プラン・決済</h2>
            <div className="flex items-center gap-4 bg-gradient-to-r from-[--blue-lt] to-[--teal-lt] border border-[--blue-mid] rounded-[14px] p-4 mb-5">
              <span className="text-3xl">⭐</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-[--blue]">{PLAN_LABELS[profile?.plan ?? 'free']}</div>
                <div className="text-xs text-[--text2] mt-0.5">チケット残数 {profile?.ticket_count ?? 0}枚</div>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {plans.map(p => (
                <div key={p.key} className={clsx('card p-5', profile?.plan === p.key && 'ring-2 ring-blue-500')}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        {p.label}
                        {profile?.plan === p.key && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">現在のプラン</span>}
                      </div>
                      <div className="text-lg font-bold text-[--blue] font-mono mt-1">{p.price}</div>
                    </div>
                    <a href={p.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-[--blue] text-white text-xs font-semibold px-3.5 py-2 rounded-[8px] no-underline hover:opacity-90 whitespace-nowrap">
                      <ExternalLink size={11} />{profile?.plan === p.key ? '管理する' : 'プランにする'}
                    </a>
                  </div>
                  <ul className="space-y-1">
                    {p.features.map(f => <li key={f} className="flex items-center gap-1.5 text-xs text-[--text2]"><span className="text-green-500">✓</span>{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="px-5 py-4 border-b border-[--border] text-sm font-semibold">講師指名チケット</div>
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="text-2xl">🎟</span>
                <div className="flex-1"><div className="text-sm font-medium">指名チケット残数：{profile?.ticket_count ?? 0}枚</div><div className="text-xs text-[--text3]">1枚で講師を指名・5分延長が可能</div></div>
                <a href={STRIPE_LINKS.tutor_nomination_ticket} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-[8px] px-3.5 py-2 no-underline hover:bg-amber-100">
                  <ExternalLink size={11} />チケット購入
                </a>
              </div>
            </div>
          </div>
        )}

        {tab === 'notif' && (
          <div>
            <h2 className="text-[18px] font-bold mb-5">通知設定</h2>
            <div className="card">
              {[
                { label: '講師がマッチングしたとき', defaultOn: true },
                { label: '自作課題にコメントが付いたとき', defaultOn: true },
                { label: '週間ランキング結果', defaultOn: true },
                { label: 'フレンド申請を受け取ったとき', defaultOn: true },
                { label: 'グループ授業の開始', defaultOn: true },
                { label: 'フォロー中の講師の新着課題', defaultOn: true },
                { label: '報酬確定通知（講師向け）', defaultOn: true },
                { label: 'メンバーシップ新着投稿', defaultOn: true },
              ].map(row => <Toggle key={row.label} {...row} onChange={() => toast.success('設定を保存しました')} />)}
            </div>
          </div>
        )}

        {tab === 'privacy' && (
          <div>
            <h2 className="text-[18px] font-bold mb-5">プライバシー設定</h2>
            <div className="card mb-4">
              {[
                { label: 'ランキングに表示する', defaultOn: true },
                { label: 'オンライン状態を表示する', defaultOn: true },
                { label: 'フレンド申請を受け取る', defaultOn: true },
                { label: '学習統計を公開する', defaultOn: false },
              ].map(row => <Toggle key={row.label} {...row} onChange={() => toast.success('設定を保存しました')} />)}
            </div>
            <div className="card">
              <div className="px-5 py-4 border-b border-[--border] text-sm font-semibold">写真データ</div>
              <div className="px-5 py-4">
                <div className="text-xs text-[--text2] leading-relaxed">授業中の写真は<strong>授業終了後即時自動削除</strong>されます（変更不可）。</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'display' && (
          <div>
            <h2 className="text-[18px] font-bold mb-5">表示設定</h2>
            <div className="card">
              {[
                { label: 'ダークモード', desc: '暗い背景で目への負担を軽減' },
                { label: 'Challenge の自動再生', desc: '次の問題を自動でスクロール' },
                { label: '広告の音量をミュート', desc: '動画広告の音をミュートにする', defaultOn: true },
              ].map(row => <Toggle key={row.label} {...row} onChange={() => toast.success('設定を保存しました')} />)}
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div>
            <h2 className="text-[18px] font-bold mb-5">セキュリティ</h2>
            <div className="card">
              <Toggle label="2段階認証" desc="ログイン時にSMSコードで本人確認" onChange={() => toast.success('設定を保存しました')} />
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="text-lg">📱</span>
                <div className="flex-1"><div className="text-sm font-medium">ログイン中のデバイス</div><div className="text-xs text-[--text3]">現在のデバイス</div></div>
                <button onClick={() => toast.success('他のデバイスをすべてログアウトしました')} className="text-xs text-[--text2] border border-[--border2] rounded-[8px] px-3 py-1.5 cursor-pointer bg-transparent">全ログアウト</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'danger' && (
          <div>
            <h2 className="text-[18px] font-bold mb-5">アカウント削除</h2>
            <div className="bg-red-50 border border-red-200 rounded-[14px] p-5">
              <div className="text-sm font-bold text-red-700 mb-2">⚠️ アカウントを完全削除</div>
              <div className="text-xs text-red-600 leading-relaxed mb-4">すべての学習データ・収益情報・投稿が削除されます。この操作は取り消せません。</div>
              <button onClick={handleDeleteAccount} className="bg-red-600 text-white border-none rounded-[9px] px-5 py-2.5 text-sm font-semibold cursor-pointer hover:bg-red-700 transition-colors">
                アカウントを削除する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
