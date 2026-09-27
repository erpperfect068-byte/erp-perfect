import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { shipments, clients, clientItems, ports, statuses, contractors, agencies, statements } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';
import { verifyAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    // Load shipments and manually construct relational tree
    const shipmentsList = await db.select().from(shipments).orderBy(desc(shipments.createdAt));

    const fullShipments = await Promise.all(
      shipmentsList.map(async (shipment) => {
        const client = await db.select().from(clients).where(eq(clients.id, shipment.clientId)).then(res => res[0]);
        const item = shipment.clientItemId ? await db.select().from(clientItems).where(eq(clientItems.id, shipment.clientItemId)).then(res => res[0]) : null;
        const port = shipment.portId ? await db.select().from(ports).where(eq(ports.id, shipment.portId)).then(res => res[0]) : null;
        const status = shipment.statusId ? await db.select().from(statuses).where(eq(statuses.id, shipment.statusId)).then(res => res[0]) : null;
        const contractor = shipment.contractorId ? await db.select().from(contractors).where(eq(contractors.id, shipment.contractorId)).then(res => res[0]) : null;
        const agency = shipment.agencyId ? await db.select().from(agencies).where(eq(agencies.id, shipment.agencyId)).then(res => res[0]) : null;

        return {
          ...shipment,
          client,
          clientItem: item,
          port,
          status,
          contractor,
          agency,
        };
      })
    );

    return NextResponse.json(fullShipments);
  } catch (error) {
    console.error('Failed to list shipments:', error);
    return NextResponse.json({ error: 'Failed to retrieve shipments list' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const body = await req.json();
    const {
      clientId,
      clientItemId,
      invoiceValue,
      invoiceNumber,
      supplierName,
      acid,
      declarationNumber46,
      containerCount,
      bolNumber,
      arrivalDate,
      documentReceiptDate,
      portId,
      statusId,
      contractorId,
      agencyId,
      currency,
      notes,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Create Shipment + Auto-create an empty Statement (since there is exactly ONE statement per shipment, 1-to-1)
    const result = await db.transaction(async (tx) => {
      const [newShipment] = await tx.insert(shipments).values({
        clientId,
        clientItemId: clientItemId || null,
        invoiceValue: invoiceValue ? invoiceValue.toString() : null,
        invoiceNumber: invoiceNumber || null,
        supplierName: supplierName || null,
        acid: acid || null,
        declarationNumber46: declarationNumber46 || null,
        containerCount: containerCount ? parseInt(containerCount) : null,
        bolNumber: bolNumber || null,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
        documentReceiptDate: documentReceiptDate ? new Date(documentReceiptDate) : null,
        portId: portId || null,
        statusId: statusId || null,
        contractorId: contractorId || null,
        agencyId: agencyId || null,
        currency: currency || 'USD',
        notes: notes || null,
        createdBy: user.id,
        updatedBy: user.id,
      }).returning();

      // Auto create empty Accounting Statement for this shipment
      await tx.insert(statements).values({
        shipmentId: newShipment.id,
        statementDate: new Date(),
        currency: 'EGP',
        totalAmount: '0.00',
        createdBy: user.id,
        updatedBy: user.id,
      });

      // Audit Log
      await logAudit({
        tableName: 'shipments',
        recordId: newShipment.id,
        action: 'INSERT',
        newData: newShipment,
        userEmail: user.email,
        req,
      });

      return newShipment;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to create shipment:', error);
    return NextResponse.json({ error: 'Failed to create shipment record' }, { status: 500 });
  }
}

// Update Shipment Status / Details
export async function PUT(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const body = await req.json();
    const { id, statusId, arrivalDate, declarationNumber46, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Shipment ID is required' }, { status: 400 });
    }

    const [oldShipment] = await db.select().from(shipments).where(eq(shipments.id, id));

    const [updatedShipment] = await db.update(shipments)
      .set({
        statusId: statusId || oldShipment?.statusId,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : oldShipment?.arrivalDate,
        declarationNumber46: declarationNumber46 || oldShipment?.declarationNumber46,
        notes: notes || oldShipment?.notes,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, id))
      .returning();

    // Log audit
    await logAudit({
      tableName: 'shipments',
      recordId: id,
      action: 'UPDATE',
      oldData: oldShipment,
      newData: updatedShipment,
      userEmail: user.email,
      req,
    });

    return NextResponse.json(updatedShipment);
  } catch (error) {
    console.error('Failed to update shipment:', error);
    return NextResponse.json({ error: 'Failed to update shipment status' }, { status: 500 });
  }
}
