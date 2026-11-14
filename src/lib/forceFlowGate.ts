/**
 * 構造フロービューア(/calc/force-flow/)を公開するかどうか。2026-11-15
 * 設計書の条件で、構造設計者のレビューが済むまでは公開しない。ページは 404、左カラム・一覧・ホーム・
 * サイトマップ・建築の調べもののリンクからも外す。レビューが済んだら環境変数
 * NEXT_PUBLIC_FORCE_FLOW_PUBLIC=1 でビルドする(または下の既定値を true にする)。
 */
export const FORCE_FLOW_PUBLIC = process.env.NEXT_PUBLIC_FORCE_FLOW_PUBLIC === '1';
