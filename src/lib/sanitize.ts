import DOMPurify from 'dompurify';

/**
 * HTMLをサニタイズして安全な文字列を返す
 * dangerouslySetInnerHTML で使用する前に必ず通す
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'blockquote', 'pre', 'code', 'hr', 'sub', 'sup'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * 埋め込みHTML（iframe等）をサニタイズ
 * ShopContent等のembed用
 */
export function sanitizeEmbed(dirty: string): string {
  if (typeof window === 'undefined') return dirty;
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['iframe', 'div', 'a', 'img', 'span'],
    ALLOWED_ATTR: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'class', 'href', 'target', 'rel', 'alt', 'title', 'sandbox'],
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'sandbox'],
  });
}
