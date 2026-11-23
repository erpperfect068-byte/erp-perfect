/** FX conversion metadata stored in statement_items.notes as JSON.
 *  amount + currency on the row are the foreign values; this flag means
 *  show/use EGP equivalent via amount × exchange_rate_at_transaction.
 */

export type StatementFxMeta = {
  convertedToEgp: boolean;
  /** Same as row amount when currency is foreign (legacy rows used EGP amount). */
  sourceAmount: number;
  sourceCurrency: string;
};

export function buildFxNotes(meta: StatementFxMeta | null | undefined): string | null {
  if (!meta) return null;
  return JSON.stringify({ fx: meta });
}

export function parseFxNotes(notes?: string | null): StatementFxMeta | null {
  if (!notes || typeof notes !== 'string') return null;
  try {
    const parsed = JSON.parse(notes);
    const fx = parsed?.fx;
    if (!fx || typeof fx !== 'object') return null;
    if (fx.convertedToEgp !== true) return null;
    const sourceAmount = Number(fx.sourceAmount);
    const sourceCurrency = String(fx.sourceCurrency || '').trim();
    if (!sourceCurrency || !Number.isFinite(sourceAmount)) return null;
    return {
      convertedToEgp: true,
      sourceAmount,
      sourceCurrency,
    };
  } catch {
    return null;
  }
}

/** EGP contribution for totals: converted/EGP rows use amount as-is; else amount × rate. */
export function lineAmountInEgp(
  amount: number | string,
  currency: string | null | undefined,
  rate: number | string | null | undefined
): number {
  const a = Number(amount || 0);
  if ((currency || 'EGP') === 'EGP') return a;
  return a * Number(rate || 1);
}
