# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell.spec.ts >> staff shell and dashboard have no Axe accessibility violations
- Location: e2e\shell.spec.ts:42:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /Vehicles out today/ })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('link', { name: /Vehicles out today/ }) with timeout 5000ms
  - waiting for getByRole('link', { name: /Vehicles out today/ })

```

```yaml
- region "System alerts":
  - link "Open breakdown incidents need attention. 1 Open incident":
    - /url: /admin/incidents
- complementary:
  - link "AutoHire KE":
    - /url: /admin
  - navigation "Staff navigation":
    - link "Dashboard":
      - /url: /admin
    - link "Fleet":
      - /url: /admin/vehicles
    - link "Bookings":
      - /url: /admin/bookings
    - link "Approvals":
      - /url: /admin/approvals
    - link "Handover":
      - /url: /admin/handover
    - link "Timeline":
      - /url: /admin/timeline
    - link "Drivers":
      - /url: /admin/drivers
    - link "Mechanics":
      - /url: /admin/mechanics
    - link "Incidents":
      - /url: /admin/incidents
    - link "Staff":
      - /url: /admin/staff
    - link "Audit log":
      - /url: /admin/audit
  - button "Sign out"
- banner:
  - button "Collapse sidebar"
  - heading "Dashboard" [level=1]
  - button "Search fleet, bookings and customers Ctrl K"
  - button "Notifications 4"
  - text: "4"
  - button "Dark"
  - button "Amina Njeri"
- main:
  - status "Loading state"
```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```