import React from 'react'

const ReferenceResources: React.FC = () => {
  return (
    <div className="space-y-4 pr-2">
      <h4 className="text-xs font-semibold border-b pb-1 mb-2">設計実務リファレンス</h4>
      
      {/* 1. 官庁営繕・標準仕様書（最も参照頻度が高い） */}
      <div className="text-[12px]">
        <div className="font-bold text-gray-800 mb-1">仕様書・設計基準（官庁営繕）</div>
        <ul className="list-disc list-outside ml-4 space-y-1 text-gray-600">
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.mlit.go.jp/gobuild/gobuild_tk2_000017.html" 
               target="_blank" rel="noopener noreferrer">
              公共建築工事標準仕様書・統一基準
            </a>
            <span className="text-[10px] text-gray-400">（建築・電気・機械・改修の各仕様書）</span>
          </li>
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.mlit.go.jp/gobuild/gobuild_tk2_000016.html" 
               target="_blank" rel="noopener noreferrer">
              建築設計基準
            </a>
            <span className="text-[10px] text-gray-400">（官庁施設の基本的性能基準）</span>
          </li>
        </ul>
      </div>

      {/* 2. 省エネ・環境（計算支援・CASBEE） */}
      <div className="text-[12px]">
        <div className="font-bold text-gray-800 mb-1">省エネ・環境</div>
        <ul className="list-disc list-outside ml-4 space-y-1 text-gray-600">
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.kenken.go.jp/becc/" 
               target="_blank" rel="noopener noreferrer">
              建築物省エネ法 計算支援プログラム
            </a>
            <span className="text-[10px] text-gray-400">（国立研究開発法人 建築研究所）</span>
          </li>
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.ibec.or.jp/" 
               target="_blank" rel="noopener noreferrer">
              建築省エネ機構 (IBEC)
            </a>
            <span className="text-[10px] text-gray-400">（CASBEE・省エネ基準等の解説）</span>
          </li>
        </ul>
      </div>

      {/* 3. 構造・技術基準（黄色本など） */}
      <div className="text-[12px]">
        <div className="font-bold text-gray-800 mb-1">構造・技術基準</div>
        <ul className="list-disc list-outside ml-4 space-y-1 text-gray-600">
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.icba.or.jp/" 
               target="_blank" rel="noopener noreferrer">
              建築行政情報センター (ICBA)
            </a>
            <span className="text-[10px] text-gray-400">（構造関係技術基準解説書Q&A等）</span>
          </li>
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.aij.or.jp/" 
               target="_blank" rel="noopener noreferrer">
              日本建築学会 (AIJ)
            </a>
            <span className="text-[10px] text-gray-400">（JASS・各構造設計指針）</span>
          </li>
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.bcj.or.jp/" 
               target="_blank" rel="noopener noreferrer">
              日本建築センター (BCJ)
            </a>
            <span className="text-[10px] text-gray-400">（法令実務・防災性能評価）</span>
          </li>
        </ul>
      </div>

      {/* 4. バリアフリー・用途別ガイドライン */}
      <div className="text-[12px]">
        <div className="font-bold text-gray-800 mb-1">バリアフリー・用途別指針</div>
        <ul className="list-disc list-outside ml-4 space-y-1 text-gray-600">
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.mlit.go.jp/jutakukentiku/build/barrier-free.html" 
               target="_blank" rel="noopener noreferrer">
              バリアフリー設計ガイドライン
            </a>
            <span className="text-[10px] text-gray-400">（高齢者・障害者等の移動円滑化）</span>
          </li>
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.mext.go.jp/a_menu/shisetu/shuppan/1291350.htm" 
               target="_blank" rel="noopener noreferrer">
              学校施設整備指針
            </a>
            <span className="text-[10px] text-gray-400">（文部科学省）</span>
          </li>
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188411.html" 
               target="_blank" rel="noopener noreferrer">
              医療施設の施設基準等
            </a>
            <span className="text-[10px] text-gray-400">（厚生労働省）</span>
          </li>
        </ul>
      </div>

       {/* 5. 消防・設備関連 */}
       <div className="text-[12px]">
        <div className="font-bold text-gray-800 mb-1">設備・消防</div>
        <ul className="list-disc list-outside ml-4 space-y-1 text-gray-600">
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="https://www.fdma.go.jp/laws/tutatsu/" 
               target="_blank" rel="noopener noreferrer">
              消防庁 通知・通達等
            </a>
            <span className="text-[10px] text-gray-400">（予防関係等の技術的助言）</span>
          </li>
          <li>
            <a className="text-blue-600 hover:underline hover:text-blue-800 transition-colors block" 
               href="http://www.shasej.org/" 
               target="_blank" rel="noopener noreferrer">
              空気調和・衛生工学会 (SHASE)
            </a>
            <span className="text-[10px] text-gray-400">（設備設計基準・便覧）</span>
          </li>
        </ul>
      </div>

    </div>
  )
}

export default ReferenceResources
