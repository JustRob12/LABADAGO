# LABADAGO — Feature & Development Changelog

> **Note for Contributors & AI Agents**:
> Every time updates or new features are added, append new entries **chronologically underneath previous entries** with the date (`YYYY-MM-DD`) and detailed breakdown of changes.

---

## [2026-09-29]

### 1. Interactive Kilometer Distance Radius Slider
- **Continuous Slider (1 km – 50 km)**: Added a smooth slider on the map to filter laundry shops in real time by distance.
- **Quick Preset Pills**: Added quick-filter buttons (`1km`, `3km`, `5km`, `10km`, `All`) for one-tap filtering.
- **Header Clean-up**: Streamlined the top bar by removing redundant navigation tabs and keeping the map view focused and uncluttered.

### 2. Shortest Track Road Navigation (OSRM / OpenStreetMap)
- **Turn-by-Turn Road Tracks**: Replaced direct straight-line chords with actual road and street routing via OSRM driving and walking profiles.
- **Road-Aligned Distance & ETA Badge**: Displays realistic travel distance and estimated time (e.g., `0.65 km • ~1m`) directly along the path.
- **Animated Pulse Line**: Implemented an animated dash overlay (`#93C5FD` with `@keyframes routeDash`) to visually guide users along the track.

### 3. Right-Aligned Shop Details Modal & Photo Display
- **Modal Placement**: Relocated the shop details card to the right side (`top-16 sm:top-20 right-3 sm:right-4`) on both desktop and mobile viewports.
- **No Overlap**: Ensures the left-hand "Browse Shops" drawer button remains fully accessible at all times.
- **Cover Photo Display**: Shows the shop's photo banner when images are available, complete with live queue badge, star rating, and photo counter.
- **Quick Action Buttons**: Added instant access to **Walk-In QR** generation and external **Google Maps** directions.
- **Mobile Bottom-Sheet Cleanup**: Removed duplicate redundant mobile bottom card in favor of the unified right-hand modal.

### 4. CARTO Voyager Basemap Integration
- **Voyager Raster Tiles**: Configured high-definition CARTO Voyager basemap using API key `cb1_430d_1_0464d8b330e7d05226c320d8`.
- **Environment Configuration**: Stored key in `NEXT_PUBLIC_CARTO_API_KEY` across `.env.local` and `.env.example`.
- **Tile Layer Switcher**: Added support for CARTO Voyager, Positron Light, and Dark Matter map styles.
- **Attribution**: Added compliant, clickable attribution for CARTO and OpenStreetMap contributors.

### 5. Modern Map Pins & Responsive Controls
- **Custom Vector Shop Pins**: SVG teardrop design with laundry machine icon, live queue indicator dot, and precise needle tip anchoring (`iconAnchor: [18, 42]`).
- **Apple/Google Maps Style GPS Puck**: Modern royal blue locator puck (`#2563EB`) with a subtle 24px animated pulse ring.
- **Relocated Map Controls**: Leaflet utility controls (Locate Me, Reset Center, Layer Switcher, Zoom, Fullscreen) moved to the bottom-right (`bottom-8 right-3 sm:right-4`) to eliminate visual conflicts.

### 6. Staff Role & Counter QR Scanner System
- **Staff Role Definition**: Added `STAFF` to `UserRole` and database schema with role switcher locks (staff users cannot toggle to customer or owner).
- **Dedicated Staff Portal (`/staff`)**: Counter QR scanner page supporting camera scan, simulated testing, order intake/dispatch, and optional washing machine numbering.
- **Owner Staff Management**: Built branch staff recruitment and removal interface (`BranchStaffManagement.tsx`) for branch owners.

### 7. Hero Landing Page Live Map & Guest Mode with Walk-In QR Login Guard
- **Full Interactive Map on Landing Page**: Visitors without an account can now immediately view the interactive map and all laundry shop data directly on the hero landing page (`/`).
- **No-Account Public Browsing**: Anyone can browse nearby branches, view live washer/dryer queues, check operating hours, examine photos, use the kilometer distance slider (1–50 km), and calculate shortest road routes without registering.
- **Walk-In QR Auth Guard**: Clicking "Walk-In QR" (on the hero CTA, shop cards, or map modal) redirects unauthenticated visitors to `/login` with an informational notice and pre-fills their destination upon signing in.
- **Customer Portal Guest Mode**: Updated `/customer` so visitors can freely explore the map in guest mode; only authenticating when generating a fast pass or accessing private orders.

### 8. Dedicated Whole-Page Map Route (`/map`) & Hero Page Separation
- **Separated Hero & Map**: Removed the embedded map block from the landing page (`/`), restoring a sleek, uncluttered hero landing presentation.
- **"View Map" Hero CTA**: Added prominent "View Map" buttons across the hero header, primary CTA group, mobile drawer, and interactive teaser banner.
- **Full-Screen Map Workspace (`/map`)**: Created a dedicated whole-page `/map` route delivering the complete full-viewport map experience (identical to the customer portal map) with:
  - Top floating glass bar with 1–50 km distance radius slider and preset pills (`1km`, `3km`, `5km`, `10km`, `All`).
  - Ratings and sorting dropdown filters.
  - Collapsible left floating sidebar with shop search, shop cards, queue badges, washer/dryer counts, and road directions.
  - Full Leaflet map workspace with turn-by-turn road polyline, distance/ETA badge, and right-side shop details modal.
  - Integrated guest mode allowing public exploration with automatic login prompts when generating a Walk-In QR counter pass.

### 9. Dedicated Guest Map Mode & Walk-In QR Login Enforcement
- **No Automatic Login on Map**: Clicking "View Map" never automatically logs in the user or assumes a customer account; it opens the dedicated public `/map` page explicitly in **Guest Mode**.
- **Clean Public Header**: Displays a clean guest header on `/map` with a "Guest Mode" indicator, "Sign In", and "Register" buttons instead of authenticated dashboard navigation tabs.
- **Walk-In QR Auth Guard**: When a guest clicks "Walk-In QR" on any shop card or within the right-side map modal, they are strictly routed to `/login?redirect=...` with the message: *"Please sign in or create an account to generate your Walk-In QR Fast Pass."*
- **Portal Boundary Enforcement**: Unauthenticated visitors who attempt to access `/customer` are automatically redirected to the public `/map` workspace to keep guest browsing separate from customer accounts.

---

## [2026-10-12]

### 10. Manual Counter Payment Recording (Cash & GCash Receipt Upload Proof)
- **Zero Third-Party Gateway Dependency**: Eliminated the need for commercial payment APIs (PayMongo, Stripe, GCash Merchant APIs) and processing fees by implementing a direct **Manual Over-The-Counter (OTC) / GCash Verification** architecture.
- **Counter Staff Payment Intake (`PaymentRecordModal.tsx`)**:
  - Staff can record payments directly from the queue or action modal at any stage (Receive, Washing, Ready, Give/Pickup).
  - **Cash Option**: One-tap recording with instant calculation and timestamped logging.
  - **GCash / Bank Transfer Option**: Allows staff to input the customer's GCash reference number, capture a camera photo of the customer's phone screen, or upload a transfer screenshot.
  - **Client-Side Image Compression & Resilient Storage**: Automatically compresses images via HTML5 Canvas before uploading to Supabase Storage bucket `payment_proofs` (with fallback to compressed base64 if storage is unavailable).
- **Cross-Role Receipt & Proof Viewer (`PaymentProofModal.tsx`)**:
  - **Customer Portal**: Customers can view their confirmed bill, payment method (`Cash` or `GCash`), reference number, and click to view their official receipt/transfer proof in a lightbox modal. If unpaid, clear instructions indicate that payment is settled at the counter (Cash or GCash) with no online checkout required.
  - **Staff Scanner Station**: Staff can review whether an order was prepaid, view receipt screenshots, or collect settlement before releasing clothes.
  - **Owner / Admin Dashboard**: Shop owners can inspect all transaction proofs in the orders table and view revenue breakdowns (`Cash Revenue` vs. `GCash Revenue`) in the analytics dashboard to prevent employee theft or unrecorded sales.
- **Database Schema & Storage Bucket Migration**:
  - Added columns `payment_method`, `payment_proof_url`, `payment_reference_no`, and `paid_at` to `public.transactions`.
  - Created public Supabase storage bucket `payment_proofs` with RLS upload/view policies.
  - Generated standalone migration script `supabase_manual_payment_migration.sql` for 1-click execution in Supabase SQL editor.
