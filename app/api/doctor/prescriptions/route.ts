import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireTreatsPatient } from '@/lib/authz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Whitelisted values for prescriptions.medicine_system (mirrors the AI route).
const MEDICINE_SYSTEMS = ['homeopathy', 'allopathy', 'ayurvedic'];

function normalizeSymptoms(symptoms: any): string[] {
    if (Array.isArray(symptoms)) return symptoms.map((s) => String(s).trim()).filter(Boolean);
    if (typeof symptoms === 'string' && symptoms.trim()) {
        return symptoms.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
}

// NOTE: the patient notification deliberately does NOT fire here. A created
// prescription starts as a draft (sent_to_patient = false) and the patient
// backend hides drafts, so notifying at create time would announce something
// the patient cannot see — and did so before the draft was ever sent. The
// notification now lives in the send route.

export async function POST(request: NextRequest) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const body = await request.json();
        // `did` is no longer read from the body. It used to be trusted directly,
        // so a doctor could file a prescription under any other doctor's
        // identity.
        const { pid, aid, diagnosis, symptoms, medicines, instructions, diet_advice, follow_up_date, medicine_system, ai_generated } = body;

        if (!pid || !diagnosis || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        let medicineSystem: string | null = null;
        if (medicine_system !== undefined && medicine_system !== null && medicine_system !== '') {
            if (!MEDICINE_SYSTEMS.includes(medicine_system)) {
                return NextResponse.json({ success: false, error: 'Invalid medicine system. Expected one of: homeopathy, allopathy, ayurvedic' }, { status: 400 });
            }
            medicineSystem = medicine_system;
        }

        const did = auth.data.did;

        // A doctor may only prescribe for a patient they actually treat.
        const patient = await requireTreatsPatient(auth.data, pid);
        if (!patient.ok) return patient.response;

        // If an appointment is referenced it must be this doctor's too, otherwise
        // the `aid` link could be pointed at someone else's consultation.
        if (aid) {
            const [appt] = await sql`
                SELECT aid FROM appointments
                WHERE aid = ${aid} AND did = ${did} AND pid = ${pid}
                LIMIT 1
            `;
            if (!appt) {
                return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
            }
        }

        const normalizedSymptoms = normalizeSymptoms(symptoms);

        const [data] = await sql`
            INSERT INTO prescriptions (pid, did, aid, diagnosis, symptoms, medicines, instructions, diet_advice, follow_up_date, medicine_system, ai_generated, is_active)
            VALUES (${pid}, ${did}, ${aid || null}, ${diagnosis}, ${normalizedSymptoms}, ${medicines}, ${instructions || null}, ${diet_advice || null}, ${follow_up_date || null}, ${medicineSystem}, ${ai_generated === true}, true)
            RETURNING *
        `;

        return NextResponse.json({ success: true, prescription: data, message: 'Prescription created successfully' });
    } catch (error: any) {
        console.error('[API] Prescription creation error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        // `?did=` is gone: it selected whose prescriptions to read with no
        // ownership check, exposing other doctors' patient lists.
        const did = auth.data.did;

        const prescriptions = await sql`
            SELECT p.prescription_id, p.diagnosis, p.symptoms, p.medicines,
                   p.instructions, p.diet_advice, p.follow_up_date,
                   p.medicine_system, p.ai_generated,
                   p.created_at, p.sent_to_patient, p.sent_at,
                   pat.pid, pat.city, pat.state, u.name, u.email, u.profile_image_url
            FROM prescriptions p
            JOIN patients pat ON p.pid = pat.pid
            JOIN users u ON pat.uid = u.uid
            WHERE p.did = ${did} AND p.is_active = true
            ORDER BY p.created_at DESC
        `;

        // No camelCase transform in doctor_view db.ts — all keys are snake_case as returned by Postgres
        const formatted = prescriptions.map(p => ({
            prescription_id: p.prescription_id,
            diagnosis: p.diagnosis,
            symptoms: p.symptoms,
            medicines: p.medicines,
            instructions: p.instructions,
            diet_advice: p.diet_advice,
            follow_up_date: p.follow_up_date,
            medicine_system: p.medicine_system,
            ai_generated: p.ai_generated,
            created_at: p.created_at,
            sent_to_patient: p.sent_to_patient,
            sent_at: p.sent_at,
            patients: { pid: p.pid, city: p.city, state: p.state, users: { name: p.name, email: p.email, profile_image_url: p.profile_image_url } }
        }));

        return NextResponse.json({ success: true, prescriptions: formatted });
    } catch (error: any) {
        console.error('[API] Prescriptions fetch error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
