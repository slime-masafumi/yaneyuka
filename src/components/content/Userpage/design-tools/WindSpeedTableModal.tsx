import React from 'react';

interface WindSpeedTableModalProps {
  onClose: () => void;
}

/**
 * 基準風速別表モーダルコンポーネント
 * 出典：平成12年建設省告示第1454号
 * 
 * このコンポーネントは、建築基準法施行令第87条に基づく
 * 全国の基準風速一覧表を表示します。
 */
export const WindSpeedTableModal: React.FC<WindSpeedTableModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4"
      style={{ paddingTop: '200px' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full overflow-hidden overflow-y-auto"
        style={{ maxWidth: 'min(1000px, 95vw)', maxHeight: 'calc(100vh - 220px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#3b3b3b] text-white p-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-semibold">全国の基準風速</h3>
            <p className="text-xs mt-1">都道府県別市町村の基準風速一覧表</p>
            <p className="text-xs mt-1">出典：平成12年建設省告示第1454号</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="overflow-auto p-4 flex-1">
          <div className="text-xs text-gray-600 mb-4 space-y-1">
            <p>※ 市町村名は告示制定時点の名称です。</p>
            <p>※ 下記以外の地方は、全都道府県で区分(1)、基準風速30m/sです。</p>
            <p>※ 表は建築基準法施行令第87条・平成12年建設省告示第1454号の別表をもとに、読みやすいよう体裁のみ編集しています。</p>
          </div>
          <table className="w-full text-[10px] border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border border-gray-300 p-2 text-left w-28">都道府県</th>
                <th className="border border-gray-300 p-2 text-center w-16">区分</th>
                <th className="border border-gray-300 p-2 text-center w-24">基準風速 V₀ (m/s)</th>
                <th className="border border-gray-300 p-2 text-left">市町村の範囲</th>
              </tr>
            </thead>
            <tbody>
              {/* (1)  (2)から(9)までに掲げる地方以外の地方 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">全都道府県</td>
                <td className="border border-gray-300 p-2 text-center">(1)</td>
                <td className="border border-gray-300 p-2 text-center">30</td>
                <td className="border border-gray-300 p-2">下記以外の地方</td>
              </tr>

              {/* 北海道 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={3}>北海道</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">札幌市　小博市　網走市　留萌市　稚内市　江別市　紋別市　名寄市　千歳市　恵庭市　北広島市　石狩市　石狩郡　厚田郡　浜益郡　空知郡のうち南幌町　夕張郡のうち由仁町及び長沼町　上川郡のうち風連町及び下川町　中川郡のうち美深町、音威子府村及び中川町　増毛郡　留萌郡　苫前郡　天塩郡　宗谷郡　枝幸郡　礼文郡　利尻郡　網走郡のうち東藻琴村、女満別町及び美幌町　斜里郡のうち清里町及び小清水町　常呂郡のうち端野町、佐呂間町及び常呂町　紋別郡のうち上湧別町、湧別町、興部町、西興部村及び雄武町　勇払郡のうち追分町及び穂別町　沙流郡のうち平取町　新冠郡　静内郡　三石郡　浦河郡　様似郡　幌泉郡　厚岸郡のうち厚岸町　川上郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">函館市　室蘭市　苫小牧市　根室市　登別市　伊達市　松前郡　上磯郡　亀田郡　茅部郡　斜里郡のうち斜里町　虻田郡　岩内郡のうち共和町　積丹郡　古平郡　余市郡　有珠郡　白老郡　勇払郡のうち早来町、厚真町及び鵡川町　沙流郡のうち門別町　厚岸郡のうち浜中町　野付郡　標津郡　目梨郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">山越郡　檜山郡　爾志郡　久遠郡　奥尻郡　瀬棚郡　島牧郡　寿都郡　岩内郡のうち岩内町　磯谷郡　古宇郡</td>
              </tr>

              {/* 青森県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">青森県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 岩手県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>岩手県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">久慈市　岩手郡のうち葛巻町　下閉伊郡のうち田野畑村及び普代村　九戸郡のうち野田村及び山形村　二戸郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">二戸市　九戸郡のうち軽米町、種市町、大野村及び九戸村</td>
              </tr>

              {/* 宮城県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">宮城県</td>
                <td className="border border-gray-300 p-2 text-center">(1)</td>
                <td className="border border-gray-300 p-2 text-center">30</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 秋田県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>秋田県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">秋田市　大館市　本荘市　鹿角市　鹿角郡　北秋田郡のうち鷹巣町、比内町、合川町及び上小阿仁村　南秋田郡のうち五城目町、昭和町、八郎潟町、飯田川町、天王町及び井川町　由利郡のうち仁賀保町、金浦町、象潟町、岩城町及び西目町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">能代市　男鹿市　北秋田郡のうち田代町　山本郡　南秋郡のうち若美町及び大潟村</td>
              </tr>

              {/* 山形県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">山形県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">鶴岡市　酒田市　西田川郡　飽海郡のうち遊佐町</td>
              </tr>

              {/* 福島県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">福島県</td>
                <td className="border border-gray-300 p-2 text-center">(1)</td>
                <td className="border border-gray-300 p-2 text-center">30</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 茨城県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={3}>茨城県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">水戸市　下妻市　ひたちなか市　東茨城郡のうち内原町　西茨城郡のうち友部町及び岩間町　新治郡のうち八郷町　真壁郡のうち明野町及び真壁町　結城郡　猿島郡のうち五霞町、猿島町及び境町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">土浦市　石岡市　龍ヶ崎市　水海道市　取手市　岩井市　牛久市　つくば市　東茨城郡のうち茨城町、小川町、美野里町及び大洗町　鹿島郡のうち旭村、鉾田町及び大洋村　行方郡のうち麻生町、北浦町及び玉造町　稲敷郡　新治郡のうち霞ケ浦町、玉里村、千代田町及び新治村　筑波郡　北相馬郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">鹿島市　鹿島郡のうち神栖町及び波崎町　行方郡のうち牛掘町及び潮来町</td>
              </tr>

              {/* 栃木県・群馬県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">栃木県</td>
                <td className="border border-gray-300 p-2 text-center">(1)</td>
                <td className="border border-gray-300 p-2 text-center">30</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">群馬県</td>
                <td className="border border-gray-300 p-2 text-center">(1)</td>
                <td className="border border-gray-300 p-2 text-center">30</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 埼玉県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>埼玉県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">川越市　大宮市　所沢市　狭山市　上尾市　与野市　入間市　桶川市　久喜市　富士見市　上福岡市　蓮田市　幸手市　北足立郡のうち伊奈町　入間郡のうち大井町及び三芳町　南埼玉郡　北葛飾郡のうち栗橋町、鷲宮町及び杉戸町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">川口市　浦和市　岩槻市　春日部市　草加市　越谷市　蕨市　戸田市　鳩ヶ谷市　朝霧市　志木市　和光市　新座市　八潮市　三郷市　吉川市　北葛飾郡のうち松伏町及び庄和町</td>
              </tr>

              {/* 千葉県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={3}>千葉県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">市川市　船橋市　松戸市　野市市　柏市　流山市　八千代市　我孫子市　鎌ヶ谷市　浦安市　印西市　東葛飾郡　印旛郡のうち白井町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">千葉市　佐原市　成田市　佐倉市　習志野市　四街道市　八街市　印旛郡のうち酒々井町、富里町、印旛村、本埜村及び栄町　香取郡　山武郡のうち山武町及び芝山町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(5)</td>
                <td className="border border-gray-300 p-2 text-center">38</td>
                <td className="border border-gray-300 p-2">銚子市　館山市　木更津市　茂原市　東金市　八日市場市　旭市　勝浦市　市原市　鴨川市　君津市　富津市　袖ヶ浦市　海上郡　匝瑳郡　山武郡のうち大網白里町、九十九里町、成東町、蓮沼村、松尾町及び横芝町　長生郡　夷隅郡　安房郡</td>
              </tr>

              {/* 東京都 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={4}>東京都</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">八王子市　立川市　昭島市　日野市　東村山市　福生市　東大和市　武蔵村山市　羽村市　あきる野市　西多摩郡のうち瑞穂町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">23区　武蔵野市　三鷹市　府中市　調布市　町田市　小金井市　小平市　国分寺市　国立市　田無市　保谷市　狛江市　清瀬市　東久留米市　多摩市　稲城市</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(5)</td>
                <td className="border border-gray-300 p-2 text-center">38</td>
                <td className="border border-gray-300 p-2">大島町　利島村　新島村　神津島村　三宅村　御蔵島村</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(7)</td>
                <td className="border border-gray-300 p-2 text-center">42</td>
                <td className="border border-gray-300 p-2">八丈町　青ヶ島村　小笠原村</td>
              </tr>

              {/* 神奈川県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={3}>神奈川県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">足柄上郡のうち山北町　津久井郡のうち津久井町、相模湖町及び藤野町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">横浜市　川崎市　平塚市　鎌倉市　藤沢市　小田原市　茅ヶ崎市　相模原市　秦野市　厚木市　大和市　伊勢原市　海老名市　座間市　南足柄市　綾瀬市　高座郡　中郡　足柄上郡のうち中井町、大井町、松田町及び開成町　足柄下郡　愛甲郡　津久井郡のうち城山町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">横須賀市　逗子市　三浦市　三浦郡</td>
              </tr>

              {/* 新潟県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">新潟県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">両津市　佐渡郡　岩船郡のうち山北町及び粟島浦村</td>
              </tr>

              {/* 富山・石川・福井 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">富山県</td>
                <td className="border border-gray-300 p-2 text-center">(1)</td>
                <td className="border border-gray-300 p-2 text-center">30</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">石川県</td>
                <td className="border border-gray-300 p-2 text-center">(1)</td>
                <td className="border border-gray-300 p-2 text-center">30</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">福井県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">敦賀市　小浜市　三方郡　遠敷郡　大飯郡</td>
              </tr>

              {/* 山梨・長野 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">山梨県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">富士吉田市　南巨摩郡のうち南部町及び富沢町　南都留郡のうち秋山村、道志村、忍野村、山中湖村及び鳴沢村</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">長野県</td>
                <td className="border border-gray-300 p-2 text-center">(1)</td>
                <td className="border border-gray-300 p-2 text-center">30</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 岐阜県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>岐阜県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">多治見市　関市　美農市　美農加茂市　各務原市　可児市　揖斐郡のうち藤橋村及び坂内村　本巣郡のうち根尾村　山県郡　武儀郡のうち洞戸村及び武芸川町　加茂郡のうち坂祝町及び富加町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">岐阜市　大垣市　羽島市　羽島郡　海津郡　養老郡　不破郡　安八郡　揖斐郡のうち揖斐川町、谷汲村、大野町、池田町、春日村及び久瀬村　本巣郡のうち北方町、本巣町、穂積町、巣南町、真正町及び糸貫町</td>
              </tr>

              {/* 静岡県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={3}>静岡県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">静岡市　浜松市　清水市　富士宮市　島田市　磐田市　焼津市　掛川市　藤枝市　袋井市　湖西市　富士郡　庵原郡　志太郡　榛原郡のうち御前崎町、相良町、榛原町、吉田町及び金谷町　小笠郡　磐田郡のうち浅羽町、福田町、竜洋町及び豊田町　浜名郡　引佐郡のうち細江町及び三ケ日町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">沼津市　熱海市　三島市　富士市　御殿場市　裾野市　賀茂郡のうち松崎町、西伊豆町及び賀茂村　田方郡　駿東郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">伊東市　下田市　賀茂郡のうち東伊豆町、河津町及び南伊豆町</td>
              </tr>

              {/* 愛知県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>愛知県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">豊橋市　瀬戸市　春日井市　豊川市　豊田市　小牧市　犬山市　尾張旭市　日進市　愛知郡　丹羽郡　額田郡のうち額田町　宝飾郡　西加茂郡のうち三好町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">名古屋市　岡崎市　一宮市　半田市　津島市　碧南市　刈谷市　安城市　西尾市　蒲郡市　常滑市　江南市　尾西市　稲沢市　東海市　大府市　知多市　知立市　高浜市　岩倉市　豊明市　西春日井郡　葉栗郡　中島郡　海部郡　知多郡　幡豆郡　額田郡のうち幸田町　渥美郡</td>
              </tr>

              {/* 三重県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">三重県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 滋賀県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>滋賀県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">大津市　草津市　守山市　滋賀郡　栗太郡　伊香郡　高島郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">彦根市　長浜市　近江八幡市　八日市市　野洲郡　甲賀郡　蒲生郡　神崎郡　愛知郡　犬上郡　坂田郡　東浅井郡</td>
              </tr>

              {/* 京都府 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">京都府</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 大阪府 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>大阪府</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">高槻市　枚方市　八尾市　寝屋川市　大東市　柏原市　東大阪市　四条畷市　交野市　三島郡　南河内郡のうち太子町、河南町及び千早赤阪村</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">大阪市　堺市　岸和田市　豊中市　池田市　吹田市　東大津市　貝塚市　守口市　茨木市　泉佐野市　富田林市　河内長野市　松原市　和泉市　箕面市　羽曳野市　門真市　摂津市　高石市　藤井寺市　泉南市　大阪狭山市　阪南市　豊能郡　泉北郡　泉南郡　南河内郡のうち美原町</td>
              </tr>

              {/* 兵庫県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>兵庫県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">姫路市　相生市　豊岡市　龍野市　赤穂市　西脇市　加西市　篠山市　多可郡　飾磨郡　神崎郡　揖保郡　赤穂郡　宍粟郡　城崎郡　出石郡　美方郡　養父郡　朝来郡　氷上郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">神戸市　尼崎市　明石市　西宮市　洲本市　芦屋市　伊丹市　加古川市　宝塚市　三木市　高砂市　川西市　小野市　三田市　川辺郡　美嚢郡　加東郡　加古郡　津名郡　三原郡</td>
              </tr>

              {/* 奈良県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>奈良県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">奈良市　大和高田市　大和郡山市　天理市　橿原市　桜井市　御所市　生駒市　香芝市　添上郡　山辺郡　生駒郡　磯城郡　宇陀郡のうち大宇陀町、菟田野町、榛原町及び室生村　高市郡　北葛城郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">五條市　吉野郡　宇陀郡のうち曽爾村及び御杖村</td>
              </tr>

              {/* 和歌山県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">和歌山県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 鳥取県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">鳥取県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">鳥取市　岩美郡　八頭郡のうち郡家町、船岡町、八東町及び若桜町</td>
              </tr>

              {/* 島根県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>島根県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">益田市　美濃郡のうち匹見町　鹿足郡のうち日原町　隠岐郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">鹿足郡のうち津和野町、柿木村及び六日市町</td>
              </tr>

              {/* 岡山県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">岡山県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">岡山市　倉敷市　玉野市　笠岡市　備前市　和気郡のうち日生町　邑久郡　児島郡　都窪郡　浅口郡</td>
              </tr>

              {/* 広島県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>広島県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">広島市　竹原市　三原市　尾道市　福山市　東広島市　安芸郡のうち府中町　佐伯郡のうち湯来町及び吉和村　山県郡のうち筒賀村　賀茂郡のうち河内町　豊田郡のうち本郷町　御調郡のうち向島町　沼隈郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">呉市　因島市　大竹市　廿日市市　安芸郡のうち海田町、熊野町、坂町、江田島町、音戸町、倉橋町、下蒲刈町及び蒲刈町　佐伯郡のうち大野町、佐伯町、宮島町、能美町、沖美町及び大柿町　賀茂郡のうち黒瀬町　豊田郡のうち安芸津町、安浦町、川尻町、豊浜町、豊町、大崎町、東野町、木江町及び瀬戸田町</td>
              </tr>

              {/* 山口県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">山口県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 徳島県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={3}>徳島県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">三好郡のうち三野町、三好町、池田町及び山城町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">徳島市　鳴門市　小松島市　阿南市　勝浦郡　名東郡　名西郡　那賀郡のうち那賀川町及び羽ノ浦町　板野郡　阿波郡　麻植郡　美馬郡　三好郡のうち井川町、三加茂町、東祖谷山村及び西祖谷山村</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(5)</td>
                <td className="border border-gray-300 p-2 text-center">38</td>
                <td className="border border-gray-300 p-2">那賀郡のうち鷲敷町、相生町、上那賀町、木沢村及び木頭村　海部郡</td>
              </tr>

              {/* 香川県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">香川県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 愛媛県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">愛媛県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 高知県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={4}>高知県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">土佐郡のうち大川村及び本川村　吾川郡のうち池川町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">宿毛市　長岡郡　土佐郡のうち鏡村、土佐山村及び土佐町　吾川郡のうち伊野町、吾川村及び吾北村　高岡郡のうち佐川町、越知町、檮原町、大野見村、東津野村、葉山村、仁淀村及び日高村　幡多郡のうち大正町、大月町、十和村、西土佐村及び三原村</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(5)</td>
                <td className="border border-gray-300 p-2 text-center">38</td>
                <td className="border border-gray-300 p-2">高知市　安芸市　南国市　土佐市　須崎市　中村市　土佐清水市　安芸郡のうち馬路村及び芸西村　香美郡　吾川郡のうち春野町　高岡郡のうち中土佐町及び窪川町　幡多郡のうち佐賀町及び大方町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(6)</td>
                <td className="border border-gray-300 p-2 text-center">40</td>
                <td className="border border-gray-300 p-2">室戸市　安芸郡のうち東洋町、奈半利町、田野町、安田町及び北川村</td>
              </tr>

              {/* 福岡県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>福岡県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">山田市　甘木市　八女市　豊前市　小郡市　嘉穂郡のうち桂川町、稲築町、碓井町及び嘉穂町　朝倉郡　浮羽郡　三井郡　八女郡　田川郡のうち添田町、川崎町、大任町及び赤村　京都郡のうち犀川町　築上郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">北九州市　福岡市　大牟田市　久留米市　直方市　飯塚市　田川市　柳川市　筑後市　大川市　行橋市　中間市　筑紫野市　春日市　大野城市　宗像市　太宰府市　前原市　古賀市　筑紫郡　糟屋郡　宗像郡　遠賀郡　鞍手郡　嘉穂郡のうち筑穂町、穂波町、庄内町及び頴田町　糸島郡　三潴郡　山門郡　三池郡　田川郡のうち香春町、金田町、糸田町、赤池町及び方城町　京都郡のうち苅田町、勝山町及び豊津町</td>
              </tr>

              {/* 佐賀県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">佐賀県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>

              {/* 長崎県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>長崎県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">長崎市　佐世保市　島原市　諌早市　大村市　平戸市　松浦市　西彼杵郡　東彼杵郡　北高来郡　南高来郡　北松浦郡　南松浦郡のうち若松町、上五島町、新魚目町、有川町及び奈良尾町　壱岐郡　下県郡　上県郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">福江市　南松浦郡のうち富江町、玉之浦町、三井楽町、岐宿町及び奈留町</td>
              </tr>

              {/* 熊本県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={2}>熊本県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">山鹿市　菊池市　玉名郡のうち菊水町、三加和町及び南関町　鹿本郡　菊池郡　阿蘇郡のうち一の宮町、阿蘇町、産山村、波野村、蘇陽町、高森町、白水村、久木野村、長陽村及び西原村</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">熊本市　八代市　人吉市　荒尾市　水俣市　玉名市　本渡市　牛深市　宇土市　宇土郡　下益城郡　玉名郡のうち岱明町、横島町、天水町、玉東町及び長洲町　上益城郡　八代郡　葦北郡　球磨郡　天草郡</td>
              </tr>

              {/* 大分県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">大分県</td>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">大分市　別府市　中津市　日田市　佐伯市　臼杵市　津久見市　竹田市　豊後高田市　杵築市　宇佐市　西国東郡　東国東郡　速見郡　大分郡のうち野津原町、狭間町及び庄内町　北海部郡　南海部郡　大野郡　直入郡　下毛郡　宇佐郡</td>
              </tr>

              {/* 宮崎県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={3}>宮崎県</td>
                <td className="border border-gray-300 p-2 text-center">(2)</td>
                <td className="border border-gray-300 p-2 text-center">32</td>
                <td className="border border-gray-300 p-2">西臼杵郡のうち高千穂町及び日之影町　東臼杵郡のうち北川町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(3)</td>
                <td className="border border-gray-300 p-2 text-center">34</td>
                <td className="border border-gray-300 p-2">延岡市　日向市　西都市　西諸県郡のうち須木村　児湯郡　東臼杵郡のうち門川町、東郷町、南郷村、西郷村、北郷村、北方町、北浦町、諸塚村及び椎葉村　西臼杵郡のうち五ケ瀬町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">宮崎市　都城市　日南市　小林市　串間市　えびの市　営崎郡　南那珂郡　北諸県郡　西諸県郡のうち高原町及び野尻町　東諸県郡</td>
              </tr>

              {/* 鹿児島県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold" rowSpan={6}>鹿児島県</td>
                <td className="border border-gray-300 p-2 text-center">(4)</td>
                <td className="border border-gray-300 p-2 text-center">36</td>
                <td className="border border-gray-300 p-2">川内市　阿久根市　出水市　大口市　国分市　鹿児島郡のうち吉田町　薩摩郡のうち樋脇町、入来町、東郷町、宮之城町、鶴田町、薩摩町及び祁答院町　出水郡　伊佐郡　始良郡　曽於郡</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(5)</td>
                <td className="border border-gray-300 p-2 text-center">38</td>
                <td className="border border-gray-300 p-2">鹿児島市　鹿屋市　串木野市　垂水市　鹿児島郡のうち桜島町　肝属郡のうち串良町、東串良町、高山町、吾平町、内之浦町及び大根占町　日置郡のうち市来町、東市来町、伊集院町、松元町、郡山町、日吉町及び吹上町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(6)</td>
                <td className="border border-gray-300 p-2 text-center">40</td>
                <td className="border border-gray-300 p-2">枕崎市　指宿市　加世田市　西之表市　揖宿郡　川辺郡　日置郡のうち金峰町　薩摩郡のうち里村、上甑村、下甑村及び鹿島村　肝属郡のうち根占町、田代町及び佐多町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(7)</td>
                <td className="border border-gray-300 p-2 text-center">42</td>
                <td className="border border-gray-300 p-2">熊毛郡のうち中種子町及び南種子町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(8)</td>
                <td className="border border-gray-300 p-2 text-center">44</td>
                <td className="border border-gray-300 p-2">鹿児島郡のうち三島村　熊毛郡のうち上屋久町及び屋久町</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-center">(9)</td>
                <td className="border border-gray-300 p-2 text-center">46</td>
                <td className="border border-gray-300 p-2">名瀬市　鹿児島郡のうち十島村　大島郡</td>
              </tr>

              {/* 沖縄県 */}
              <tr>
                <td className="border border-gray-300 p-2 font-semibold">沖縄県</td>
                <td className="border border-gray-300 p-2 text-center">(9)</td>
                <td className="border border-gray-300 p-2 text-center">46</td>
                <td className="border border-gray-300 p-2">全域</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
