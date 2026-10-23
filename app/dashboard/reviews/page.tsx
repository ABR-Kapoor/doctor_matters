'use client';

// AURASUTRA-REVIEWS:doctor_reviews_page
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { Star, MessageSquare, RefreshCw, User } from 'lucide-react';
import { TranslatedText } from '@/app/components/TranslatedText';
import { useAuthToken } from '@/lib/auth-token-context';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { formatDate } from '@/lib/shared/utils';
import PageLoader from '@/app/components/PageLoader';
import VerificationGuard from '@/app/components/VerificationGuard';

interface Review {
  reviewId: string;
  aid: string;
  rating: number;
  comment: string | null;
  patientName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReviewSummary {
  // null until the first review lands. The page renders "No reviews yet" for
  // that case rather than a misleading 0.0.
  avgRating: number | null;
  totalReviews: number;
  distribution: Record<string, number>;
}

const EMPTY_SUMMARY: ReviewSummary = {
  avgRating: null,
  totalReviews: 0,
  distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
};

function StarRow({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${size} ${i <= rating ? 'text-amber-400' : 'text-blue-100'}`}
          fill={i <= rating ? '#fbbf24' : 'none'}
        />
      ))}
    </div>
  );
}

function ReviewsContent() {
  const token = useAuthToken();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!token) return;

    try {
      const res = await fetchWithAuth('/api/doctor/reviews', token);
      const data = await res.json();

      if (!res.ok || !data.success) {
        // A failed background poll must not blow away a list already on screen.
        if (!silent) setError(data?.message || data?.error || 'Could not load your reviews.');
        return;
      }

      setReviews(data.reviews || []);
      setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      setError(null);
    } catch (err) {
      console.error('[reviews] fetch failed:', err);
      if (!silent) setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader />;

  const hasReviews = summary.totalReviews > 0;

  return (
    <div className="flex flex-col lg:flex-row gap-10 pb-12 p-4 sm:p-6 lg:p-8 xl:p-10">

      {/* Main Content */}
      <div className="flex-1 min-w-0">

        {/* Page Header */}
        <div className="mb-10">
          <span className="pill-badge mb-4 inline-block">
            <MessageSquare className="w-3 h-3" /><TranslatedText>Reviews</TranslatedText>
          </span>
          <h1 className="headline-lg mb-1">
            <TranslatedText>Patient</TranslatedText>{' '}
            <span className="text-blue-600 italic"><TranslatedText>Feedback</TranslatedText></span>
          </h1>
          <p className="body-md text-blue-600 max-w-xl">
            <TranslatedText>What patients said after their completed consultations</TranslatedText>
          </p>
        </div>

        {error ? (
          <div className="card-base p-4 mb-6 border-red-200 bg-red-50">
            <p className="body-md text-red-600">{error}</p>
          </div>
        ) : null}

        {/* Review List */}
        {reviews.length === 0 ? (
          <div className="card-base p-12 text-center">
            <MessageSquare className="w-12 h-12 text-blue-200 mx-auto mb-4" />
            <p className="body-md text-blue-600">
              <TranslatedText>No reviews yet</TranslatedText>
            </p>
            <p className="label-md text-blue-500 mt-2">
              <TranslatedText>Patients can rate a consultation once you mark it completed</TranslatedText>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.reviewId} className="bg-white rounded-[2rem] border border-blue-100 p-5 sm:p-7 shadow-[var(--shadow-sm)]">

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      {/* Already masked to "First L." by the API, and rendered verbatim:
                          NameText transliterates, which would mangle the initial. */}
                      <p className="text-sm font-bold text-blue-900 truncate">
                        {review.patientName || 'Patient'}
                      </p>
                      <p className="label-md text-blue-500">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <StarRow rating={review.rating} />
                </div>

                {review.comment ? (
                  <p className="body-md text-blue-700 bg-blue-50 rounded-2xl p-4 leading-relaxed">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                ) : (
                  <p className="body-md text-blue-500 italic"><TranslatedText>No written comment</TranslatedText></p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-5">

        {/* Rating Summary */}
        <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100">
          <p className="label-md text-blue-600 mb-4"><TranslatedText>Rating</TranslatedText></p>

          <div className="flex items-center gap-3 mb-6">
            <p className="text-4xl font-black font-display text-blue-900">
              {summary.avgRating != null ? summary.avgRating.toFixed(1) : '--'}
            </p>
            <div>
              <StarRow rating={summary.avgRating != null ? Math.round(summary.avgRating) : 0} />
                <p className="text-xs text-blue-600 mt-1">
                  <TranslatedText>{`${summary.totalReviews} review(s)`}</TranslatedText>
                </p>
            </div>
          </div>

          {/* 5 -> 1 distribution. Hidden entirely when there is nothing to plot. */}
          {hasReviews ? (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(star => {
                const count = Number(summary.distribution?.[star] ?? 0);
                const pct = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-500 w-6 flex items-center gap-0.5">
                      {star}<Star className="w-2.5 h-2.5" fill="#fbbf24" strokeWidth={0} />
                    </span>
                    <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400 smooth-transition" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-blue-500 w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="body-md text-blue-600"><TranslatedText>No ratings yet</TranslatedText></p>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { setRefreshing(true); load(); }}
          disabled={refreshing}
          className="btn-secondary w-full py-3 px-4 text-sm justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <TranslatedText>Refresh</TranslatedText>
        </button>
      </div>

    </div>
  );
}

export default function DoctorReviewsPage() {
  return (
    <VerificationGuard>
      <ReviewsContent />
    </VerificationGuard>
  );
}