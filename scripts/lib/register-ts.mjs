// scripts から src/lib の .ts を node で直接読むためのフック。
//   node --import ./scripts/lib/register-ts.mjs scripts/collect-news.ts
//
// Node 22.18 以降は .ts の型をそのまま外して実行できるが、拡張子なしの相対 import
// (Next 側の書き方 `from './newsSources'`)は解決できない。見つからないときだけ .ts / /index.ts / .tsx を補う。
// `@/` で始まる import(tsconfig の paths)は src/ に読み替える。JSON は import 属性なしでも読めるようにする。
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = pathToFileURL(path.resolve('src') + path.sep).href;

register(
  'data:text/javascript,' +
    encodeURIComponent(`
const SRC = ${JSON.stringify(SRC)};
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) specifier = SRC + specifier.slice(2);
  try {
    return await next(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('file:');
    if (!relative || /\\.[cm]?[jt]sx?$|\\.json$/.test(specifier)) throw err;
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      try { return await next(specifier + ext, context); } catch {}
    }
    throw err;
  }
}
export async function load(url, context, next) {
  if (url.endsWith('.json')) return next(url, { ...context, importAttributes: { ...context.importAttributes, type: 'json' } });
  return next(url, context);
}
`),
  import.meta.url
);
