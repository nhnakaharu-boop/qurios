'use client';
import { useState } from 'react';
import type { Profile } from '@/types/database';
import { clsx } from 'clsx';

const MOCK = [
  { rank:1, name:'Kenta_Math',   sub:'数学・高校2年', score:842, delta:'+120', lessons:12, answers:98, color:'#3B82F6', init:'K', me:false },
  { rank:2, name:'study_girl_s', sub:'英語・数学',    score:791, delta:'+45',  lessons:10, answers:87, color:'#14B8A6', init:'S', me:false },
  { rank:3, name:'Riku_Physics', sub:'物理・化学',    score:758, delta:'-12',  lessons:9,  answers:81, color:'#F59E0B', init:'R', me:false },
  { rank:4, name:'Hana_Chem',    sub:'化学・高3',     score:703, delta:'+88',  lessons:8,  answers:74, color:'#7C3AED', init:'H', me:false },
  { rank:5, name:'Akira_Bio',    sub:'生物・化学',    score:668, delta:'+33',  lessons:7,  answers:68, color:'#EC4899', init:'A', me:false },
  { rank:6, name:'Jun_Math',     sub:'数学・高1',     score:621, delta:'+91',  lessons:6,  answers:62, color:'#0D9488', init:'J', me:false },
  { rank:7, name:'Nana_English', sub:'英語・国語',    score:578, delta:'-8',   lessons:5,  answers:58, color:'#8B5CF6', init:'N', me:false },
  { rank:8, name:'山田 太郎',     sub:'数学・理科',    score:512, delta:'+124', lessons:6,  answers:47, color:'#2563EB', init:'山', me:true  },
  { rank:9, name:'Yuki_Science', sub:'物理・高2',     score:487, delta:'+22',  lessons:4,  answers:43, color:'#16A34A', init:'Y', me:false },
  { rank:10, name:'Mio_Lit',     sub:'国語・社会',    score:445, delta:'-34',  lessons:3,  answers:39, color:'#D97706', init:'M', me:false },
];

const PERIODS = ['weekly','monthly','alltime','friends'] as const;
const PERIOD_LABELS: Record<string, string> = { weekly:'週間', monthly:'月間', alltime:'累計', friends:'フレンド' };
const SUBJECTS = ['all','math','english','chemistry','physics','challenge'];
const SUBJECT_LABELS: Record<string, string> = { all:'総合', math:'数学', english:'英語', chemistry:'化学', physics:'物理', challenge:'Challenge' };

interface Props { profile: Profile | null; rankings: Record<string, unknown>[]; myRank: Record<string, unknown> | null; }

export default function RankingClient({ profile, rankings, myRank }: Props) {
  const [period, setPeriod] = useState<typeof PERIODS[number]>('weekly');
  const [subject, setSubject] = useState('all');

  const data = rankings.length > 0
    ? rankings.map((r, i) => ({
        rank: i + 1,
        name: (r.user as Record<string, unknown>)?.display_name as string ?? '不明',
        sub: '',
        score: r.score as number,
        delta: '',
        lessons: 0,
        answers: 0,
        color: '#3B82F6',
        init: ((r.user as Record<string, unknown>)?.display_name as string ?? '?')[0],
        me: (r.user as Record<string, unknown>)?.id === profile?.id,
      }))
    : MOCK;

  const top3 = [data[1], data[0], data[2]].filter(Boolean);
  const PODIUM_STYLES = [
    { h: 'h-14', bg: 'bg-gray-300', label: '2位', avSize: 'w-14 h-14 text-lg' },
    { h: 'h-20', bg: 'bg-amber-400', label: '1位', avSize: 'w-[68px] h-[68px] text-xl', crown: true },
    { h: 'h-10', bg: 'bg-orange-700', label: '3位', avSize: 'w-12 h-12 text-base' },
  ];

  const myData = data.find(d => d.me);

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-[--surface] border-b border-[--border] px-6 py-4 sticky top-0 z-10">
          <h1 className="text-[18px] font-bold tracking-tight mb-3">ランキング</h1>
          <div className="flex gap-0 border-b border-[--border] -mx-6 px-6">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer border-none bg-transparent -mb-px',
                  period === p ? 'text-[--blue] border-[--blue]' : 'text-[--text3] border-transparent hover:text-[--text2]')}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Subject filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)}
                className={clsx('px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all',
                  subject === s
                    ? 'bg-[--blue] border-[--blue] text-white'
                    : 'bg-transparent border-[--border] text-[--text2] hover:bg-[--surface2]')}>
                {SUBJECT_LABELS[s]}
              </button>
            ))}
          </div>

          {/* My position */}
          <div className="flex items-center gap-4 bg-[--blue-lt] border border-[--blue-mid] rounded-[12px] p-4 mb-6">
            <div className="font-mono text-[32px] font-bold text-[--blue]">#{myRank?.rank_pos ?? myData?.rank ?? '--'}</div>
            <div>
              <div className="text-sm font-semibold text-[--blue]">あなたの今週の順位</div>
              <div className="text-xs text-[--text2]">{myRank?.score ?? myData?.score ?? 0}pt 獲得</div>
            </div>
            <div className="ml-auto text-xs text-green-600 font-semibold">↑ 先週より3ランクUP！</div>
          </div>

          {/* Podium */}
          <div className="flex justify-center items-end gap-4 mb-8 px-4">
            {top3.map((u, i) => {
              const style = PODIUM_STYLES[i];
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  {style.crown && <span className="text-xl">👑</span>}
                  <div className={clsx('rounded-full flex items-center justify-center text-white font-bold border-2', style.avSize)}
                    style={{ background: u?.color, borderColor: i === 1 ? '#D97706' : i === 0 ? '#9CA3AF' : '#B45309' }}>
                    {u?.init}
                  </div>
                  <div className="text-xs font-semibold text-center max-w-[80px] truncate">{u?.name}</div>
                  <div className="text-[11px] text-[--text3] font-mono">{u?.score}pt</div>
                  <div className={clsx('w-[68px] rounded-t-[6px] flex items-center justify-center text-xs font-bold text-white', style.h, style.bg)}>
                    {style.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rank table */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[--border]">
                  {['順位','ユーザー','スコア','前週比','授業数','解答数'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold text-[--text3] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(u => (
                  <tr key={u.rank}
                    className={clsx('border-b border-[--border] last:border-none hover:bg-[--bg] transition-colors', u.me && 'bg-[--blue-lt]')}>
                    <td className={clsx('py-3 px-4 font-mono font-bold text-center',
                      u.rank === 1 ? 'text-amber-500' : u.rank === 2 ? 'text-gray-400' : u.rank === 3 ? 'text-orange-700' : u.me ? 'text-[--blue]' : 'text-[--text3]')}>
                      {u.rank <= 3 ? ['🥇','🥈','🥉'][u.rank - 1] : u.rank}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: u.color }}>{u.init}</div>
                        <div>
                          <div className={clsx('text-sm font-medium', u.me && 'text-[--blue]')}>{u.name}{u.me && ' (あなた)'}</div>
                          <div className="text-xs text-[--text3]">{u.sub}</div>
                        </div>
                      </div>
                    </td>
                    <td className={clsx('py-3 px-4 font-mono font-semibold',
                      u.rank <= 3 ? 'text-amber-600' : u.me ? 'text-[--blue]' : 'text-[--text]')}>{u.score}pt</td>
                    <td className={clsx('py-3 px-4 text-xs font-mono',
                      u.delta.startsWith('+') ? 'text-green-600' : 'text-red-500')}>{u.delta}</td>
                    <td className="py-3 px-4 text-sm font-mono text-[--text2]">{u.lessons}</td>
                    <td className="py-3 px-4 text-sm font-mono text-[--text2]">{u.answers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
