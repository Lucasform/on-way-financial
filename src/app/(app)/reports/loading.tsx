import { CardSkeleton, ChartSkeleton, PageHeaderSkeleton } from "@/components/ui/loading";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <ChartSkeleton height={288} />
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton height={320} />
        <ChartSkeleton height={320} />
      </div>
    </div>
  );
}
