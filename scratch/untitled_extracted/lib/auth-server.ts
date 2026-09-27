import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';
import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPermissions } from './roles-service';

export interface DatabaseUser {
  id: string;
  uid: string;
  email: string;
  name: string | null;
  role: string;
  roleId: string | null;
  permissions?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEMO_USERS: Record<string, { email: string; name: string; role: string; uid: string }> = {
  admin: {
    uid: 'demo-uid-admin',
    email: 'admin@demo-customs.eg',
    name: 'أحمد محمود (مدير النظام التجريبي)',
    role: 'admin',
  },
  accountant: {
    uid: 'demo-uid-accountant',
    email: 'accountant@demo-customs.eg',
    name: 'سارة إبراهيم (محاسب مالي تجريبي)',
    role: 'accountant',
  },
  clearance_officer: {
    uid: 'demo-uid-clearance_officer',
    email: 'clearance@demo-customs.eg',
    name: 'كابتن طارق السعيد (مخلص جمركي تجريبي)',
    role: 'clearance_officer',
  },
  data_entry: {
    uid: 'demo-uid-data_entry',
    email: 'dataentry@demo-customs.eg',
    name: 'مصطفى عادل (مدخل بيانات تجريبي)',
    role: 'data_entry',
  },
};

export async function verifyAuth(req: NextRequest): Promise<{ user: DatabaseUser | null; error: string | null; status: number }> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'غير مصرح - لم يتم إرسال رمز المصادقة', status: 401 };
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return { user: null, error: 'رمز المصادقة فارغ', status: 401 };
    }

    // 1. Support for Demo / Dummy Token
    if (token.startsWith('demo-')) {
      const requestedRole = token.replace('demo-', '') || 'admin';
      const demoConfig = DEMO_USERS[requestedRole] || DEMO_USERS['admin'];

      // Look up user in database
      let found = await db.select().from(users).where(eq(users.email, demoConfig.email)).then((r) => r[0]);
      if (!found) {
        const [created] = await db
          .insert(users)
          .values({
            uid: demoConfig.uid,
            email: demoConfig.email,
            name: demoConfig.name,
            role: demoConfig.role,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: users.email,
            set: { name: demoConfig.name, role: demoConfig.role, isActive: true },
          })
          .returning();
        found = created;
      }

      // Populate permissions
      const perms = await getUserPermissions(found.roleId, found.role);
      const userObj: DatabaseUser = {
        ...(found as unknown as DatabaseUser),
        permissions: perms,
      };

      return { user: userObj, error: null, status: 200 };
    }

    // 2. Real Firebase ID Token Verification
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (err: any) {
      console.warn('Firebase token verification error:', err.message);
      return { user: null, error: 'رمز المصادقة غير صالح أو منتهي الصلاحية', status: 401 };
    }

    // Fetch user from DB
    const dbUser = await db.select().from(users).where(eq(users.uid, decoded.uid)).then((r) => r[0]);
    if (!dbUser) {
      return { user: null, error: 'المستخدم غير مسجل في قاعدة بيانات النظام', status: 403 };
    }

    if (!dbUser.isActive) {
      return { user: null, error: 'تم تعطيل هذا الحساب من قِبل إدارة النظام', status: 403 };
    }

    const perms = await getUserPermissions(dbUser.roleId, dbUser.role);
    const userObj: DatabaseUser = {
      ...(dbUser as unknown as DatabaseUser),
      permissions: perms,
    };

    return { user: userObj, error: null, status: 200 };
  } catch (error: any) {
    console.error('Server auth verification failed:', error);
    return { user: null, error: 'خطأ داخلي أثناء التحقق من الصلاحيات', status: 500 };
  }
}

export function checkRole(user: DatabaseUser | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return allowedRoles.includes(user.role);
}

export function checkPermission(user: DatabaseUser | null, requiredPermission: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.permissions && user.permissions.includes(requiredPermission)) return true;
  return false;
}
