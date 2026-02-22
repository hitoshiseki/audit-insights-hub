import { useEffect, useRef, useState } from "react";

interface LazyMountProps {
  children: React.ReactNode;
  /** Skeleton placeholder shown until the element enters the viewport */
  fallback?: React.ReactNode;
  /** IntersectionObserver rootMargin – pre-load before element is visible */
  rootMargin?: string;
}

/**
 * Defers mounting children until the wrapper element enters the viewport.
 * Use this around expensive chart grids to avoid mounting all Recharts
 * ResizeObservers at once.
 */
export function LazyMount ({
  children,
  fallback,
  rootMargin = "300px",
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Force-render all charts when a PDF export is about to start
    const handlePdfExport = () => setVisible(true);
    window.addEventListener("pdf-export-start", handlePdfExport);

    // If IntersectionObserver not available (SSR / old browser), mount immediately
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return () => window.removeEventListener("pdf-export-start", handlePdfExport);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      window.removeEventListener("pdf-export-start", handlePdfExport);
    };
  }, [rootMargin]);

  return (
    <div ref={ref}>
      {visible ? children : fallback ?? <ChartGridSkeleton />}
    </div>
  );
}

/** Generic skeleton that approximates a grid of chart cards */
function ChartGridSkeleton () {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-52 animate-pulse rounded-xl bg-muted"
        />
      ))}
    </div>
  );
}
