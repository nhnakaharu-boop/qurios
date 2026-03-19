import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '利用規約 | Qurios' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 no-underline text-sm font-medium hover:underline">← トップへ戻る</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2 text-gray-900">利用規約</h1>
          <p className="text-sm text-gray-500">最終更新日：2025年1月1日</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {[
            {
              title: '第1条（総則と厳格な運用方針）',
              content: [
                '本規約は、運営者（以下「運営」）が提供する学習プラットフォーム「Qurios」（以下「本サービス」）の利用条件を定める。',
                '本サービスは、25分間の集中学習と5分間の強制休憩（スクワット推奨および広告視聴）を繰り返すサイクルにより、学習効率を最大化することを目的とする。',
                'ユーザー（生徒・講師）が本規約に一回でも違反した場合、運営は事前の催告なく直ちにアカウントを永久停止し、被った損害（得べかりし広告収益、ブランド毀損、調査費用等）について、弁護士を通じた法的措置を講じるものとする。',
              ],
            },
            {
              title: '第2条（講師の加入条件と場所代）',
              content: [
                '「有料講師」として活動する者は、月額4,980円（税込）のシステム利用料（以下「場所代」）を支払うものとする。',
                '講師は、自身のブランド構築、メンバーシップ勧誘、著書・アフィリエイトリンクの掲載のために本サービスを利用できる。',
                '25分間の「有料授業」を実施した場合、1回につき100円の報酬を支払う。ただし、5分間の休憩時間（広告表示時間）に対する報酬は一切発生しない。',
              ],
            },
            {
              title: '第3条（生徒の利用制限と広告視聴義務）',
              content: [
                '生徒は、月額有料プラン（月額980円または2,480円）に加入することで、エンドレス勉強機能および特定の有料授業への参加権を得る。',
                '広告の強制視聴：5分間の休憩時間中に配信される広告について、生徒はこれを遮断（アドブロック等の使用）、スキップ、または意図的に無視してはならない。',
                '休憩時間中のスクワット指示は脳の活性化を目的とした演出であり、実際の実施および体調管理はユーザーの自己責任とする。',
              ],
            },
            {
              title: '第4条（禁止事項：即時法的措置対象）',
              content: [
                '以下の行為を「重大な背信行為」とみなし、即座に法的措置をとる。',
              ],
              list: [
                'プラットフォーム外への誘導（抜き抜き行為）：Quriosを介して知り合った生徒に対し、運営を介さない直接取引や他サービスへの勧誘を行うこと。',
                '不正な広告回避：広告ブロックツールの使用、またはシステムの脆弱性を突いた広告の非表示化。',
                '不適切なコンテンツ：授業内での公序良俗に反する発言、またはQuriosのブランドを著しく傷つける行為。',
              ],
            },
          ].map((section, i) => (
            <div key={i} className="p-7 border-b border-gray-100 last:border-none">
              <h2 className="text-base font-bold text-gray-900 mb-3">{section.title}</h2>
              <div className="space-y-2.5">
                {section.content.map((c, j) => (
                  <p key={j} className="text-sm text-gray-600 leading-relaxed pl-4 border-l-2 border-gray-100">{c}</p>
                ))}
                {section.list && (
                  <ul className="mt-3 space-y-2">
                    {section.list.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                        <span className="text-red-500 mt-1 flex-shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">本規約は予告なく変更される場合があります。最新の規約はこのページでご確認ください。</p>
        </div>
      </div>
    </div>
  );
}
