import { NextResponse } from 'next/server';
import { requireDoctor } from '@/lib/authz';
import { callErrorResponse, getActiveSessionForToken } from '@/lib/callSessions';
import { generateToken04 } from '../../../../lib/zegoServerAssistant';

const ROOM_PREFIX = 'appointment_';

export async function POST(req: Request) {
    const auth = await requireDoctor();
    if (!auth.ok) return auth.response;

    const { clerkId, uid, name } = auth.data;

    try {
        const body = await req.json();
        const { roomId } = body;

        if (!roomId || typeof roomId !== 'string') {
            return NextResponse.json({ success: false, error: 'Missing roomId' }, { status: 400 });
        }

        // The room is client-controlled and the identity used to come from the
        // body, so any caller could mint a token for any room under any identity.
        if (!roomId.startsWith(ROOM_PREFIX)) {
            return NextResponse.json({ success: false, error: 'Invalid room' }, { status: 400 });
        }

        const aid = roomId.slice(ROOM_PREFIX.length);
        const active = await getActiveSessionForToken({ uid, role: 'doctor' }, aid);
        if (!active.ok) {
            const error = callErrorResponse(active);
            return NextResponse.json(error.body, { status: error.status });
        }

        const appId = parseInt(process.env.ZEGO_APP_ID || process.env.NEXT_PUBLIC_ZEGO_APP_ID || '', 10);
        // Fail closed. This previously fell back to a ZEGO server secret that
        // was hardcoded in the repository and also read from a NEXT_PUBLIC_
        // variable, which publishes it to the browser bundle.
        const serverSecret = process.env.ZEGO_SERVER_SECRET;

        if (!appId || Number.isNaN(appId) || !serverSecret) {
            console.error('ZEGO credentials are not configured on this server');
            return NextResponse.json({ success: false, error: 'Video service not configured' }, { status: 500 });
        }

        const effectiveTimeInSeconds = 7200;

        // A UIKit token is NOT a bare Token04. The client SDK's
        // `generateKitTokenForProduction` is literally
        //     `<token04> + "#" + base64({userID, roomID, userName, appID})`
        // and `ZegoUIKitPrebuilt.create()` parses that suffix for the room and
        // identity. Returning the raw token04 made joins fail at runtime, and the
        // previous fix replaced that by exposing the server secret to the browser
        // via `generateKitTokenForTest`. This builds the real thing server-side so
        // the secret never leaves the server.
        //
        // Identity is the Clerk session id and the DB name — never a body value.
        const accessToken = generateToken04(appId, clerkId, serverSecret, effectiveTimeInSeconds, '');
        const kitToken =
            accessToken +
            '#' +
            Buffer.from(
                JSON.stringify({
                    userID: clerkId,
                    roomID: roomId,
                    userName: encodeURIComponent(name || 'Doctor'),
                    appID: appId,
                }),
                'utf8'
            ).toString('base64');

        return NextResponse.json({
            success: true,
            token: kitToken,
        });
    } catch (error) {
        console.error('Zego Token Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
