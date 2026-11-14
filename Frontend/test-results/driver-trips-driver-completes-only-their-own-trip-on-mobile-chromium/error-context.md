# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: driver-trips.spec.ts >> driver completes only their own trip on mobile
- Location: e2e\driver-trips.spec.ts:4:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.driver-trip-card').filter({ hasText: 'BK-2611-0007' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.driver-trip-card').filter({ hasText: 'BK-2611-0007' }) with timeout 5000ms
  - waiting for locator('.driver-trip-card').filter({ hasText: 'BK-2611-0007' })

```

```yaml
- main:
  - paragraph: AutoHire KE
  - heading "My trips" [level=1]
  - text: Peter Mwangi
  - button "Sign out"
  - article:
    - text: BK-2611-0013
    - strong: 13 Nov 2026, 09:00
    - text: Assigned Vehicle plate
    - strong: KDA 101A
    - link "Call 0712 345 013":
      - /url: tel:254712345013
      - text: Call customer
    - link "WhatsApp 0712 345 013":
      - /url: https://wa.me/254712345013
      - text: WhatsApp
    - link "Open handover inspection":
      - /url: /admin/bookings/booking-13/check-in
    - button "En Route to Pickup"
    - button "Customer Onboard" [disabled]
    - button "Trip Completed" [disabled]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import { DEMO_PASSWORD, users } from '../src/mocks/fixtures'
  3  | 
  4  | test('driver completes only their own trip on mobile', async ({ page }) => {
  5  |   const driver = users.find((user) => user.role === 'driver')!
  6  |   await page.setViewportSize({ width: 390, height: 844 })
  7  |   await page.goto('/login')
  8  |   await page.getByLabel('Work email').fill(driver.email)
  9  |   await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  10 |   await page.getByRole('button', { name: 'Sign in' }).click()
  11 |   await expect(page).toHaveURL(/\/admin\/my-trips$/)
  12 |   await expect(page.getByRole('heading', { name: 'My trips' })).toBeVisible()
  13 |   await expect(page.getByRole('navigation', { name: 'Staff navigation' })).toHaveCount(0)
  14 | 
  15 |   const ownTrip = page.locator('.driver-trip-card').filter({ hasText: 'BK-2611-0007' })
> 16 |   await expect(ownTrip).toBeVisible()
     |                         ^ Error: expect(locator).toBeVisible() failed
  17 |   await expect(page.getByText('BK-2611-0004')).toHaveCount(0)
  18 |   await expect(ownTrip.getByRole('link', { name: 'Call customer' })).toHaveAttribute('href', /^tel:/)
  19 |   await expect(ownTrip.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\//)
  20 |   await expect(ownTrip.getByText('KDG 707G')).toBeVisible()
  21 | 
  22 |   for (const label of ['En Route to Pickup', 'Customer Onboard', 'Trip Completed']) {
  23 |     await ownTrip.getByRole('button', { name: label }).click()
  24 |     await expect(page.getByRole('dialog')).toBeVisible()
  25 |     await page.getByRole('button', { name: 'Confirm status' }).click()
  26 |   }
  27 |   await expect(ownTrip.getByText('trip completed')).toBeVisible()
  28 | })
  29 | 
```