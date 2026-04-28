'use client';

import React, { useState, useEffect, useRef } from 'react';

const LawsRegulations: React.FC = () => {
  const [showBeppyo1Modal, setShowBeppyo1Modal] = useState(false);
  const [showBeppyo2Modal, setShowBeppyo2Modal] = useState(false);
  const [showBeppyo3Modal, setShowBeppyo3Modal] = useState(false);
  const [showBeppyo4Modal, setShowBeppyo4Modal] = useState(false);
  
  const modalContentRef1 = useRef<HTMLDivElement>(null);
  const modalContentRef2 = useRef<HTMLDivElement>(null);
  const modalContentRef3 = useRef<HTMLDivElement>(null);
  const modalContentRef4 = useRef<HTMLDivElement>(null);
  
  // モーダルが開いているかどうか
  const isModalOpen = showBeppyo1Modal || showBeppyo2Modal || showBeppyo3Modal || showBeppyo4Modal;
  
  // モーダル表示中に背景のスクロールを無効化
  useEffect(() => {
    if (isModalOpen) {
      // 背景のスクロールを無効化
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const scrollY = window.scrollY;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isModalOpen]);
  
  // モーダル外でホイールを動かしたときにモーダル内をスクロール
  const handleModalWheel = (e: React.WheelEvent, modalRef: React.RefObject<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // モーダルコンテンツ内でホイールが動いた場合は通常のスクロールを許可
    if (modalRef.current && modalRef.current.contains(target)) {
      return;
    }
    // モーダル背景（オーバーレイ）上でホイールが動いた場合、モーダル内をスクロール
    e.preventDefault();
    e.stopPropagation();
    if (modalRef.current) {
      const currentScroll = modalRef.current.scrollTop;
      const maxScroll = modalRef.current.scrollHeight - modalRef.current.clientHeight;
      const newScroll = Math.max(0, Math.min(maxScroll, currentScroll + e.deltaY));
      modalRef.current.scrollTop = newScroll;
    }
  };

  // 別表表示用の関数
  const showBeppyo1 = () => {
    setShowBeppyo1Modal(true);
  };

  const showBeppyo2 = () => {
    setShowBeppyo2Modal(true);
  };

  const showBeppyo3 = () => {
    setShowBeppyo3Modal(true);
  };

  const showBeppyo4 = () => {
    setShowBeppyo4Modal(true);
  };

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">法規</h2>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        建築設計で頻繁に参照する法令・告示リンクをまとめています（e-Gov法令検索・国交省データベースへ遷移します）。
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        
        {/* 建築基準法 */}
        <div className="bg-white p-4 rounded border border-gray-300 md:col-span-2">
          <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">建築基準法</h3>
          <p className="text-[11px] mb-2 text-gray-500">建築物の敷地、構造、設備及び用途に関する最低の基準</p>
          <div className="flex gap-2 flex-wrap mb-2">
            <a href="https://elaws.e-gov.go.jp/document?lawid=325AC0000000201" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 border border-blue-200 font-bold no-underline inline-block">法</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=325CO0000000338" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行令</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=325M50004000040" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行規則</a>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={showBeppyo1} className="text-[11px] text-teal-700 bg-teal-50 px-3 py-1.5 rounded hover:bg-teal-100 border border-teal-200">別表1 (耐火建築物)</button>
            <button onClick={showBeppyo2} className="text-[11px] text-teal-700 bg-teal-50 px-3 py-1.5 rounded hover:bg-teal-100 border border-teal-200">別表2 (用途地域)</button>
            <button onClick={showBeppyo3} className="text-[11px] text-teal-700 bg-teal-50 px-3 py-1.5 rounded hover:bg-teal-100 border border-teal-200">別表3 (道路斜線)</button>
            <button onClick={showBeppyo4} className="text-[11px] text-teal-700 bg-teal-50 px-3 py-1.5 rounded hover:bg-teal-100 border border-teal-200">別表4 (日影)</button>
          </div>
        </div>

        {/* iPhone/iPadアプリ情報 */}
        <div className="bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 border-2 border-blue-400 rounded-lg p-3 shadow-md">
          <h3 className="font-bold mb-1.5 text-[13px] text-blue-900">📱 iPhone/iPadアプリ</h3>
          <div className="flex flex-col md:flex-row gap-3 items-center md:items-start">
            <div className="flex-shrink-0">
              <img 
                src="/qr-code.png" 
                alt="アプリQRコード" 
                className="w-32 h-32 md:w-36 md:h-36 border-2 border-white rounded-lg shadow-md"
              />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-gray-800">
                建築法規を確認できるアプリをリリースしました。iPhone / iPad対応。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* 国土交通省告示 */}
        <div className="bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">国土交通省告示</h3>
          <p className="text-[11px] mb-2 text-gray-500">技術的基準を定める告示の検索</p>
          <div className="flex gap-2">
            <a href="https://www.mlit.go.jp/notice/index.html" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 border border-blue-200 font-bold no-underline inline-block">告示検索システム</a>
            <a href="https://www.mlit.go.jp/jutakukentiku/build/jutakukentiku_house_fr_000074.html" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">技術的助言・通達</a>
          </div>
        </div>

        {/* 建築物省エネ法 (追加) */}
        <div className="bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">建築物省エネ法</h3>
          <p className="text-[11px] mb-2 text-gray-500">建築物のエネルギー消費性能の向上に関する法律</p>
          <div className="flex gap-2">
            <a href="https://elaws.e-gov.go.jp/document?lawid=427AC0000000053" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 border border-blue-200 font-bold no-underline inline-block">法</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=428CO0000000008" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行令</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=428M60000800008" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行規則</a>
          </div>
        </div>

        {/* 消防法 */}
        <div className="bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">消防法</h3>
          <p className="text-[11px] mb-2 text-gray-500">火災予防・危険物規制・消防用設備等</p>
          <div className="flex gap-2">
            <a href="https://elaws.e-gov.go.jp/document?lawid=323AC1000000186" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 border border-blue-200 font-bold no-underline inline-block">法</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=336CO0000000037" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行令</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=336M50000008006" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行規則</a>
          </div>
        </div>

        {/* 都市計画法 */}
        <div className="bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">都市計画法</h3>
          <p className="text-[11px] mb-2 text-gray-500">都市計画の内容及び決定手続、都市計画制限等</p>
          <div className="flex gap-2">
            <a href="https://elaws.e-gov.go.jp/document?lawid=343AC0000000100" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 border border-blue-200 font-bold no-underline inline-block">法</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=344CO0000000158" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行令</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=344M50004000049" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行規則</a>
          </div>
        </div>

        {/* バリアフリー法 */}
        <div className="bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">バリアフリー法</h3>
          <p className="text-[11px] mb-2 text-gray-500">高齢者、障害者等の移動等の円滑化の促進</p>
          <div className="flex gap-2">
            <a href="https://elaws.e-gov.go.jp/document?lawid=418AC0000000091" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 border border-blue-200 font-bold no-underline inline-block">法</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=418CO0000000379" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行令</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=418M60000800011" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行規則</a>
        </div>
      </div>

        {/* 道路法 (追加) */}
        <div className="bg-white p-4 rounded border border-gray-300">
          <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">道路法</h3>
          <p className="text-[11px] mb-2 text-gray-500">道路の定義、整備手続き、管理、費用負担等</p>
          <div className="flex gap-2">
            <a href="https://elaws.e-gov.go.jp/document?lawid=327AC0000000180" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 border border-blue-200 font-bold no-underline inline-block">法</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=327CO0000000479" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行令</a>
            <a href="https://elaws.e-gov.go.jp/document?lawid=327M50004000025" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 bg-gray-50 px-3 py-1.5 rounded hover:bg-gray-100 border border-gray-200 no-underline inline-block">施行規則</a>
          </div>
        </div>

      </div>


      {/* 別表1 モーダル */}
      {showBeppyo1Modal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4"
          style={{ paddingTop: '120px', zIndex: 2147483647 }}
          onClick={() => setShowBeppyo1Modal(false)}
          onWheel={(e) => handleModalWheel(e, modalContentRef1)}
        >
          <div 
            ref={modalContentRef1}
            className="bg-white w-full overflow-hidden overflow-y-auto"
            style={{ maxWidth: 'min(900px, 90vw)', maxHeight: 'calc(90vh + 20px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 bg-opacity-100 z-10">
              <h3 className="text-base font-semibold">別表第一 耐火建築物等としなければならない特殊建築物</h3>
              <button
                onClick={() => setShowBeppyo1Modal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-600 mb-4">
                （第六条、第二十一条、第二十七条、第二十八条、第三十五条一第三十五条の三、第九十条の三関係）
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-center w-12">項</th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(い)</div>
                        <div className="text-[10px] text-gray-600">用途</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(ろ)</div>
                        <div className="text-[10px] text-gray-600">(い)欄の用途に供する階</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(は)</div>
                        <div className="text-[10px] text-gray-600">(い)欄の用途に供する部分((一)項の場合にあつては客席、(二)項及び(四)項の場合にあつては2階、(五)項の場合にあつては3階以上の部分に限り、かつ、病院及び診療所についてはその部分に患者の収容施設がある場合に限る。)の床面積の合計</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(に)</div>
                        <div className="text-[10px] text-gray-600">(い)欄の用途に供する部分の床面積の合計</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-2 text-center">(一)</td>
                      <td className="border border-gray-300 p-2">劇場、映画館、演芸場、観覧場、公会堂、集会場その他これらに類するもので政令で定めるもの</td>
                      <td className="border border-gray-300 p-2">3階以上の階</td>
                      <td className="border border-gray-300 p-2">200平方メートル（屋外観覧席にあつては、1,000平方メートル）以上</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 text-center">(二)</td>
                      <td className="border border-gray-300 p-2">病院、診療所（患者の収容施設があるものに限る。）、ホテル、旅館、下宿、共同住宅、寄宿舎その他これらに類するもので政令で定めるもの</td>
                      <td className="border border-gray-300 p-2">3階以上の階</td>
                      <td className="border border-gray-300 p-2">300平方メートル以上</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 text-center">(三)</td>
                      <td className="border border-gray-300 p-2">学校、体育館その他これらに類するもので政令で定めるもの</td>
                      <td className="border border-gray-300 p-2">3階以上の階</td>
                      <td className="border border-gray-300 p-2">2,000平方メートル以上</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 text-center">(四)</td>
                      <td className="border border-gray-300 p-2">百貨店、マーケット、展示場、キャバレー、カフェー、ナイトクラブ、バー、ダンスホール、遊技場その他これらに類するもので政令で定めるもの</td>
                      <td className="border border-gray-300 p-2">3階以上の階</td>
                      <td className="border border-gray-300 p-2">500平方メートル以上</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 text-center">(五)</td>
                      <td className="border border-gray-300 p-2">倉庫その他これに類するもので政令で定めるもの</td>
                      <td className="border border-gray-300 p-2">-</td>
                      <td className="border border-gray-300 p-2">200平方メートル以上</td>
                      <td className="border border-gray-300 p-2">1,500平方メートル以上</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 text-center">(六)</td>
                      <td className="border border-gray-300 p-2">自動車車庫、自動車修理工場その他これらに類するもので政令で定めるもの</td>
                      <td className="border border-gray-300 p-2">3階以上の階</td>
                      <td className="border border-gray-300 p-2">-</td>
                      <td className="border border-gray-300 p-2">150平方メートル以上</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 別表2 モーダル */}
      {showBeppyo2Modal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4"
          style={{ paddingTop: '120px', zIndex: 2147483647 }}
          onClick={() => setShowBeppyo2Modal(false)}
          onWheel={(e) => handleModalWheel(e, modalContentRef2)}
        >
          <div 
            ref={modalContentRef2}
            className="bg-white w-full overflow-hidden overflow-y-auto"
            style={{ maxWidth: 'min(900px, 90vw)', maxHeight: 'calc(100vh - 200px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 bg-opacity-100 z-10">
              <h3 className="text-base font-semibold">別表第二 用途地域等内の建築物の制限</h3>
              <button
                onClick={() => setShowBeppyo2Modal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-600 mb-4">
                （第二十七条、第四十八条、第六十八条の三関係）
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-center w-16">項</th>
                      <th className="border border-gray-300 p-2 text-left">用途地域等</th>
                      <th className="border border-gray-300 p-2 text-left">建築物の制限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* (い) 第一種低層住居専用地域内に建築することができる建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(い)</td>
                      <td className="border border-gray-300 p-2 align-top">第一種低層住居専用地域内に建築することができる建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　住宅</div>
                          <div>二　住宅で事務所、店舗その他これらに類する用途を兼ねるもののうち政令で定めるもの</div>
                          <div>三　共同住宅、寄宿舎又は下宿</div>
                          <div>四　学校（大学、高等専門学校、専修学校及び各種学校を除く。）、図書館その他これらに類するもの</div>
                          <div>五　神社、寺院、教会その他これらに類するもの</div>
                          <div>六　老人ホーム、保育所、福祉ホームその他これらに類するもの</div>
                          <div>七　公衆浴場（風俗営業等の規制及び業務の適正化等に関する法律（昭和23年法律第122号）第2条第6項第1号に該当する営業（以下この表において「個室付浴場業」という。）に係るものを除く。）</div>
                          <div>八　診療所</div>
                          <div>九　巡査派出所、公衆電話所その他これらに類する政令で定める公益上必要な建築物</div>
                          <div>十　前各号の建築物に附属するもの（政令で定めるものを除く。）</div>
                        </div>
                      </td>
                    </tr>
                    {/* (ろ) 第二種低層住居専用地域内に建築することができる建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(ろ)</td>
                      <td className="border border-gray-300 p-2 align-top">第二種低層住居専用地域内に建築することができる建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（い）項第一号から第九号までに掲げるもの</div>
                          <div>二　店舗、飲食店その他これらに類する用途に供するもののうち政令で定めるものでその用途に供する部分の床面積の合計が150平方メートル以内のもの（3階以上の部分をその用途に供するものを除く。）</div>
                          <div>三　前二号の建築物に附属するもの（政令で定めるものを除く。）</div>
                        </div>
                      </td>
                    </tr>
                    {/* (は) 第一種中高層住居専用地域内に建築することができる建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(は)</td>
                      <td className="border border-gray-300 p-2 align-top">第一種中高層住居専用地域内に建築することができる建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（い）項第一号から第九号までに掲げるもの</div>
                          <div>二　大学、高等専門学校、専修学校その他これらに類するもの</div>
                          <div>三　病院</div>
                          <div>四　老人福祉センター、児童厚生施設その他これらに類するもの</div>
                          <div>五　店舗、飲食店その他これらに類する用途に供するもののうち政令で定めるものでその用途に供する部分の床面積の合計が500平方メートル以内のもの（3階以上の部分をその用途に供するものを除く。）</div>
                          <div>六　自動車車庫で床面積の合計が300平方メートル以内のもの又は都市計画として決定されたもの（3階以上の部分をその用途に供するものを除く。）</div>
                          <div>七　公益上必要な建築物で政令で定めるもの</div>
                          <div>八　前各号の建築物に附属するもの（政令で定めるものを除く。）</div>
                        </div>
                      </td>
                    </tr>
                    {/* (に) 第二種中高層住居専用地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(に)</td>
                      <td className="border border-gray-300 p-2 align-top">第二種中高層住居専用地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（ほ）項第二号及び第三号、（へ）項第三号から第五号まで、（と）項第四号並びに（り）項第二号及び第三号に掲げるもの</div>
                          <div>二　工場（政令で定めるものを除く。）</div>
                          <div>三　ボーリング場、スケート場、水泳場その他これらに類する政令で定める運動施設</div>
                          <div>四　ホテル又は旅館</div>
                          <div>五　自動車教習所</div>
                          <div>六　政令で定める規模の畜舎</div>
                          <div>七　3階以上の部分を（は）項に掲げる建築物以外の建築物の用途に供するもの（政令で定めるものを除く。）</div>
                          <div>八　（は）項に掲げる建築物以外の建築物の用途に供するものでその用途に供する部分の床面積の合計が1,500平方メートルを超えるもの（政令で定めるものを除く。）</div>
                        </div>
                      </td>
                    </tr>
                    {/* (ほ) 第一種住居地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(ほ)</td>
                      <td className="border border-gray-300 p-2 align-top">第一種住居地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（へ）項第一号から第五号までに掲げるもの</div>
                          <div>二　マージャン屋、ぱちんこ屋、射的場、勝馬投票券発売所、場外車券売場その他これらに類するもの</div>
                          <div>三　カラオケボックスその他これに類するもの</div>
                          <div>四　（は）項に掲げる建築物以外の建築物の用途に供するものでその用途に供する部分の床面積の合計が3,000平方メートルを超えるもの（政令で定めるものを除く。）</div>
                        </div>
                      </td>
                    </tr>
                    {/* (へ) 第二種住居地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(へ)</td>
                      <td className="border border-gray-300 p-2 align-top">第二種住居地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（と）項第三号及び第四号並びに（り）項に掲げるもの</div>
                          <div>二　原動機を使用する工場で作業場の床面積の合計が50平方メートルを超えるもの</div>
                          <div>三　劇場、映画館、演芸場若しくは観覧場又はナイトクラブその他これに類する政令で定めるもの</div>
                          <div>四　自動車車庫で床面積の合計が300平方メートルを超えるもの又は3階以上の部分にあるもの（建築物に附属するもので政令で定めるもの又は都市計画として決定されたものを除く。）</div>
                          <div>五　倉庫業を営む倉庫</div>
                          <div>六　店舗、飲食店、展示場、遊技場、勝馬投票券発売所、場外車券売場その他これらに類する用途で政令で定めるものに供する建築物でその用途に供する部分の床面積の合計が10,000平方メートルを超えるもの</div>
                        </div>
                      </td>
                    </tr>
                    {/* (と) 準住居地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(と)</td>
                      <td className="border border-gray-300 p-2 align-top">準住居地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（り）項に掲げるもの</div>
                          <div>二　原動機を使用する工場で作業場の床面積の合計が50平方メートルを超えるもの（作業場の床面積の合計が150平方メートルを超えない自動車修理工場を除く。）</div>
                          <div>三　次に掲げる事業（特殊の機械の使用その他の特殊の方法による事業であつて住居の環境を害するおそれがないものとして政令で定めるものを除く。）を営む工場</div>
                          <div className="pl-4 space-y-0.5">
                            <div>（一）　容量10リットル以上30リットル以下のアセチレンガス発生器を用いる金属の工作</div>
                            <div>（一の二）　印刷用インキの製造</div>
                            <div>（二）　出力の合計が0.75キロワット以下の原動機を使用する塗料の吹付</div>
                            <div>（二の二）　原動機を使用する魚肉の練製品の製造</div>
                            <div>（三）　原動機を使用する2台以下の研磨機による金属の乾燥研磨（工具研磨を除く。）</div>
                            <div>（四）　コルク、エボナイト若しくは合成樹脂の粉砕若しくは乾燥研磨又は木材の粉砕で原動機を使用するもの</div>
                            <div>（四の二）　厚さ0.5ミリメートル以上の金属板のつち打加工（金属工芸品の製造を目的とするものを除く。）又は原動機を使用する金属のプレス（液圧プレスのうち矯正プレスを使用するものを除く。）若しくはせん断</div>
                            <div>（四の三）　印刷用平版の研磨</div>
                            <div>（四の四）　糖衣機を使用する製品の製造</div>
                            <div>（四の五）　原動機を使用するセメント製品の製造</div>
                            <div>（四の六）　ワイヤーフォーミングマシンを使用する金属線の加工で出力の合計が0.75キロワットを超える原動機を使用するもの</div>
                            <div>（五）　木材の引割若しくはかんな削り、裁縫、機織、撚糸、組ひも、編物、製袋又はやすりの目立で出力の合計が0.75キロワットを超える原動機を使用するもの</div>
                            <div>（六）　製針又は石材の引割で出力の合計が1.5キロワットを超える原動機を使用するもの</div>
                            <div>（七）　出力の合計が2.5キロワットを超える原動機を使用する製粉</div>
                            <div>（八）　合成樹脂の射出成形加工</div>
                            <div>（九）　出力の合計が10キロワットを超える原動機を使用する金属の切削</div>
                            <div>（十）　メッキ</div>
                            <div>（十一）　原動機の出力の合計が1.5キロワットを超える空気圧縮機を使用する作業</div>
                            <div>（十二）　原動機を使用する印刷</div>
                            <div>（十三）　ベンディングマシン（ロール式のものに限る。）を使用する金属の加工</div>
                            <div>（十四）　タンブラーを使用する金属の加工</div>
                            <div>（十五）　ゴム練用又は合成樹脂練用のロール機（カレンダーロール機を除く。）を使用する作業</div>
                            <div>（十六）　（一）から（十五）までに掲げるもののほか、安全上若しくは防火上の危険の度又は衛生上若しくは健康上の有害の度が高いことにより、住居の環境を保護する上で支障があるものとして政令で定める事業</div>
                          </div>
                          <div>四　（る）項第一号（一）から（三）まで、（十一）又は（十二）の物品（（ぬ）項第四号及び（る）項第二号において「危険物」という。）の貯蔵又は処理に供するもので政令で定めるもの</div>
                          <div>五　劇場、映画館、演芸場若しくは観覧場のうち客席の部分の床面積の合計が200平方メートル以上のもの又はナイトクラブその他これに類する用途で政令で定めるものに供する建築物でその用途に供する部分の床面積の合計が200平方メートル以上のもの</div>
                          <div>六　前号に掲げるもののほか、劇場、映画館、演芸場若しくは観覧場、ナイトクラブその他これに類する用途で政令で定めるもの又は店舗、飲食店、展示場、遊技場、勝馬投票券発売所、場外車券売場その他これらに類する用途で政令で定めるものに供する建築物でその用途に供する部分（劇場、映画館、演芸場又は観覧場の用途に供する部分にあつては、客席の部分に限る。）の床面積の合計が10,000平方メートルを超えるもの</div>
                        </div>
                      </td>
                    </tr>
                    {/* (ち) 田園住居地域内に建築することができる建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(ち)</td>
                      <td className="border border-gray-300 p-2 align-top">田園住居地域内に建築することができる建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（い）項第一号から第九号までに掲げるもの</div>
                          <div>二　農産物の生産、集荷、処理又は貯蔵に供するもの（政令で定めるものを除く。）</div>
                          <div>三　農業の生産資材の貯蔵に供するもの</div>
                          <div>四　地域で生産された農産物の販売を主たる目的とする店舗その他の農業の利便を増進するために必要な店舗、飲食店その他これらに類する用途に供するもののうち政令で定めるものでその用途に供する部分の床面積の合計が500平方メートル以内のもの（3階以上の部分をその用途に供するものを除く。）</div>
                          <div>五　前号に掲げるもののほか、店舗、飲食店その他これらに類する用途に供するもののうち政令で定めるものでその用途に供する部分の床面積の合計が150平方メートル以内のもの（3階以上の部分をその用途に供するものを除く。）</div>
                          <div>六　前各号の建築物に附属するもの（政令で定めるものを除く。）</div>
                        </div>
                      </td>
                    </tr>
                    {/* (り) 近隣商業地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(り)</td>
                      <td className="border border-gray-300 p-2 align-top">近隣商業地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（ぬ）項に掲げるもの</div>
                          <div>二　キャバレー、料理店その他これらに類するもの</div>
                          <div>三　個室付浴場業に係る公衆浴場その他これに類する政令で定めるもの</div>
                        </div>
                      </td>
                    </tr>
                    {/* (ぬ) 商業地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(ぬ)</td>
                      <td className="border border-gray-300 p-2 align-top">商業地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（る）項第一号及び第二号に掲げるもの</div>
                          <div>二　原動機を使用する工場で作業場の床面積の合計が150平方メートルを超えるもの（日刊新聞の印刷所及び作業場の床面積の合計が300平方メートルを超えない自動車修理工場を除く。）</div>
                          <div>三　次に掲げる事業（特殊の機械の使用その他の特殊の方法による事業であつて商業その他の業務の利便を害するおそれがないものとして政令で定めるものを除く。）を営む工場</div>
                          <div className="pl-4 space-y-0.5">
                            <div>（一）　玩具煙火の製造</div>
                            <div>（二）　アセチレンガスを用いる金属の工作（アセチレンガス発生器の容量30リットル以下のもの又は溶解アセチレンガスを用いるものを除く。）</div>
                            <div>（三）　引火性溶剤を用いるドライクリーニング、ドライダイイング又は塗料の加熱乾燥若しくは焼付（赤外線を用いるものを除く。）</div>
                            <div>（四）　セルロイドの加熱加工又は機械のこぎりを使用する加工</div>
                            <div>（五）　絵具又は水性塗料の製造</div>
                            <div>（六）　出力の合計が0.75キロワットを超える原動機を使用する塗料の吹付</div>
                            <div>（七）　亜硫酸ガスを用いる物品の漂白</div>
                            <div>（八）　骨炭その他動物質炭の製造</div>
                            <div>（八の二）　せつけんの製造</div>
                            <div>（八の三）　魚粉、フェザーミール、肉骨粉、肉粉若しくは血粉又はこれらを原料とする飼料の製造</div>
                            <div>（八の四）　手すき紙の製造</div>
                            <div>（九）　羽又は毛の洗浄、染色又は漂白</div>
                            <div>（十）　ぼろ、くず綿、くず紙、くず糸、くず毛その他これらに類するものの消毒、選別、洗浄又は漂白</div>
                            <div>（十一）　製綿、古綿の再製、起毛、せん毛、反毛又はフェルトの製造で原動機を使用するもの</div>
                            <div>（十二）　骨、角、牙、ひづめ若しくは貝殻の引割若しくは乾燥研磨又は3台以上の研磨機による金属の乾燥研磨で原動機を使用するもの</div>
                            <div>（十三）　鉱物、岩石、土砂、コンクリート、アスファルト・コンクリート、硫黄、金属、ガラス、れんが、陶磁器、骨又は貝殻の粉砕で原動機を使用するもの</div>
                            <div>（十三の二）　レディーミクストコンクリートの製造又はセメントの袋詰で出力の合計が2.5キロワットを超える原動機を使用するもの</div>
                            <div>（十四）　壁、懐炉灰又はれん炭の製造</div>
                            <div>（十五）　活字若しくは金属工芸品の鋳造又は金属の溶融で容量の合計が50リットルを超えないるつぼ又は窯を使用するもの（印刷所における活字の鋳造を除く。）</div>
                            <div>（十六）　瓦、れんが、土器、陶磁器、人造砥石、るつぼ又はほうろう鉄器の製造</div>
                            <div>（十七）　ガラスの製造又は砂吹</div>
                            <div>（十七の二）　金属の溶射又は砂吹</div>
                            <div>（十七の三）　鉄板の波付加工</div>
                            <div>（十七の四）　ドラム缶の洗浄又は再生</div>
                            <div>（十八）　スプリングハンマーを使用する金属の鍛造</div>
                            <div>（十九）　伸線、伸管又はロールを用いる金属の圧延で出力の合計が4キロワット以下の原動機を使用するもの</div>
                            <div>（二十）　（一）から（十九）までに掲げるもののほか、安全上若しくは防火上の危険の度又は衛生上若しくは健康上の有害の度が高いことにより、商業その他の業務の利便を増進する上で支障があるものとして政令で定める事業</div>
                          </div>
                          <div>四　危険物の貯蔵又は処理に供するもので政令で定めるもの</div>
                        </div>
                      </td>
                    </tr>
                    {/* (る) 準工業地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(る)</td>
                      <td className="border border-gray-300 p-2 align-top">準工業地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　次に掲げる事業（特殊の機械の使用その他の特殊の方法による事業であつて環境の悪化をもたらすおそれのない工業の利便を害するおそれがないものとして政令で定めるものを除く。）を営む工場</div>
                          <div className="pl-4 space-y-0.5">
                            <div>（一）　火薬類取締法（昭和25年法律第149号）の火薬類（玩具煙火を除く。）の製造</div>
                            <div>（二）　消防法（昭和23年法律第186号）第2条第7項に規定する危険物の製造（政令で定めるものを除く。）</div>
                            <div>（三）　マッチの製造</div>
                            <div>（四）　ニトロセルロース製品の製造</div>
                            <div>（五）　ビスコース製品、アセテート又は銅アンモニアレーヨンの製造</div>
                            <div>（六）　合成染料若しくはその中間物、顔料又は塗料の製造（漆又は水性塗料の製造を除く。）</div>
                            <div>（七）　引火性溶剤を用いるゴム製品又は芳香油の製造</div>
                            <div>（八）　乾燥油又は引火性溶剤を用いる擬革紙布又は防水紙布の製造</div>
                            <div>（九）　木材を原料とする活性炭の製造（水蒸気法によるものを除く。）</div>
                            <div>（十）　石炭ガス類又はコークスの製造</div>
                            <div>（十一）　可燃性ガスの製造（政令で定めるものを除く。）</div>
                            <div>（十二）　圧縮ガス又は液化ガスの製造（製氷又は冷凍を目的とするものを除く。）</div>
                            <div>（十三）　塩素、臭素、ヨード、硫黄、塩化硫黄、弗化水素酸、塩酸、硝酸、硫酸、燐酸、苛性カリ、苛性ソーダ、アンモニア水、炭酸カリ、洗濯ソーダ、ソーダ灰、さらし粉、次硝酸蒼鉛、亜硫酸塩類、チオ硫酸塩類、砒素化合物、鉛化合物、バリウム化合物、銅化合物、水銀化合物、シアン化合物、クロールズルホン酸、クロロホルム、四塩化炭素、ホルマリン、ズルホナール、グリセリン、イヒチオールズルホン酸アンモン、酢酸、石炭酸、安息香酸、タンニン酸、アセトアニリド、アスピリン又はグアヤコールの製造</div>
                            <div>（十四）　たんぱく質の加水分解による製品の製造</div>
                            <div>（十五）　油脂の採取、硬化又は加熱加工（化粧品の製造を除く。）</div>
                            <div>（十六）　ファクチス、合成樹脂、合成ゴム又は合成繊維の製造</div>
                            <div>（十七）　肥料の製造</div>
                            <div>（十八）　製紙（手すき紙の製造を除く。）又はパルプの製造</div>
                            <div>（十九）　製革、にかわの製造又は毛皮若しくは骨の精製</div>
                            <div>（二十）　アスファルトの精製</div>
                            <div>（二十一）　アスファルト、コールタール、木タール、石油蒸溜産物又はその残りかすを原料とする製造</div>
                            <div>（二十二）　セメント、石膏、消石灰、生石灰又はカーバイドの製造</div>
                            <div>（二十三）　金属の溶融又は精練（容量の合計が50リットルを超えないるつぼ若しくは窯を使用するもの又は活字若しくは金属工芸品の製造を目的とするものを除く。）</div>
                            <div>（二十四）　炭素粉を原料とする炭素製品若しくは黒鉛製品の製造又は黒鉛の粉砕</div>
                            <div>（二十五）　金属厚板又は形鋼の工作で原動機を使用するはつり作業（グラインダーを用いるものを除く。）、びよう打作業又は孔埋作業を伴うもの</div>
                            <div>（二十六）　鉄釘類又は鋼球の製造</div>
                            <div>（二十七）　伸線、伸管又はロールを用いる金属の圧延で出力の合計が4キロワットを超える原動機を使用するもの</div>
                            <div>（二十八）　鍛造機（スプリングハンマーを除く。）を使用する金属の鍛造</div>
                            <div>（二十九）　動物の臓器又は排せつ物を原料とする医薬品の製造</div>
                            <div>（三十）　石綿を含有する製品の製造又は粉砕</div>
                            <div>（三十一）　（一）から（三十）までに掲げるもののほか、安全上若しくは防火上の危険の度又は衛生上若しくは健康上の有害の度が高いことにより、環境の悪化をもたらすおそれのない工業の利便を増進する上で支障があるものとして政令で定める事業</div>
                          </div>
                          <div>二　危険物の貯蔵又は処理に供するもので政令で定めるもの</div>
                          <div>三　個室付浴場業に係る公衆浴場その他これに類する政令で定めるもの</div>
                        </div>
                      </td>
                    </tr>
                    {/* (を) 工業地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(を)</td>
                      <td className="border border-gray-300 p-2 align-top">工業地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（る）項第三号に掲げるもの</div>
                          <div>二　ホテル又は旅館</div>
                          <div>三　キャバレー、料理店その他これらに類するもの</div>
                          <div>四　劇場、映画館、演芸場若しくは観覧場又はナイトクラブその他これに類する政令で定めるもの</div>
                          <div>五　学校（幼保連携型認定こども園を除く。）</div>
                          <div>六　病院</div>
                          <div>七　店舗、飲食店、展示場、遊技場、勝馬投票券発売所、場外車券売場その他これらに類する用途で政令で定めるものに供する建築物でその用途に供する部分の床面積の合計が10,000平方メートルを超えるもの</div>
                        </div>
                      </td>
                    </tr>
                    {/* (わ) 工業専用地域内に建築してはならない建築物 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(わ)</td>
                      <td className="border border-gray-300 p-2 align-top">工業専用地域内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>一　（を）項に掲げるもの</div>
                          <div>二　住宅</div>
                          <div>三　共同住宅、寄宿舎又は下宿</div>
                          <div>四　老人ホーム、福祉ホームその他これらに類するもの</div>
                          <div>五　物品販売業を営む店舗又は飲食店</div>
                          <div>六　図書館、博物館その他これらに類するもの</div>
                          <div>七　ボーリング場、スケート場、水泳場その他これらに類する政令で定める運動施設</div>
                          <div>八　マージャン屋、ぱちんこ屋、射的場、勝馬投票券発売所、場外車券売場その他これらに類するもの</div>
                        </div>
                      </td>
                    </tr>
                    {/* (か) 用途地域の指定のない区域 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(か)</td>
                      <td className="border border-gray-300 p-2 align-top">用途地域の指定のない区域（都市計画法第7条第1項に規定する市街化調整区域を除く。）内に建築してはならない建築物</td>
                      <td className="border border-gray-300 p-2">
                        <div className="space-y-1">
                          <div>劇場、映画館、演芸場若しくは観覧場、ナイトクラブその他これに類する用途で政令で定めるもの又は店舗、飲食店、展示場、遊技場、勝馬投票券発売所、場外車券売場その他これらに類する用途で政令で定めるものに供する建築物でその用途に供する部分（劇場、映画館、演芸場又は観覧場の用途に供する部分にあつては、客席の部分に限る。）の床面積の合計が10,000平方メートルを超えるもの</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 別表3 モーダル */}
      {showBeppyo3Modal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4"
          style={{ paddingTop: '120px', zIndex: 2147483647 }}
          onClick={() => setShowBeppyo3Modal(false)}
          onWheel={(e) => handleModalWheel(e, modalContentRef3)}
        >
          <div 
            ref={modalContentRef3}
            className="bg-white w-full overflow-hidden overflow-y-auto"
            style={{ maxWidth: 'min(900px, 90vw)', maxHeight: 'calc(100vh - 200px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 bg-opacity-100 z-10">
              <h3 className="text-base font-semibold">別表第三 前面道路との関係についての建築物の各部分の高さの制限</h3>
              <button
                onClick={() => setShowBeppyo3Modal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-600 mb-4">
                （第五十六条、第九十一条関係）
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-center w-16">項</th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(い)</div>
                        <div className="text-[10px] text-gray-600">建築物がある地域、地区又は区域</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(ろ)</div>
                        <div className="text-[10px] text-gray-600">第五十二条第一項、第二項、第七項及び第九項の規定による容積率の限度</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(は)</div>
                        <div className="text-[10px] text-gray-600">距離</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(に)</div>
                        <div className="text-[10px] text-gray-600">数値</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 第一項 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top" rowSpan={4}>(一)</td>
                      <td className="border border-gray-300 p-2 align-top" rowSpan={4}>
                        第一種低層住居専用地域、第二種低層住居専用地域、第一種中高層住居専用地域、第二種中高層住居専用地域若しくは田園住居地域内の建築物又は第一種住居地域、第二種住居地域若しくは準住居地域内の建築物（四の項に掲げる建築物を除く。）
                      </td>
                      <td className="border border-gray-300 p-2">20/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">20ｍ</td>
                      <td className="border border-gray-300 p-2">1.25</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">20/10を超え、30/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">25ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">30/10を超え、40/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">30ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">40/10を超える場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">35ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    {/* 第二項 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top" rowSpan={7}>(二)</td>
                      <td className="border border-gray-300 p-2 align-top" rowSpan={7}>
                        近隣商業地域又は商業地域内の建築物
                      </td>
                      <td className="border border-gray-300 p-2">40/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">20ｍ</td>
                      <td className="border border-gray-300 p-2">1.5</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">40/10を超え、60/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">25ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">60/10を超え、80/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">30ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">80/10を超え、100/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">35ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">100/10を超え、110/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">40ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">110/10を超え、120/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">45ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">120/10を超える場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">50ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    {/* 第三項 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top" rowSpan={4}>(三)</td>
                      <td className="border border-gray-300 p-2 align-top" rowSpan={4}>
                        準工業地域内の建築物（四の項に掲げる建築物を除く。）又は工業地域若しくは工業専用地域内の建築物
                      </td>
                      <td className="border border-gray-300 p-2">20/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">20ｍ</td>
                      <td className="border border-gray-300 p-2">1.5</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">20/10を超え、30/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">25ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">30/10を超え、40/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">30ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">40/10を超える場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">35ｍ</td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    {/* 第四項 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top">(四)</td>
                      <td className="border border-gray-300 p-2 align-top">
                        第一種住居地域、第二種住居地域、準住居地域又は準工業地域内について定められた高層住居誘導地区内の建築物であつて、その住宅の用途に供する部分の床面積の合計がその延べ面積の3分の2以上であるもの
                      </td>
                      <td className="border border-gray-300 p-2">-</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">35ｍ</td>
                      <td className="border border-gray-300 p-2">1.5</td>
                    </tr>
                    {/* 第五項 */}
                    <tr>
                      <td className="border border-gray-300 p-2 text-center align-top" rowSpan={3}>(五)</td>
                      <td className="border border-gray-300 p-2 align-top" rowSpan={3}>
                        用途地域の指定のない区域内の建築物
                      </td>
                      <td className="border border-gray-300 p-2">20/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">20ｍ</td>
                      <td className="border border-gray-300 p-2">0.25又は1.5のうち、特定行政庁が土地利用の状況等を考慮し当該区域を区分して都道府県都市計画審議会の議を経て定めるもの</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">20/10を超え、30/10以下の場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">25ｍ</td>
                      <td className="border border-gray-300 p-2">0.25又は1.5のうち、特定行政庁が土地利用の状況等を考慮し当該区域を区分して都道府県都市計画審議会の議を経て定めるもの</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2">30/10を超える場合</td>
                      <td className="border border-gray-300 p-2 whitespace-nowrap">30ｍ</td>
                      <td className="border border-gray-300 p-2">0.25又は1.5のうち、特定行政庁が土地利用の状況等を考慮し当該区域を区分して都道府県都市計画審議会の議を経て定めるもの</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* 備考 */}
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <h4 className="text-xs font-semibold mb-2">備考</h4>
                <div className="text-xs text-gray-700 space-y-2">
                  <div>一　建築物が(い)欄に掲げる地域、地区又は区域の二以上にわたる場合においては、(い)欄の「建築物」は「建築物の部分」と読み替えるものとする。</div>
                  <div>二　建築物の敷地が(い)欄に掲げる地域、地区又は区域の二以上にわたる場合における(は)欄の距離の適用については、政令で定める。</div>
                  <div>三　第一種中高層住居専用地域又は第二種中高層住居専用地域内の建築物で、当該地域内において定められた高層住居誘導地区（容積率の限度が40/10以上であるものに限る。）内の建築物又は第一種住居地域、第二種住居地域若しくは準住居地域内について定められた高層住居誘導地区内の建築物については、(は)欄第一項の「25メートル」を「20メートル」と、「30メートル」を「25メートル」と、「35メートル」を「30メートル」と読み替えるものとし、(に)欄第一項の「1.25」を「1.5」と読み替えるものとする。</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 別表4 モーダル */}
      {showBeppyo4Modal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4"
          style={{ paddingTop: '120px', zIndex: 2147483647 }}
          onClick={() => setShowBeppyo4Modal(false)}
          onWheel={(e) => handleModalWheel(e, modalContentRef4)}
        >
          <div 
            ref={modalContentRef4}
            className="bg-white w-full overflow-hidden overflow-y-auto"
            style={{ maxWidth: 'min(1200px, 90vw)', maxHeight: 'calc(100vh - 200px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 bg-opacity-100 z-10">
              <h3 className="text-base font-semibold">別表第四 日影による中高層の建築物の制限</h3>
              <button
                onClick={() => setShowBeppyo4Modal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-600 mb-4">
                （第五十六条、第五十六条の二関係）
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(い)</div>
                        <div className="text-[10px] text-gray-600">地域又は区域</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(ろ)</div>
                        <div className="text-[10px] text-gray-600">制限を受ける建築物</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left">
                        <div className="font-semibold mb-1">(は)</div>
                        <div className="text-[10px] text-gray-600">平均地盤面からの高さ</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left" colSpan={3}>
                        <div className="font-semibold mb-1">(に)</div>
                        <div className="text-[10px] text-gray-600">敷地境界線からの水平距離が10ｍ以内の範囲における日影時間</div>
                      </th>
                      <th className="border border-gray-300 p-2 text-left" colSpan={3}>
                        <div className="font-semibold mb-1">(ほ)</div>
                        <div className="text-[10px] text-gray-600">敷地境界線からの水平距離が10ｍを超える範囲における日影時間</div>
                      </th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2"></th>
                      <th className="border border-gray-300 p-2"></th>
                      <th className="border border-gray-300 p-2"></th>
                      <th className="border border-gray-300 p-2 text-center">(一)</th>
                      <th className="border border-gray-300 p-2 text-center">(二)</th>
                      <th className="border border-gray-300 p-2 text-center">(三)</th>
                      <th className="border border-gray-300 p-2 text-center">(一)</th>
                      <th className="border border-gray-300 p-2 text-center">(二)</th>
                      <th className="border border-gray-300 p-2 text-center">(三)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 第一項 */}
                    <tr>
                      <td className="border border-gray-300 p-2 align-top">
                        第一種低層住居専用地域、第二種低層住居専用地域又は田園住居地域
                      </td>
                      <td className="border border-gray-300 p-2 align-top">
                        軒の高さが7ｍを超える建築物又は地階を除く階数が3以上の建築物
                      </td>
                      <td className="border border-gray-300 p-2 align-top whitespace-nowrap">1.5ｍ</td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        4時間<br />(道の区域内にあつては、3時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        5時間<br />(道の区域内にあつては、4時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        2時間<br />(道の区域内にあつては、1.5時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        2.5時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2.5時間)
                      </td>
                    </tr>
                    {/* 第二項 */}
                    <tr>
                      <td className="border border-gray-300 p-2 align-top">
                        第一種中高層住居専用地域又は第二種中高層住居専用地域
                      </td>
                      <td className="border border-gray-300 p-2 align-top">
                        高さが10ｍを超える建築物
                      </td>
                      <td className="border border-gray-300 p-2 align-top whitespace-nowrap">4ｍ又は6.5ｍ</td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        4時間<br />(道の区域内にあつては、3時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        5時間<br />(道の区域内にあつては、4時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        2時間<br />(道の区域内にあつては、1.5時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        2.5時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2.5時間)
                      </td>
                    </tr>
                    {/* 第三項 */}
                    <tr>
                      <td className="border border-gray-300 p-2 align-top">
                        第一種住居地域、第二種住居地域、準住居地域、近隣商業地域又は準工業地域
                      </td>
                      <td className="border border-gray-300 p-2 align-top">
                        高さが10ｍを超える建築物
                      </td>
                      <td className="border border-gray-300 p-2 align-top whitespace-nowrap">4ｍ又は6.5ｍ</td>
                      <td className="border border-gray-300 p-2">
                        4時間<br />(道の区域内にあつては、3時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        5時間<br />(道の区域内にあつては、4時間)
                      </td>
                      <td className="border border-gray-300 p-2">-</td>
                      <td className="border border-gray-300 p-2">
                        2.5時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2.5時間)
                      </td>
                      <td className="border border-gray-300 p-2">-</td>
                    </tr>
                    {/* 第四項 - イ */}
                    <tr>
                      <td className="border border-gray-300 p-2 align-top" rowSpan={2}>
                        用途地域の指定のない区域
                      </td>
                      <td className="border border-gray-300 p-2 align-top">
                        イ　軒の高さが7ｍを超える建築物又は地階を除く階数が3以上の建築物
                      </td>
                      <td className="border border-gray-300 p-2 align-top whitespace-nowrap">1.5ｍ</td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        4時間<br />(道の区域内にあつては、3時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        5時間<br />(道の区域内にあつては、4時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        2時間<br />(道の区域内にあつては、1.5時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        2.5時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2.5時間)
                      </td>
                    </tr>
                    {/* 第四項 - ロ */}
                    <tr>
                      <td className="border border-gray-300 p-2 align-top">
                        ロ　高さが10ｍを超える建築物
                      </td>
                      <td className="border border-gray-300 p-2 align-top whitespace-nowrap">4ｍ</td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        4時間<br />(道の区域内にあつては、3時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        5時間<br />(道の区域内にあつては、4時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        2時間<br />(道の区域内にあつては、1.5時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        2.5時間<br />(道の区域内にあつては、2時間)
                      </td>
                      <td className="border border-gray-300 p-2">
                        3時間<br />(道の区域内にあつては、2.5時間)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* 備考 */}
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-700">
                  この表において、平均地盤面からの高さとは、当該建築物が周囲の地面と接する位置の平均の高さにおける水平面からの高さをいうものとする。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LawsRegulations; 