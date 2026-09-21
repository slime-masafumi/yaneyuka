/**
 * 左カラム（Sidebar の Ⅳ 設計ツール）から DesignTools の分野・ツールを指定して開くための受け渡し。
 * 仕組みは src/lib/toolNav.ts を参照。
 */
import { createToolNav } from './toolNav';

export type DesignToolsTarget = { categoryId: string; subTabId?: string };

const nav = createToolNav<DesignToolsTarget>('yaneyuka:design-tools-target');

export const requestDesignToolsTarget = nav.request;
export const consumeDesignToolsTarget = nav.consume;
export const onDesignToolsTarget = nav.subscribe;
