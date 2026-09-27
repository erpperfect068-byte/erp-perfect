import { db } from '@/src/db/index';
import { auditLog } from '@/src/db/schema';
import { verifyAuth } from './auth-server';
import { NextRequest } from 'next/server';

export async function logAudit({
  tableName,
  recordId,
  action,
  oldData = null,
  newData = null,
  req,
  userId = null,
  userEmail = null,
}: {
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldData?: any;
  newData?: any;
  req?: Request;
  userId?: string | null;
  userEmail?: string | null;
}) {
  try {
    let resolvedUserId = userId;
    let resolvedUserEmail = userEmail;

    // Resolve user from authorization headers if request is passed and userEmail not provided
    if (req && !resolvedUserEmail) {
      try {
        const { user } = await verifyAuth(req as NextRequest);
        if (user) {
          resolvedUserEmail = user.email;
          resolvedUserId = user.id;
        }
      } catch {
        // Fallback
      }
    }

    // Insert into audit logs table
    await db.insert(auditLog).values({
      tableName,
      recordId: String(recordId),
      action,
      oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
      changedBy: null, // Keep references loose to prevent deletion cascading
      changedByEmail: resolvedUserEmail || 'System/Guest',
      ipAddress: req ? (req.headers.get('x-forwarded-for') || '127.0.0.1') : '127.0.0.1',
      userAgent: req ? (req.headers.get('user-agent') || 'Server Task') : 'Server Task',
    });
  } catch (error) {
    console.error('Audit logger failed error:', error);
  }
}
