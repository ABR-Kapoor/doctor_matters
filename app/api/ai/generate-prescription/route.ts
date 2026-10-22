import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sql from '@/lib/db';
import { formatDate } from '@/lib/shared/utils';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: NextRequest) {
    try {
        const { pid, aid } = await request.json();

        if (!pid) {
            return NextResponse.json({ success: false, error: 'Patient ID required' }, { status: 400 });
        }

        const patientData = await fetchPatientData(pid, aid);

        if (!patientData.success) {
            return NextResponse.json({ success: false, error: 'Failed to fetch patient data' }, { status: 500 });
        }

        const aiPrescription = await generatePrescriptionWithAI(patientData.data);
        return NextResponse.json({ success: true, ...aiPrescription });
    } catch (error: any) {
        console.error('AI Prescription Generation Error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to generate prescription' }, { status: 500 });
    }
}

async function fetchPatientData(pid: string, aid?: string) {
    try {
        const [patient] = await sql`
            SELECT p.*, u.name, u.email
            FROM patients p JOIN users u ON p.uid = u.uid
            WHERE p.pid = ${pid}
        `;
        if (!patient) throw new Error('Patient not found');

        const formattedPatient = { ...patient, user: { name: patient.name, email: patient.email } };

        let currentAppointment = null;
        if (aid) {
            const [apt] = await sql`SELECT * FROM appointments WHERE aid = ${aid}`;
            currentAppointment = apt;
        }

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const previousPrescriptions = await sql`
            SELECT * FROM prescriptions WHERE pid = ${pid} AND created_at >= ${threeMonthsAgo.toISOString()}
            ORDER BY created_at DESC LIMIT 5
        `;

        const adherenceData = await sql`
            SELECT *, CASE WHEN is_taken THEN 'taken' WHEN is_skipped THEN 'skipped' ELSE 'pending' END as status
            FROM medication_adherence WHERE pid = ${pid}
            ORDER BY scheduled_date DESC LIMIT 20
        `;

        return { success: true, data: { patient: formattedPatient, currentAppointment, previousPrescriptions: previousPrescriptions || [], adherenceData: adherenceData || [] } };
    } catch (error) {
        console.error('Fetch patient data error:', error);
        return { success: false, error };
    }
}

async function generatePrescriptionWithAI(data: any) {
    const { patient, currentAppointment, previousPrescriptions, adherenceData } = data;

    const patientLocation = { city: patient.city || 'Not specified', state: patient.state || 'Not specified', country: patient.country || 'India' };
    const currentSymptoms = currentAppointment?.chief_complaint || 'General consultation';
    const adherenceSummary = analyzeAdherence(adherenceData);

    const prompt = `You are Dr. Manas AI, an expert Ayurvedic physician assistant. Generate a comprehensive prescription based on this patient data.

PATIENT: ${patient.user?.name || 'Patient'} | Age: ${patient.age || 'N/A'} | Gender: ${patient.gender || 'N/A'} | Location: ${patientLocation.city}, ${patientLocation.state}
ALLERGIES: ${patient.allergies?.join(', ') || 'None'} | CURRENT MEDS: ${patient.current_medications?.join(', ') || 'None'} | CHRONIC: ${patient.chronic_conditions?.join(', ') || 'None'}
COMPLAINT: ${currentSymptoms} | SYMPTOMS: ${currentAppointment?.symptoms?.join(', ') || 'None'} | NOTES: ${currentAppointment?.doctor_notes || 'None'}
ADHERENCE: ${adherenceSummary}
SEASON: ${new Date().toLocaleString('default', { month: 'long' })} in ${patientLocation.state}
PREFER Ayurvedic medicines. For emergency cases you may include Allopathic medicines (mark in notes).

OUTPUT ONLY THIS EXACT JSON STRUCTURE WITH NO OTHER TEXT:
{"diagnosis":"text","symptoms":["s1"],"medicines":[{"name":"n","dosage":"d","frequency":"f","duration":"7 days","notes":"n"}],"instructions":"markdown","dietAdvice":"markdown","followUpDays":7,"safetyNotes":"text"}

RULES: Use double quotes only. No trailing commas. Escape internal quotes with backslash. No text before or after JSON. duration must be simple text like "7 days".`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('[AI Raw Response]', text.slice(0, 2000));

        let cleanedText = text.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '');
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No valid JSON in AI response: ' + text.slice(0, 500));

        const prescription = parseJsonSafely(jsonMatch[0]);

        if (prescription.medicines && Array.isArray(prescription.medicines)) {
            prescription.medicines = prescription.medicines.map((med: any) => ({
                ...med, duration: simplifyDuration(med.duration || '7 days')
            }));
        }

        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + (prescription.followUpDays || 7));

        return {
            diagnosis: prescription.diagnosis, symptoms: prescription.symptoms, medicines: prescription.medicines,
            instructions: prescription.instructions, dietAdvice: prescription.dietAdvice,
            followUpDate: followUpDate.toISOString().split('T')[0], safetyNotes: prescription.safetyNotes || '',
        };
    } catch (error) {
        console.error('Gemini AI Error:', error);
        throw new Error('Failed to generate prescription with AI');
    }
}

function parseJsonSafely(raw: string): any {
    let cleaned = raw
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"');

    try {
        return JSON.parse(cleaned);
    } catch {
        cleaned = cleaned
            .replace(/\\[^"\\\/bfnrtu]/g, '')
            .replace(/\n\s*/g, ' ')
            .replace(/\r/g, '')
            .replace(/\t/g, ' ')
            .replace(/undefined/g, 'null');
        return JSON.parse(cleaned);
    }
}

function simplifyDuration(duration: string): string {
    const durationLower = duration.toLowerCase();
    if (durationLower.includes('day')) { const match = durationLower.match(/(\d+)\s*day/); return match ? `${match[1]} days` : '7 days'; }
    if (durationLower.includes('week')) { const match = durationLower.match(/(\d+)\s*week/); return match ? `${match[1]} weeks` : '2 weeks'; }
    if (durationLower.includes('month')) { const match = durationLower.match(/(\d+)\s*month/); return match ? `${match[1]} months` : '1 month'; }
    if (durationLower.includes('year')) { const match = durationLower.match(/(\d+)\s*year/); return match ? `${match[1]} years` : '1 year'; }
    if (/^\d+\s+(day|days|week|weeks|month|months|year|years)$/i.test(duration.trim())) return duration.trim();
    return '7 days';
}

function analyzeAdherence(adherenceData: any[]): string {
    if (!adherenceData || adherenceData.length === 0) return 'No data';
    const total = adherenceData.length;
    const taken = adherenceData.filter(a => a.is_taken).length;
    const skipped = adherenceData.filter(a => a.is_skipped).length;
    return `${((taken / total) * 100).toFixed(0)}% adherence (${taken}/${total} taken, ${skipped} skipped)`;
}
