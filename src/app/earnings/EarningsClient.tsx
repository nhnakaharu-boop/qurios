'use client';
import type { Profile } from '@/types/database';
import { CheckCircle, Lock } from 'lucide-react';
import { clsx } from 'clsx';

const RATE_TABLE = [
  { min: 0,    max: 29,         rate: null, label: '〜29回' },
  { min: 30,   max: 99,         rate: 0,    label: '30〜99回' },
  { min: 100,  max: 399,        rate: 0.2,  label: '100〜399回' },
  { min: 400,  max: 999,        rate: 0.3,  label: '400〜999回' },
  { min: 1000, max: 1599,       rate: 0.5,  label: '1000〜1599回' },
  { min: 1600, max: Infinity,   rate: 0.8,  label: '1600回〜' },
];

const MONTHLY_DATA = [
  { month: '9月', yen: 1240 }, { month: '10月', yen: 1820 },
  { month: '11月', yen: 2380 }, { month: '12月', yen: 3040 },
  { month: '1月', yen: 4820 },
];

interface Props { profile: Profile | null; earnings: Record<string, unknown>[]; payouts: Record<string, unknown>[]; currentMonth: string; }

export default function EarningsClient({ profile, earnings, currentMonth }: Props) {
  const monthly = profile?.monthly_lessons ?? 0;
  const followers = profile?.follower_count ?? 0;
  const tier = RATE_TABLE.findLast(t => monthly >= t.min) ?? RATE_TABLE[0];
  const nextTier = RATE_TABLE.find(t => t.min > monthly);
  const toNextTier = nextTier ? nextTier.min - monthly : 0;
  const totalThisMonth = earnings.filter(e => e.month === currentMonth).reduce((s, e) => s + Number(e.amount_yen), 0);
  const totalEver = earnings.reduce((s, e) => s + Number(e.amount_yen), 0);
  const maxYen = Math.max(...MONTHLY_DATA.map(d => d.yen));

  return (
    <div className="p-7 max-w-[1000px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight">収益ダッシュボード</h1>
          <div className="text-sm text-[--text2] mt-1">{profile?.display_name} · 講師{profile?.plan === 'tutor_premium' ? 'プレミアム' : '無料'}</div>
        </div>
        <button className="bg-[--blue] text-white border-none rounded-[9px] px-5 py-2.5 text-sm font-semibold cursor-pointer hover:opacity-90">振込申請</button>
      </div>

      {/* Status card */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold">今月のステータス</span>
          {monthly >= 30
            ? <span className="text-xs font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">報酬発生中 ✓</span>
            : <span className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full">未達成</span>}
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span>今月の授業回数</span>
            <span className="font-mono font-semibold text-[--blue]">{monthly} / 30回 {monthly >= 30 && '✓'}</span>
          </div>
          <div className="h-1.5 bg-[--surface2] rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((monthly / 30) * 100, 100)}%` }} />
          </div>
          <div className="text-xs text-[--text3] mt-1">
            現在単価：{tier.rate === null ? '対象外' : tier.rate === 0 ? '¥0（100回で報酬開始）' : `¥${tier.rate}/解答`}
          </div>
        </div>
        {toNextTier > 0 && nextTier && (
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span>次の単価アップまで</span>
              <span className="font-mono font-semibold text-amber-600">あと{toNextTier}回 → ¥{nextTier.rate}/解答</span>
            </div>
            <div className="h-1.5 bg-[--surface2] rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full"
                style={{ width: `${(monthly / nextTier.min) * 100}%` }} />
            </div>
          </div>
        )}
        {followers < 200 && monthly >= 400 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-[9px] text-xs text-amber-800 leading-relaxed">
            ⚠️ フォロワーが{followers}人です。¥0.3以上の単価帯にはフォロワー200人以上が必要です。
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: '今月の収益', value: `¥${totalThisMonth.toLocaleString()}`, color: 'text-blue-600' },
          { label: '累計収益',   value: `¥${totalEver.toLocaleString()}`,      color: 'text-green-600' },
          { label: '今月授業回数', value: `${monthly}回`,                       color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-[--text3] mb-2">{s.label}</div>
            <div className={clsx('font-mono text-[24px] font-bold tracking-tight', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-5 mb-5">
        {/* Bar chart (pure SVG) */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-4">月次収益推移</div>
          <div className="flex items-end gap-3 h-[140px]">
            {MONTHLY_DATA.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[11px] text-[--text3]">¥{(d.yen / 1000).toFixed(1)}k</span>
                <div className="w-full rounded-t-[4px] transition-all"
                  style={{ height: `${(d.yen / maxYen) * 100}%`, background: i === MONTHLY_DATA.length - 1 ? 'var(--blue)' : 'var(--surface2)' }} />
                <span className={clsx('text-[11px] font-medium', i === MONTHLY_DATA.length - 1 ? 'text-[--blue]' : 'text-[--text3]')}>{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payout */}
        <div className="card p-5">
          <div className="text-xs text-[--text3] mb-1">次回振込予定額</div>
          <div className="font-mono text-[34px] font-bold text-green-600 tracking-tight mb-1">¥{totalThisMonth.toLocaleString()}</div>
          <div className="text-xs text-[--text2] mb-4">振込予定日：翌月末</div>
          <div className="flex items-center gap-3 bg-[--surface2] border border-[--border] rounded-[10px] p-3 mb-4">
            <span className="text-xl">🏦</span>
            <div>
              <div className="text-sm font-medium">三菱UFJ銀行</div>
              <div className="text-xs text-[--text3] font-mono">****-1234</div>
            </div>
            <span className="ml-auto text-xs text-[--blue] cursor-pointer">変更</span>
          </div>
          <button className="w-full bg-green-50 text-green-700 border border-green-200 rounded-[10px] py-3 text-sm font-semibold cursor-pointer hover:bg-green-100 transition-colors">
            振込申請（月1回自動）
          </button>
        </div>
      </div>

      {/* Rate table */}
      <div className="card overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-[--border] text-sm font-semibold">💰 報酬単価（改定版）</div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[--border]">
              {['月授業回数','投稿','単価/解答','条件'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-[--text3] uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RATE_TABLE.map((t, i) => {
              const isCurrent = monthly >= t.min && monthly <= t.max;
              return (
                <tr key={i} className={clsx('border-b border-[--border] last:border-none', isCurrent && 'bg-[--blue-lt]')}>
                  <td className={clsx('py-3 px-4 text-sm font-medium', isCurrent && 'text-[--blue]')}>
                    {t.label}
                    {isCurrent && <span className="ml-2 text-[10px] bg-[--blue] text-white px-1.5 py-0.5 rounded-full">現在</span>}
                  </td>
                  <td className="py-3 px-4">
                    {t.rate !== null
                      ? <CheckCircle size={14} className="text-green-600" />
                      : <Lock size={14} className="text-red-500" />}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-sm text-[--text2]">
                    {t.rate === null ? '—' : t.rate === 0 ? '¥0（報酬なし）' : `¥${t.rate}`}
                  </td>
                  <td className="py-3 px-4 text-xs text-[--text3]">
                    {t.min >= 400 ? 'フォロワー200人以上も必要' : t.min === 0 ? '30回達成で解禁' : t.min === 30 ? '100回で報酬開始' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Transaction history */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--border]">
          <span className="text-sm font-semibold">取引履歴</span>
          <span className="text-xs text-[--text3]">{earnings.length}件</span>
        </div>
        {earnings.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[--text3]">まだ収益データがありません</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[--border]">
                {['種別','日時','金額','状態'].map(h => (
                  <th key={h} className="text-left py-3 px-5 text-[11px] font-semibold text-[--text3] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {earnings.map(e => (
                <tr key={e.id as string} className="border-b border-[--border] last:border-none hover:bg-[--bg] transition-colors">
                  <td className="py-3 px-5 text-sm capitalize">{e.type as string}</td>
                  <td className="py-3 px-5 text-xs text-[--text3] font-mono">{new Date(e.created_at as string).toLocaleDateString('ja')}</td>
                  <td className="py-3 px-5 font-mono font-semibold text-green-600">¥{Number(e.amount_yen).toFixed(2)}</td>
                  <td className="py-3 px-5">
                    <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full',
                      e.is_paid ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>
                      {e.is_paid ? '振込済み' : '確定'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
