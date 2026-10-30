import { NextRequest, NextResponse } from 'next/server';
import { requireDoctor } from '@/lib/authz';
import { callErrorResponse, performCallAction } from '@/lib/callSessions';

export async function POST(_request: NextRequest, { params }: { params: { aid: string } }) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    const result = await performCallAction(
        { uid: auth.data.uid, role: 'doctor' },
        params.aid,
        'end',
    );

    if (!result.ok) {
        const error = callErrorResponse(result);
        return NextResponse.json(error.body, { status: error.status });
    }

    return NextResponse.json({ success: true, session: result.data });
}
