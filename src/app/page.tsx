// yaneyuka トップページ中央カラム（B案: Feature Grid）。
// 引継ぎ元: 共有/Toppage/handoff/yaneyuka-center-B.html を実プロジェクト情報に合わせて調整。
// サーバーコンポーネントとして構成し、SSRで初回描画を高速化。
export default function Home() {
  return (
    <>
      <style>{`
        .yy-center {
          max-width: 760px;
          margin: 0 auto;
          background: #ffffff;
          color: #1a1a1a;
          font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
          padding: 56px 56px 64px;
          box-sizing: border-box;
        }
        .yy-center * { box-sizing: border-box; }

        .yy-hero { text-align: center; margin-bottom: 36px; }

        .yy-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #eef2e8;
          padding: 5px 12px;
          margin-bottom: 16px;
        }
        .yy-eyebrow__dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #8ca888;
        }
        .yy-eyebrow__text {
          font-size: 11px;
          color: #4a5d48;
          letter-spacing: 0.1em;
          font-weight: 500;
        }
        .yy-wordmark {
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 400;
          font-size: 52px;
          letter-spacing: -0.02em;
          margin: 0 0 14px;
          line-height: 1;
        }
        .yy-lead {
          font-size: 16px;
          line-height: 1.75;
          color: #6a6a6a;
          margin: 0 auto;
          max-width: 520px;
        }

        .yy-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-top: 1px solid #ececec;
          border-bottom: 1px solid #ececec;
          padding: 16px 0;
          margin-bottom: 32px;
        }
        .yy-stat { text-align: center; }
        .yy-stat + .yy-stat { border-left: 1px solid #ececec; }
        .yy-stat__num {
          font-family: Georgia, serif;
          font-size: 24px;
          font-weight: 400;
          color: #1f3a7a;
          line-height: 1;
        }
        .yy-stat__label {
          font-size: 10.5px;
          color: #6a6a6a;
          margin-top: 6px;
          letter-spacing: 0.08em;
        }

        .yy-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1px;
          background: #ececec;
          border: 1px solid #ececec;
          margin-bottom: 32px;
        }
        .yy-card {
          background: #fff;
          padding: 22px 18px;
          position: relative;
        }
        .yy-card__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .yy-card__icon {
          width: 36px;
          height: 36px;
          background: #eef2e8;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .yy-card__icon svg {
          stroke: #8ca888;
          fill: none;
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .yy-tag {
          font-size: 9px;
          letter-spacing: 0.1em;
          font-weight: 600;
          color: #8ca888;
          border: 1px solid #8ca888;
          padding: 2px 6px;
        }
        .yy-tag--new {
          color: #1f3a7a;
          border-color: #1f3a7a;
        }
        .yy-card__title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          letter-spacing: 0.02em;
        }
        .yy-card__desc {
          font-size: 11.5px;
          line-height: 1.65;
          color: #6a6a6a;
        }

        .yy-closing {
          font-size: 13px;
          color: #6a6a6a;
          text-align: center;
          line-height: 1.8;
          margin: 0;
        }

        /* タブレット・小型ノートPC横向き */
        @media (max-width: 960px) {
          .yy-center { padding: 40px 32px 40px; }
          .yy-hero { margin-bottom: 28px; }
          .yy-wordmark { font-size: 46px; }
          .yy-stats { margin-bottom: 24px; }
          .yy-grid { margin-bottom: 24px; }
          .yy-card { padding: 18px 14px; }
        }
        /* スマホ縦・タブレット縦 */
        @media (max-width: 720px) {
          .yy-center { padding: 32px 20px 32px; }
          .yy-hero { margin-bottom: 20px; }
          .yy-wordmark { font-size: 38px; margin-bottom: 10px; }
          .yy-lead { font-size: 14px; line-height: 1.65; }
          .yy-stats { grid-template-columns: repeat(2, 1fr); gap: 10px 0; padding: 12px 0; margin-bottom: 18px; }
          .yy-stat:nth-child(3) { border-left: none; }
          .yy-stat__num { font-size: 22px; }
          .yy-grid { grid-template-columns: 1fr 1fr; margin-bottom: 18px; }
          .yy-card { padding: 14px 12px; }
          .yy-card__title { font-size: 12.5px; }
          .yy-card__desc { font-size: 11px; line-height: 1.55; }
          .yy-closing { font-size: 12px; }
        }
        /* 極小スマホ */
        @media (max-width: 440px) {
          .yy-center { padding: 24px 14px 24px; }
          .yy-wordmark { font-size: 32px; }
          .yy-grid { grid-template-columns: 1fr; }
          .yy-card { padding: 12px 14px; }
        }
        /* 縦解像度が狭い場合（横向き・小型ノート）でも下まで見えるように圧縮 */
        @media (max-height: 760px) {
          .yy-center { padding-top: 28px; padding-bottom: 28px; }
          .yy-hero { margin-bottom: 20px; }
          .yy-wordmark { font-size: 40px; margin-bottom: 10px; }
          .yy-eyebrow { margin-bottom: 10px; }
          .yy-lead { font-size: 14px; line-height: 1.6; }
          .yy-stats { padding: 10px 0; margin-bottom: 18px; }
          .yy-grid { margin-bottom: 18px; }
          .yy-card { padding: 14px 12px; }
          .yy-card__head { margin-bottom: 8px; }
          .yy-card__icon { width: 30px; height: 30px; }
          .yy-card__icon svg { width: 18px; height: 18px; }
          .yy-card__title { margin-bottom: 4px; }
        }
        @media (max-height: 620px) {
          .yy-center { padding-top: 20px; padding-bottom: 20px; }
          .yy-hero { margin-bottom: 14px; }
          .yy-wordmark { font-size: 34px; }
          .yy-stats { padding: 8px 0; margin-bottom: 12px; }
          .yy-grid { margin-bottom: 12px; }
        }
      `}</style>

      <section className="yy-center" aria-label="yaneyuka 概要">
        <div className="yy-hero">
          <div className="yy-eyebrow">
            <span className="yy-eyebrow__dot" aria-hidden="true"></span>
            <span className="yy-eyebrow__text">建築・建設業界の業務支援ポータル</span>
          </div>
          <h1 className="yy-wordmark">yaneyuka</h1>
          <p className="yy-lead">
            設計・施工・メーカー・職人。立場を越えた現場の知恵と課題を、<br />
            ひとつのプラットフォームに。
          </p>
        </div>

        <div className="yy-stats" role="list">
          <div className="yy-stat" role="listitem">
            <div className="yy-stat__num">20+</div>
            <div className="yy-stat__label">実務ツール</div>
          </div>
          <div className="yy-stat" role="listitem">
            <div className="yy-stat__num">70+</div>
            <div className="yy-stat__label">CAD・添景素材</div>
          </div>
          <div className="yy-stat" role="listitem">
            <div className="yy-stat__num">¥0</div>
            <div className="yy-stat__label">会員登録</div>
          </div>
          <div className="yy-stat" role="listitem">
            <div className="yy-stat__num">24/7</div>
            <div className="yy-stat__label">アクセス可</div>
          </div>
        </div>

        <div className="yy-grid">
          <article className="yy-card">
            <div className="yy-card__head">
              <div className="yy-card__icon">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <path d="M3 9h18M9 3v18" />
                  <circle cx="15" cy="15" r="2" />
                </svg>
              </div>
              <span className="yy-tag">無料</span>
            </div>
            <div className="yy-card__title">CAD・添景素材</div>
            <div className="yy-card__desc">
              人物・樹木などの添景画像とCADデータを70点以上、無料でダウンロード
            </div>
          </article>

          <article className="yy-card">
            <div className="yy-card__head">
              <div className="yy-card__icon">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <rect x="4" y="3" width="16" height="18" rx="1" />
                  <rect x="7" y="6" width="10" height="3" />
                  <circle cx="8" cy="13" r="0.6" fill="currentColor" />
                  <circle cx="12" cy="13" r="0.6" fill="currentColor" />
                  <circle cx="16" cy="13" r="0.6" fill="currentColor" />
                  <circle cx="8" cy="17" r="0.6" fill="currentColor" />
                  <circle cx="12" cy="17" r="0.6" fill="currentColor" />
                  <circle cx="16" cy="17" r="0.6" fill="currentColor" />
                </svg>
              </div>
              <span className="yy-tag">11種</span>
            </div>
            <div className="yy-card__title">建築計算ツール</div>
            <div className="yy-card__desc">
              ガラス厚・雨水排水・建蔽率／容積率・採光換気・構造計算などを自動算出
            </div>
          </article>

          <article className="yy-card">
            <div className="yy-card__head">
              <div className="yy-card__icon">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path d="M14.7 6.3a4 4 0 1 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-2.1 2.6-2.4z" />
                </svg>
              </div>
              <span className="yy-tag">10種</span>
            </div>
            <div className="yy-card__title">実務ユーティリティ</div>
            <div className="yy-card__desc">
              画像リサイズ・PDF圧縮・単位変換・メモ・スプレッドシート等をブラウザで完結
            </div>
          </article>

          <article className="yy-card">
            <div className="yy-card__head">
              <div className="yy-card__icon">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path d="M12 3v3M6 6h12M7 6l-2 8a4 4 0 0 0 8 0l-2-8M17 6l-2 8a4 4 0 0 0 8 0l-2-8" />
                  <path d="M12 6v14M8 20h8" />
                </svg>
              </div>
              <span className="yy-tag yy-tag--new">NEW</span>
            </div>
            <div className="yy-card__title">My法規</div>
            <div className="yy-card__desc">
              建築基準法・告示・省エネ法・都市計画法等の関連条文を自分用に整理・検索
            </div>
          </article>

          <article className="yy-card">
            <div className="yy-card__head">
              <div className="yy-card__icon">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                  <path d="M16 4l2-1 2 1-1 2 1 2-2 1-2-1" strokeWidth="1" />
                </svg>
              </div>
            </div>
            <div className="yy-card__title">メーカー連絡帳</div>
            <div className="yy-card__desc">
              建材メーカー担当者の連絡先と問い合わせ履歴を個人／チームで一元管理
            </div>
          </article>

          <article className="yy-card">
            <div className="yy-card__head">
              <div className="yy-card__icon">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="1" />
                  <path d="M8 9l2 2 4-4M8 15l2 2 4-4" />
                </svg>
              </div>
            </div>
            <div className="yy-card__title">Myタスク・工程管理</div>
            <div className="yy-card__desc">
              Myカレンダー、MyタスクとTeamタスクの共有、yymail／yychatによる社内連携
            </div>
          </article>
        </div>

        <p className="yy-closing">
          現場の「欲しい」をカタチに。建築・建設業界の業務効率化を、一歩先へ。
        </p>
      </section>
    </>
  );
}
