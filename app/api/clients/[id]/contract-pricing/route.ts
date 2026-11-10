import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';
import {
  CLEARANCE_TIERS,
  OFFER_CATALOG,
  TRANSPORT_PORT_KEYS,
  TRANSPORT_UNITS,
  clearanceTierLabel,
  offerLabel,
  resolveClearanceTierKey,
  resolvePortKeyFromName,
  transportPortLabel,
  transportUnitLabel,
  type SuggestedPricingLine,
} from '@/lib/client-contract-pricing';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function canViewClients(user: { permissions: string[]; role: string }) {
  return (
    userHasPermission(user as any, 'clients.view') ||
    userHasPermission(user as any, 'clients.create') ||
    userHasPermission(user as any, 'client_pricing.create') ||
    userHasPermission(user as any, 'client_pricing.update')
  );
}

function canEditPricing(user: { permissions: string[]; role: string }) {
  return (
    userHasPermission(user as any, 'clients.update') ||
    userHasPermission(user as any, 'client_pricing.create') ||
    userHasPermission(user as any, 'client_pricing.update') ||
    userHasPermission(user as any, 'clients.create')
  );
}

async function assertOwnedClient(supabase: any, clientId: string, companyId: string | null) {
  let q = supabase.from('clients').select('id, company_id, name').eq('id', clientId);
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q.maybeSingle();
  return { data, error };
}

function mergeClearance(rows: any[]) {
  const byKey = new Map(rows.map((r) => [r.tier_key, r]));
  return CLEARANCE_TIERS.map((t) => {
    const row = byKey.get(t.key);
    return {
      id: row?.id || null,
      tierKey: t.key,
      label: t.label,
      amount: row?.amount != null ? Number(row.amount) : null,
      currency: row?.currency || 'EGP',
      isActive: row?.is_active ?? true,
    };
  });
}

function mergeOffers(rows: any[]) {
  const byKey = new Map(rows.map((r) => [r.offer_key, r]));
  const catalog = OFFER_CATALOG.map((o, idx) => {
    const row = byKey.get(o.key);
    return {
      id: row?.id || null,
      offerKey: o.key,
      label: offerLabel(o.key, row?.custom_label),
      customLabel: row?.custom_label || '',
      amount: row?.amount != null ? Number(row.amount) : null,
      currency: row?.currency || 'EGP',
      isActive: row?.is_active ?? false,
      sortOrder: row?.sort_order ?? idx,
      isCustom: false,
    };
  });

  const custom = rows
    .filter((r) => !OFFER_CATALOG.some((o) => o.key === r.offer_key))
    .map((r) => ({
      id: r.id,
      offerKey: r.offer_key,
      label: offerLabel(r.offer_key, r.custom_label),
      customLabel: r.custom_label || '',
      amount: r.amount != null ? Number(r.amount) : null,
      currency: r.currency || 'EGP',
      isActive: r.is_active ?? true,
      sortOrder: r.sort_order ?? 100,
      isCustom: true,
    }));

  return [...catalog, ...custom].sort((a, b) => a.sortOrder - b.sortOrder);
}

function mergeTransport(rows: any[]) {
  const byKey = new Map(rows.map((r) => [`${r.port_key}::${r.unit_key}`, r]));
  const standard: any[] = [];
  for (const port of TRANSPORT_PORT_KEYS) {
    for (const unit of TRANSPORT_UNITS) {
      const k = `${port.key}::${unit.key}`;
      const row = byKey.get(k);
      standard.push({
        id: row?.id || null,
        portKey: port.key,
        unitKey: unit.key,
        label: `${port.label} — ${unit.label}`,
        customLabel: row?.custom_label || '',
        amount: row?.amount != null ? Number(row.amount) : null,
        currency: row?.currency || 'EGP',
        isActive: row?.is_active ?? true,
        isCustom: false,
      });
      byKey.delete(k);
    }
  }
  const custom = [...byKey.values()].map((r) => ({
    id: r.id,
    portKey: r.port_key,
    unitKey: r.unit_key,
    label: r.custom_label || `${transportPortLabel(r.port_key)} — ${transportUnitLabel(r.unit_key)}`,
    customLabel: r.custom_label || '',
    amount: r.amount != null ? Number(r.amount) : null,
    currency: r.currency || 'EGP',
    isActive: r.is_active ?? true,
    isCustom: true,
  }));
  return [...standard, ...custom];
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!canViewClients(user)) return forbiddenResponse('غير مصرح لك بعرض تسعير العملاء');

    const { id } = await context.params;
    const { data: client, error: clientErr } = await assertOwnedClient(
      supabase,
      id,
      user.company_id
    );
    if (clientErr) throw clientErr;
    if (!client) return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });

    const [metaRes, clearanceRes, offersRes, transportRes] = await Promise.all([
      supabase.from('client_contract_meta').select('*').eq('client_id', id).maybeSingle(),
      supabase.from('client_clearance_rates').select('*').eq('client_id', id),
      supabase.from('client_offer_rates').select('*').eq('client_id', id).order('sort_order'),
      supabase.from('client_transport_rates').select('*').eq('client_id', id),
    ]);

    if (clearanceRes.error) throw clearanceRes.error;
    if (offersRes.error) throw offersRes.error;
    if (transportRes.error) throw transportRes.error;

    const meta = metaRes.data
      ? {
          effectiveDate: metaRes.data.effective_date,
          durationLabel: metaRes.data.duration_label,
          contractType: metaRes.data.contract_type,
          coveredPorts: metaRes.data.covered_ports,
        }
      : {
          effectiveDate: null,
          durationLabel: 'عام من تاريخه',
          contractType: 'clearance_transport',
          coveredPorts: 'الإسكندرية / السخنة',
        };

    return NextResponse.json({
      success: true,
      clientId: id,
      clientName: client.name,
      catalogs: {
        clearanceTiers: CLEARANCE_TIERS,
        offers: OFFER_CATALOG,
        ports: TRANSPORT_PORT_KEYS.map(({ key, label }) => ({ key, label })),
        units: TRANSPORT_UNITS,
      },
      meta,
      clearance: mergeClearance(clearanceRes.data || []),
      offers: mergeOffers(offersRes.data || []),
      transport: mergeTransport(transportRes.data || []),
    });
  } catch (err: any) {
    console.error('Failed to load client contract pricing:', err);
    return NextResponse.json({ error: err.message || 'فشل تحميل تسعير التعاقد' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!canEditPricing(user)) return forbiddenResponse('غير مصرح لك بتعديل تسعير العملاء');

    const { id } = await context.params;
    const { data: client, error: clientErr } = await assertOwnedClient(
      supabase,
      id,
      user.company_id
    );
    if (clientErr) throw clientErr;
    if (!client) return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });

    const body = await req.json();
    const { meta, clearance, offers, transport } = body;
    const companyId = user.company_id || client.company_id || null;
    const now = new Date().toISOString();

    if (meta && typeof meta === 'object') {
      const metaPayload = {
        client_id: id,
        company_id: companyId,
        effective_date: meta.effectiveDate || null,
        duration_label: meta.durationLabel || null,
        contract_type: meta.contractType || 'clearance_transport',
        covered_ports: meta.coveredPorts || null,
        updated_at: now,
        created_by: user.id,
      };
      const { error: metaErr } = await supabase.from('client_contract_meta').upsert(metaPayload, {
        onConflict: 'client_id',
      });
      if (metaErr) throw metaErr;
    }

    if (Array.isArray(clearance)) {
      const rows = clearance
        .filter((r: any) => r?.tierKey)
        .map((r: any) => ({
          client_id: id,
          company_id: companyId,
          tier_key: String(r.tierKey),
          amount:
            r.amount === '' || r.amount == null || Number.isNaN(Number(r.amount))
              ? null
              : Number(r.amount),
          currency: r.currency || 'EGP',
          is_active: r.isActive !== false,
          updated_at: now,
          created_by: user.id,
        }));
      if (rows.length > 0) {
        const { error: cErr } = await supabase.from('client_clearance_rates').upsert(rows, {
          onConflict: 'client_id,tier_key',
        });
        if (cErr) throw cErr;
      }
    }

    if (Array.isArray(offers)) {
      const rows = offers
        .filter((r: any) => r?.offerKey)
        .map((r: any, idx: number) => ({
          client_id: id,
          company_id: companyId,
          offer_key: String(r.offerKey),
          custom_label: r.customLabel?.trim() || null,
          amount:
            r.amount === '' || r.amount == null || Number.isNaN(Number(r.amount))
              ? null
              : Number(r.amount),
          currency: r.currency || 'EGP',
          is_active: !!r.isActive,
          sort_order: r.sortOrder ?? idx,
          updated_at: now,
          created_by: user.id,
        }));
      if (rows.length > 0) {
        const { error: oErr } = await supabase.from('client_offer_rates').upsert(rows, {
          onConflict: 'client_id,offer_key',
        });
        if (oErr) throw oErr;
      }
    }

    if (Array.isArray(transport)) {
      const rows = transport
        .filter((r: any) => r?.portKey && r?.unitKey)
        .map((r: any) => ({
          client_id: id,
          company_id: companyId,
          port_key: String(r.portKey),
          unit_key: String(r.unitKey),
          custom_label: r.customLabel?.trim() || null,
          amount:
            r.amount === '' || r.amount == null || Number.isNaN(Number(r.amount))
              ? null
              : Number(r.amount),
          currency: r.currency || 'EGP',
          is_active: r.isActive !== false,
          updated_at: now,
          created_by: user.id,
        }));
      if (rows.length > 0) {
        const { error: tErr } = await supabase.from('client_transport_rates').upsert(rows, {
          onConflict: 'client_id,port_key,unit_key',
        });
        if (tErr) throw tErr;
      }
    }

    return NextResponse.json({ success: true, message: 'تم حفظ تسعير التعاقد بنجاح' });
  } catch (err: any) {
    console.error('Failed to save client contract pricing:', err);
    return NextResponse.json({ error: err.message || 'فشل حفظ تسعير التعاقد' }, { status: 500 });
  }
}

/** Resolve suggested statement lines from shipment context */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!canViewClients(user)) return forbiddenResponse();

    const { id } = await context.params;
    const body = await req.json();
    const {
      containerCount,
      portId,
      portName,
      portKey: bodyPortKey,
      unitKey = '20ft',
      includeClearance = true,
      includeTransport = true,
      offerKeys = [] as string[],
      includeActiveOffers = false,
    } = body;

    const { data: client, error: clientErr } = await assertOwnedClient(
      supabase,
      id,
      user.company_id
    );
    if (clientErr) throw clientErr;
    if (!client) return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });

    let resolvedPortName = portName || null;
    if (!resolvedPortName && portId) {
      const { data: port } = await supabase.from('ports').select('name').eq('id', portId).maybeSingle();
      resolvedPortName = port?.name || null;
    }
    const portKey = bodyPortKey || resolvePortKeyFromName(resolvedPortName);

    const [clearanceRes, offersRes, transportRes] = await Promise.all([
      supabase.from('client_clearance_rates').select('*').eq('client_id', id).eq('is_active', true),
      supabase.from('client_offer_rates').select('*').eq('client_id', id).eq('is_active', true),
      supabase.from('client_transport_rates').select('*').eq('client_id', id).eq('is_active', true),
    ]);

    if (clearanceRes.error) throw clearanceRes.error;
    if (offersRes.error) throw offersRes.error;
    if (transportRes.error) throw transportRes.error;

    const suggestions: SuggestedPricingLine[] = [];

    if (includeClearance) {
      const tierKey = resolveClearanceTierKey(containerCount);
      if (tierKey) {
        const row = (clearanceRes.data || []).find((r: any) => r.tier_key === tierKey);
        if (row && row.amount != null && Number(row.amount) > 0) {
          suggestions.push({
            source: 'clearance',
            key: tierKey,
            label: `أتعاب تخليص — ${clearanceTierLabel(tierKey)}`,
            amount: Number(row.amount),
            currency: row.currency || 'EGP',
            itemType: 'fee',
          });
        }
      }
    }

    if (includeTransport && portKey) {
      const row = (transportRes.data || []).find(
        (r: any) => r.port_key === portKey && r.unit_key === unitKey
      );
      if (row && row.amount != null && Number(row.amount) > 0) {
        suggestions.push({
          source: 'transport',
          key: `${portKey}::${unitKey}`,
          label: `نولون نقل — ${transportPortLabel(portKey)} / ${transportUnitLabel(unitKey, row.custom_label)}`,
          amount: Number(row.amount),
          currency: row.currency || 'EGP',
          itemType: 'expense',
        });
      }
    }

    const selectedOfferKeys: string[] = Array.isArray(offerKeys) ? offerKeys : [];
    const offerRows = (offersRes.data || []).filter((r: any) => {
      if (includeActiveOffers) return true;
      return selectedOfferKeys.includes(r.offer_key);
    });
    for (const row of offerRows) {
      if (row.amount == null || Number(row.amount) <= 0) continue;
      suggestions.push({
        source: 'offer',
        key: row.offer_key,
        label: offerLabel(row.offer_key, row.custom_label),
        amount: Number(row.amount),
        currency: row.currency || 'EGP',
        itemType: 'expense',
      });
    }

    // Flat catalog for manual picker
    const picker = [
      ...(clearanceRes.data || [])
        .filter((r: any) => r.amount != null && Number(r.amount) > 0)
        .map((r: any) => ({
          source: 'clearance' as const,
          key: r.tier_key,
          label: `تخليص — ${clearanceTierLabel(r.tier_key)}`,
          amount: Number(r.amount),
          currency: r.currency || 'EGP',
          itemType: 'fee' as const,
        })),
      ...(offersRes.data || [])
        .filter((r: any) => r.amount != null && Number(r.amount) > 0)
        .map((r: any) => ({
          source: 'offer' as const,
          key: r.offer_key,
          label: offerLabel(r.offer_key, r.custom_label),
          amount: Number(r.amount),
          currency: r.currency || 'EGP',
          itemType: 'expense' as const,
        })),
      ...(transportRes.data || [])
        .filter((r: any) => r.amount != null && Number(r.amount) > 0)
        .map((r: any) => ({
          source: 'transport' as const,
          key: `${r.port_key}::${r.unit_key}`,
          label: `نقل — ${transportPortLabel(r.port_key)} / ${transportUnitLabel(r.unit_key, r.custom_label)}`,
          amount: Number(r.amount),
          currency: r.currency || 'EGP',
          itemType: 'expense' as const,
        })),
    ];

    return NextResponse.json({
      success: true,
      resolved: {
        tierKey: resolveClearanceTierKey(containerCount),
        portKey,
        unitKey,
      },
      suggestions,
      picker,
    });
  } catch (err: any) {
    console.error('Failed to resolve client contract pricing:', err);
    return NextResponse.json({ error: err.message || 'فشل احتساب أسعار التعاقد' }, { status: 500 });
  }
}
