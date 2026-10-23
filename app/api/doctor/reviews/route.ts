// AURASUTRA-REVIEWS:doctor_own_reviews
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { requireDoctor } from '@/lib/authz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function maskName(full: string | null): string | null {
  if (!full) return null;
  const p = full.trim().split(/\s+/);
  if (p.length <= 1) return p[0] ?? null;
  return `${p[0]} ${p[p.length - 1][0]}.`;
}

export async function GET(request: NextRequest) {
  const auth = await requireDoctor();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 50);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const rows = await sql`
      SELECT r.review_id, r.aid, r.rating, r.comment, r.created_at, r.updated_at, r.is_published,
             u.name AS patient_name, a.scheduled_date, a.scheduled_time
      FROM reviews r
      JOIN patients p ON p.pid = r.pid
      JOIN users u ON u.uid = p.uid
      JOIN appointments a ON a.aid = r.aid
      WHERE r.did = ${auth.data.did}
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    // Summary over all of this doctor's reviews (not just the page), so the
    // dashboard page can render the average + distribution in one round trip.
    const [agg] = await sql`
      SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 2), NULL) AS avg_rating,
        COUNT(*)::int AS total_reviews
      FROM reviews
      WHERE did = ${auth.data.did} AND is_published = true
    `;
    const dist = await sql`
      SELECT rating, COUNT(*)::int AS count
      FROM reviews
      WHERE did = ${auth.data.did} AND is_published = true
      GROUP BY rating
    `;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of dist) {
      if (d.rating >= 1 && d.rating <= 5) distribution[d.rating] = d.count;
    }
    const reviews = rows.map((x: any) => ({
      reviewId: x.review_id,
      aid: x.aid,
      rating: x.rating,
      comment: x.comment,
      createdAt: x.created_at,
      updatedAt: x.updated_at,
      isPublished: x.is_published,
      patientName: maskName(x.patient_name),
      scheduledDate: x.scheduled_date,
      scheduledTime: x.scheduled_time,
    }));
    const summary = {
      avgRating: agg?.avg_rating != null ? Number(agg.avg_rating) : null,
      totalReviews: agg?.total_reviews ?? 0,
      distribution,
    };
    // `items`/`count` stay for forward-compat; the dashboard page reads
    // `reviews` + `summary`.
    return NextResponse.json({
      success: true,
      reviews,
      summary,
      items: reviews,
      count: summary.totalReviews,
      limit,
      offset,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
