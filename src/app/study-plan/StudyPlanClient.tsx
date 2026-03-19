'use client';
import { useState } from 'react';
import type { Profile } from '@/types/database';
import { Brain, Target, Calendar, CheckCircle, Clock, Zap } from 'lucide-react';
import { clsx } from 'clsx';

const SUBJECTS = ['数学', '英語', '化学', '物理', '生物', '国語', '社会', '情報'];

interface Task { id: number; subject: string; task: string; duration: number; done: boolean; priority: 'high' | 'medium' | 'low'; }

const INITIAL_TASKS: Task[] = [
  { id: 1, subject: '数学', task: '微積分の基本公式を復習', duration: 20, done: false, priority: 'high' },
  { id: 2, subject: '英語', task: '関係代名詞の練習問題10問', duration: 15, done: true, priority: 'high' },
  { id: 3, subject: '化学', task: 'モルの計算問題5問', duration: 25, done: false, priority: 'medium' },
  { id: 4, subject: '数学', task: 'Challengeで微分を5問解く', duration: 10, done: false, priority: 'high' },
  { id: 5, subject: '物理', task: '力学の公式まとめ', duration: 30, done: false, priority: 'low' },
];

const PRIORITY_CONFIG = {
  high:   { label: '高', cls: 'bg-red-50 text-red-600 border-red-200' },
  medium: { label: '中', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  low:    { label: '低', cls: 'bg-green-50 text-green-600 border-green-200' },
};

interface Props { profile: Profile | null; }

export default function StudyPlanClient({ profile }: Props) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [selectedDay, setSelectedDay] = useState(0);
  const [newTask, setNewTask] = useState('');
  const [newSubject, setNewSubject] = useState('数学');

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { label: i === 0 ? '今日' : ['日','月','火','水','木','金','土'][d.getDay()], date: d.getDate() };
  });

  const completedToday = tasks.filter(t => t.done).length;
  const totalTime = tasks.reduce((s, t) => s + t.duration, 0);
  const completedTime = tasks.filter(t => t.done).reduce((s, t) => s + t.duration, 0);

  function toggleTask(id: number) {
    setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }
  function addTask() {
    if (!newTask.trim()) return;
    setTasks(p => [...p, { id: Date.now(), subject: newSubject, task: newTask, duration: 20, done: false, priority: 'medium' }]);
    setNewTask('');
  }

  return (
    <div className="p-7 max-w-[900px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight">AIスタディプラン</h1>
          <p className="text-sm text-[--text2] mt-1">AIがあなたの学習データから最適な計画を生成</p>
        </div>
        <div className="flex items-center gap-2 bg-[--blue-lt] border border-[--blue-mid] rounded-[10px] px-4 py-2 text-sm text-[--blue] font-medium">
          <Brain size={16} /><span>AI最適化 済み</span>
        </div>
      </div>

      {/* Progress */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {[
          { icon: CheckCircle, label: '今日の完了', val: `${completedToday}/${tasks.length}`, color: 'text-green-600' },
          { icon: Clock, label: '学習予定時間', val: `${totalTime}分`, color: 'text-blue-600' },
          { icon: Target, label: '達成率', val: `${Math.round((completedToday/tasks.length)*100)}%`, color: 'text-amber-600' },
          { icon: Zap, label: '連続学習日', val: '7日', color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 text-xs text-[--text2] mb-2"><s.icon size={14} />{s.label}</div>
            <div className={clsx('font-mono text-[22px] font-bold', s.color)}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Day selector */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button key={i} onClick={() => setSelectedDay(i)}
            className={clsx('flex flex-col items-center gap-1 px-4 py-2.5 rounded-[10px] border text-sm font-medium cursor-pointer transition-all shrink-0',
              selectedDay === i ? 'bg-[--blue] border-[--blue] text-white' : 'bg-[--surface] border-[--border] text-[--text2] hover:border-[--border2]')}>
            <span className="text-[11px]">{d.label}</span>
            <span className="text-lg font-bold">{d.date}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Task list */}
        <div>
          <div className="card overflow-hidden mb-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[--border]">
              <span className="text-sm font-semibold">今日のタスク</span>
              <div className="text-xs text-[--text3]">完了時間: {completedTime}/{totalTime}分</div>
            </div>
            <div className="divide-y divide-[--border]">
              {tasks.map(task => (
                <div key={task.id} className={clsx('flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[--bg]', task.done && 'opacity-60')}>
                  <button onClick={() => toggleTask(task.id)}
                    className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0',
                      task.done ? 'bg-green-500 border-green-500' : 'border-[--border2] hover:border-green-400')}>
                    {task.done && <CheckCircle size={12} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={clsx('text-sm font-medium', task.done && 'line-through text-[--text3]')}>{task.task}</div>
                    <div className="text-xs text-[--text3] mt-0.5">{task.subject} · {task.duration}分</div>
                  </div>
                  <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full border', PRIORITY_CONFIG[task.priority].cls)}>
                    {PRIORITY_CONFIG[task.priority].label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Add task */}
          <div className="card p-4">
            <div className="text-sm font-semibold mb-3">タスクを追加</div>
            <div className="flex gap-2">
              <select value={newSubject} onChange={e => setNewSubject(e.target.value)} className="input !w-auto text-sm">
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="タスクを入力..." className="input flex-1 text-sm" />
              <button onClick={addTask} className="bg-[--blue] text-white border-none rounded-[9px] px-4 text-sm font-semibold cursor-pointer hover:opacity-90 whitespace-nowrap">追加</button>
            </div>
          </div>
        </div>

        {/* AI suggestions */}
        <div className="flex flex-col gap-3.5">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold mb-4">
              <Brain size={16} className="text-[--blue]" />AIからの提案
            </div>
            <div className="space-y-3">
              {[
                { icon: '📈', text: '数学の正答率が低下中。微積分を優先してください。', color: 'bg-red-50 border-red-100' },
                { icon: '⏰', text: '21時以降は記憶定着率が20%低下します。今日は早めに学習を。', color: 'bg-amber-50 border-amber-100' },
                { icon: '🎯', text: '英語の完了率が高いです。今週は化学にも時間を割きましょう。', color: 'bg-blue-50 border-blue-100' },
              ].map((s, i) => (
                <div key={i} className={clsx('flex gap-2.5 p-3 rounded-[10px] border text-xs leading-relaxed', s.color)}>
                  <span className="text-base flex-shrink-0">{s.icon}</span>
                  <span className="text-[--text2]">{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm font-semibold mb-3">今週の目標</div>
            <div className="space-y-3">
              {[
                { label: 'Challenge 解答', current: 47, target: 100, color: 'bg-blue-500' },
                { label: '授業回数', current: 6, target: 10, color: 'bg-green-500' },
                { label: '学習時間', current: 4.2, target: 10, color: 'bg-amber-500', unit: 'h' },
              ].map(g => (
                <div key={g.label}>
                  <div className="flex justify-between text-xs text-[--text2] mb-1.5">
                    <span>{g.label}</span>
                    <span className="font-mono font-medium">{g.current}{g.unit ?? ''} / {g.target}{g.unit ?? ''}</span>
                  </div>
                  <div className="h-1.5 bg-[--surface2] rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all', g.color)} style={{ width: `${(g.current/g.target)*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
