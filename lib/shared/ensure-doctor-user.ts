import sql from '@/lib/db';
import type { ClerkUser } from '@/lib/clerk-verify';

/**
 * Resolves the internal `users.uid` for the signed-in Clerk user, provisioning
 * the row when it is missing.
 *
 * The web dashboard provisions users through /api/sync-user, but the mobile
 * client resolves identity through GET /api/doctor/profile, so a doctor who
 * only ever signed in on mobile had no `users` row at all — every write route
 * that resolves `auth_id -> uid` then failed to find them.
 */
export async function ensureDoctorUser(clerkUser: ClerkUser): Promise<string | null> {
    const [byAuthId] = await sql`SELECT uid FROM users WHERE auth_id = ${clerkUser.id} LIMIT 1`;
    if (byAuthId) {
        if (clerkUser.picture) {
            await sql`
                UPDATE users 
                SET profile_image_url = COALESCE(profile_image_url, ${clerkUser.picture})
                WHERE uid = ${byAuthId.uid} AND profile_image_url IS NULL
            `;
        }
        return byAuthId.uid;
    }

    if (!clerkUser.email) return null;

    const [byEmail] = await sql`SELECT uid, role, profile_image_url FROM users WHERE email = ${clerkUser.email} LIMIT 1`;
    if (byEmail) {
        // Same guard as /api/sync-user — patient accounts never get claimed here.
        if (byEmail.role === 'patient') return null;
        const [claimed] = await sql`
            UPDATE users
            SET auth_id = ${clerkUser.id}, 
                last_login = ${new Date().toISOString()},
                profile_image_url = COALESCE(profile_image_url, ${clerkUser.picture})
            WHERE uid = ${byEmail.uid}
            RETURNING uid
        `;
        if (claimed) return claimed.uid;
    }

    const name = `${clerkUser.given_name || ''} ${clerkUser.family_name || ''}`.trim() || 'Doctor';

    try {
        const [created] = await sql`
            INSERT INTO users (auth_id, email, name, role, is_verified, last_login, profile_image_url)
            VALUES (${clerkUser.id}, ${clerkUser.email}, ${name}, 'doctor', false, ${new Date().toISOString()}, ${clerkUser.picture || null})
            RETURNING uid
        `;
        return created?.uid ?? null;
    } catch (e: any) {
        // Lost a race against a concurrent request, or email is already taken by
        // a row the lookup above missed — re-read and accept the winner.
        if (e.code === '23505') {
            const [existing] = await sql`SELECT uid FROM users WHERE auth_id = ${clerkUser.id} LIMIT 1`;
            return existing?.uid ?? null;
        }
        throw e;
    }
}
