import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Qurioss — 5分・25分で伸びる学習サービス' };

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <span className="text-xl font-bold text-blue-600 tracking-tight">Qurioss</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors no-underline">機能</a>
            <a href="#science"  className="hover:text-gray-900 transition-colors no-underline">仕組み</a>
            <a href="#plans"    className="hover:text-gray-900 transition-colors no-underline">料金</a>
            <Link href="/auth/login" className="hover:text-gray-900 transition-colors no-underline">ログイン</Link>
          </div>
          <Link href="/auth/register"
            className="bg-blue-600 text-white px-5 py-2 rounded-[9px] text-sm font-medium no-underline hover:bg-blue-700 transition-colors">
            無料で始める
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            全国の講師とリアルタイムマッチング
          </div>
          <h1 className="text-5xl font-bold text-gray-900 tracking-tight leading-tight mb-5">
            5分・25分で<br />
            <span className="text-blue-600">本当に伸びる</span>学習体験
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto">
            困った課題を投稿するだけで全国の講師が解説。脳科学に基づいた5分授業と、25分エンドレス学習で記憶に定着。
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/auth/register"
              className="bg-blue-600 text-white px-8 py-3.5 rounded-[10px] text-base font-semibold no-underline hover:bg-blue-700 transition-colors">
              今すぐ無料で始める →
            </Link>
            <Link href="/auth/login"
              className="bg-white text-gray-700 border border-gray-200 px-7 py-3.5 rounded-[10px] text-base no-underline hover:border-gray-300 transition-colors">
              ゲストで体験
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-50 border-y border-gray-100 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-6 text-center">
          {[
            { n: '5分', l: '1授業の長さ' },
            { n: '25分', l: 'エンドレス学習' },
            { n: '¥100', l: '1授業の講師報酬' },
            { n: '40名', l: 'グループ上限' },
          ].map(s => (
            <div key={s.n}>
              <div className="text-3xl font-bold text-blue-600 mb-1">{s.n}</div>
              <div className="text-sm text-gray-500">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-3">Features</div>
            <h2 className="text-3xl font-bold text-gray-900">全ての機能が一つに</h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { icon: '⚡', title: '5分授業',           desc: '課題投稿から最短30秒でマッチング。脳科学に最適化された5分授業で確実に定着。' },
              { icon: '🔁', title: '25分エンドレス',    desc: '25分授業→3分スクワット→2分休憩を繰り返す。講師指名機能付き。有料会員限定。' },
              { icon: '⭐', title: 'Challenge Shorts', desc: 'TikTok感覚でスワイプしながら問題を解く。AIが弱点を自動出題。フォロー機能付き。' },
              { icon: '🏆', title: '講師ランキング',    desc: '授業回数・満足度ランキングで優秀な講師を発見。25分学習で即指名可能。' },
              { icon: '💎', title: 'メンバーシップ',    desc: '講師のYouTube授業動画チャンネルに参加。料金は講師が自由設定（¥100〜）。' },
              { icon: '🏅', title: '実績・バッジ',      desc: 'エンドレス達成・連続学習・ランキングなど多数の実績で学習モチベーションUP。' },
            ].map(f => (
              <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-gray-200 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <div className="font-semibold text-gray-900 mb-2">{f.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Science section */}
      <section id="science" className="bg-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-3">Science</div>
            <h2 className="text-3xl font-bold text-gray-900">脳科学が証明した設計</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-7">
              <div className="text-4xl font-bold text-blue-600 mb-1">5</div>
              <div className="text-sm text-gray-400 mb-4">分授業の根拠</div>
              <h3 className="font-bold text-gray-900 mb-3">ワーキングメモリに最適な時間</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                人間のワーキングメモリは3〜5チャンクを保持できます。5分という時間は1概念だけを深く理解するのに最適な長さ。開始から終了まで集中力が維持できる唯一の時間帯です。
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-7">
              <div className="text-4xl font-bold text-blue-600 mb-1">25</div>
              <div className="text-sm text-gray-400 mb-4">分授業の根拠</div>
              <h3 className="font-bold text-gray-900 mb-3">ポモドーロ技法 × 運動科学</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                25分集中後の3分間の有酸素運動（スクワット）は、BDNF（脳由来神経栄養因子）の分泌を促進し、直前に学習した内容の記憶定着率を最大40%向上させます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-3">Pricing</div>
            <h2 className="text-3xl font-bold text-gray-900">シンプルな料金体系</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                name: '生徒 無料', price: '¥0', period: '',
                features: ['5分授業', 'Challengeを解く', 'ランキング参加', '広告あり', 'クールタイムあり'],
                cta: '無料で始める', popular: false,
              },
              {
                name: '生徒有料プラン', price: '¥980', period: '/月',
                features: ['5分授業（クールタイムなし）', '30チケット/月', 'Challenge投稿', '25分エンドレス学習', '広告あり'],
                cta: 'プレミアムにする', popular: false,
              },
              {
                name: '生徒有料プラン+', price: '¥2,480', period: '/月',
                features: ['全機能利用可能', '広告完全削除', 'クールタイムなし', '25分エンドレス', 'メンバーシップ参加'],
                cta: '完全版にする', popular: true,
              },
              {
                name: '有料講師プラン', price: '¥4,980', period: '/月',
                features: ['25分エンドレス授業参加', 'Challenge報酬最大¥0.8', '公式マーク付与', 'メンバーシップ作成', 'YouTube・サイトリンク掲載'],
                cta: '講師登録する', popular: false,
              },
            ].map(p => (
              <div key={p.name} className={`rounded-2xl p-6 border ${p.popular ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-100 bg-white'}`}>
                {p.popular && <div className="text-xs font-bold bg-white text-blue-600 px-2.5 py-0.5 rounded-full mb-3 w-fit">おすすめ</div>}
                <div className={`text-sm font-semibold mb-2 ${p.popular ? 'text-blue-100' : 'text-gray-500'}`}>{p.name}</div>
                <div className={`text-3xl font-bold mb-0.5 ${p.popular ? 'text-white' : 'text-gray-900'}`}>
                  {p.price}<span className={`text-sm font-normal ${p.popular ? 'text-blue-200' : 'text-gray-400'}`}>{p.period}</span>
                </div>
                <div className={`text-xs mb-5 ${p.popular ? 'text-blue-200' : 'text-gray-400'}`}>税込</div>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-xs ${p.popular ? 'text-blue-100' : 'text-gray-600'}`}>
                      <span className={p.popular ? 'text-white' : 'text-blue-500'}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register"
                  className={`block text-center py-2.5 rounded-[9px] text-sm font-semibold no-underline transition-colors ${
                    p.popular ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">今日から始めよう</h2>
          <p className="text-blue-100 mb-8">課題投稿から最短30秒でマッチング。全国の講師があなたを待っています。</p>
          <Link href="/auth/register"
            className="inline-block bg-white text-blue-600 px-8 py-3.5 rounded-[10px] text-base font-semibold no-underline hover:bg-blue-50 transition-colors">
            無料でアカウント作成 →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center">
        <div className="text-sm text-gray-400 mb-2">
          <span className="font-semibold text-gray-600">Qurioss</span> — 全国の講師とつながる学習プラットフォーム
        </div>
        <div className="flex justify-center gap-4 text-xs text-gray-400">
          <Link href="/terms"   className="no-underline hover:text-gray-600">利用規約</Link>
          <span>·</span>
          <Link href="/privacy" className="no-underline hover:text-gray-600">プライバシーポリシー</Link>
        </div>
        <div className="text-xs text-gray-300 mt-3">© 2025 Qurioss. All rights reserved.</div>
      </footer>
    </div>
  );
}
