# Phase 0 API contract and integration gaps

The agreed contract is [Backend/openapi.yaml](../../Backend/openapi.yaml). Phases 1–3 added MongoDB-backed authentication, fleet/availability, and booking lifecycle support. Phase 4 is paused and unverified; Phase 5 has partial backend work and is paused before its completion check. Phase 6 focused backend integration and frontend tests pass; interactive UI flows against the real backend and live SMTP delivery are not yet verified. Keep `VITE_USE_MOCKS` working until each real-API flow is verified.

## Contract conventions

- The API base is `/api/v1`; `POST /contact` is the current unversioned exception.
- Successful responses use `{ "success": true, "data": ..., "error": null }`. Failures use the shared `ErrorEnvelope`; operation-specific codes are in `x-error-codes`.
- `x-operation-access` records the authentication mechanism and allowed roles for every operation. The default is bearer authentication, with public, guest-cookie, provider-signature, and token-authenticated exceptions declared per operation. Role checks never replace record ownership, branch scoping, or explicit state-transition checks.
- Cursor lists use `limit` (default 50, maximum 100) and opaque `cursor`, returning `{ items, nextCursor }`. Each operation defines its own filters. Timestamps are UTC; business dates use `Africa/Nairobi`.
- Money is integer KES. Server-calculated price, payment amounts, timestamps, audit records, and status changes are authoritative.
- JSON is used except where the contract marks a request `multipart/form-data`. Upload limits and allowed media types are specified on each upload operation.

## Complete current MSW route-to-operation map

Every active handler in `Frontend/src/mocks/handlers.ts` maps to one operation below. MSW paths are shown with the `/api/v1` prefix except for the contact endpoint.

| MSW method and route | OpenAPI operation |
| --- | --- |
| `GET /api/v1/health` | `getHealth` |
| `POST /contact` | `submitContactMessage` |
| `GET /api/v1/vehicles` | `listVehicles` |
| `POST /api/v1/vehicles` | `createVehicle` |
| `GET /api/v1/vehicles/{vehicleId}` | `getVehicle` |
| `PATCH /api/v1/vehicles/{vehicleId}` | `updateVehicle` |
| `GET /api/v1/maintenance-windows` | `listMaintenanceWindows` |
| `POST /api/v1/maintenance-windows` | `createMaintenanceWindow` |
| `PATCH /api/v1/maintenance-windows/{windowId}` | `updateMaintenanceWindow` |
| `DELETE /api/v1/maintenance-windows/{windowId}` | `deleteMaintenanceWindow` |
| `GET /api/v1/mechanics/nearest` | `findNearestMechanics` |
| `GET /api/v1/mechanics` | `listMechanics` |
| `POST /api/v1/mechanics` | `createMechanic` |
| `GET /api/v1/incidents` | `listIncidents` |
| `POST /api/v1/incidents/breakdown` | `createBreakdownIncident` |
| `PATCH /api/v1/incidents/{id}/dispatch` | `dispatchIncident` |
| `GET /api/v1/drivers` | `listDrivers` |
| `GET /api/v1/drivers/available` | `listAvailableDrivers` |
| `GET /api/v1/drivers/me/trips` | `listMyDriverTrips` |
| `GET /api/v1/bookings` | `listBookings` |
| `GET /api/v1/bookings/{id}` | `getBooking` |
| `GET /api/v1/bookings/{id}/checkout` | `getGuestCheckout` |
| `POST /api/v1/bookings/{id}/checkout` | `submitGuestCheckout` |
| `GET /api/v1/bookings/{ref}/guest` | `getGuestBooking` |
| `POST /api/v1/bookings/{ref}/guest` | `exchangeGuestBookingAccess` |
| `POST /api/v1/bookings/{bookingKey}/cancel` | `cancelBooking` |
| `POST /api/v1/bookings/{id}/driver` | `assignDriver` |
| `POST /api/v1/bookings/{id}/driver-status` | `updateAssignedDriverTripStatus` |
| `POST /api/v1/bookings/{id}/inspections/photos` | `uploadInspectionPhoto` |
| `POST /api/v1/bookings/{id}/check-out` | `checkOutBooking` |
| `POST /api/v1/bookings/{id}/check-in/settlement` | `previewCheckInSettlement` |
| `POST /api/v1/bookings/{id}/check-in` | `checkInBooking` |
| `POST /api/v1/bookings/{id}/payments/stk` | `initiateMpesaStk` |
| `GET /api/v1/payments/{paymentId}/status` | `getPaymentStatus` |
| `POST /api/v1/quotes/calculate` | `calculateQuote` |
| `POST /api/v1/bookings` | `createBooking` |
| `POST /api/v1/bookings/{id}/offline-approval` | `approveOfflinePayment` |
| `GET /api/v1/dashboard` | `getDashboard` |
| `GET /api/v1/notifications` | `getNotificationCounts` |
| `GET /api/v1/search` | `searchStaffRecords` |
| `GET /api/v1/approvals` | `listPendingApprovals` |
| `GET /api/v1/staff` | `listStaff` |
| `POST /api/v1/staff` | `inviteStaff` |
| `PATCH /api/v1/staff/{staffId}` | `updateStaff` |
| `POST /api/v1/staff/invitations/{invitationId}/resend` | `resendStaffInvitation` |
| `DELETE /api/v1/staff/invitations/{invitationId}` | `revokeStaffInvitation` |
| `GET /api/v1/audit` | `listAuditEntries` |
| `POST /api/v1/auth/login` | `login` |
| `POST /api/v1/auth/refresh` | `refreshSession` |
| `POST /api/v1/auth/logout` | `logout` |
| `GET /api/v1/auth/me` | `getCurrentUser` |
| `PATCH /api/v1/auth/me` | `updateCurrentUser` |

`src/api/auth.ts` calls login, logout, and current-user routes. `src/api/client.ts` calls refresh when a protected request returns 401. `src/api/queries.ts` and feature pages call the remaining mapped routes; action requests and response shapes are specified in OpenAPI. There is no longer a generic booking status `PATCH`: the frontend uses explicit approval, cancellation, check-in/out, and driver-status operations.

## Additional contract operations without current MSW handlers

These operations are contract-first and now have initial backend implementations; verify them against MongoDB and the frontend before disabling mocks.

- **Authentication and account lifecycle:** profile update, password reset, and invitation acceptance.
- **Booking and payment:** booking refund records and the M-Pesa provider callback.
- **Incident workflow:** incident resolution.
- **Administration:** pending approvals, staff list/invite/update/resend/revoke, dashboard, notifications, search, and owner-only audit listing.

The admin screens now use API queries/mutations rather than fixture-backed state. Contact messages are sent to `CONTACT_INBOX` (default `hello@autohire.ke`) and are not retained in the database. SMTP must be configured for delivery.

## UI assumptions and request behavior

- **401 / 403:** `apiClient` attempts one cookie-based refresh after a protected request returns 401; if that fails, it clears the in-memory access token and dispatches `autohire:unauthorized`, which clears the `AuthContext` user. A normal 403 keeps the session and lets the screen show the permission error; `ACCOUNT_DEACTIVATED` clears the session. `ProtectedRoute` redirects unauthenticated users to `/login` and role mismatches to `/403`. These are UX behaviors only; backend middleware is authoritative.
- **Timeline:** `TimelinePage.tsx` requests bookings, vehicles, incidents, and maintenance windows. The visible range is built from Nairobi midnight boundaries and sent as UTC instants; the server must filter by interval overlap and return canonical booking/incident states. The page does not send arbitrary sort instructions.
- **Handover:** `HandoverPage.tsx` uploads each inspection photo separately as multipart (`file`, `type`), asks the server to calculate a check-in settlement, then submits the signed inspection. The server owns inspection timestamps, validates odometer monotonicity and booking state, and moves a critically defective vehicle to maintenance.
- **Guest checkout:** licence data is part of the checkout multipart request. The one-time access token is exchanged for a scoped HttpOnly cookie and is not placed in a URL. Guest reads/cancellation use that cookie. A hold is not a confirmed booking until online payment or authorized offline approval completes.
- **Fleet status:** `booked` is derived from active bookings; operators may set `available`, `maintenance`, or `inactive`. Vehicles are retained rather than hard-deleted. A vehicle cannot be disabled or put into maintenance while it has an active reservation.
- **Availability:** date intervals are half-open `[start, end)`. Reads filter overlapping bookings and maintenance windows; booking holds and maintenance writes recheck overlap in a MongoDB transaction. MongoDB must run as a replica set. A stale availability result can still race with another request, so reservation creation is authoritative and returns `VEHICLE_UNAVAILABLE` on conflict.
- **Reservation lifecycle:** quotes check requested-date availability; creation recalculates the quote and atomically creates a 15-minute hold. Repeated `Idempotency-Key` requests replay the original booking only when the payload matches. Listing/detail lazily mark expired holds as `expired`. Confirmed bookings require the real payment or offline approval transition.
- **Approvals and cancellation:** offline approval records the payment reference and transitions `reserved` to `confirmed`; creator self-approval is forbidden, agents cannot approve corporate credit, and corporate approval requires a reason. Staff may cancel live reserved holds. Confirmed/paid bookings are not cancellable until the owner-approved refund workflow exists.
- **Staff and audit:** server-side role hierarchy, last-owner safeguards, immediate session revocation on deactivation, and append-only server-generated audit entries are implemented. Successful API mutations and lazy system booking transitions are audited; system transition snapshots include only status/fee fields, while request bodies and secrets are never stored. Verify every mutation path in integration tests.

## State machines and actors

The authoritative transitions are in `x-state-machines` in OpenAPI. Clients may request only the named action, never an arbitrary status patch.

| Aggregate | Allowed transitions | Trigger / actor |
| --- | --- | --- |
| Booking | `reserved → confirmed / cancelled / expired`; `confirmed → checked_out / completed / cancelled`; `checked_out → overdue / completed`; `overdue → completed` | Verified payment or offline approval; eligible guest or authorized staff cancellation; system hold expiry / overdue processing; authorized handover or assigned-driver trip completion. Paid staff cancellations require owner-approved refund handling. Terminal: completed, cancelled, expired. |
| Payment | `pending → paid / failed`; `paid → refund_pending`; `refund_pending → refunded / failed` | Verified provider callback or authorized offline approval; owner-approved cancellation/refund; provider refund result. Callback and refund processing must be idempotent. |
| Chauffeur trip | `unassigned → en_route_to_pickup → customer_onboard → trip_completed` | Only the assigned driver can advance their trip. |
| Inspection | `not_checked_out → checked_out → checked_in` | Authorized handover staff or the booking's assigned driver; check-out requires a confirmed booking, check-in requires an existing check-out and a nondecreasing odometer. |
| Incident | `open → dispatched / awaiting_replacement → resolved` | Authorized dispatcher selects mechanic/rescue or replacement; authorized incident manager or mechanic records resolution. |

## Confirmed business and security decisions

- **Pricing (provisional defaults):** bill at least one day and round rental duration up to whole days; VAT 16%; refundable deposit KES 15,000. Extras: baby seat KES 500/day, rooftop tent KES 1,800/day, cooler box KES 700/day, airport pickup KES 2,500 once. Chauffeur: KES 3,500/day in-town and KES 6,500/day upcountry. The server calculates the authoritative quote.
- **Hold:** 15 minutes. Expiry is enforced server-side and overlapping bookings are prevented atomically.
- **Cancellation/refunds:** guests may cancel at least 48 hours before pickup for a full refund; online guest cancellation inside that window is unavailable. Staff cancellation of a paid booking requires explicit owner approval and a recorded refund; refund stays pending until provider confirmation.
- **Offline payment:** owner, manager, and agent can approve with a payment reference; corporate approval also requires a reason and is unavailable to agents. No approver may approve their own booking.
- **Date/time:** persist and exchange UTC instants; use `Africa/Nairobi` for business-day rules and display.
- **First owner:** provision once using a secure CLI bootstrap, only when no owner exists; read the password securely and hash it. No public owner registration or seeded credentials.
- **Staff invitation:** invite-only, single-use hashed token, 72-hour expiry; resend rotates/revokes the prior token; revoke is supported.
- **Password reset:** generic acknowledgement for known/unknown emails; single-use hashed token expires in 30 minutes; rate-limit requests and revoke existing sessions on successful reset.
- **Session lifetime:** access JWT expires after 15 minutes; refresh credentials rotate on use and have a 30-day absolute expiry from login. Store only refresh-token hashes; revoke the session on logout or password reset.
- **Pagination:** cursor-based, default 50, maximum 100; cursors are opaque.
- **Uploads:** licence: JPG/JPEG, PNG, WebP, or PDF, max 5 MiB. Inspection and incident images: JPEG, PNG, or WebP, max 5 MiB each and max 10 per inspection/incident. Multipart; enforce limits and media sniffing server-side.
- **Handover settlement (provisional):** 2-hour grace, KES 1,500 per late hour, 100 km/day included, KES 50 per excess km. Server owns timestamps and computes settlement.

The confirmed frontend role permissions are mirrored in `x-operation-access`. Owner has all permissions; Manager has the same except audit and settings; Agent has booking/payment/approval (not corporate), handover, driver assignment, dispatch, and incident management without fleet/staff/audit/settings management; Driver has own trips, handover, and mechanic read; Mechanic has vehicle read, incident management, and maintenance read. Agents receive read-only maintenance-window data for the existing timeline view, but cannot create or change maintenance windows. Ownership, assignment, role hierarchy, and branch scope remain server-side checks.

## Remaining gaps before real-backend rollout

| Gap | Needed before |
| --- | --- |
| Guest checkout/payments and Phase 5 operational changes are paused and not verified end to end; retain mock mode for those flows. | Before enabling the corresponding real-API flows |
| Production and local MongoDB must support transactions; configure MongoDB as a replica set. | Before running fleet/availability APIs |
| Confirm the M-Pesa provider, callback schema/signature mechanism, credentials/secrets delivery, retry semantics, and refund API. The webhook contract is normalized, not provider-certified. | Payment integration |
| Branch-level isolation is deferred; the application is being operated as a single branch. Do not treat the staff branch label as an authorization boundary. | Before multi-branch production data |
| Configure real SMTP credentials and `CONTACT_INBOX`; rate limiting is five requests per 15 minutes per client IP. Contact submissions are not persisted. | Before enabling public contact delivery |
| Verify staff, profile, approvals, audit, dashboard, notifications, and search through the frontend against the real backend; validate contact delivery with configured SMTP. | Before Phase 6 production rollout |
| Verify every contract operation against the real backend before disabling its corresponding mock. | Production cutover |

## Server invariants

Hash passwords and invitation/reset tokens; keep all credentials and provider secrets out of the repository and provide placeholder-only `.env.example` values. Validate every input and upload, enforce ownership/roles/state transitions, compute prices and statuses on the server, use transactions or locking for availability and booking creation, process payment callbacks idempotently, and return the shared error envelope for failures.
