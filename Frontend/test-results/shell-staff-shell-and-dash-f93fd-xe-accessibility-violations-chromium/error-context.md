# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell.spec.ts >> staff shell and dashboard have no Axe accessibility violations
- Location: e2e\shell.spec.ts:42:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 226

- Array []
+ Array [
+   Object {
+     "description": "Ensure table headers have discernible text",
+     "help": "Table header text should not be empty",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.14/empty-table-header?application=playwright",
+     "id": "empty-table-header",
+     "impact": "minor",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "has-visible-text",
+             "impact": "minor",
+             "message": "Element does not have text that is visible to screen readers",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element does not have text that is visible to screen readers",
+         "html": "<th scope=\"col\"></th>",
+         "impact": "minor",
+         "none": Array [],
+         "target": Array [
+           "th:nth-child(4)",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.name-role-value",
+       "best-practice",
+     ],
+   },
+   Object {
+     "description": "Ensure the order of headings is semantically correct",
+     "help": "Heading levels should only increase by one",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.14/heading-order?application=playwright",
+     "id": "heading-order",
+     "impact": "moderate",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "heading-order",
+             "impact": "moderate",
+             "message": "Heading order invalid",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Heading order invalid",
+         "html": "<h3>No returns are due today.</h3>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "h3",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.semantics",
+       "best-practice",
+     ],
+   },
+   Object {
+     "description": "Ensure that elements labelled through their content must have their visible text as part of their accessible name",
+     "help": "Elements must have their visible text as part of their accessible name",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.14/label-content-name-mismatch?application=playwright",
+     "id": "label-content-name-mismatch",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "label-content-name-mismatch",
+             "impact": "serious",
+             "message": "Text inside the element is not included in the accessible name",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Text inside the element is not included in the accessible name",
+         "html": "<a aria-label=\"Vehicles out today, 4\" class=\"dashboard-kpi-link\" href=\"/admin/bookings?status=active\" data-discover=\"true\"><article class=\"kpi-card\"><p>Vehicles out today</p><strong>4</strong></article></a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[aria-label=\"Vehicles out today, 4\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "label-content-name-mismatch",
+             "impact": "serious",
+             "message": "Text inside the element is not included in the accessible name",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Text inside the element is not included in the accessible name",
+         "html": "<a aria-label=\"Pickups due today, 1\" class=\"dashboard-kpi-link\" href=\"/admin/bookings?pickup=due-today\" data-discover=\"true\"><article class=\"kpi-card\"><p>Pickups due today</p><strong>1</strong></article></a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[aria-label=\"Pickups due today, 1\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "label-content-name-mismatch",
+             "impact": "serious",
+             "message": "Text inside the element is not included in the accessible name",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Text inside the element is not included in the accessible name",
+         "html": "<a aria-label=\"Returns due today, 0\" class=\"dashboard-kpi-link\" href=\"/admin/bookings?return=due-today\" data-discover=\"true\"><article class=\"kpi-card\"><p>Returns due today</p><strong>0</strong></article></a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[aria-label=\"Returns due today, 0\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "label-content-name-mismatch",
+             "impact": "serious",
+             "message": "Text inside the element is not included in the accessible name",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Text inside the element is not included in the accessible name",
+         "html": "<a aria-label=\"Overdue vehicles, 2\" class=\"dashboard-kpi-link dashboard-kpi-link--danger\" href=\"/admin/bookings?status=overdue\" data-discover=\"true\"><article class=\"kpi-card\"><p>Overdue vehicles</p><strong>2</strong></article><span class=\"badge badge--danger\">Action required</span></a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".dashboard-kpi-link--danger",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "label-content-name-mismatch",
+             "impact": "serious",
+             "message": "Text inside the element is not included in the accessible name",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Text inside the element is not included in the accessible name",
+         "html": "<a aria-label=\"Pending offline approvals, 2\" class=\"dashboard-kpi-link\" href=\"/admin/approvals?status=pending\" data-discover=\"true\"><article class=\"kpi-card\"><p>Pending offline approvals</p><strong>2</strong></article></a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[aria-label=\"Pending offline approvals, 2\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "label-content-name-mismatch",
+             "impact": "serious",
+             "message": "Text inside the element is not included in the accessible name",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Text inside the element is not included in the accessible name",
+         "html": "<a aria-label=\"Active breakdown alerts, 2\" class=\"dashboard-kpi-link\" href=\"/admin/incidents?status=active\" data-discover=\"true\"><article class=\"kpi-card\"><p>Active breakdown alerts</p><strong>2</strong></article></a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[aria-label=\"Active breakdown alerts, 2\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "label-content-name-mismatch",
+             "impact": "serious",
+             "message": "Text inside the element is not included in the accessible name",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Text inside the element is not included in the accessible name",
+         "html": "<a aria-label=\"Monthly revenue, KES 23,000\" class=\"dashboard-kpi-link\" href=\"/admin/bookings?period=current-month&amp;status=completed\" data-discover=\"true\"><article class=\"kpi-card\"><p>Monthly revenue</p><strong>KES 23,000</strong></article></a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[aria-label=\"Monthly revenue, KES 23,000\"]",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.semantics",
+       "wcag21a",
+       "wcag253",
+       "EN-301-549",
+       "EN-9.2.5.3",
+       "RGAAv4",
+       "RGAA-6.1.5",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - region "System alerts" [ref=e4]:
    - link "Open breakdown incidents need attention. 1 Open incident" [ref=e5] [cursor=pointer]:
      - /url: /admin/incidents
      - text: Open breakdown incidents need attention.
      - generic [ref=e9]: "1"
      - generic [ref=e10]: Open incident
  - generic [ref=e11]:
    - complementary [ref=e12]:
      - link "AutoHire KE" [ref=e13] [cursor=pointer]:
        - /url: /admin
      - navigation "Staff navigation" [ref=e19]:
        - link "Dashboard" [ref=e20] [cursor=pointer]:
          - /url: /admin
        - link "Fleet" [ref=e25] [cursor=pointer]:
          - /url: /admin/vehicles
        - link "Bookings" [ref=e30] [cursor=pointer]:
          - /url: /admin/bookings
        - link "Approvals" [ref=e35] [cursor=pointer]:
          - /url: /admin/approvals
        - link "Handover" [ref=e40] [cursor=pointer]:
          - /url: /admin/handover
        - link "Timeline" [ref=e45] [cursor=pointer]:
          - /url: /admin/timeline
        - link "Drivers" [ref=e49] [cursor=pointer]:
          - /url: /admin/drivers
        - link "Mechanics" [ref=e56] [cursor=pointer]:
          - /url: /admin/mechanics
        - link "Incidents" [ref=e60] [cursor=pointer]:
          - /url: /admin/incidents
        - link "Staff" [ref=e64] [cursor=pointer]:
          - /url: /admin/staff
        - link "Audit log" [ref=e71] [cursor=pointer]:
          - /url: /admin/audit
      - button "Sign out" [ref=e75] [cursor=pointer]
    - generic [ref=e80]:
      - banner [ref=e81]:
        - generic [ref=e82]:
          - button "Collapse sidebar" [ref=e83] [cursor=pointer]
          - heading "Dashboard" [level=1] [ref=e86]
        - generic [ref=e87]:
          - button "Search fleet, bookings and customers Ctrl K" [ref=e88] [cursor=pointer]:
            - generic [ref=e92]: Search fleet, bookings and customers
            - generic [ref=e93]: Ctrl K
          - generic [ref=e94]:
            - button "Notifications 3" [ref=e95] [cursor=pointer]
            - generic "3" [ref=e99]
          - button "Dark" [ref=e100] [cursor=pointer]
          - button "Amina Njeri" [ref=e104] [cursor=pointer]:
            - generic [aria-hidden] [ref=e105]: A
      - main [ref=e107]:
        - generic [ref=e108]:
          - paragraph [ref=e109]: Your fleet at a glance
          - region "Dashboard" [ref=e110]:
            - link "Vehicles out today, 4" [ref=e111] [cursor=pointer]:
              - /url: /admin/bookings?status=active
              - article [ref=e112]:
                - paragraph [ref=e113]: Vehicles out today
                - strong [ref=e114]: "4"
            - link "Pickups due today, 1" [ref=e115] [cursor=pointer]:
              - /url: /admin/bookings?pickup=due-today
              - article [ref=e116]:
                - paragraph [ref=e117]: Pickups due today
                - strong [ref=e118]: "1"
            - link "Returns due today, 0" [ref=e119] [cursor=pointer]:
              - /url: /admin/bookings?return=due-today
              - article [ref=e120]:
                - paragraph [ref=e121]: Returns due today
                - strong [ref=e122]: "0"
            - link "Overdue vehicles, 2" [ref=e123] [cursor=pointer]:
              - /url: /admin/bookings?status=overdue
              - article [ref=e124]:
                - paragraph [ref=e125]: Overdue vehicles
                - strong [ref=e126]: "2"
              - generic [ref=e127]: Action required
            - link "Pending offline approvals, 2" [ref=e128] [cursor=pointer]:
              - /url: /admin/approvals?status=pending
              - article [ref=e129]:
                - paragraph [ref=e130]: Pending offline approvals
                - strong [ref=e131]: "2"
            - link "Active breakdown alerts, 2" [ref=e132] [cursor=pointer]:
              - /url: /admin/incidents?status=active
              - article [ref=e133]:
                - paragraph [ref=e134]: Active breakdown alerts
                - strong [ref=e135]: "2"
            - link "Monthly revenue, KES 23,000" [ref=e136] [cursor=pointer]:
              - /url: /admin/bookings?period=current-month&status=completed
              - article [ref=e137]:
                - paragraph [ref=e138]: Monthly revenue
                - strong [ref=e139]: KES 23,000
          - generic [ref=e140]:
            - generic [ref=e141]:
              - generic [ref=e142]:
                - generic [ref=e143]: Today's pickups
                - 'link "View bookings: Today''s pickups" [ref=e147] [cursor=pointer]':
                  - /url: /admin/bookings?pickup=due-today
              - table [ref=e152]:
                - rowgroup [ref=e153]:
                  - row [ref=e154]:
                    - columnheader "Time" [ref=e155]
                    - columnheader "Customer" [ref=e156]
                    - columnheader "Vehicle" [ref=e157]
                    - columnheader [ref=e158]
                - rowgroup [ref=e159]:
                  - row [ref=e160]:
                    - cell "09:00" [ref=e161]
                    - cell "Joseph Kamau" [ref=e162]
                    - cell "Toyota Axio" [ref=e163]
                    - cell [ref=e164]:
                      - link "Check out" [ref=e165] [cursor=pointer]:
                        - /url: /admin/bookings/booking-14/check-out
            - generic [ref=e166]:
              - generic [ref=e167]:
                - generic [ref=e168]: Today's returns
                - 'link "View bookings: Today''s returns" [ref=e173] [cursor=pointer]':
                  - /url: /admin/bookings?return=due-today
              - generic [ref=e177]:
                - heading "No returns are due today." [level=3] [ref=e180]
                - paragraph [ref=e181]: No returns are due today.
                - link "View bookings" [ref=e182] [cursor=pointer]:
                  - /url: /admin/bookings
            - generic [ref=e183]:
              - generic [ref=e184]: Fleet status
              - generic [ref=e189]:
                - img "Fleet status" [ref=e190]:
                  - application [ref=e193]
                - list [ref=e209]:
                  - listitem [ref=e210]:
                    - text: Available
                    - generic [ref=e212]: "5"
                  - listitem [ref=e213]:
                    - text: Rented
                    - generic [ref=e215]: "3"
                  - listitem [ref=e216]:
                    - text: Reserved
                    - generic [ref=e218]: "2"
                  - listitem [ref=e219]:
                    - text: Maintenance
                    - generic [ref=e221]: "1"
            - generic [ref=e222]:
              - generic [ref=e223]:
                - generic [ref=e224]: Recent activity
                - 'link "View bookings: Recent activity" [ref=e227] [cursor=pointer]':
                  - /url: /admin/bookings?sort=updatedAt
              - list [ref=e231]:
                - listitem [ref=e232]:
                  - generic [ref=e236]:
                    - generic [ref=e237]: Booking updated
                    - generic [ref=e238]: AH-2619
                  - time [ref=e239]: 20 Nov 2026, 09:00
                - listitem [ref=e240]:
                  - generic [ref=e244]:
                    - generic [ref=e245]: Booking updated
                    - generic [ref=e246]: AH-2618
                  - time [ref=e247]: 19 Nov 2026, 09:00
                - listitem [ref=e248]:
                  - generic [ref=e252]:
                    - generic [ref=e253]: Booking updated
                    - generic [ref=e254]: AH-2617
                  - time [ref=e255]: 18 Nov 2026, 09:00
                - listitem [ref=e256]:
                  - generic [ref=e260]:
                    - generic [ref=e261]: Booking updated
                    - generic [ref=e262]: AH-2616
                  - time [ref=e263]: 17 Nov 2026, 09:00
                - listitem [ref=e264]:
                  - generic [ref=e268]:
                    - generic [ref=e269]: Booking updated
                    - generic [ref=e270]: AH-2615
                  - time [ref=e271]: 16 Nov 2026, 09:00
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import AxeBuilder from '@axe-core/playwright'
  3  | import { DEMO_PASSWORD, users } from '../src/mocks/fixtures'
  4  | 
  5  | test('public shell fits desktop width and shows primary routes', async ({ page }) => {
  6  |   await page.setViewportSize({ width: 1440, height: 1000 })
  7  |   await page.goto('/')
  8  |   await expect(page.getByRole('link', { name: 'Vehicles', exact: true }).first()).toBeVisible()
  9  |   await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  10 |   await expect(page.getByRole('contentinfo')).toBeVisible()
  11 |   const dimensions = await page.locator('body').evaluate((element) => ({
  12 |     client: element.clientWidth,
  13 |     scroll: element.scrollWidth,
  14 |   }))
  15 |   expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
  16 | })
  17 | 
  18 | test('mobile navigation opens and footer remains within the viewport', async ({ page }) => {
  19 |   await page.setViewportSize({ width: 390, height: 844 })
  20 |   await page.goto('/')
  21 |   await page.getByRole('button', { name: 'Open navigation menu' }).click()
  22 |   await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  23 |   await page.getByRole('navigation').getByRole('link', { name: 'About Us' }).click()
  24 |   await expect(page.getByRole('heading', { name: 'About Us' })).toBeVisible()
  25 |   const dimensions = await page.locator('body').evaluate((element) => ({
  26 |     client: element.clientWidth,
  27 |     scroll: element.scrollWidth,
  28 |   }))
  29 |   expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
  30 | })
  31 | 
  32 | test('styleguide exposes all primitives and switches to dark theme', async ({ page }) => {
  33 |   await page.goto('/styleguide')
  34 |   await expect(page.getByRole('heading', { name: 'Component styleguide' })).toBeVisible()
  35 |   await expect(page.getByRole('heading', { name: 'Form controls' })).toBeVisible()
  36 |   await page.getByRole('button', { name: 'Dark', exact: true }).click()
  37 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  38 |   await page.getByRole('button', { name: 'Light', exact: true }).click()
  39 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  40 | })
  41 | 
  42 | test('staff shell and dashboard have no Axe accessibility violations', async ({ page }) => {
  43 |   const owner = users.find((user) => user.role === 'owner')!
  44 |   await page.goto('/login')
  45 |   await page.getByLabel('Work email').fill(owner.email)
  46 |   await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  47 |   await page.getByRole('button', { name: 'Sign in' }).click()
  48 |   await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  49 |   await expect(page.getByRole('link', { name: /Vehicles out today/ })).toBeVisible()
> 50 |   expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
     |                                                                 ^ Error: expect(received).toEqual(expected) // deep equality
  51 | })
  52 | 
  53 | test('driver navigation hides office-only links and exposes assigned trips', async ({ page }) => {
  54 |   const driver = users.find((user) => user.role === 'driver')!
  55 |   await page.goto('/login')
  56 |   await page.getByLabel('Work email').fill(driver.email)
  57 |   await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  58 |   await page.getByRole('button', { name: 'Sign in' }).click()
  59 |   await expect(page).toHaveURL(/\/admin\/my-trips$/)
  60 |   await expect(page.getByRole('navigation', { name: 'Staff navigation' }).getByRole('link', { name: 'My trips' })).toBeVisible()
  61 |   await expect(page.getByRole('navigation', { name: 'Staff navigation' }).getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
  62 | })
  63 | 
  64 | test('Ctrl+K searches vehicle plates', async ({ page }) => {
  65 |   const owner = users.find((user) => user.role === 'owner')!
  66 |   await page.goto('/login')
  67 |   await page.getByLabel('Work email').fill(owner.email)
  68 |   await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  69 |   await page.getByRole('button', { name: 'Sign in' }).click()
  70 |   await expect(page.getByRole('button', { name: /Search fleet, bookings and customers/ })).toBeVisible()
  71 |   await page.keyboard.press('Control+k')
  72 |   await expect(page.getByRole('dialog', { name: 'Search fleet, bookings and customers' })).toBeVisible()
  73 |   await page.getByRole('textbox', { name: 'Search fleet, bookings and customers' }).fill('KDA 101A')
  74 |   await expect(page.getByRole('link', { name: /Toyota Prado TX/ })).toBeVisible()
  75 | })
```