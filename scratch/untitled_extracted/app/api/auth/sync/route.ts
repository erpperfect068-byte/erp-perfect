import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/src/db/../../lib/firebase-admin';
import { db } from '@/src/db/index';
import { users, userInvitations, authEvents } from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getUserPermissions, ensurePermissionsAndRoles } from '@/lib/roles-service';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Token is empty' }, { status: 401 });
    }

    await ensurePermissionsAndRoles();

    // Support for Demo / Dummy Token
    if (token.startsWith('demo-')) {
      const demoRole = token.replace('demo-', '') || 'admin';
      const demoEmails: Record<string, { email: string; name: string; role: string }> = {
        admin: { email: 'admin@demo-customs.eg', name: 'أحمد محمود (مدير النظام التجريبي)', role: 'admin' },
        accountant: { email: 'accountant@demo-customs.eg', name: 'سارة إبراهيم (محاسب مالي تجريبي)', role: 'accountant' },
        clearance_officer: { email: 'clearance@demo-customs.eg', name: 'كابتن طارق السعيد (مخلص جمركي تجريبي)', role: 'clearance_officer' },
        data_entry: { email: 'dataentry@demo-customs.eg', name: 'مصطفى عادل (مدخل بيانات تجريبي)', role: 'data_entry' },
      };
      const d = demoEmails[demoRole] || demoEmails.admin;

      let demoUser = await db.select().from(users).where(eq(users.email, d.email)).then((r) => r[0]);
      if (!demoUser) {
        const [inserted] = await db
          .insert(users)
          .values({
            uid: `demo-uid-${d.role}`,
            email: d.email,
            name: d.name,
            role: d.role,
            isActive: true,
          })
          .returning();
        demoUser = inserted;
      }

      const perms = await getUserPermissions(demoUser.roleId, demoUser.role);
      return NextResponse.json({
        user: {
          ...demoUser,
          permissions: perms,
        },
      });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      console.error('Firebase token verification failed:', err);
      return NextResponse.json({ error: 'Invalid or expired authentication token' }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || email?.split('@')[0] || 'User';

    if (!email) {
      return NextResponse.json({ error: 'Authentication token has no email address' }, { status: 400 });
    }

    let existingUser;
    try {
      const existingUsers = await db.select().from(users).where(eq(users.uid, uid));
      existingUser = existingUsers[0];
    } catch (dbErr) {
      console.error('Database query error checking existing user by uid:', dbErr);
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    if (existingUser) {
      if (!existingUser.isActive) {
        return NextResponse.json({ error: 'This user account is deactivated' }, { status: 403 });
      }

      try {
        await db.insert(authEvents).values({
          userId: existingUser.id,
          userEmail: existingUser.email,
          eventType: 'login',
          ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: req.headers.get('user-agent') || 'Unknown',
        });
      } catch (logErr) {
        console.warn('Failed to log auth event:', logErr);
      }

      const perms = await getUserPermissions(existingUser.roleId, existingUser.role);
      return NextResponse.json({
        user: {
          ...existingUser,
          permissions: perms,
        },
      });
    }

    let userByEmail;
    try {
      const usersByEmail = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      userByEmail = usersByEmail[0];
    } catch (dbErr) {
      console.error('Database query error checking user by email:', dbErr);
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 });
    }

    if (userByEmail) {
      try {
        const updated = await db
          .update(users)
          .set({ uid, name: userByEmail.name || name, updatedAt: new Date() })
          .where(eq(users.id, userByEmail.id))
          .returning();
        existingUser = updated[0];
      } catch (dbErr) {
        console.error('Database update error linking uid:', dbErr);
        return NextResponse.json({ error: 'Database update error' }, { status: 500 });
      }

      if (!existingUser.isActive) {
        return NextResponse.json({ error: 'This user account is deactivated' }, { status: 403 });
      }

      const perms = await getUserPermissions(existingUser.roleId, existingUser.role);
      return NextResponse.json({
        user: {
          ...existingUser,
          permissions: perms,
        },
      });
    }

    let userCount = 0;
    try {
      const counts = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      userCount = counts[0]?.count || 0;
    } catch (dbErr) {
      console.error('Database query error during bootstrap check:', dbErr);
      return NextResponse.json({ error: 'Database bootstrap error' }, { status: 500 });
    }

    let role = 'data_entry';
    let isAllowed = false;

    if (userCount === 0) {
      role = 'admin';
      isAllowed = true;
    } else {
      let invitation;
      try {
        const invitations = await db.select().from(userInvitations).where(eq(userInvitations.email, email.toLowerCase()));
        invitation = invitations[0];
      } catch (dbErr) {
        console.error('Database query error during invitation lookup:', dbErr);
        return NextResponse.json({ error: 'Database verification error' }, { status: 500 });
      }

      if (invitation && invitation.status === 'pending') {
        role = invitation.role;
        isAllowed = true;

        try {
          await db
            .update(userInvitations)
            .set({ status: 'accepted', acceptedAt: new Date() })
            .where(eq(userInvitations.id, invitation.id));
        } catch (dbErr) {
          console.error('Failed to update invitation status:', dbErr);
        }
      }
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'This email is not authorized to access this system. Please ask an admin to invite you.' }, { status: 403 });
    }

    let newUser;
    try {
      const inserted = await db
        .insert(users)
        .values({
          uid,
          email: email.toLowerCase(),
          name,
          role,
          isActive: true,
        })
        .returning();
      newUser = inserted[0];
    } catch (dbErr) {
      console.error('Database insert error creating new user:', dbErr);
      return NextResponse.json({ error: 'Failed to complete registration in database' }, { status: 500 });
    }

    const perms = await getUserPermissions(newUser.roleId, newUser.role);
    return NextResponse.json({
      user: {
        ...newUser,
        permissions: perms,
      },
    });
  } catch (error) {
    console.error('Unhandled session sync error:', error);
    return NextResponse.json({ error: 'An unexpected internal server error occurred' }, { status: 500 });
  }
}
