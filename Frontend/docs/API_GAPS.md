# API Gaps

The OpenAPI contract was not present when this frontend scaffold was created. These endpoints are mocked by MSW until the backend contract is available:

| Endpoint | Purpose | Mock behavior |
| --- | --- | --- |
| `GET /api/v1/health` | Health check | Returns `{ status: "ok" }` |
| `POST /api/v1/auth/login` | Sign in | Matches one of the five fixture users and returns an in-memory access token |
| `POST /api/v1/auth/refresh` | Refresh access | Returns a fixture token; a real API must validate the httpOnly refresh cookie |
| `POST /api/v1/auth/logout` | Sign out | Returns a successful logout envelope |
| `GET /api/v1/auth/me` | Current user | Resolves the mock user from the in-memory bearer token |
| `GET /api/v1/vehicles` | Vehicle list | Returns the 12 vehicle fixtures |
| `GET /api/v1/bookings` | Booking list | Returns the 20 booking fixtures |

Staff routes and role permissions follow dashboard documentation sections 4.1, 4.2, 5, and 8.1. Endpoint schemas, error codes, and refresh-cookie behavior remain provisional until the backend OpenAPI contract is available.