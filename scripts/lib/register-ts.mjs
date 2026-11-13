// scripts から src/lib の .ts を node で直接読むためのフック。
//   node --import ./scripts/lib/register-ts.mjs scripts/collect-news.ts
//
// Node 22.18 以降は .ts の型をそのまま外して実行できるが、拡張子なしの相対 import
// (Next 側の書き方 `from './newsSources'`)は解決できない。見つからないときだけ .ts / /index.ts を補う。
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    if (!relative || /\\.[cm]?[jt]s$/.test(specifier)) throw err;
    for (const ext of ['.ts', '/index.ts']) {
      try { return await next(specifier + ext, context); } catch {}
    }
    throw err;
  }
}
`),
  import.meta.url
);
