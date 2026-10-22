import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
    ? Redis.fromEnv() 
    : null;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        let uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Get internal uid if clerk auth_id is provided
        if (uid.startsWith('user_')) {
            const [dbUser] = await sql`SELECT uid FROM users WHERE auth_id = ${uid}`;
            if (dbUser) {
                uid = dbUser.uid;
            } else {
                return NextResponse.json({ success: true, overallPercentage: 0, profilePercentage: 0, payoutPercentage: 0, missingFields: [], isVerified: false });
            }
        }

        const cacheKey = `completion:${uid}`;
        if (redis && !searchParams.get('t')) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return NextResponse.json(cached);
                }
            } catch (err) {
                console.error('Redis cache read error:', err);
            }
        }

        const [user] = await sql`SELECT name, phone, profile_image_url FROM users WHERE uid = ${uid}`;
        const [doctor] = await sql`
            SELECT d.*, c.city as c_city, c.state as c_state 
            FROM doctors d 
            LEFT JOIN clinics c ON d.clinic_id = c.clinic_id 
            WHERE d.uid = ${uid}
        `;

        if (!user || !doctor) {
            return NextResponse.json({ success: true, overallPercentage: 0, profilePercentage: 0, payoutPercentage: 0, missingFields: [], isVerified: false });
        }

        // Profile fields
        const profileFields = [
            { name: 'name', value: user.name },
            { name: 'phone', value: user.phone },
            { name: 'profile image', value: user.profile_image_url },
            { name: 'specialization', value: doctor.specialization && doctor.specialization.length > 0 ? doctor.specialization : null },
            { name: 'qualification', value: doctor.qualification },
            { name: 'years of experience', value: doctor.years_of_experience },
            { name: 'consultation fee', value: doctor.consultation_fee },
            { name: 'registration number', value: doctor.registration_number },
            { name: 'city', value: doctor.city || doctor.c_city },
            { name: 'state', value: doctor.state || doctor.c_state }
        ];

        let profileMissing: string[] = [];
        let profileFilled = 0;
        profileFields.forEach(field => {
            if (field.value !== null && field.value !== undefined && field.value !== '') {
                profileFilled++;
            } else {
                profileMissing.push(field.name);
            }
        });
        const profilePercentage = Math.round((profileFilled / profileFields.length) * 100);

        // Payout fields
        let payoutMissing: string[] = [];
        let payoutFilled = 0;
        const isUpi = doctor.payout_method === 'upi';
        let payoutFields: { name: string; value: any }[] = [];
        
        if (isUpi) {
            payoutFields = [
                { name: 'account holder name', value: doctor.bank_account_holder_name },
                { name: 'upi id', value: doctor.payout_upi_id }
            ];
        } else {
            // Default to bank requirement if not set
            payoutFields = [
                { name: 'account holder name', value: doctor.bank_account_holder_name },
                { name: 'bank account number', value: doctor.bank_account_number },
                { name: 'ifsc code', value: doctor.bank_ifsc_code },
                { name: 'bank name', value: doctor.bank_name },
                { name: 'account type', value: doctor.bank_account_type }
            ];
        }

        payoutFields.forEach(field => {
            if (field.value !== null && field.value !== undefined && field.value !== '') {
                payoutFilled++;
            } else {
                payoutMissing.push(field.name);
            }
        });
        const payoutPercentage = Math.round((payoutFilled / payoutFields.length) * 100);

        // Overall
        const totalFields = profileFields.length + payoutFields.length;
        const totalFilled = profileFilled + payoutFilled;
        const overallPercentage = Math.round((totalFilled / totalFields) * 100);
        
        const missingFields = [...profileMissing, ...payoutMissing];

        const responseData = {
            success: true,
            overallPercentage,
            profilePercentage,
            payoutPercentage,
            missingFields,
            isVerified: doctor.is_verified || false,
            verificationRejected: doctor.verification_rejected || false,
            verificationNotes: doctor.verification_notes || null
        };

        if (redis) {
            try {
                // Cache for 24 hours. Profile edits will invalidate this cache.
                await redis.set(cacheKey, responseData, { ex: 86400 });
            } catch (err) {
                console.error('Redis cache write error:', err);
            }
        }

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('Completion API error:', error);
        return NextResponse.json({ error: 'Failed to calculate completion' }, { status: 500 });
    }
}
