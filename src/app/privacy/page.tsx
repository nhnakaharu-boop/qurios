import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'プライバシーポリシー | Qurios' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 no-underline text-sm font-medium hover:underline">← トップへ戻る</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2 text-gray-900">プライバシーポリシー</h1>
          <p className="text-sm text-gray-500">最終更新日：2025年1月1日</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {[
            {
              title: '1. 取得する情報',
              content: '本サービスは、以下の情報を取得する。',
              list: [
                'ユーザー属性（氏名、学年、メールアドレス等）',
                '行動ログ（学習時間、休憩中の動作データ、広告の視聴・クリックデータ）',
                '決済関連情報',
              ],
            },
            {
              title: '2. 利用目的',
              list: [
                '講師への報酬計算および生徒への学習データフィードバック。',
                'ターゲット広告の配信：休憩時間中に、ユーザーの属性に最適化された広告を表示するため。',
                '規約違反の調査：不正な広告回避や引き抜き行為の証拠保全。',
              ],
            },
            {
              title: '3. 第三者提供と開示',
              list: [
                '運営は、本サービスの維持に必要な範囲で、広告配信事業者に匿名化されたデータを提供できる。',
                '重大な規約違反が認められる場合、運営は法的措置に必要な範囲で、ユーザーの個人情報を弁護士、警察、または裁判所に開示する。',
              ],
            },
          ].map((section, i) => (
            <div key={i} className="p-7 border-b border-gray-100 last:border-none">
              <h2 className="text-base font-bold text-gray-900 mb-3">{section.title}</h2>
              {section.content && <p className="text-sm text-gray-600 leading-relaxed mb-3">{section.content}</p>}
              {section.list && (
                <ul className="space-y-2">
                  {section.list.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                      <span className="text-blue-500 mt-1 flex-shrink-0">•</span>{item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">ご不明な点は運営までお問い合わせください。</p>
      </div>
    </div>
  );
}
