import { NextRequest, NextResponse } from 'next/server';
import { requireDoctorAccount } from '@/lib/authz';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

const cache = new Map<string, { expiresAt: number; results: any[] }>();

export async function GET(request: NextRequest) {
    const auth = await requireDoctorAccount();
    if (!auth.ok) return auth.response;

    try {
        const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
        if (q.length < 3) {
            return NextResponse.json({ error: 'Enter at least 3 characters to search.' }, { status: 400 });
        }

        const token = process.env.MAPBOX_ACCESS_TOKEN;
        if (!token) {
            return NextResponse.json({ error: 'Server misconfiguration: Mapbox token missing' }, { status: 500 });
        }

        const cacheKey = q.toLowerCase();
        const cached = cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json({ results: cached.results });
        }

        const params = new URLSearchParams({
            q,
            access_token: token,
            limit: '6'
        });

        const url = 'https://api.mapbox.com/search/geocode/v6/forward?' + params.toString();
        const upstream = await fetch(url);
        if (!upstream.ok) {
            return NextResponse.json({ error: 'Location search failed' }, { status: 502 });
        }

        const payload = await upstream.json();
        
        const results = (payload.features || []).map((feat: any) => ({
            lat: feat.geometry.coordinates[1],
            lng: feat.geometry.coordinates[0],
            label: feat.properties.full_address || feat.properties.place_formatted || feat.properties.name
        }));

        if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
        cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, results });

        return NextResponse.json({ results });
    } catch (error) {
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
