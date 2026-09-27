import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { clients, clientItems, clientPricing } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';
import { verifyAuth } from '@/lib/auth-server';

// List Clients
export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    // Fetch clients
    const clientsList = await db.select().from(clients).where(eq(clients.isActive, true)).orderBy(desc(clients.createdAt));

    // For each client, fetch items and pricing rules
    const fullClients = await Promise.all(
      clientsList.map(async (client) => {
        const items = await db.select().from(clientItems).where(eq(clientItems.clientId, client.id));
        const pricing = await db.select().from(clientPricing).where(eq(clientPricing.clientId, client.id));
        return {
          ...client,
          items,
          pricing,
        };
      })
    );

    return NextResponse.json(fullClients);
  } catch (error) {
    console.error('Failed to list clients:', error);
    return NextResponse.json({ error: 'Failed to retrieve clients list' }, { status: 500 });
  }
}

// Create Client
export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const body = await req.json();
    const { name, contactPerson, phone, email, address, taxNumber, notes, items = [], pricing = [] } = body;

    if (!name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    // Transaction for atomic insertions
    const result = await db.transaction(async (tx) => {
      // 1. Insert Client
      const [newClient] = await tx.insert(clients).values({
        name,
        contactPerson,
        phone,
        email,
        address,
        taxNumber,
        notes,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();

      // 2. Insert Client Items
      let insertedItems = [];
      if (items.length > 0) {
        insertedItems = await Promise.all(
          items.map(async (itemName: string) => {
            const [item] = await tx.insert(clientItems).values({
              clientId: newClient.id,
              name: itemName,
              createdBy: user.id,
            }).returning();
            return item;
          })
        );
      }

      // 3. Insert Pricing Agreements
      let insertedPricing = [];
      if (pricing.length > 0) {
        insertedPricing = await Promise.all(
          pricing.map(async (p: { serviceName: string; price: number; currency: string }) => {
            const [priceRule] = await tx.insert(clientPricing).values({
              clientId: newClient.id,
              serviceName: p.serviceName,
              price: p.price.toString(),
              currency: p.currency || 'EGP',
              createdBy: user.id,
            }).returning();
            return priceRule;
          })
        );
      }

      // 4. Log Audit Event inside transaction
      await logAudit({
        tableName: 'clients',
        recordId: newClient.id,
        action: 'INSERT',
        newData: { ...newClient, items, pricing },
        userEmail: user.email,
        req,
      });

      return {
        ...newClient,
        items: insertedItems,
        pricing: insertedPricing,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to create client:', error);
    return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 });
  }
}
