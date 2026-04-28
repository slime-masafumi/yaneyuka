'use client';

import React, { useState } from 'react';

interface UseZoneProps {
  hideHeader?: boolean;
}

// 用途地域のデータ
const useZoneData: Record<string, {
  name: string;
  type: 'permitted' | 'prohibited';
  items: string[];
}> = {
  '1-low-residential': {
    name: '第一種低層住居専用地域',
    type: 'permitted',
    items: [
      '一　住宅',
      '二　住宅で事務所、店舗その他これらに類する用途を兼ねるもののうち政令で定めるもの',
      '三　共同住宅、寄宿舎又は下宿',
      '四　学校（大学、高等専門学校、専修学校及び各種学校を除く。）、図書館その他これらに類するもの',
      '五　神社、寺院、教会その他これらに類するもの',
      '六　老人ホーム、保育所、福祉ホームその他これらに類するもの',
      '七　公衆浴場（風俗営業等の規制及び業務の適正化等に関する法律（昭和23年法律第122号）第2条第6項第1号に該当する営業（以下この表において「個室付浴場業」という。）に係るものを除く。）',
      '八　診療所',
      '九　巡査派出所、公衆電話所その他これらに類する政令で定める公益上必要な建築物',
      '十　前各号の建築物に附属するもの（政令で定めるものを除く。）'
    ]
  },
  '2-low-residential': {
    name: '第二種低層住居専用地域',
    type: 'permitted',
    items: [
      '一　（い）項第一号から第九号までに掲げるもの',
      '二　店舗、飲食店その他これらに類する用途に供するもののうち政令で定めるものでその用途に供する部分の床面積の合計が150平方メートル以内のもの（3階以上の部分をその用途に供するものを除く。）',
      '三　前二号の建築物に附属するもの（政令で定めるものを除く。）'
    ]
  },
  '1-mid-high-residential': {
    name: '第一種中高層住居専用地域',
    type: 'permitted',
    items: [
      '一　（い）項第一号から第九号までに掲げるもの',
      '二　大学、高等専門学校、専修学校その他これらに類するもの',
      '三　病院',
      '四　老人福祉センター、児童厚生施設その他これらに類するもの',
      '五　店舗、飲食店その他これらに類する用途に供するもののうち政令で定めるものでその用途に供する部分の床面積の合計が500平方メートル以内のもの（3階以上の部分をその用途に供するものを除く。）',
      '六　自動車車庫で床面積の合計が300平方メートル以内のもの又は都市計画として決定されたもの（3階以上の部分をその用途に供するものを除く。）',
      '七　公益上必要な建築物で政令で定めるもの',
      '八　前各号の建築物に附属するもの（政令で定めるものを除く。）'
    ]
  },
  '2-mid-high-residential': {
    name: '第二種中高層住居専用地域',
    type: 'prohibited',
    items: [
      '一　（ほ）項第二号及び第三号、（へ）項第三号から第五号まで、（と）項第四号並びに（り）項第二号及び第三号に掲げるもの',
      '二　工場（政令で定めるものを除く。）',
      '三　ボーリング場、スケート場、水泳場その他これらに類する政令で定める運動施設',
      '四　ホテル又は旅館',
      '五　自動車教習所',
      '六　政令で定める規模の畜舎',
      '七　3階以上の部分を（は）項に掲げる建築物以外の建築物の用途に供するもの（政令で定めるものを除く。）',
      '八　（は）項に掲げる建築物以外の建築物の用途に供するものでその用途に供する部分の床面積の合計が1,500平方メートルを超えるもの（政令で定めるものを除く。）'
    ]
  },
  '1-residential': {
    name: '第一種住居地域',
    type: 'prohibited',
    items: [
      '一　（へ）項第一号から第五号までに掲げるもの',
      '二　マージャン屋、ぱちんこ屋、射的場、勝馬投票券発売所、場外車券売場その他これらに類するもの',
      '三　カラオケボックスその他これに類するもの',
      '四　（は）項に掲げる建築物以外の建築物の用途に供するものでその用途に供する部分の床面積の合計が3,000平方メートルを超えるもの（政令で定めるものを除く。）'
    ]
  },
  '2-residential': {
    name: '第二種住居地域',
    type: 'prohibited',
    items: [
      '一　（と）項第三号及び第四号並びに（り）項に掲げるもの',
      '二　原動機を使用する工場で作業場の床面積の合計が50平方メートルを超えるもの',
      '三　劇場、映画館、演芸場若しくは観覧場又はナイトクラブその他これに類する政令で定めるもの',
      '四　自動車車庫で床面積の合計が300平方メートルを超えるもの又は3階以上の部分にあるもの（建築物に附属するもので政令で定めるもの又は都市計画として決定されたものを除く。）',
      '五　倉庫業を営む倉庫',
      '六　店舗、飲食店、展示場、遊技場、勝馬投票券発売所、場外車券売場その他これらに類する用途で政令で定めるものに供する建築物でその用途に供する部分の床面積の合計が10,000平方メートルを超えるもの'
    ]
  },
  'quasi-residential': {
    name: '準住居地域',
    type: 'prohibited',
    items: [
      '一　（り）項に掲げるもの',
      '二　原動機を使用する工場で作業場の床面積の合計が50平方メートルを超えるもの（作業場の床面積の合計が150平方メートルを超えない自動車修理工場を除く。）',
      '三　次に掲げる事業（特殊の機械の使用その他の特殊の方法による事業であつて住居の環境を害するおそれがないものとして政令で定めるものを除く。）を営む工場',
      '四　（る）項第一号（一）から（三）まで、（十一）又は（十二）の物品（（ぬ）項第四号及び（る）項第二号において「危険物」という。）の貯蔵又は処理に供するもので政令で定めるもの',
      '五　劇場、映画館、演芸場若しくは観覧場のうち客席の部分の床面積の合計が200平方メートル以上のもの又はナイトクラブその他これに類する用途で政令で定めるものに供する建築物でその用途に供する部分の床面積の合計が200平方メートル以上のもの',
      '六　前号に掲げるもののほか、劇場、映画館、演芸場若しくは観覧場、ナイトクラブその他これに類する用途で政令で定めるもの又は店舗、飲食店、展示場、遊技場、勝馬投票券発売所、場外車券売場その他これらに類する用途で政令で定めるものに供する建築物でその用途に供する部分（劇場、映画館、演芸場又は観覧場の用途に供する部分にあつては、客席の部分に限る。）の床面積の合計が10,000平方メートルを超えるもの'
    ]
  },
  'rural-residential': {
    name: '田園住居地域',
    type: 'permitted',
    items: [
      '一　（い）項第一号から第九号までに掲げるもの',
      '二　農産物の生産、集荷、処理又は貯蔵に供するもの（政令で定めるものを除く。）',
      '三　農業の生産資材の貯蔵に供するもの',
      '四　地域で生産された農産物の販売を主たる目的とする店舗その他の農業の利便を増進するために必要な店舗、飲食店その他これらに類する用途に供するもののうち政令で定めるものでその用途に供する部分の床面積の合計が500平方メートル以内のもの（3階以上の部分をその用途に供するものを除く。）',
      '五　前号に掲げるもののほか、店舗、飲食店その他これらに類する用途に供するもののうち政令で定めるものでその用途に供する部分の床面積の合計が150平方メートル以内のもの（3階以上の部分をその用途に供するものを除く。）',
      '六　前各号の建築物に附属するもの（政令で定めるものを除く。）'
    ]
  },
  'neighborhood-commercial': {
    name: '近隣商業地域',
    type: 'prohibited',
    items: [
      '一　（ぬ）項に掲げるもの',
      '二　キャバレー、料理店その他これらに類するもの',
      '三　個室付浴場業に係る公衆浴場その他これに類する政令で定めるもの'
    ]
  },
  'commercial': {
    name: '商業地域',
    type: 'prohibited',
    items: [
      '一　（る）項第一号及び第二号に掲げるもの',
      '二　原動機を使用する工場で作業場の床面積の合計が150平方メートルを超えるもの（日刊新聞の印刷所及び作業場の床面積の合計が300平方メートルを超えない自動車修理工場を除く。）',
      '三　次に掲げる事業（特殊の機械の使用その他の特殊の方法による事業であつて商業その他の業務の利便を害するおそれがないものとして政令で定めるものを除く。）を営む工場',
      '四　危険物の貯蔵又は処理に供するもので政令で定めるもの'
    ]
  },
  'quasi-industrial': {
    name: '準工業地域',
    type: 'prohibited',
    items: [
      '一　次に掲げる事業（特殊の機械の使用その他の特殊の方法による事業であつて環境の悪化をもたらすおそれのない工業の利便を害するおそれがないものとして政令で定めるものを除く。）を営む工場',
      '二　危険物の貯蔵又は処理に供するもので政令で定めるもの',
      '三　個室付浴場業に係る公衆浴場その他これに類する政令で定めるもの'
    ]
  },
  'industrial': {
    name: '工業地域',
    type: 'prohibited',
    items: [
      '一　（る）項第三号に掲げるもの',
      '二　ホテル又は旅館',
      '三　キャバレー、料理店その他これらに類するもの',
      '四　劇場、映画館、演芸場若しくは観覧場又はナイトクラブその他これに類する政令で定めるもの',
      '五　学校（幼保連携型認定こども園を除く。）',
      '六　病院',
      '七　店舗、飲食店、展示場、遊技場、勝馬投票券発売所、場外車券売場その他これらに類する用途で政令で定めるものに供する建築物でその用途に供する部分の床面積の合計が10,000平方メートルを超えるもの'
    ]
  },
  'exclusively-industrial': {
    name: '工業専用地域',
    type: 'prohibited',
    items: [
      '一　（を）項に掲げるもの',
      '二　住宅',
      '三　共同住宅、寄宿舎又は下宿',
      '四　老人ホーム、福祉ホームその他これらに類するもの',
      '五　物品販売業を営む店舗又は飲食店',
      '六　図書館、博物館その他これらに類するもの',
      '七　ボーリング場、スケート場、水泳場その他これらに類する政令で定める運動施設',
      '八　マージャン屋、ぱちんこ屋、射的場、勝馬投票券発売所、場外車券売場その他これらに類するもの'
    ]
  }
};

const UseZone: React.FC<UseZoneProps> = ({ hideHeader }) => {
  const [selectedZone, setSelectedZone] = useState<string>('');

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedZone(e.target.value);
  };

  const selectedData = selectedZone ? useZoneData[selectedZone] : null;

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {!hideHeader && (
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">用途地域 建築物制限</h3>
        <p className="text-[11px] mt-0.5">用途地域を選択して建築物の制限を確認</p>
        </div>
      </div>
      )}
      
      <div className="p-4">
        <div className="flex space-x-8 items-start">
          {/* 左側：用途地域選択 */}
          <div className="space-y-4 w-1/2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                用途地域を選択
              </label>
              <select
                value={selectedZone}
                onChange={handleZoneChange}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              >
                <option value="">選択してください</option>
                <option value="1-low-residential">第一種低層住居専用地域</option>
                <option value="2-low-residential">第二種低層住居専用地域</option>
                <option value="1-mid-high-residential">第一種中高層住居専用地域</option>
                <option value="2-mid-high-residential">第二種中高層住居専用地域</option>
                <option value="1-residential">第一種住居地域</option>
                <option value="2-residential">第二種住居地域</option>
                <option value="quasi-residential">準住居地域</option>
                <option value="rural-residential">田園住居地域</option>
                <option value="neighborhood-commercial">近隣商業地域</option>
                <option value="commercial">商業地域</option>
                <option value="quasi-industrial">準工業地域</option>
                <option value="industrial">工業地域</option>
                <option value="exclusively-industrial">工業専用地域</option>
              </select>
            </div>
          </div>

          {/* 右側：結果表示 */}
          {selectedData ? (
            <div className="w-1/2">
              <h2 className="text-xs font-bold mb-4 border-b pb-2">建築物制限</h2>
              <div className="bg-gray-50 p-3 rounded mb-3">
                <h4 className="text-[13px] font-semibold text-gray-800 mb-1">
                  {selectedData.name}
                </h4>
                <p className="text-[11px] text-gray-600">
                  {selectedData.type === 'permitted' 
                    ? '建築することができる建築物' 
                    : '建築してはならない建築物'}
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto text-[12px] text-gray-700 whitespace-pre-line">
                {selectedData.items.join('\n')}
              </div>
            </div>
          ) : (
            <div className="w-1/2">
              <div className="text-center py-8 text-gray-400 text-xs">
                用途地域を選択すると、建築物の制限内容が表示されます
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UseZone;

