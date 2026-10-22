import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Mirror the DB trigger's frequency-to-times mapping
function parseFrequencyTimes(frequency: string): string[] {
    const f = (frequency || '').toLowerCase().trim();
    if (f.includes('twice') || f.includes('2 times') || f.includes('two times') ||
        f.includes('morning') && f.includes('night') || f.includes('morning') && f.includes('evening')) {
        return ['09:00', '21:00'];
    }
    if (f.includes('thrice') || f.includes('3 times') || f.includes('three times') ||
        f.includes('morning') && f.includes('afternoon') && f.includes('night') ||
        f.includes('morning') && f.includes('afternoon') && f.includes('evening')) {
        return ['09:00', '14:00', '21:00'];
    }
    if (f.includes('4 times') || f.includes('four times')) {
        return ['08:00', '12:00', '16:00', '20:00'];
    }
    if (f.includes('bedtime') || (f.includes('night') && !f.includes('morning'))) {
        return ['22:00'];
    }
    if (f.includes('afternoon') || f.includes('lunch')) {
        return ['14:00'];
    }
    if (f.includes('morning') || f.includes('breakfast')) {
        return ['08:00'];
    }
    return ['09:00']; // default: once daily
}

function parseDurationDays(duration: string): number {
    const d = (duration || '').toLowerCase().trim();
    const num = parseInt(d) || 0;
    if (d.includes('month')) return (num || 1) * 30;
    if (d.includes('week')) return (num || 1) * 7;
    if (d.includes('day')) return num || 7;
    if (num > 0) return num;
    return 7; // default
}

export async function POST(request: NextRequest, { params }: { params: { prescription_id: string } }) {
    try {
        const { prescription_id } = params;
        if (!prescription_id) return NextResponse.json({ success: false, error: 'Prescription ID required' }, { status: 400 });

        // Fix the DB trigger's ambiguous "medicine_name" variable vs column name.
        // The original trigger uses a local variable named "medicine_name" which conflicts
        // with the same-named column in the ON CONFLICT clause. Rename it to "v_medicine_name".
        try {
            await sql.unsafe(`
                CREATE OR REPLACE FUNCTION public.auto_create_adherence_records()
                RETURNS TRIGGER
                LANGUAGE plpgsql
                AS $func$
                DECLARE
                  medicine_record JSONB;
                  v_medicine_name TEXT;
                  dosage_times TEXT[];
                  time_slot TEXT;
                  curr_date DATE;
                  end_date DATE;
                  duration_days INTEGER;
                  duration_text TEXT;
                BEGIN
                  IF NEW.sent_to_patient = TRUE AND (OLD IS NULL OR OLD.sent_to_patient IS DISTINCT FROM TRUE) THEN
                    FOR medicine_record IN SELECT * FROM jsonb_array_elements(NEW.medicines)
                    LOOP
                      v_medicine_name := medicine_record->>'name';
                      dosage_times := ARRAY(
                        SELECT jsonb_array_elements_text(medicine_record->'times')
                      );
                      duration_text := LOWER(TRIM(medicine_record->>'duration'));
                      duration_days := CASE
                        WHEN duration_text ~ '^\\d+\\s*day'   THEN (regexp_match(duration_text, '(\\d+)'))[1]::INTEGER
                        WHEN duration_text ~ '^\\d+\\s*week'  THEN (regexp_match(duration_text, '(\\d+)'))[1]::INTEGER * 7
                        WHEN duration_text ~ '^\\d+\\s*month' THEN (regexp_match(duration_text, '(\\d+)'))[1]::INTEGER * 30
                        WHEN duration_text ~ '^\\d+\\s*year'  THEN (regexp_match(duration_text, '(\\d+)'))[1]::INTEGER * 365
                        ELSE 7
                      END;
                      IF dosage_times IS NULL OR array_length(dosage_times, 1) IS NULL THEN
                        DECLARE
                          freq_text TEXT := LOWER(TRIM(medicine_record->>'frequency'));
                        BEGIN
                          IF freq_text ~ 'twice' OR freq_text ~ '2 times' OR freq_text ~ 'morning.*night' OR freq_text ~ 'morning.*evening' THEN
                            dosage_times := ARRAY['09:00', '21:00'];
                          ELSIF freq_text ~ 'thrice' OR freq_text ~ '3 times' OR freq_text ~ 'morning.*afternoon.*night' THEN
                            dosage_times := ARRAY['09:00', '14:00', '21:00'];
                          ELSIF freq_text ~ '4 times' OR freq_text ~ 'four times' THEN
                            dosage_times := ARRAY['08:00', '12:00', '16:00', '20:00'];
                          ELSIF freq_text ~ 'bedtime' OR freq_text ~ 'night' THEN
                            dosage_times := ARRAY['22:00'];
                          ELSIF freq_text ~ 'afternoon' OR freq_text ~ 'lunch' THEN
                            dosage_times := ARRAY['14:00'];
                          ELSIF freq_text ~ 'morning' OR freq_text ~ 'breakfast' THEN
                            dosage_times := ARRAY['08:00'];
                          ELSE
                            dosage_times := ARRAY['09:00'];
                          END IF;
                        END;
                      END IF;
                      curr_date := CURRENT_DATE;
                      end_date := curr_date + duration_days;
                      IF dosage_times IS NOT NULL AND array_length(dosage_times, 1) > 0 THEN
                        WHILE curr_date < end_date LOOP
                          FOREACH time_slot IN ARRAY dosage_times LOOP
                            INSERT INTO medication_adherence
                              (prescription_id, pid, medicine_name, scheduled_date, scheduled_time, is_taken, is_skipped, synced)
                            VALUES
                              (NEW.prescription_id, NEW.pid, v_medicine_name, curr_date, time_slot::TIME, false, false, false)
                            ON CONFLICT (prescription_id, medicine_name, scheduled_date, scheduled_time)
                            DO NOTHING;
                          END LOOP;
                          curr_date := curr_date + 1;
                        END LOOP;
                      END IF;
                    END LOOP;
                  END IF;
                  RETURN NEW;
                END;
                $func$;
            `);
            console.log('[Send] DB trigger function patched successfully.');
        } catch (triggerFixErr: any) {
            console.warn('[Send] Could not patch trigger function (may lack DDL privileges):', triggerFixErr.message);
        }

        // Fetch the prescription first so we have the data even if the trigger fires
        const [existing] = await sql`
            SELECT * FROM prescriptions WHERE prescription_id = ${prescription_id}
        `;
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
        }

        // Mark as sent — the fixed trigger (or app-level code below) handles adherence
        let data = existing;
        try {
            const [updated] = await sql`
                UPDATE prescriptions SET sent_to_patient = true, sent_at = ${new Date().toISOString()}
                WHERE prescription_id = ${prescription_id}
                RETURNING *
            `;
            if (updated) data = updated;
        } catch (updateErr: any) {
            console.error('[Send] UPDATE failed (likely trigger error):', updateErr.message);
            // Force the flag via a direct cast to bypass potential trigger issue in some PG versions
            try {
                const [fallback] = await sql`
                    UPDATE prescriptions SET sent_to_patient = true, sent_at = ${new Date().toISOString()},
                        updated_at = ${new Date().toISOString()}
                    WHERE prescription_id = ${prescription_id} AND sent_to_patient = false
                    RETURNING *
                `;
                if (fallback) data = fallback;
            } catch (fallbackErr: any) {
                console.error('[Send] Fallback UPDATE also failed:', fallbackErr.message);
                return NextResponse.json({ success: false, error: 'Failed to send prescription: ' + updateErr.message }, { status: 500 });
            }
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Prescription not found' }, { status: 404 });
        }

        // Auto-generate adherence records now that the prescription is sent
        const pid = data.pid;
        const medicines = Array.isArray(data.medicines)
            ? data.medicines
            : JSON.parse(data.medicines || '[]');

        const now = new Date();
        let insertedCount = 0;

        for (const med of medicines) {
            const times = parseFrequencyTimes(med.frequency || '');
            const days = parseDurationDays(med.duration || '');

            for (let i = 0; i < days; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() + i);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                for (const time of times) {
                    await sql`
                        INSERT INTO medication_adherence
                            (pid, prescription_id, medicine_name, scheduled_date, scheduled_time, is_taken, is_skipped)
                        VALUES
                            (${pid}, ${prescription_id}, ${med.name}, ${dateStr}, ${time}, false, false)
                        ON CONFLICT (prescription_id, medicine_name, scheduled_date, scheduled_time) DO NOTHING
                    `;
                    insertedCount++;
                }
            }
        }

        // Refresh materialized view for stats
        try {
            await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY adherence_progress_summary`;
        } catch {
            try { await sql`REFRESH MATERIALIZED VIEW adherence_progress_summary`; } catch { /* ignore */ }
        }

        console.log(`[Send] Prescription ${prescription_id} sent. Generated ${insertedCount} adherence records.`);

        return NextResponse.json({
            success: true,
            prescription: data,
            message: 'Prescription sent to patient successfully',
            adherenceRecordsCreated: insertedCount
        });
    } catch (error: any) {
        console.error('[API] Send prescription error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
