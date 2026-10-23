import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export type AuthzResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export interface SessionUser {
    clerkId: string;
    uid: string;
    role: string;
    email: string | null;
    name: string | null;
}

export interface DoctorIdentity extends SessionUser {
    did: string;
}

/**
 * A doctor account that may not be fully provisioned yet.
 *
 * `uid` is null until `ensureDoctorUser` has created the `users` row and `did`
 * is null until the `doctors` row exists. The doctor profile routes are the
 * provisioning path, so they must accept this shape; every other route uses
 * `requireDoctor()`, which demands both.
 */
export interface DoctorAccount {
    clerkId: string;
    uid: string | null;
    did: string | null;
    role: string;
    email: string | null;
    name: string | null;
}

function fail(status: number, error: string, message: string, extra?: Record<string, unknown>) {
    return NextResponse.json({ error, message, ...extra }, { status });
}

/**
 * Requires a signed-in Clerk session and nothing else — no database lookup, no
 * role check. Used by the provisioning routes, which cannot require a `users`
 * row because creating that row is their job.
 *
 * Only `auth()` is used (no `currentUser()` round-trip) so this stays cheap.
 * `auth()` resolves both the web session cookie and the mobile
 * `Authorization: Bearer` token, because `clerkMiddleware` matches `/api`.
 */
export async function requireClerkSession(): Promise<AuthzResult<{ clerkId: string }>> {
    let clerkId: string | null = null;

    try {
        const session = await auth();
        clerkId = session.userId;
    } catch {
        return { ok: false, response: fail(401, 'UNAUTHENTICATED', 'Sign in to continue.') };
    }

    if (!clerkId) {
        return { ok: false, response: fail(401, 'UNAUTHENTICATED', 'Sign in to continue.') };
    }

    return { ok: true, data: { clerkId } };
}

/**
 * Resolves the signed-in Clerk user to its `users` row.
 */
export async function requireSessionUser(): Promise<AuthzResult<SessionUser>> {
    const clerk = await requireClerkSession();
    if (!clerk.ok) return clerk;

    const [user] = await sql`
        SELECT uid, role, email, name
        FROM users
        WHERE auth_id = ${clerk.data.clerkId}
        LIMIT 1
    `;

    if (!user) {
        return {
            ok: false,
            response: fail(403, 'NOT_PROVISIONED', 'Account not found. Please sign in again.'),
        };
    }

    return {
        ok: true,
        data: {
            clerkId: clerk.data.clerkId,
            uid: user.uid,
            role: user.role,
            email: user.email ?? null,
            name: user.name ?? null,
        },
    };
}

/**
 * Requires a signed-in Clerk account that is allowed to act as a doctor, but
 * tolerates a missing `users`/`doctors` row so the profile routes can
 * provision one. Patient accounts are refused with `ROLE_MISMATCH`, which the
 * mobile client surfaces as a clear "wrong portal" message.
 *
 * Rejecting only `patient` was too permissive: this codebase also has a
 * `project_admin` role, and PATCH /api/doctor/profile inserts a `doctors` row
 * when one is missing, so a project_admin could mint themselves a doctor
 * profile. Rather than allowlisting roles — which would lock out any practising
 * doctor whose `users.role` had been changed to something else — this refuses
 * only accounts that are neither a doctor (or admin) nor yet provisioned. A
 * brand-new signup with no `users` row still passes, and any account that
 * already has a `doctors` row still passes, so no existing doctor is affected.
 */
export async function requireDoctorAccount(): Promise<AuthzResult<DoctorAccount>> {
    const clerk = await requireClerkSession();
    if (!clerk.ok) return clerk;

    const [user] = await sql`
        SELECT uid, role, email, name
        FROM users
        WHERE auth_id = ${clerk.data.clerkId}
        LIMIT 1
    `;

    if (user && user.role === 'patient') {
        return {
            ok: false,
            response: fail(403, 'ROLE_MISMATCH', 'Patient accounts cannot access the doctor portal.'),
        };
    }

    let did: string | null = null;
    if (user) {
        const [doctor] = await sql`SELECT did FROM doctors WHERE uid = ${user.uid} LIMIT 1`;
        did = doctor?.did ?? null;

        const isPortalRole = user.role === 'doctor' || user.role === 'admin';
        if (!isPortalRole && !did) {
            return {
                ok: false,
                response: fail(
                    403,
                    'ROLE_MISMATCH',
                    'This account is not registered as a doctor and cannot use the doctor portal.'
                ),
            };
        }
    }

    return {
        ok: true,
        data: {
            clerkId: clerk.data.clerkId,
            uid: user?.uid ?? null,
            did,
            role: user?.role ?? 'doctor',
            email: user?.email ?? null,
            name: user?.name ?? null,
        },
    };
}

/**
 * Requires an authenticated `users.role = 'doctor'` and a `doctors` row,
 * returning the resolved `did`. This is the guard for all data routes: the
 * `did`/`uid` returned here are the only identity any route may use, and a
 * client-supplied `?uid=` is never trusted.
 */
export async function requireDoctor(): Promise<AuthzResult<DoctorIdentity>> {
    const account = await requireDoctorAccount();
    if (!account.ok) return account;

    // A `users` row is implied by a `doctors` row, but narrow it explicitly so
    // the resolved identity is never partially null.
    if (!account.data.uid || !account.data.did) {
        return {
            ok: false,
            response: fail(403, 'NOT_PROVISIONED', 'Doctor profile not found. Please sign in again.'),
        };
    }

    return {
        ok: true,
        data: {
            clerkId: account.data.clerkId,
            uid: account.data.uid,
            did: account.data.did,
            role: account.data.role,
            email: account.data.email,
            name: account.data.name,
        },
    };
}

/**
 * Requires `users.role = 'admin'`. Replaces the previous shared-secret check
 * (`ADMIN_VERIFICATION_SECRET || 'secret123'`), which was a guessable value that
 * was emailed to administrators in plain text.
 */
export async function requireAdmin(): Promise<AuthzResult<SessionUser>> {
    const session = await requireSessionUser();
    if (!session.ok) return session;

    if (session.data.role !== 'admin') {
        return {
            ok: false,
            response: fail(403, 'FORBIDDEN', 'Administrator access required.'),
        };
    }

    return session;
}

export interface AppointmentAccess {
    aid: string;
    pid: string;
    did: string;
    status: string;
    mode: string;
    call_started_at?: string | null;
    call_ended_at?: string | null;
    call_duration_minutes?: number | null;
    duration_minutes?: number | null;
    scheduled_date?: string | Date | null;
    scheduled_time?: string | null;
}

/** Loads an appointment by id without any ownership check. */
export async function loadAppointment(aid: string): Promise<AppointmentAccess | null> {
    if (!aid) return null;

    const [appointment] = await sql`
        SELECT aid, pid, did, status, mode, call_started_at, call_ended_at, scheduled_date, scheduled_time
        FROM appointments
        WHERE aid = ${aid}
        LIMIT 1
    `;

    return (appointment as AppointmentAccess) ?? null;
}

/** Minimal appointment projection used by the video-token routes. */
export async function loadAppointmentForToken(aid: string): Promise<AppointmentAccess | null> {
    if (!/^[0-9a-f-]{36}$/i.test(aid)) return null;
    return loadAppointment(aid);
}

/** Asserts the doctor owns the appointment (`appointments.did` -> `doctors.uid`). */
export async function requireOwnAppointment(
    identity: DoctorIdentity,
    aid: string,
): Promise<AuthzResult<AppointmentAccess>> {
    if (!aid) {
        return { ok: false, response: fail(400, 'BAD_REQUEST', 'Appointment id required.') };
    }

    const appointment = await loadAppointment(aid);

    if (!appointment) {
        return { ok: false, response: fail(404, 'NOT_FOUND', 'Appointment not found.') };
    }

    if (appointment.did !== identity.did) {
        return { ok: false, response: fail(403, 'FORBIDDEN', 'You do not have access to this appointment.') };
    }

    return { ok: true, data: appointment };
}

/**
 * Asserts the doctor has a clinical relationship with the patient, either via
 * `doctor_patient_relationships` or an existing appointment. Gates every route
 * that would otherwise expose patient PHI.
 */
export async function requireTreatsPatient(
    identity: DoctorIdentity,
    patientId: string,
): Promise<AuthzResult<{ pid: string; uid: string }>> {
    if (!patientId) {
        return { ok: false, response: fail(400, 'BAD_REQUEST', 'Patient id required.') };
    }

    const [patient] = await sql`
        SELECT p.pid, p.uid
        FROM patients p
        WHERE p.pid = ${patientId}
        LIMIT 1
    `;

    if (!patient) {
        return { ok: false, response: fail(404, 'NOT_FOUND', 'Patient not found.') };
    }

    const [relationship] = await sql`
        SELECT 1 AS ok
        FROM doctor_patient_relationships
        WHERE did = ${identity.did} AND pid = ${patientId} AND relationship_status = 'active'
        LIMIT 1
    `;

    if (relationship) {
        return { ok: true, data: { pid: patient.pid, uid: patient.uid } };
    }

    const [appointment] = await sql`
        SELECT 1 AS ok
        FROM appointments
        WHERE did = ${identity.did} AND pid = ${patientId}
        LIMIT 1
    `;

    if (appointment) {
        return { ok: true, data: { pid: patient.pid, uid: patient.uid } };
    }

    return { ok: false, response: fail(403, 'FORBIDDEN', 'You do not have access to this patient.') };
}

/** Asserts the doctor owns the prescription (`prescriptions.did`). */
export async function requireOwnPrescription(
    identity: DoctorIdentity,
    prescriptionId: string,
): Promise<AuthzResult<{ prescription_id: string; did: string; pid: string; aid: string | null }>> {
    if (!prescriptionId) {
        return { ok: false, response: fail(400, 'BAD_REQUEST', 'Prescription id required.') };
    }

    const [prescription] = await sql`
        SELECT prescription_id, did, pid, aid
        FROM prescriptions
        WHERE prescription_id = ${prescriptionId}
        LIMIT 1
    `;

    if (!prescription) {
        return { ok: false, response: fail(404, 'NOT_FOUND', 'Prescription not found.') };
    }

    if (prescription.did !== identity.did) {
        return { ok: false, response: fail(403, 'FORBIDDEN', 'You do not have access to this prescription.') };
    }

    return {
        ok: true,
        data: {
            prescription_id: prescription.prescription_id,
            did: prescription.did,
            pid: prescription.pid,
            aid: prescription.aid ?? null,
        },
    };
}

/** Call-joinable statuses. `scheduled` must be confirmed by the doctor first. */
export const JOINABLE_STATUSES = ['confirmed', 'in_progress'] as const;

export function isJoinableStatus(status: string): boolean {
    return (JOINABLE_STATUSES as readonly string[]).includes(status);
}

/** Masks a bank account number for display: `1234567890` -> `••••7890`. */
export function maskAccountNumber(value: string | null | undefined): string | null {
    if (!value) return null;
    if (value.length <= 4) return '••••';
    return `••••${value.slice(-4)}`;
}
