import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor, requireOwnPrescription } from '@/lib/authz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: { prescription_id: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    try {
        const { prescription_id } = params;

        // Unauthenticated before: any caller could read a patient's medication
        // schedule and adherence history for any prescription id.
        const owned = await requireOwnPrescription(auth.data, prescription_id);
        if (!owned.ok) return owned.response;

        const [prescription] = await sql`
            SELECT p.prescription_id, p.pid, p.did, p.diagnosis, u.name as patient_name, u.profile_image_url as patient_image
            FROM prescriptions p
            JOIN patients pat ON p.pid = pat.pid
            JOIN users u ON pat.uid = u.uid
            WHERE p.prescription_id = ${prescription_id} AND p.did = ${auth.data.did}
        `;

        const adherenceRecords = await sql`
            SELECT *, CASE WHEN is_taken THEN 'taken' WHEN is_skipped THEN 'skipped' ELSE 'pending' END as status
            FROM medication_adherence
            WHERE prescription_id = ${prescription_id}
            ORDER BY scheduled_date ASC
        `;

        if (!adherenceRecords || adherenceRecords.length === 0) {
            return NextResponse.json({
                success: true,
                stats: { total_doses: 0, taken: 0, skipped: 0, pending: 0, adherence_rate: 0, daily_breakdown: [], medicine_breakdown: [] }
            });
        }

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = now.toTimeString().split(' ')[0];

        const isPending = (r: any) => !r.is_taken && !r.is_skipped;

        const totalDoses = adherenceRecords.length;
        const totalTaken = adherenceRecords.filter(r => r.is_taken).length;
        const totalSkipped = adherenceRecords.filter(r => r.is_skipped).length;
        
        const totalNotTaken = adherenceRecords.filter(r => {
            if (!isPending(r)) return false;
            let dateStr = r.scheduled_date;
            if (typeof r.scheduled_date === 'object') dateStr = r.scheduled_date.toISOString().split('T')[0];
            else if (typeof r.scheduled_date === 'string') dateStr = r.scheduled_date.split('T')[0];
            return dateStr < todayStr || (dateStr === todayStr && r.scheduled_time <= timeStr);
        }).length;

        const adherence_rate = totalDoses > 0 ? ((totalTaken / totalDoses) * 100).toFixed(1) : 0;

        const todayRecords = adherenceRecords.filter(r => {
            let dateStr = r.scheduled_date;
            if (typeof r.scheduled_date === 'object') dateStr = r.scheduled_date.toISOString().split('T')[0];
            else if (typeof r.scheduled_date === 'string') dateStr = r.scheduled_date.split('T')[0];
            return dateStr === todayStr;
        });
        
        const todayScheduled = todayRecords.length;
        const todayTaken = todayRecords.filter(r => r.is_taken).length;
        const todaySkipped = todayRecords.filter(r => r.is_skipped).length;
        const todayNotTaken = todayRecords.filter(r => isPending(r) && r.scheduled_time <= timeStr).length;
        
        const daily_adherence_rate = todayScheduled > 0 ? ((todayTaken / todayScheduled) * 100).toFixed(1) : 0;

        const dailyMap = new Map();
        adherenceRecords.forEach(record => {
            const date = record.scheduled_date;
            if (!dailyMap.has(date)) dailyMap.set(date, { date, taken: 0, skipped: 0, pending: 0, notTaken: 0 });
            const day = dailyMap.get(date);
            
            let dateStr = record.scheduled_date;
            if (typeof record.scheduled_date === 'object') dateStr = record.scheduled_date.toISOString().split('T')[0];
            else if (typeof record.scheduled_date === 'string') dateStr = record.scheduled_date.split('T')[0];

            if (record.is_taken) day.taken++; 
            else if (record.is_skipped) day.skipped++; 
            else if (isPending(record) && (dateStr < todayStr || (dateStr === todayStr && record.scheduled_time <= timeStr))) day.notTaken++;
            else day.pending++;
        });

        const medicineMap = new Map();
        adherenceRecords.forEach(record => {
            const name = record.medicine_name;
            if (!medicineMap.has(name)) medicineMap.set(name, { medicine_name: name, total: 0, taken: 0, skipped: 0, notTaken: 0, elapsedTotal: 0 });
            const med = medicineMap.get(name);
            med.total++; 
            if (record.is_taken) med.taken++;
            else if (record.is_skipped) med.skipped++;
            
            let dateStr = record.scheduled_date;
            if (typeof record.scheduled_date === 'object') dateStr = record.scheduled_date.toISOString().split('T')[0];
            else if (typeof record.scheduled_date === 'string') dateStr = record.scheduled_date.split('T')[0];
            
            if (isPending(record) && (dateStr < todayStr || (dateStr === todayStr && record.scheduled_time <= timeStr))) {
                med.notTaken++;
            }
            if (!isPending(record) || (dateStr < todayStr || (dateStr === todayStr && record.scheduled_time <= timeStr))) {
                med.elapsedTotal++;
            }
        });

        const recent_activity = adherenceRecords
            .filter(r => r.is_taken || r.is_skipped)
            .sort((a, b) => new Date(b.taken_at || b.updated_at || 0).getTime() - new Date(a.taken_at || a.updated_at || 0).getTime())
            .slice(0, 3);

        const upcoming_activity = adherenceRecords
            .filter(r => isPending(r) && (new Date(r.scheduled_date).toISOString().split('T')[0] > todayStr || (new Date(r.scheduled_date).toISOString().split('T')[0] === todayStr && r.scheduled_time > timeStr)))
            .sort((a, b) => {
                const dateA = new Date(a.scheduled_date).toISOString().split('T')[0];
                const dateB = new Date(b.scheduled_date).toISOString().split('T')[0];
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                return a.scheduled_time.localeCompare(b.scheduled_time);
            })
            .slice(0, 5);

        // Full dose-by-dose history (every scheduled time, its status and the
        // moment it was acted on). Opt-in via ?with_doses=1 so the
        // prescriptions dashboard — which polls this route every 15s for each
        // card — never pays for a payload only the detail screen renders.
        const dateKey = (value: any) =>
            typeof value === 'object' && value instanceof Date
                ? value.toISOString().split('T')[0]
                : String(value).split('T')[0];

        const withDoses = request.nextUrl.searchParams.get('with_doses') === '1';
        const doseLogMap = new Map<string, any[]>();

        if (withDoses) {
            const sorted = [...adherenceRecords].sort((a, b) => {
                const dateA = dateKey(a.scheduled_date);
                const dateB = dateKey(b.scheduled_date);
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                return String(a.scheduled_time).localeCompare(String(b.scheduled_time));
            });

            for (const record of sorted) {
                const recordDate = dateKey(record.scheduled_date);
                const elapsed = recordDate < todayStr || (recordDate === todayStr && record.scheduled_time <= timeStr);
                const status = record.is_taken
                    ? 'taken'
                    : record.is_skipped
                        ? 'skipped'
                        : elapsed ? 'missed' : 'pending';

                const entry = {
                    adherence_id: record.adherence_id,
                    date: recordDate,
                    time: String(record.scheduled_time).substring(0, 5),
                    status,
                    taken_at: record.taken_at || null,
                    skipped_at: record.skipped_at || null
                };

                const list = doseLogMap.get(record.medicine_name);
                if (list) list.push(entry);
                else doseLogMap.set(record.medicine_name, [entry]);
            }
        }

        const dose_log = Array.from(doseLogMap.entries()).map(([medicine_name, doses]) => ({
            medicine_name,
            doses
        }));

        return NextResponse.json({
            success: true,
            stats: {
                total_doses: totalDoses, taken: totalTaken, skipped: totalSkipped, not_taken: totalNotTaken,
                today_scheduled: todayScheduled, today_taken: todayTaken, today_skipped: todaySkipped, today_not_taken: todayNotTaken,
                adherence_rate: Number(adherence_rate),
                daily_adherence_rate: Number(daily_adherence_rate),
                daily_breakdown: Array.from(dailyMap.values()),
                medicine_breakdown: Array.from(medicineMap.values()).map(m => ({ ...m, adherence_rate: m.total > 0 ? ((m.taken / m.total) * 100).toFixed(1) : 0 })),
                recent_activity,
                upcoming_activity,
                dose_log,
                patient: prescription ? { name: prescription.patient_name, profile_image_url: prescription.patient_image } : null
            }
        });
    } catch (error: any) {
        console.error('[API] Adherence stats error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
