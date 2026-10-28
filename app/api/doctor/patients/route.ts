import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor } from '@/lib/authz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const doctor = { did: auth.data.did };

        // Query appointments for this doctor to identify patients who have booked appointments
        const appointmentRows = await sql`
            SELECT 
                pid, 
                COUNT(*)::int AS total_appointments,
                MAX(scheduled_date) AS last_appointment_date,
                MIN(scheduled_date) AS first_appointment_date
            FROM appointments
            WHERE did = ${doctor.did}
            GROUP BY pid
        `;

        if (!appointmentRows || appointmentRows.length === 0) {
            return NextResponse.json({ success: true, patients: [] });
        }

        const patientIds = appointmentRows.map(r => r.pid);

        // Get patient details with user info
        const patients = await sql`
            SELECT p.pid, p.uid, p.date_of_birth, p.gender, p.blood_group, p.allergies, p.chronic_conditions,
                   u.name, u.email, u.phone, u.profile_image_url
            FROM patients p
            JOIN users u ON p.uid = u.uid
            WHERE p.pid = ANY(${patientIds}::uuid[])
        `;

        // Enrich with adherence and prescription data
        const enrichedPatients = await Promise.all(patients.map(async (patient) => {
            const aptSummary = appointmentRows.find(r => r.pid === patient.pid);

            const [prescriptionCount] = await sql`
                SELECT count(*)::int as count FROM prescriptions
                WHERE pid = ${patient.pid} AND did = ${doctor.did}
            `;

            const adherenceRecords = await sql`
                SELECT is_taken, is_skipped, scheduled_date, scheduled_time FROM medication_adherence
                WHERE pid = ${patient.pid}
            `;

            let adherenceRate = 0;
            if (adherenceRecords && adherenceRecords.length > 0) {
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0];

                const takenCount = adherenceRecords.filter(r => r.is_taken).length;
                adherenceRate = adherenceRecords.length > 0 ? Math.round((takenCount / adherenceRecords.length) * 100) : 0;
            }

            return {
                ...patient,
                user: { name: patient.name, email: patient.email, phone: patient.phone, profile_image_url: patient.profile_image_url },
                total_appointments: aptSummary?.total_appointments || 0,
                last_appointment_date: aptSummary?.last_appointment_date,
                first_appointment_date: aptSummary?.first_appointment_date,
                adherenceRate,
                prescriptionCount: prescriptionCount?.count || 0,
                recentAdherence: adherenceRecords?.slice(-7) || [],
            };
        }));

        return NextResponse.json({ success: true, patients: enrichedPatients });
    } catch (error: any) {
        console.error('[API] Patients fetch error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
