// 建材の小分類ページ(/exterior-wall/{小分類}/)。中身は src/lib/materialSubPage.tsx
import { materialSubPage } from '@/lib/materialSubPage';

const p = materialSubPage('exterior-wall');
export const dynamicParams = false;
export const generateStaticParams = p.generateStaticParams;
export const generateMetadata = p.generateMetadata;
export default p.Page;
