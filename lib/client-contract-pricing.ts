/** Unified client contract pricing catalogs + resolve helpers (PDF-style, no notes). */

export const CLEARANCE_TIERS = [
  { key: 'qty_1', label: 'حاوية واحدة (1)', min: 1, max: 1 },
  { key: 'qty_2', label: 'حاويتان (2)', min: 2, max: 2 },
  { key: 'qty_3', label: 'ثلاث حاويات (3)', min: 3, max: 3 },
  { key: 'qty_4', label: 'أربع حاويات (4)', min: 4, max: 4 },
  { key: 'qty_5', label: 'خمس حاويات (5)', min: 5, max: 5 },
  { key: 'qty_6_10', label: 'من 6 إلى 10 حاويات', min: 6, max: 10 },
  { key: 'qty_11_15', label: 'من 11 إلى 15 حاوية', min: 11, max: 15 },
  { key: 'qty_16_20', label: 'من 16 إلى 20 حاوية', min: 16, max: 20 },
  { key: 'qty_21_50', label: 'من 21 إلى 50 حاوية', min: 21, max: 50 },
  { key: 'lcl', label: 'شحنات LCL', min: null, max: null },
  { key: 'extra_unit', label: 'حاوية إضافية (بعد الأولى)', min: null, max: null },
] as const;

export const OFFER_CATALOG = [
  { key: 'xray', label: 'عرض إشعاع (X-Ray) للحاوية' },
  { key: 'price_committee', label: 'عرض لجنة أسعار / واردات (إن وجد)' },
  { key: 'public_security', label: 'عرض أمن عام' },
  { key: 'chemistry', label: 'عرض كيمياء (إن وجد)' },
  { key: 'stamps_no_sample', label: 'عرض دمغة وموازين بدون سحب عينة (إن وجد)' },
  { key: 'stamps_with_sample', label: 'عرض دمغة وموازين (في حالة سحب عينة للعبور)' },
  { key: 'food_safety', label: 'عرض سلامة غذاء (إن وجد)' },
  { key: 'atomic_energy', label: 'عرض طاقة ذرية (إن وجد)' },
  { key: 'military_intel', label: 'عرض مخابرات حربية (إن وجد)' },
  { key: 'civil_protection', label: 'عرض حماية مدنية' },
] as const;

export const TRANSPORT_PORT_KEYS = [
  { key: 'alexandria', label: 'الإسكندرية', nameMatch: /إسكند|اسكند|alex/i },
  { key: 'sokhna', label: 'العين السخنة', nameMatch: /سخن|sokhna|sokh/i },
] as const;

export const TRANSPORT_UNITS = [
  { key: '20ft', label: 'حاوية 20 قدم' },
  { key: '40ft', label: 'حاوية 40 قدم' },
  { key: '2x20ft', label: 'نولون 2 حاوية 20 قدم' },
  { key: 'jumbo', label: 'جامبو' },
  { key: 'tanker', label: 'دبابة' },
  { key: '20ft_upto_8t', label: '20 قدم حتى 8 طن' },
] as const;

export type ClearanceTierKey = (typeof CLEARANCE_TIERS)[number]['key'];
export type OfferKey = (typeof OFFER_CATALOG)[number]['key'] | string;
export type TransportPortKey = (typeof TRANSPORT_PORT_KEYS)[number]['key'] | string;
export type TransportUnitKey = (typeof TRANSPORT_UNITS)[number]['key'] | string;

export function clearanceTierLabel(tierKey: string) {
  return CLEARANCE_TIERS.find((t) => t.key === tierKey)?.label || tierKey;
}

export function offerLabel(offerKey: string, customLabel?: string | null) {
  if (customLabel?.trim()) return customLabel.trim();
  return OFFER_CATALOG.find((o) => o.key === offerKey)?.label || offerKey;
}

export function transportPortLabel(portKey: string) {
  return TRANSPORT_PORT_KEYS.find((p) => p.key === portKey)?.label || portKey;
}

export function transportUnitLabel(unitKey: string, customLabel?: string | null) {
  if (customLabel?.trim()) return customLabel.trim();
  return TRANSPORT_UNITS.find((u) => u.key === unitKey)?.label || unitKey;
}

export function resolvePortKeyFromName(portName?: string | null): TransportPortKey | null {
  if (!portName) return null;
  for (const p of TRANSPORT_PORT_KEYS) {
    if (p.nameMatch.test(portName)) return p.key;
  }
  return null;
}

export function resolveClearanceTierKey(containerCount: number | null | undefined): ClearanceTierKey | null {
  if (containerCount == null || Number.isNaN(Number(containerCount)) || Number(containerCount) <= 0) {
    return null;
  }
  const n = Number(containerCount);
  for (const tier of CLEARANCE_TIERS) {
    if (tier.min == null || tier.max == null) continue;
    if (n >= tier.min && n <= tier.max) return tier.key;
  }
  if (n > 50) return 'qty_21_50';
  return null;
}

export type SuggestedPricingLine = {
  source: 'clearance' | 'offer' | 'transport';
  key: string;
  label: string;
  amount: number;
  currency: string;
  itemType: 'fee' | 'expense';
};

export function buildEmptyClearanceTemplate() {
  return CLEARANCE_TIERS.map((t) => ({
    tierKey: t.key as string,
    label: t.label,
    amount: '' as string | number,
    currency: 'EGP',
    isActive: true,
  }));
}

export function buildEmptyOfferTemplate() {
  return OFFER_CATALOG.map((o, idx) => ({
    offerKey: o.key as string,
    label: o.label,
    customLabel: '',
    amount: '' as string | number,
    currency: 'EGP',
    isActive: false,
    sortOrder: idx,
  }));
}

export function buildEmptyTransportTemplate() {
  const rows: Array<{
    portKey: string;
    unitKey: string;
    label: string;
    amount: string | number;
    currency: string;
    isActive: boolean;
  }> = [];
  for (const port of TRANSPORT_PORT_KEYS) {
    for (const unit of TRANSPORT_UNITS) {
      rows.push({
        portKey: port.key,
        unitKey: unit.key,
        label: `${port.label} — ${unit.label}`,
        amount: '',
        currency: 'EGP',
        isActive: true,
      });
    }
  }
  return rows;
}
