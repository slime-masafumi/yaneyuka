/**
 * 設計情報の記事に入れる図(自作の SVG)。2026-11-14
 *
 * 図の本体は public/figures/{id}.svg。記事の本文(design-posts.ts)は書き換えず、
 * after に書いた見出し(本文の「## 見出し」の文字そのまま)の節の終わりに差し込む。
 * <img> で出すので Google の画像検索にも載る。
 */
export type Fig = {
  /** ファイル名(拡張子なし)。p{記事id}-{英小文字の短い名前}。例 p44-stair-dims */
  id: string;
  /** 記事の id(design-posts.ts) */
  post: string;
  /** 差し込む節の見出し(「## 」の後ろの文字そのまま)。空なら記事の最初の節の終わり */
  after: string;
  /** 図の題(alt にも使う)。30 字以内 */
  title: string;
  /** 図の説明(1〜2 文、80 字以内)。根拠の条文があれば入れる */
  caption: string;
  /** SVG の viewBox の幅・高さ(width / height 属性と同じ) */
  w: number;
  h: number;
};
