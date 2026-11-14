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

Locator: locator('.driver-trip-card').filter({ hasText: 'BK-2611-0013' }).getByText('trip completed')
Expected: visible
Error: strict mode violation: locator('.driver-trip-card').filter({ hasText: 'BK-2611-0013' }).getByText('trip completed') resolved to 2 elements:
    1) <span class="driver-trip-card__status">trip completed</span> aka getByText('trip completed', { exact: true })
    2) <button disabled type="button" class="button button--secondary button--sm ">Trip Completed</button> aka getByRole('button', { name: 'Trip Completed' })

Call log:
  - Expect "toBeVisible" locator('.driver-trip-card').filter({ hasText: 'BK-2611-0013' }).getByText('trip completed') with timeout 5000ms
  - waiting for locator('.driver-trip-card').filter({ hasText: 'BK-2611-0013' }).getByText('trip completed')

```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: AutoHire KE
      - heading "My trips" [level=1] [ref=e7]
      - generic [ref=e8]: Peter Mwangi
    - button "Sign out" [ref=e9] [cursor=pointer]
  - article [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]: BK-2611-0013
        - strong [ref=e18]: 13 Nov 2026, 09:00
      - generic [ref=e19]: trip completed
    - generic [ref=e20]:
      - generic [ref=e21]: Vehicle plate
      - strong [ref=e22]: KDA 101A
    - generic [ref=e23]:
      - link "Call 0712 345 013" [ref=e24] [cursor=pointer]:
        - /url: tel:254712345013
        - text: Call customer
      - link "WhatsApp 0712 345 013" [ref=e27] [cursor=pointer]:
        - /url: https://wa.me/254712345013
        - text: WhatsApp
    - link "Open handover inspection" [ref=e30] [cursor=pointer]:
      - /url: /admin/bookings/booking-13/check-in
    - generic "Status actions for BK-2611-0013" [ref=e31]:
      - button "SOS" [ref=e32] [cursor=pointer]
      - button "En Route to Pickup" [disabled] [ref=e35]
      - button "Customer Onboard" [disabled] [ref=e36]
      - button "Trip Completed" [disabled] [ref=e37]
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
  15 |   const ownTrip = page.locator('.driver-trip-card').filter({ hasText: 'BK-2611-0013' })
  16 |   await expect(ownTrip).toBeVisible()
  17 |   await expect(page.getByText('BK-2611-0004')).toHaveCount(0)
  18 |   await expect(ownTrip.getByRole('link', { name: /^Call / })).toHaveAttribute('href', /^tel:/)
  19 |   await expect(ownTrip.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\//)
  20 |   await expect(ownTrip.getByText('KDA 101A')).toBeVisible()
  21 | 
  22 |   for (const label of ['En Route to Pickup', 'Customer Onboard', 'Trip Completed']) {
  23 |     await ownTrip.getByRole('button', { name: label }).click()
  24 |     await expect(page.getByRole('dialog')).toBeVisible()
  25 |     await page.getByRole('button', { name: 'Confirm status' }).click()
  26 |   }
> 27 |   await expect(ownTrip.getByText('trip completed')).toBeVisible()
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  28 | })
  29 | 
```