const fs = require('fs');
const file = 'src/hooks/queries/doctorQueries.ts';
let c = fs.readFileSync(file, 'utf8');

const start = c.indexOf('function normalizeAppointments(raw: any): DoctorAppointmentBuckets {');
const end = c.indexOf('export function useDoctorAppointments');

const newFunc = `function normalizeAppointments(raw: any): DoctorAppointmentBuckets {
  if (!raw) return EMPTY_BUCKETS;

  if (Array.isArray(raw)) {
    return bucketAppointments(raw);
  }
  if (typeof raw !== 'object') return EMPTY_BUCKETS;

  for (const key of ['appointments', 'data', 'list', 'items', 'all', 'upcoming']) {
    const list = (raw as any)[key];
    if (Array.isArray(list) && list.length > 0) return bucketAppointments(list);
  }

  const hasBuckets = BUCKET_KEYS.some((k) => Array.isArray((raw as any)[k]));
  if (hasBuckets) {
    const pending = Array.isArray(raw.pending) ? raw.pending : [];
    const confirmed = Array.isArray(raw.confirmed) ? raw.confirmed : [];
    const today = Array.isArray(raw.today) ? raw.today : [];
    const completed = Array.isArray(raw.completed) ? raw.completed : [];
    const cancelled = Array.isArray(raw.cancelled) ? raw.cancelled : [];

    const inProgress = Array.isArray((raw as any).in_progress) ? (raw as any).in_progress : [];
    const ongoing = Array.isArray((raw as any).ongoing) ? (raw as any).ongoing : [];
    const extra = [...inProgress, ...ongoing];

    const todayStr = localTodayStr();
    for (const apt of extra) {
      confirmed.push(apt);
      if (aptDateStr(apt) === todayStr) {
        if (!today.some(t => (t.aid ?? t.id ?? t._id) === (apt.aid ?? apt.id ?? apt._id))) {
          today.push(apt);
        }
      }
    }

    return { pending, confirmed, today, completed, cancelled };
  }

  return EMPTY_BUCKETS;
}

`;

c = c.substring(0, start) + newFunc + c.substring(end);
fs.writeFileSync(file, c);
console.log('Done');
