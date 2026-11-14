# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> an agent sees 403 on a manager-only route
- Location: e2e\login.spec.ts:31:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/403$/
Received string:  "http://127.0.0.1:4173/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    3 × locator resolved to <html lang="en">…</html>
      - unexpected value "http://127.0.0.1:4173/admin/staff"
    10 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://127.0.0.1:4173/login"

```

```yaml
- main:
  - region "Run your fleet from one place":
    - link "AutoHire KE":
      - /url: /
    - paragraph: Staff portal
    - heading "Run your fleet from one place" [level=1]
    - list:
      - listitem: Keep every vehicle ready and accounted for.
      - listitem: Move bookings from request to handover.
      - listitem: Keep your whole team in sync.
    - paragraph: Built for car hire teams across Kenya.
  - region "Sign in to AutoHire KE":
    - paragraph: WELCOME BACK
    - heading "Sign in to AutoHire KE" [level=2]
    - paragraph: Use your invited staff account to continue.
    - text: Work email
    - textbox "Work email":
      - /placeholder: name@company.co.ke
    - text: Password
    - textbox "Password"
    - button "Show password"
    - button "Sign in"
    - paragraph: Staff access is by invitation from an owner.
```

# Test source

```ts
  1  | import AxeBuilder from '@axe-core/playwright'
  2  | import { expect, test } from '@playwright/test'
  3  | import { DEMO_PASSWORD, users } from '../src/mocks/fixtures'
  4  | 
  5  | const destinations = {
  6  |   owner: { path: '/admin', heading: 'Dashboard' },
  7  |   manager: { path: '/admin', heading: 'Dashboard' },
  8  |   agent: { path: '/admin', heading: 'Dashboard' },
  9  |   driver: { path: '/admin/my-trips', heading: 'My trips' },
  10 |   mechanic: { path: '/admin/incidents', heading: 'Incidents' },
  11 | }
  12 | 
  13 | for (const user of users) {
  14 |   const destination = destinations[user.role]
  15 |   test(`${user.role} lands on the correct staff page`, async ({ page }) => {
  16 |     await page.goto('/login')
  17 |     await page.getByLabel('Work email').fill(user.email)
  18 |     await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  19 |     await page.getByRole('button', { name: 'Sign in' }).click()
  20 |     await expect(page).toHaveURL(new RegExp(`${destination.path.replaceAll('/', '\\/')}$`))
  21 |     await expect(page.getByRole('heading', { name: destination.heading })).toBeVisible()
  22 |   })
  23 | }
  24 | 
  25 | test('login page has no Axe accessibility violations', async ({ page }) => {
  26 |   await page.goto('/login')
  27 |   const results = await new AxeBuilder({ page }).analyze()
  28 |   expect(results.violations).toEqual([])
  29 | })
  30 | 
  31 | test('an agent sees 403 on a manager-only route', async ({ page }) => {
  32 |   const agent = users.find((user) => user.role === 'agent')!
  33 |   await page.goto('/login')
  34 |   await page.getByLabel('Work email').fill(agent.email)
  35 |   await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  36 |   await page.getByRole('button', { name: 'Sign in' }).click()
  37 |   await page.goto('/admin/staff')
> 38 |   await expect(page).toHaveURL(/\/403$/)
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  39 |   await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  40 | })
```