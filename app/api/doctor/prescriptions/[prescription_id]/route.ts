import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireOwnPrescription } from '@/lib/authz';

function normalizeSymptoms(symptoms: any): string[] {
    if (Array.isArray(symptoms)) return symptoms.map((s) => String(s).trim()).filter(Boolean);
    if (typeof symptoms === 'string' && symptoms.trim()) {
        return symptoms.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
}

function normalizeMedicines(medicines: any): any[] {
    if (!Array.isArray(medicines)) return [];
    return medicines.map((m) => ({
        name: String(m?.name || '').trim(),
        dosage: String(m?.dosage || '').trim(),
        frequency: String(m?.frequency || '').trim(),
        duration: String(m?.duration || '').trim(),
        ...(typeof m === 'object' && m ? m : {}),
    }));
}

function formatPrescription(p: any) {
    return {
        prescription_id: p.prescription_id,
        diagnosis: p.diagnosis,
        symptoms: p.symptoms,
        medicines: p.medicines,
        instructions: p.instructions,
        diet_advice: p.diet_advice,
        follow_up_date: p.follow_up_date,
        medicine_system: p.medicine_system ?? null,
        ai_generated: p.ai_generated === true,
        created_at: p.created_at,
        updated_at: p.updated_at,
        sent_to_patient: p.sent_to_patient,
        sent_at: p.sent_at,
        patients: p.pid
            ? { pid: p.pid, city: p.city, state: p.state, users: { name: p.name, email: p.email, profile_image_url: p.profile_image_url } }
            : null,
    };
}

export async function GET(request: NextRequest, { params }: { params: { prescription_id: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { prescription_id } = params;

        // This route previously had no authentication at all: any caller could
        // read any prescription in the platform, including the patient's name,
        // diagnosis and full medication list.
        const owned = await requireOwnPrescription(auth.data, prescription_id);
        if (!owned.ok) return owned.response;

        const [prescription] = await sql`
            SELECT p.prescription_id, p.pid, p.did, p.aid, p.diagnosis, p.symptoms, p.medicines,
                   p.instructions, p.diet_advice, p.follow_up_date, p.medicine_system, p.ai_generated,
                   p.created_at, p.updated_at,
                   p.sent_to_patient, p.sent_at,
                   pat.pid AS pat_pid, pat.city, pat.state,
                   u.name, u.email, u.profile_image_url
            FROM prescriptions p
            LEFT JOIN patients pat ON p.pid = pat.pid
            LEFT JOIN users u ON pat.uid = u.uid
            WHERE p.prescription_id = ${prescription_id}
        `;

        if (!prescription) {
            return NextResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            prescription: formatPrescription({
                ...prescription,
                pid: prescription.pat_pid,
                city: prescription.city,
                state: prescription.state,
            }),
        });
    } catch (error: any) {
        console.error('[API] Fetch prescription error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}

async function updatePrescription(identity: { did: string }, prescription_id: string, body: any) {
    const { diagnosis, symptoms, medicines, instructions, diet_advice, follow_up_date, medicine_system, ai_generated } = body;
    if (!diagnosis || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (medicine_system !== undefined && medicine_system !== null && medicine_system !== '' &&
        !['homeopathy', 'allopathy', 'ayurvedic'].includes(medicine_system)) {
        return NextResponse.json({ success: false, error: 'Invalid medicine system. Expected one of: homeopathy, allopathy, ayurvedic' }, { status: 400 });
    }

    const normalizedSymptoms = normalizeSymptoms(symptoms);
    const normalizedMedicines = normalizeMedicines(medicines);

    // COALESCE keeps the stored value when the client omits the field, so a
    // partial update can never silently null out the medicine system or the
    // AI flag.
    const [data] = await sql`
        UPDATE prescriptions SET
            diagnosis = ${diagnosis},
            symptoms = ${normalizedSymptoms},
            medicines = ${normalizedMedicines},
            instructions = ${instructions || null},
            diet_advice = ${diet_advice || null},
            follow_up_date = ${follow_up_date || null},
            medicine_system = COALESCE(${medicine_system || null}, medicine_system),
            ai_generated = COALESCE(${typeof ai_generated === 'boolean' ? ai_generated : null}, ai_generated),
            updated_at = ${new Date().toISOString()}
        WHERE prescription_id = ${prescription_id} AND did = ${identity.did}
        RETURNING *
    `;

    if (!data) {
        return NextResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, prescription: formatPrescription(data), message: 'Prescription updated successfully' });
}

export async function PATCH(request: NextRequest, { params }: { params: { prescription_id: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { prescription_id } = params;
        const owned = await requireOwnPrescription(auth.data, prescription_id);
        if (!owned.ok) return owned.response;

        const body = await request.json();
        return updatePrescription(auth.data, prescription_id, body);
    } catch (error: any) {
        console.error('[API] Update prescription error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { prescription_id: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { prescription_id } = params;
        const owned = await requireOwnPrescription(auth.data, prescription_id);
        if (!owned.ok) return owned.response;

        const body = await request.json();
        return updatePrescription(auth.data, prescription_id, body);
    } catch (error: any) {
        console.error('[API] Update prescription error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { prescription_id: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { prescription_id } = params;
        const owned = await requireOwnPrescription(auth.data, prescription_id);
        if (!owned.ok) return owned.response;

        // Soft delete, scoped to the owning doctor.
        const [data] = await sql`
            UPDATE prescriptions SET is_active = false
            WHERE prescription_id = ${prescription_id} AND did = ${auth.data.did}
            RETURNING prescription_id
        `;

        if (!data) {
            return NextResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Prescription deleted successfully' });
    } catch (error: any) {
        console.error('[API] Delete prescription error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}