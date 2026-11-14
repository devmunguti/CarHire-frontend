# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: about-contact.spec.ts >> /about has no axe violations
- Location: e2e\about-contact.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { level: 1 })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { level: 1 }) with timeout 5000ms
  - waiting for getByRole('heading', { level: 1 })

```

```yaml
- banner:
  - link "AutoHire KE":
    - /url: /
  - navigation "Primary navigation":
    - link "Home":
      - /url: /
    - link "Vehicles":
      - /url: /vehicles
    - link "About Us":
      - /url: /about
    - link "Contact Us":
      - /url: /contact
  - link "Need help? +254 700 123 456":
    - /url: tel:254700123456
    - text: Need help?
    - strong: +254 700 123 456
  - text: Language
  - combobox "Language":
    - option "English" [selected]
    - option "Kiswahili"
- main:
  - status "Loading state"
- contentinfo:
  - link "AutoHire KE":
    - /url: /
  - paragraph: Your journey, our drive.
  - heading "Address" [level=2]
  - paragraph: Mombasa Road, Nairobi, Kenya
  - paragraph:
    - button "Email"
  - paragraph:
    - link "+254 700 123 456":
      - /url: tel:254700123456
  - heading "Useful links" [level=2]
  - link "Home":
    - /url: /
  - link "Vehicles":
    - /url: /vehicles
  - link "About Us":
    - /url: /about
  - link "Contact Us":
    - /url: /contact
  - heading "Vehicles" [level=2]
  - link "SUVs":
    - /url: /vehicles
  - link "Sedans":
    - /url: /vehicles
  - link "Vans":
    - /url: /vehicles
  - text: © 2026 AutoHire KE. All rights reserved. Your journey, our drive.
```

# Test source

```ts
  1  | import AxeBuilder from '@axe-core/playwright'
  2  | import { expect, test } from '@playwright/test'
  3  | 
  4  | for (const path of ['/about', '/contact']) {
  5  |   test(`${path} has no axe violations`, async ({ page }) => {
  6  |     await page.goto(path)
> 7  |     await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  8  |     const results = await new AxeBuilder({ page }).analyze()
  9  |     expect(results.violations).toEqual([])
  10 |   })
  11 | }
  12 | 
  13 | test('contact form submits to its mocked endpoint', async ({ page }) => {
  14 |   await page.goto('/contact')
  15 |   await page.getByLabel('Name').fill('Jane Doe')
  16 |   await page.getByLabel('Email').fill('jane@example.test')
  17 |   await page.getByLabel('Phone').fill('0712 345 678')
  18 |   await page.getByRole('textbox', { name: 'Message' }).fill('Please help me plan a trip.')
  19 |   await page.getByRole('button', { name: 'Send message' }).click()
  20 |   await expect(page.getByRole('status')).toContainText('Thanks for reaching out')
  21 | })
  22 | 
  23 | for (const path of ['/about', '/contact']) {
  24 |   test(`${path} fits a 390px viewport`, async ({ page }) => {
  25 |     await page.setViewportSize({ width: 390, height: 844 })
  26 |     await page.goto(path)
  27 |     await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  28 |     const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  29 |     expect(pageWidth).toBeLessThanOrEqual(390)
  30 |   })
  31 | }
  32 | 
```