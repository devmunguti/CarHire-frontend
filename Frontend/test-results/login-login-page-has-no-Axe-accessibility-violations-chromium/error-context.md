# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> login page has no Axe accessibility violations
- Location: e2e\login.spec.ts:25:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Run your fleet from one place' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Run your fleet from one place' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Run your fleet from one place' })

```

```yaml
- status "Loading state"
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
> 27 |   await expect(page.getByRole('heading', { name: 'Run your fleet from one place' })).toBeVisible()
     |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  28 |   await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  29 |   const results = await new AxeBuilder({ page }).analyze()
  30 |   expect(results.violations).toEqual([])
  31 | })
  32 | 
  33 | test('an agent sees 403 on a manager-only route', async ({ page }) => {
  34 |   const agent = users.find((user) => user.role === 'agent')!
  35 |   await page.goto('/admin/staff')
  36 |   await expect(page).toHaveURL(/\/login$/)
  37 |   await page.getByLabel('Work email').fill(agent.email)
  38 |   await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  39 |   await page.getByRole('button', { name: 'Sign in' }).click()
  40 |   await expect(page).toHaveURL(/\/403$/)
  41 |   await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  42 | })
  43 | 
  44 | test('refresh cookie restores the session after a reload', async ({ page }) => {
  45 |   const owner = users.find((user) => user.role === 'owner')!
  46 |   await page.goto('/login')
  47 |   await page.getByLabel('Work email').fill(owner.email)
  48 |   await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  49 |   await page.getByRole('button', { name: 'Sign in' }).click()
  50 |   await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  51 |   await page.context().addCookies([{
  52 |     name: 'autohire_refresh',
  53 |     value: 'mock-owner',
  54 |     url: 'http://127.0.0.1:4173',
  55 |     httpOnly: true,
  56 |     sameSite: 'Lax',
  57 |   }])
  58 |   const cookieNames = (await page.context().cookies()).map((cookie) => cookie.name)
  59 |   expect(cookieNames).toContain('autohire_refresh')
  60 |   await page.reload({ waitUntil: 'domcontentloaded' })
  61 |   await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  62 | })
```