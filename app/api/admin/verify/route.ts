import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
    ? Redis.fromEnv() 
    : null;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uid, action, token, reason } = body;

        const adminSecret = process.env.ADMIN_VERIFICATION_SECRET || 'secret123';

        if (token !== adminSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!uid || !action) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        if (action === 'approve') {
            await sql`
                UPDATE doctors 
                SET is_verified = true, verification_rejected = false, verification_notes = null 
                WHERE uid = ${uid}
            `;
        } else if (action === 'reject') {
            await sql`
                UPDATE doctors 
                SET is_verified = false, verification_rejected = true, verification_notes = ${reason || 'Profile does not meet our guidelines.'} 
                WHERE uid = ${uid}
            `;
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
