'use client';
/**
 * 設計計画 › 面積表。
 * 面積表は表計算のテンプレート（式つき）として作ってある。ここから表計算をテンプレート付きで開く。
 * 表計算は Excel の読み書き・印刷・共有まで持っているので、別の面積表ツールを作るより強い。
 */
import React from 'react';
import { PENDING_TEMPLATE_KEY } from '../general-tools/spreadsheet/templates';

export default function AreaTableLauncher() {
  const open = (id: string) => {
    try {
      sessionStorage.setItem(PENDING_TEMPLATE_KEY, id);
    } catch {
      /* 渡せなければ表計算の「テンプレートから作成」で選んでもらう */
    }
    window.location.href = '/?m=general-tools&t=sheet';
  };
  return (
    <div className="p-4 text-[12px] leading-relaxed text-gray-700 space-y-3 max-w-[640px]">
      <p>
        面積表は<b>表計算のテンプレート</b>で作れます。行ごとの幅×奥行から面積と坪（1 坪 = 400/121 ㎡）を出して合計し、
        建築面積・敷地面積を入れると建蔽率・容積率が出ます。Excel での書き出し・印刷も表計算の機能がそのまま使えます。
      </p>
      <ul className="list-disc pl-4 space-y-1 text-[11px]">
        <li>
          <b>床面積</b>は壁その他の区画の<b>中心線（壁芯）</b>で囲まれた水平投影面積です（建築基準法施行令 第 2 条第 1 項第三号）。
          幅・奥行は壁芯の寸法で入れ、廊下・階段・便所・PS なども 1 行ずつ入れてください。室の内法を足しても床面積になりません。
        </li>
        <li>
          表の「延べ面積」は全行の合計です。延べ面積は各階の床面積の合計（同 第四号）で、確認申請書には階ごとの床面積も要るので、階ごとの小計は行を足して出してください。
        </li>
        <li>
          <b>建築面積</b>は室の合計からは出ません。外壁または柱の中心線で囲まれた水平投影面積で、中心線から 1m 以上突き出た軒・ひさし等は先端から 1m 後退した線までを含めます（同 第二号）。別に計算して入れてください。
        </li>
        <li>
          表の「容積率」は延べ面積をそのまま敷地面積で割った値（不算入を引く前）です。容積率の算定では、自動車車庫等（延べの 1/5 まで）・備蓄倉庫・蓄電池（各 1/50 まで）・自家発電設備・貯水槽・宅配ボックス（各 1/100 まで）（同 第四号ただし書・第 3 項）、
          天井が地盤面から 1m 以下の地階にある住宅・老人ホーム等の部分（住宅等の部分の床面積の 1/3 まで、建築基準法 第 52 条第 3 項）、昇降路・共同住宅等の共用廊下と階段（同 第 6 項）を算入しません。該当する部分を引いた延べ面積で見直してください。
        </li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => open('area')} className="yy-btn is-primary">
          表計算で面積表を開く
        </button>
        <button type="button" onClick={() => open('finish')} className="yy-btn">
          仕上表
        </button>
        <button type="button" onClick={() => open('door')} className="yy-btn">
          建具表
        </button>
      </div>
      <p className="text-[10px] text-gray-500">ログインしていると新しいシートとして保存されます。</p>
    </div>
  );
}
