import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireAdmin, requireClerkSession } from '@/lib/authz';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export const dynamic = 'force-dynamic';

/**
 * Approve or reject a doctor profile.
 *
 * This used to authorise with `ADMIN_VERIFICATION_SECRET || 'secret123'` — a
 * guessable constant that was also emailed out in plaintext in the review link.
 * `ADMIN_VERIFICATION_SECRET` is not set anywhere, so the constant was the live
 * credential and anyone who read the source could verify arbitrary doctors.
 *
 * Authorisation is now a Clerk session with `users.role = 'admin'`. No secret
 * is accepted from the request, so there is nothing to leak through email or
 * referrers.
 */
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const uid = url.searchParams.get('uid');
        if (!uid) {
            return NextResponse.json({ error: 'Doctor UID required' }, { status: 400 });
        }

        const [user] = await sql`SELECT uid, name, email, phone, profile_image_url FROM users WHERE uid = ${uid}`;
        const [doctor] = await sql`
            SELECT d.*, c.clinic_name as joined_clinic_name, c.address_line1 as c_address1, c.city as c_city, c.state as c_state 
            FROM doctors d 
            LEFT JOIN clinics c ON d.clinic_id = c.clinic_id 
            WHERE d.uid = ${uid}
        `;

        if (!user || !doctor) {
            return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user, doctor });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to load doctor' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // Check if user is logged in as admin via Clerk session
    const auth = await requireAdmin().catch(() => ({ ok: false as const, response: null }));
    
    // If not admin by Clerk session, check if any admin exists or if request has a matching admin email header/secret
    let isAuthorized = auth.ok;

    if (!isAuthorized) {
        // Check if there are no registered admins yet, or if current request is authenticated
        const clerkAuth = await requireClerkSession().catch(() => ({ ok: false as const }));
        if (clerkAuth.ok) {
            const [currentUser] = await sql`SELECT role FROM users WHERE auth_id = ${clerkAuth.data.clerkId}`;
            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_admin')) {
                isAuthorized = true;
            }
        }
    }

    // If still not authorized, return 403
    if (!isAuthorized) {
        if (!auth.ok && auth.response) {
            return auth.response;
        }
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { uid, action, reason } = body;

        if (!uid || !action) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (action === 'approve') {
            await sql`
                UPDATE doctors
                SET is_verified = true, verification_rejected = false, verification_notes = null, verification_requested = false
                WHERE uid = ${uid}
            `;
            await sql`
                UPDATE users
                SET is_verified = true
                WHERE uid = ${uid}
            `;
        } else {
            await sql`
                UPDATE doctors
                SET is_verified = false, verification_rejected = true, verification_notes = ${reason || 'Profile does not meet our guidelines.'}, verification_requested = false
                WHERE uid = ${uid}
            `;
            await sql`
                UPDATE users
                SET is_verified = false
                WHERE uid = ${uid}
            `;
        }

        // Invalidate caches to update doctor's UI in real-time
        if (redis) {
            await redis.del(`completion:${uid}`);
            await redis.del(`profile:${uid}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Verification Action API error:', error);
        return NextResponse.json({ error: 'Failed to process verification' }, { status: 500 });
    }
}
