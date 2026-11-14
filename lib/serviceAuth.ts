import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Server-to-server authorization for the external admin panel.
 * The admin app calls these routes with the shared `INTERNAL_SERVICE_SECRET`.
 */
export function isServiceAuthorized(request: NextRequest): boolean {
    const expected = process.env.INTERNAL_SERVICE_SECRET;
    const provided = request.headers.get('x-service-secret');

    if (!expected || !provided) return false;

    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);

    if (expectedBuffer.length !== providedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, providedBuffer);
}
