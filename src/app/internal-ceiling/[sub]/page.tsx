// 建材の小分類ページ(/internal-ceiling/{小分類}/)。中身は src/lib/materialSubPage.tsx
import { materialSubPage } from '@/lib/materialSubPage';

const p = materialSubPage('internal-ceiling');
export const dynamicParams = false;
export const generateStaticParams = p.generateStaticParams;
export const generateMetadata = p.generateMetadata;
export default p.Page;
