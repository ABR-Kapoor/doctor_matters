import { NextRequest, NextResponse } from 'next/server';
import { requireDoctor, requireOwnAppointment } from '@/lib/authz';

export async function POST(_request: NextRequest, { params }: { params: { aid: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    const owned = await requireOwnAppointment(auth.data, params.aid);
    if (!owned.ok) return owned.response;

    return NextResponse.json({
        success: false,
        code: 'CLIENT_UPDATE_REQUIRED',
        error: 'Please update the app to use the new calling experience.',
    }, { status: 426 });
}
