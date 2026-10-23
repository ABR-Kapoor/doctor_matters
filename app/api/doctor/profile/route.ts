import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyClerkUser } from '@/lib/clerk-verify';
import { requireDoctorAccount } from '@/lib/authz';
import { ensureDoctorUser } from '@/lib/shared/ensure-doctor-user';
import { parseClinicGeo } from '@/lib/clinic-geo';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
    ? Redis.fromEnv() 
    : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The mobile client submits form fields verbatim, so numbers arrive as strings
// and unset fields arrive as ''. Coerce before they reach typed columns.
const asText = (v: unknown): string | null => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
};

const asUuid = (v: unknown): string | null => {
    const s = asText(v);
    return s !== null && UUID_RE.test(s) ? s : null;
};

const asNumber = (v: unknown): number | null => {
    const s = asText(v);
    if (s === null) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
};

const asInteger = (v: unknown): number | null => {
    const n = asNumber(v);
    return n === null ? null : Math.trunc(n);
};

const asTextArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
    const s = asText(v);
    return s === null ? [] : s.split(',').map(x => x.trim()).filter(Boolean);
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    const auth = await requireDoctorAccount();
    if (!auth.ok) return auth.response;

    try {
        // Provision on read: the mobile client resolves identity through this
        // endpoint, so this is the only chance a new doctor has to get a users
        // row. The `?uid=` parameter that used to select an arbitrary account is
        // gone — the session is the only identity.
        const clerkUser = await verifyClerkUser(request);
        const uid = clerkUser ? await ensureDoctorUser(clerkUser) : null;

        if (!uid) {
            return NextResponse.json(
                { error: 'Unable to resolve your account. Please sign out and sign in again.' },
                { status: 404 }
            );
        }

        const cacheKey = `profile:${uid}`;
        if (redis) {
            try {
                const cached = await Promise.race([
                    redis.get(cacheKey),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Redis Timeout")), 50))
                ]);
                if (cached) {
                    return NextResponse.json(cached);
                }
            } catch (err) {
                console.error('Redis profile cache read error:', err);
            }
        }

        const [user] = await sql`
            SELECT uid, email, name, phone, profile_image_url, role, is_verified, created_at
            FROM users
            WHERE uid = ${uid}
        `;

        const [doctor] = await sql`
            SELECT d.*, c.clinic_id as c_clinic_id, c.clinic_name as c_clinic_name, c.city as c_city, c.state as c_state
            FROM doctors d
            LEFT JOIN clinics c ON d.clinic_id = c.clinic_id
            WHERE d.uid = ${uid}
        `;

        const doctorWithImage = doctor ? {
            ...doctor,
            profile_image_url: user?.profile_image_url || null,
            clinic_name: doctor.c_clinic_name || doctor.clinic_name || '',
            clinics: doctor.c_clinic_id ? { clinic_id: doctor.c_clinic_id, clinic_name: doctor.c_clinic_name, city: doctor.c_city, state: doctor.c_state } : null,
            // Exact map point for the clinic, encoded inside address_line2.
            clinicLocation: parseClinicGeo(doctor.address_line2)
        } : null;

        const responseData = { success: true, user, doctor: doctorWithImage };

        if (redis) {
            // Fire and forget the write, don't block the response
            Promise.race([
                redis.set(cacheKey, responseData, { ex: 86400 }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Redis Timeout")), 500))
            ]).catch(err => {
                console.error('Redis profile cache write error:', err);
            });
        }

        return NextResponse.json(responseData, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const auth = await requireDoctorAccount();
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json();
        const { user, doctor } = body;

        // Never trust the client-supplied uid — resolve the row from the session.
        const clerkUser = await verifyClerkUser(request);
        const uid = clerkUser ? await ensureDoctorUser(clerkUser) : null;
        if (!uid) {
            return NextResponse.json({ error: 'Unable to resolve your account. Please sign out and sign in again.' }, { status: 404 });
        }

        if (user) {
            try {
                await sql`
                    UPDATE users
                    SET name = COALESCE(${asText(user.name)}, name),
                        phone = ${asText(user.phone)},
                        profile_image_url = ${asText(user.profile_image_url)}
                    WHERE uid = ${uid}
                `;
            } catch (e: any) {
                if (e.code === '23505' && e.message?.includes('phone')) {
                    return NextResponse.json({ error: 'This phone number is already registered to another user.' }, { status: 400 });
                }
                throw e;
            }
        }

        if (doctor) {
            const regNum = asText(doctor.registration_number);
            if (!regNum) {
                return NextResponse.json({ error: 'Registration number is required.' }, { status: 400 });
            }

            const [existingDoctor] = await sql`SELECT did FROM doctors WHERE uid = ${uid}`;

            const d = {
                specialization: asTextArray(doctor.specialization),
                custom_specializations: asText(doctor.custom_specializations),
                qualification: asText(doctor.qualification) ?? '',
                registration_number: regNum,
                years_of_experience: asInteger(doctor.years_of_experience),
                consultation_fee: asNumber(doctor.consultation_fee),
                bio: asText(doctor.bio),
                clinic_id: asUuid(doctor.clinic_id),
                clinic_name: asText(doctor.clinic_name),
                address_line1: asText(doctor.address_line1),
                address_line2: asText(doctor.address_line2),
                city: asText(doctor.city),
                state: asText(doctor.state),
                postal_code: asText(doctor.postal_code),
                languages: asTextArray(doctor.languages),
            };
            d.clinic_name = d.clinic_id ? null : d.clinic_name;

            try {
                if (existingDoctor) {
                    await sql`
                        UPDATE doctors SET
                            specialization = ${d.specialization},
                            custom_specializations = ${d.custom_specializations},
                            qualification = ${d.qualification},
                            registration_number = ${d.registration_number},
                            years_of_experience = ${d.years_of_experience},
                            consultation_fee = ${d.consultation_fee},
                            bio = ${d.bio},
                            clinic_id = ${d.clinic_id},
                            clinic_name = ${d.clinic_name},
                            address_line1 = ${d.address_line1},
                            address_line2 = ${d.address_line2},
                            city = ${d.city},
                            state = ${d.state},
                            postal_code = ${d.postal_code},
                            languages = ${d.languages},
                            is_verified = false,
                            verification_rejected = false,
                            verification_notes = null
                        WHERE uid = ${uid}
                    `;
                } else {
                    await sql`
                        INSERT INTO doctors (uid, specialization, custom_specializations, qualification, registration_number, years_of_experience, consultation_fee, bio, clinic_id, clinic_name, address_line1, address_line2, city, state, postal_code, languages)
                        VALUES (${uid}, ${d.specialization}, ${d.custom_specializations}, ${d.qualification}, ${d.registration_number}, ${d.years_of_experience}, ${d.consultation_fee}, ${d.bio}, ${d.clinic_id}, ${d.clinic_name}, ${d.address_line1}, ${d.address_line2}, ${d.city}, ${d.state}, ${d.postal_code}, ${d.languages})
                    `;
                }
            } catch (e: any) {
                console.error('[PATCH Profile] Database Error:', e);
                if (e.code === '23505' && e.message?.includes('registration_number')) {
                    return NextResponse.json({ error: 'This registration number is already registered to another doctor.' }, { status: 400 });
                }
                if (e.code === '23502') {
                    return NextResponse.json({ error: `Missing required field: ${e.message?.match(/column "([^"]+)"/)?.[1] ?? 'unknown'}` }, { status: 400 });
                }
                throw e;
            }
        }

        if (redis) {
            // Fire and forget cache invalidation
            Promise.race([
                Promise.all([
                    redis.del(`profile:${uid}`),
                    redis.del(`completion:${uid}`)
                ]),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Redis Timeout")), 500))
            ]).catch(err => {
                console.error('Redis cache invalidation error:', err);
            });
        }

        try {
            await sql`
                INSERT INTO notifications (uid, title, body, type, is_read)
                VALUES (${uid}, 'Profile Updated', 'Your professional profile and clinic details have been updated.', 'profile', false)
            `;
        } catch (e) {
            console.error('Profile update notification error:', e);
        }

        return NextResponse.json({ success: true, message: 'Profile updated successfully' }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Failed to update profile', details: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    }
}

// AURASUTRA-REVIEWS:expose_rating_fields
