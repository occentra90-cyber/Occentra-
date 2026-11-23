/**
 * One source of truth for what each product costs. The server always derives the
 * amount from the template id; the browser can never choose or change a price.
 */
export const CV_CENTS = 2000;
export const COVER_LETTER_CENTS = 1500;
/** Ready-made animated GIF invitation (customer edits the wording). */
export const GIF_READY_CENTS = 5000;
/** "Make your own" animated GIF (customer's own picture/GIF, effects and layout). */
export const GIF_OWN_CENTS = 10000;

export const GIF_READY_IDS = ['champagne', 'blush', 'midnight', 'confetti', 'balloons', 'sage', 'snow', 'hearts'] as const;
export type GifReadyId = (typeof GIF_READY_IDS)[number];

const readyPattern = new RegExp('^gif-(' + GIF_READY_IDS.join('|') + ')$');

export function isGifTemplateId(id: unknown): id is string {
  return typeof id === 'string' && (id === 'gif-own' || readyPattern.test(id));
}

/** Price in cents for any purchasable template id, or null when the id is not for sale. */
export function priceCentsFor(templateId: unknown): number | null {
  if (typeof templateId !== 'string') return null;
  if (/^cv-[0-5]$/.test(templateId)) return CV_CENTS;
  if (/^cover-(classic|navy|sage|executive)$/.test(templateId)) return COVER_LETTER_CENTS;
  if (templateId === 'gif-own') return GIF_OWN_CENTS;
  if (readyPattern.test(templateId)) return GIF_READY_CENTS;
  return null;
}

/** Where SnapScan sends the customer back to, per product. */
export function returnPathFor(templateId: string, reference: string): string {
  if (templateId.startsWith('cover-')) return '/cover-letters?o=' + reference;
  if (isGifTemplateId(templateId)) return '/gifs?o=' + reference;
  return '/?o=' + reference;
}
