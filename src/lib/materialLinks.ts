/**
 * 建材 16 分類ごとの「つながり」(建材ページの右列。モック「高級感 3」Q9)。
 *   maker … src/data/makers.json / maker-feeds.json の分類名
 *   lookup … 建築の調べもの(src/data/lookup/items.json)のどの章を出すか
 *   tools … この分類で使う設計ツール(designToolsMenu の分野 id / ツール id、図は home/toolArt)
 * 対応は内容から手で決めた。合わないものがあればここを直す。
 */
export type MaterialLink = {
  maker: string;
  lookup: { slug: string; section: string };
  tools: Array<{ cat: string; sub: string; art?: string; why: string }>;
};

const RAIN = { cat: 'detail-design', sub: 'building-rainwater', art: 'rain', why: '軒樋・ルーフドレン' };
const COND = { cat: 'detail-design', sub: 'condensation', art: 'cond', why: '外皮の結露を判定' };
const GLASS = { cat: 'detail-design', sub: 'glass-thickness', art: 'glass', why: '風圧力に対する板厚' };
const PALETTE = { cat: 'basic-design', sub: 'color-palette', why: '基準色から配色' };
const JPMA = { cat: 'basic-design', sub: 'jpma-search', why: '日塗工番号・マンセル値' };
const DENS = { cat: 'structural-design', sub: 'density-list', why: '単位体積重量の参考' };
const EXRAIN = { cat: 'exterior-design', sub: 'exterior-rainwater', art: 'rain', why: 'マニング式と耐荷重' };
const PAVE = { cat: 'exterior-design', sub: 'pavement', why: 'TA 法で舗装構成' };
const PLANT = { cat: 'exterior-design', sub: 'plant-selection', why: '条件に合う樹種' };
const SLOPE = { cat: 'exterior-design', sub: 'slope-calc', why: '勾配の換算' };

export const MATERIAL_LINKS: Record<string, MaterialLink> = {
  roof: { maker: '屋根', lookup: { slug: 'design', section: '1-11' }, tools: [RAIN, COND] },
  'exterior-wall': { maker: '外壁', lookup: { slug: 'design', section: '1-9' }, tools: [COND, PALETTE, JPMA] },
  opening: { maker: '開口部', lookup: { slug: 'design', section: '1-8' }, tools: [GLASS, COND] },
  'external-floor': { maker: '外部床', lookup: { slug: 'design', section: '1-14' }, tools: [SLOPE, EXRAIN] },
  'exterior-other': { maker: '外部その他', lookup: { slug: 'design', section: '1-11' }, tools: [RAIN] },
  'internal-floor': { maker: '内部床', lookup: { slug: 'design', section: '1-12' }, tools: [DENS, PALETTE] },
  'internal-wall': { maker: '内装壁材', lookup: { slug: 'design', section: '1-12' }, tools: [PALETTE, JPMA, COND] },
  'internal-ceiling': { maker: '内装天井材', lookup: { slug: 'design', section: '1-12' }, tools: [DENS] },
  'internal-other': { maker: '内装その他', lookup: { slug: 'design', section: '1-7' }, tools: [DENS] },
  waterproof: { maker: '防水', lookup: { slug: 'design', section: '1-10' }, tools: [RAIN] },
  hardware: { maker: '金物', lookup: { slug: 'design', section: '1-22' }, tools: [] },
  furniture: { maker: 'ファニチャー', lookup: { slug: 'design', section: '1-12' }, tools: [PALETTE] },
  'electrical-systems': {
    maker: '電気設備',
    lookup: { slug: 'electrical', section: '4-9' },
    tools: [
      { cat: 'electrical', sub: 'illumination', why: '照度の算定' },
      { cat: 'electrical', sub: 'elec-capacity', why: '受電・契約電力' },
    ],
  },
  'mechanical-systems': {
    maker: '機械設備',
    lookup: { slug: 'mep', section: '3-6' },
    tools: [
      { cat: 'mechanical', sub: 'vent-24h', art: 'vent', why: 'シックハウス対策の換気量' },
      { cat: 'mechanical', sub: 'aircon-business', art: 'vent', why: '用途・面積から能力' },
      { cat: 'mechanical', sub: 'duct-sizing', art: 'duct', why: '風量・許容圧損から' },
    ],
  },
  'exterior-infrastructure': { maker: '外構', lookup: { slug: 'design', section: '1-14' }, tools: [PAVE, EXRAIN, SLOPE] },
  exterior: { maker: 'エクステリア', lookup: { slug: 'design', section: '1-14' }, tools: [PLANT, PAVE] },
};
