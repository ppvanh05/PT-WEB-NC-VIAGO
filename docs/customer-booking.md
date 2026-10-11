# Customer booking

The customer home route implements search, results, trip details, seat selection, passenger details, pickup/drop-off, vouchers, review, payment, failure/retry, success, electronic tickets and browser printing. UI controls come from shared components and styles use the global design tokens.

## Current frontend boundary

This project currently has no booking backend. The persisted catalog is a dated frontend fixture, not a live operator schedule. Orders, vouchers, seat holds and audit events use localStorage; Web Locks prevent competing claims between tabs in the same browser, not between devices. The payment adapter returns a frontend confirmation and must not be used to establish that money was received.

Before real transactions, replace the catalog/state operations and PAYMENT_GATEWAY with authenticated APIs. The server must enforce unique trip/seat occupancy, atomic expiring holds, idempotent order creation, voucher limits and payment reconciliation using provider callbacks. Authoritative deadlines and audit records must be server-owned. Ticket QR tokens are currently opaque local tokens; issue signed or server-verified tokens and expose a public verification endpoint for production. Do not expose passenger details in public QR payloads.

The supplied feedback also covers staff-only operations on occupied seats and post-sale editing/refunds. These are outside this customer purchase screen. They require authenticated staff permissions, server-enforced edit/cancellation policies, independent refund transactions and immutable audit records. The customer flow only cancels unpaid holds.

## Verification

`scripts/check-customer-booking.mjs` exercises the browser flow on desktop and mobile, including offline payment failure, retry, ticket QR and printing. Set BOOKING_PREVIEW_URL to the running preview URL. Customer unit specs cover schedule restrictions, seat conflicts, expiry, validation, vouchers, duplicate submissions, round trips and draft restoration.

Run customer tests with `npm test -- --watch=false --include="src/app/featured/customer/home/**/*.spec.ts" --runner-config=scripts/vitest-booking.config.mjs`. The original reference layout is restored using shared controls and global tokens, with marketing and booking layout styles separated. Production build passes without stylesheet size warnings.

## Reference completion

Seat maps preserve the reference cells and numbered rectangle icons: limousine 9 with a centre aisle; cabin 22 with 12 downstairs and 10 upstairs; sleeper 34 with first-row gaps on both floors. Old 11/11 cabin catalogs migrate without clearing orders. Inline selections retain their hold deadline when continuing. Round-trip maps, room configuration, multi-choice filters, recent searches, journey summaries, passenger notes, vouchers, payment and destination sections are restored. Pickup/drop-off uses the shared searchable dropdown.

Destination forecasts use Open-Meteo for the actual arrival date, with unavailable/loading/retry states. Hotel cards link to destination searches; no hotel prices or availability are asserted. The payment QR identifies the local order and is not a bank payment instruction.
