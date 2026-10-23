import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sql from '@/lib/db';
import { requireDoctor, requireTreatsPatient } from '@/lib/authz';
import { checkRateLimit } from '@/lib/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// The medicine system is interpolated into the prompt, so it is whitelisted here
// rather than trusted from the request body.
const MEDICINE_SYSTEMS = ['homeopathy', 'allopathy', 'ayurvedic'] as const;
type MedicineSystem = (typeof MEDICINE_SYSTEMS)[number];

// Groq is the fallback provider (OpenAI-compatible REST — no SDK dependency).
// Model comes from GROQ_MODEL because available models vary by Groq account;
// this account serves openai/gpt-oss-120b, not the older llama-3.3-70b.
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_TIMEOUT_MS = 45000;

// One strict directive per system: the model must stay inside the chosen school
// of medicine so the generated names/dosages are meaningful for that toggle.
const SYSTEM_DIRECTIVES: Record<MedicineSystem, string> = {
    allopathy: `MEDICINE SYSTEM: Allopathy (conventional medicine). Prescribe conventional pharmacological drugs only — generic drug names with standard doses (mg/mcg/ml), standard frequencies and durations. No herbal, homeopathic or Ayurvedic preparations.`,
    homeopathy: `MEDICINE SYSTEM: Homeopathy. Prescribe homeopathic remedies only — remedy names with dilution/potency (e.g. 30C, 200C, 1M), globules/tablets/mother tinctures as appropriate, doses as drops or globule counts. No allopathic or Ayurvedic drugs.`,
    ayurvedic: `MEDICINE SYSTEM: Ayurveda. Prescribe Ayurvedic formulations and herbs only — classical and proprietary formulations with standard doses and anupana where relevant. No allopathic or homeopathic drugs.`,
};

export async function POST(request: NextRequest) {
    // This endpoint had no authentication. It loads a patient's date of birth,
    // allergies and chronic conditions and forwards them to the Gemini API, so
    // an unauthenticated caller could both exfiltrate PHI and spend the quota.
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { pid, aid, system, diagnosis, symptoms } = await request.json();

        if (!pid) {
            return NextResponse.json({ success: false, error: 'Patient ID required' }, { status: 400 });
        }

        if (system !== undefined && system !== null && system !== '' && !MEDICINE_SYSTEMS.includes(system)) {
            return NextResponse.json({ success: false, error: 'Invalid medicine system. Expected one of: homeopathy, allopathy, ayurvedic' }, { status: 400 });
        }

        // This route spends Gemini/Groq quota per call, so per-doctor limiting
        // mirrors the appointments endpoint's proven Upstash pattern.
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitRes = await checkRateLimit(`ai_gen_${auth.data.did}_${ip}`);
        if (!rateLimitRes.success) return rateLimitRes.response!;

        const access = await requireTreatsPatient(auth.data, pid);
        if (!access.ok) return access.response;

        // If an appointment is supplied it must belong to this doctor and patient.
        if (aid) {
            const [appt] = await sql`
                SELECT aid FROM appointments
                WHERE aid = ${aid} AND did = ${auth.data.did} AND pid = ${pid}
                LIMIT 1
            `;
            if (!appt) {
                return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
            }
        }

        const patientData = await fetchPatientData(pid, aid);

        if (!patientData.success) {
            return NextResponse.json({ success: false, error: 'Failed to fetch patient data' }, { status: 500 });
        }

        const aiPrescription = await generatePrescriptionWithAI(patientData.data, {
            system: system || undefined,
            doctorDiagnosis: typeof diagnosis === 'string' ? diagnosis.trim() : '',
            doctorSymptoms: Array.isArray(symptoms)
                ? symptoms.filter((s: any) => typeof s === 'string')
                : typeof symptoms === 'string'
                    ? symptoms.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : [],
        });
        return NextResponse.json({ success: true, medicineSystem: system || null, ...aiPrescription });
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

interface GenerationOptions {
    system?: MedicineSystem;
    doctorDiagnosis?: string;
    doctorSymptoms?: string[];
}

async function generatePrescriptionWithAI(data: any, options: GenerationOptions = {}) {
    const { patient, currentAppointment, adherenceData } = data;

    const patientLocation = { city: patient.city || 'Not specified', state: patient.state || 'Not specified', country: patient.country || 'India' };
    const currentSymptoms = currentAppointment?.chief_complaint || 'General consultation';
    const adherenceSummary = analyzeAdherence(adherenceData);

    // When no system is requested the legacy wording is kept byte-for-byte so the
    // existing web dashboard keeps its Ayurvedic-leaning behaviour; the mobile app
    // always sends `system` and gets the corresponding strict directive instead.
    const persona = options.system
        ? 'You are Dr. Manas AI, an expert clinical prescription assistant.'
        : 'You are Dr. Manas AI, an expert Ayurvedic physician assistant.';
    const systemDirective = options.system
        ? SYSTEM_DIRECTIVES[options.system]
        : 'PREFER Ayurvedic medicines. For emergency cases you may include Allopathic medicines (mark in notes).';
    const hasWorkingImpression =
        !!options.doctorDiagnosis || (options.doctorSymptoms && options.doctorSymptoms.length > 0);
    const workingImpression = hasWorkingImpression
        ? `\nDOCTOR'S WORKING IMPRESSION (respect this diagnosis, refine it, do not contradict it): DIAGNOSIS: ${options.doctorDiagnosis || 'not yet entered'} | SYMPTOMS: ${(options.doctorSymptoms || []).join(', ') || 'none added'}`
        : '';

    const prompt = `${persona} Generate a comprehensive prescription based on this patient data.

PATIENT: ${patient.user?.name || 'Patient'} | Age: ${patient.age || 'N/A'} | Gender: ${patient.gender || 'N/A'} | Location: ${patientLocation.city}, ${patientLocation.state}
ALLERGIES: ${patient.allergies?.join(', ') || 'None'} | CURRENT MEDS: ${patient.current_medications?.join(', ') || 'None'} | CHRONIC: ${patient.chronic_conditions?.join(', ') || 'None'}
COMPLAINT: ${currentSymptoms} | SYMPTOMS: ${currentAppointment?.symptoms?.join(', ') || 'None'} | NOTES: ${currentAppointment?.doctor_notes || 'None'}
ADHERENCE: ${adherenceSummary}
SEASON: ${new Date().toLocaleString('default', { month: 'long' })} in ${patientLocation.state}
${systemDirective}${workingImpression}

OUTPUT ONLY THIS EXACT JSON STRUCTURE WITH NO OTHER TEXT:
{"diagnosis":"text","symptoms":["s1"],"medicines":[{"name":"n","dosage":"d","frequency":"f","duration":"7 days","notes":"n"}],"instructions":"markdown","dietAdvice":"markdown","followUpDays":7,"safetyNotes":"text"}

RULES: Use double quotes only. No trailing commas. Escape internal quotes with backslash. No text before or after JSON. duration must be simple text like "7 days".`;

    // Gemini is primary; Groq takes over when Gemini errors out (quota, network,
    // malformed JSON) so a single flaky provider cannot take the feature down.
    // An empty GROQ_API_KEY skips the fallback entirely.
    try {
        const text = await generateWithGemini(prompt);
        return { provider: 'gemini', ...parsePrescriptionResponse(text) };
    } catch (error: any) {
        console.warn('[AI] Gemini failed -> Groq fallback:', error?.message || error);
    }

    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) throw new Error('GROQ_API_KEY is not configured');
        const text = await generateWithGroq(prompt, groqKey);
        return { provider: 'groq', ...parsePrescriptionResponse(text) };
    } catch (error: any) {
        console.error('[AI] Groq fallback also failed:', error?.message || error);
        throw new Error('Failed to generate prescription with AI');
    }
}

async function generateWithGemini(prompt: string): Promise<string> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (!text) throw new Error('Gemini returned an empty response');
        console.log('[AI][gemini] raw response:', text.slice(0, 2000));
        return text;
    } catch (error: any) {
        console.error('Gemini AI Error:', error?.message || error);
        throw error;
    }
}

async function generateWithGroq(prompt: string, apiKey: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
    try {
        const res = await fetch(GROQ_CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: GROQ_MODEL,
                temperature: 0.4,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'You are Dr. Manas AI, a clinical prescription assistant. Answer with one valid JSON object only.' },
                    { role: 'user', content: prompt },
                ],
            }),
            signal: controller.signal,
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(`Groq HTTP ${res.status}: ${detail.slice(0, 300)}`);
        }
        const body: any = await res.json();
        const text = body?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Groq returned an empty completion');
        console.log('[AI][groq] raw response:', String(text).slice(0, 2000));
        return String(text);
    } finally {
        clearTimeout(timer);
    }
}

function parsePrescriptionResponse(text: string) {
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
