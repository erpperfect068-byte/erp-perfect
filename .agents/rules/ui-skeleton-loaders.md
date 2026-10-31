# UI Skeleton Loaders Policy

## Core Principle
Whenever a page, widget, or tab loads asynchronous data from the API/database:
1. **Never flash empty states or 0 counts:**
   - While `loading === true`, **NEVER** render "لا يوجد بيانات" (Empty State) or `0` in metrics.
   - Initial empty states must ONLY be shown when `!loading && data.length === 0`.
2. **Always render Skeleton Loaders while loading:**
   - Use the components from `@/components/ui/Skeleton`:
     - `<MetricCardSkeleton />` for statistics/summary metric cards.
     - `<CardSkeleton />` for grid views (contractors, safeboxes, shipments, cards).
     - `<TableSkeleton />` for tabular views (invoices, transaction logs, lists).
     - `<AlertBannerSkeleton />` for alerts and banners.
3. **Smooth UX & Visual Stability:**
   - The skeleton structure must closely mirror the real layout to prevent Layout Shift (CLS) when data arrives.
   - Skeletons should use gentle Tailwind `animate-pulse` with slate colors matching our design palette.
