"use client";

import { ErrorState, EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ReviewCard } from "@/components/review-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useQuery } from "@/lib/api";

export default function ReviewPage() {
  const review = useQuery("review", () => api.listReview());
  const treasury = useQuery("treasury", () => api.getTreasury());
  const vendors = new Map((treasury.data?.vendors ?? []).map((v) => [v.id, v]));

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Invoices Warden held for you, most urgent first. Nothing here has been paid."
      />
      {review.error && <ErrorState message={review.error.message} action={review.error.action} onRetry={review.reload} />}
      {!review.data && review.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-card border border-line bg-surface-1 p-4">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="mt-3 h-3 w-72" />
            </div>
          ))}
        </div>
      ) : review.data?.length === 0 ? (
        <div className="rounded-card border border-line bg-surface-1">
          <EmptyState
            title="No invoices awaiting review."
            body="Clean invoices are paid automatically."
            action={{ href: "/upload", label: "Upload an invoice" }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {review.data?.map((p) => (
            <ReviewCard key={p.id} payment={p} vendor={p.vendorId ? vendors.get(p.vendorId) ?? null : null} />
          ))}
        </div>
      )}
    </>
  );
}
