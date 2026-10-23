import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireTreatsPatient } from '@/lib/authz';

export async function GET(request: NextRequest, { params }: { params: { patientId: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { patientId } = params;

        // This route previously had no authentication and no relationship check,
        // so anyone could pull a full patient record — date of birth, blood
        // group, allergies, chronic conditions, current medications — for any
        // patient id, and see that patient's appointments with other doctors.
        const access = await requireTreatsPatient(auth.data, patientId);
        if (!access.ok) return access.response;

        const [patient] = await sql`
            SELECT p.pid, p.uid, p.date_of_birth, p.gender, p.blood_group, p.allergies, p.chronic_conditions, p.current_medications,
                   u.name, u.email, u.phone, u.profile_image_url
            FROM patients p
            JOIN users u ON p.uid = u.uid
            WHERE p.pid = ${patientId}
        `;

        if (!patient) {
            return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
        }

        // Scoped to this doctor: a patient's care history with a different
        // doctor is not this caller's to see.
        const appointments = await sql`
            SELECT aid, scheduled_date, scheduled_time, mode, status, chief_complaint, duration_minutes
            FROM appointments
            WHERE pid = ${patientId} AND did = ${auth.data.did}
            ORDER BY scheduled_date DESC
        `;

        const prescriptions = await sql`
            SELECT prescription_id, diagnosis, created_at, is_active
            FROM prescriptions
            WHERE pid = ${patientId} AND did = ${auth.data.did}
            ORDER BY created_at DESC
        `;

        return NextResponse.json({
            success: true,
            patient: {
                ...patient,
                user: { name: patient.name, email: patient.email, phone: patient.phone, profile_image_url: patient.profile_image_url },
            },
            appointments: appointments || [],
            prescriptions: prescriptions || [],
        });
    } catch (error: any) {
        console.error('[API] Patient detail error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
