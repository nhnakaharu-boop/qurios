'use client';
import type { Notification } from '@/types/database';
import { Bell, CheckCircle, Star, Users, Trophy } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  lesson_matched:  { icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50' },
  challenge_like:  { icon: Star,        color: 'text-amber-600',  bg: 'bg-amber-50' },
  friend_request:  { icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50'  },
  ranking_up:      { icon: Trophy,      color: 'text-purple-600', bg: 'bg-purple-50' },
  default:         { icon: Bell,        color: 'text-gray-600',   bg: 'bg-gray-50'  },
};

interface Props { notifications: Notification[]; }

export default function NotificationsClient({ notifications }: Props) {
  return (
    <div className="p-7 max-w-[680px]">
      <h1 className="text-[20px] font-bold mb-5 tracking-tight">通知</h1>
      {notifications.length === 0 ? (
        <div className="card py-16 text-center">
          <Bell size={40} className="mx-auto mb-4 text-[--text3]" />
          <p className="text-[--text2]">通知はありません</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.default;
            const Icon = cfg.icon;
            return (
              <div key={n.id} className="flex items-start gap-3.5 px-5 py-4 border-b border-[--border] last:border-none hover:bg-[--bg] transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={17} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-[--text2] mt-0.5 leading-relaxed">{n.body}</div>}
                  <div className="text-[11px] text-[--text3] mt-1">
                    {new Date(n.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
