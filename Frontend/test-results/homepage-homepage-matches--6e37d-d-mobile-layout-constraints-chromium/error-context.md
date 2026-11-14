# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: homepage.spec.ts >> homepage matches desktop and mobile layout constraints
- Location: e2e\homepage.spec.ts:4:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.evaluate: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('body')

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - generic [ref=f1e5]:
      - link "AutoHire KE" [ref=f1e6] [cursor=pointer]:
        - /url: /
      - link "Need help? +254 700 123 456" [ref=f1e12] [cursor=pointer]:
        - /url: tel:254700123456
      - generic [ref=f1e16]:
        - generic [ref=f1e17]: Language
        - combobox "Language" [ref=f1e18]:
          - option "English" [selected]
          - option "Kiswahili"
      - button "Open navigation menu" [ref=f1e19]
  - main [ref=f1e21]:
    - generic [ref=f1e22]:
      - region "Experience the road like never before" [ref=f1e23]:
        - generic [ref=f1e24]:
          - heading "Experience the road like never before" [level=1] [ref=f1e25]
          - paragraph [ref=f1e26]: Find a car that fits your plans, then enjoy a smoother way to get there.
          - link "View all cars" [ref=f1e27] [cursor=pointer]:
            - /url: /vehicles
        - generic [ref=f1e28]:
          - heading "Book your car" [level=2] [ref=f1e29]
          - generic [ref=f1e30]:
            - generic [ref=f1e31]: Car type
            - combobox "Car type" [ref=f1e32]:
              - option "Choose a car type" [selected]
              - option "SUV"
              - option "Sedan"
              - option "Van"
          - generic [ref=f1e33]:
            - generic [ref=f1e34]: Place of rental
            - textbox "Place of rental" [ref=f1e35]:
              - /placeholder: Where will you pick up?
          - generic [ref=f1e36]:
            - generic [ref=f1e37]: Place of return
            - textbox "Place of return" [ref=f1e38]:
              - /placeholder: Where will you return?
          - generic [ref=f1e39]:
            - generic [ref=f1e40]: Rental date and time (EAT)
            - textbox "Rental date and time (EAT)" [ref=f1e41]
          - generic [ref=f1e42]:
            - generic [ref=f1e43]: Return date and time (EAT)
            - textbox "Return date and time (EAT)" [ref=f1e44]
          - button "Book now" [ref=f1e45] [cursor=pointer]
      - region "Why travel with AutoHire KE" [ref=f1e46]:
        - article [ref=f1e47]:
          - heading "Availability" [level=2] [ref=f1e51]
          - paragraph [ref=f1e52]: Choose from vehicles ready for your dates and destination.
        - article [ref=f1e53]:
          - heading "Comfort" [level=2] [ref=f1e57]
          - paragraph [ref=f1e58]: Make every journey easier with a car that suits your plans.
        - article [ref=f1e59]:
          - heading "Savings" [level=2] [ref=f1e63]
          - paragraph [ref=f1e64]: Clear daily rates help you plan your trip with confidence.
      - generic [ref=f1e65]:
        - img "Journey photo coming soon" [ref=f1e66]
        - generic [ref=f1e71]:
          - heading "How it works" [level=2] [ref=f1e72]
          - list [ref=f1e73]:
            - listitem [ref=f1e74]:
              - generic [aria-hidden] [ref=f1e75]: "1"
              - generic [ref=f1e76]:
                - heading "Search dates" [level=3] [ref=f1e77]
                - paragraph [ref=f1e78]: Choose when and where you need your car.
            - listitem [ref=f1e79]:
              - generic [aria-hidden] [ref=f1e80]: "2"
              - generic [ref=f1e81]:
                - heading "Choose a car" [level=3] [ref=f1e82]
                - paragraph [ref=f1e83]: Compare the available vehicles and pick your fit.
            - listitem [ref=f1e84]:
              - generic [aria-hidden] [ref=f1e85]: "3"
              - generic [ref=f1e86]:
                - heading "Reserve and pay with M-Pesa" [level=3] [ref=f1e87]
                - paragraph [ref=f1e88]: Confirm the booking and complete payment securely.
            - listitem [ref=f1e89]:
              - generic [aria-hidden] [ref=f1e90]: "4"
              - generic [ref=f1e91]:
                - heading "Pick up" [level=3] [ref=f1e92]
                - paragraph [ref=f1e93]: Meet the team at your selected pickup location.
      - region "Choose the car that suits you" [ref=f1e94]:
        - generic [ref=f1e95]:
          - heading "Choose the car that suits you" [level=2] [ref=f1e96]
          - link "View all" [ref=f1e97] [cursor=pointer]:
            - /url: /vehicles
        - generic [ref=f1e100]:
          - article [ref=f1e101]:
            - img "Vehicle photo coming soon" [ref=f1e102]
            - generic [ref=f1e107]:
              - generic [ref=f1e108]:
                - heading "Toyota Prado TX" [level=3] [ref=f1e109]
                - generic [ref=f1e110]: SUV
              - strong [ref=f1e111]:
                - text: KES 18,000
                - generic [ref=f1e112]: per day
            - generic [ref=f1e113]:
              - generic [ref=f1e114]: 7 seats
              - generic [ref=f1e118]: Automatic
            - link "View details" [ref=f1e119] [cursor=pointer]:
              - /url: /vehicles/car-01
          - article [ref=f1e122]:
            - img "Vehicle photo coming soon" [ref=f1e123]
            - generic [ref=f1e128]:
              - generic [ref=f1e129]:
                - heading "Nissan X-Trail" [level=3] [ref=f1e130]
                - generic [ref=f1e131]: SUV
              - strong [ref=f1e132]:
                - text: KES 14,000
                - generic [ref=f1e133]: per day
            - generic [ref=f1e134]:
              - generic [ref=f1e135]: 7 seats
              - generic [ref=f1e139]: Automatic
            - link "View details" [ref=f1e140] [cursor=pointer]:
              - /url: /vehicles/car-03
          - article [ref=f1e143]:
            - img "Vehicle photo coming soon" [ref=f1e144]
            - generic [ref=f1e149]:
              - generic [ref=f1e150]:
                - heading "Toyota Noah" [level=3] [ref=f1e151]
                - generic [ref=f1e152]: Van
              - strong [ref=f1e153]:
                - text: KES 12,000
                - generic [ref=f1e154]: per day
            - generic [ref=f1e155]:
              - generic [ref=f1e156]: 8 seats
              - generic [ref=f1e160]: Automatic
            - link "View details" [ref=f1e161] [cursor=pointer]:
              - /url: /vehicles/car-04
          - article [ref=f1e164]:
            - img "Vehicle photo coming soon" [ref=f1e165]
            - generic [ref=f1e170]:
              - generic [ref=f1e171]:
                - heading "Toyota RAV4" [level=3] [ref=f1e172]
                - generic [ref=f1e173]: SUV
              - strong [ref=f1e174]:
                - text: KES 11,000
                - generic [ref=f1e175]: per day
            - generic [ref=f1e176]:
              - generic [ref=f1e177]: 5 seats
              - generic [ref=f1e181]: Automatic
            - link "View details" [ref=f1e182] [cursor=pointer]:
              - /url: /vehicles/car-06
          - article [ref=f1e185]:
            - img "Vehicle photo coming soon" [ref=f1e186]
            - generic [ref=f1e191]:
              - generic [ref=f1e192]:
                - heading "Toyota Hiace" [level=3] [ref=f1e193]
                - generic [ref=f1e194]: Van
              - strong [ref=f1e195]:
                - text: KES 16,000
                - generic [ref=f1e196]: per day
            - generic [ref=f1e197]:
              - generic [ref=f1e198]: 14 seats
              - generic [ref=f1e202]: Manual
            - link "View details" [ref=f1e203] [cursor=pointer]:
              - /url: /vehicles/car-08
          - article [ref=f1e206]:
            - img "Vehicle photo coming soon" [ref=f1e207]
            - generic [ref=f1e212]:
              - generic [ref=f1e213]:
                - heading "Toyota Land Cruiser V8" [level=3] [ref=f1e214]
                - generic [ref=f1e215]: SUV
              - strong [ref=f1e216]:
                - text: KES 28,000
                - generic [ref=f1e217]: per day
            - generic [ref=f1e218]:
              - generic [ref=f1e219]: 7 seats
              - generic [ref=f1e223]: Automatic
            - link "View details" [ref=f1e224] [cursor=pointer]:
              - /url: /vehicles/car-09
      - region "Facts in numbers" [ref=f1e227]:
        - generic [ref=f1e228]:
          - heading "Facts in numbers" [level=2] [ref=f1e229]
          - paragraph [ref=f1e230]: A fleet and service built around the way you travel.
        - generic [ref=f1e231]:
          - article [ref=f1e232]:
            - strong [ref=f1e237]: 540+
            - generic [ref=f1e238]: Cars
          - article [ref=f1e239]:
            - strong [ref=f1e244]: 20k+
            - generic [ref=f1e245]: Customers
          - article [ref=f1e246]:
            - strong [ref=f1e250]: 25+
            - generic [ref=f1e251]: Years
          - article [ref=f1e252]:
            - strong [ref=f1e256]: 20m+
            - generic [ref=f1e257]: Miles
      - generic [ref=f1e259]:
        - heading "Enjoy every mile" [level=2] [ref=f1e260]
        - paragraph [ref=f1e261]: Start with the place you want to explore.
        - generic [ref=f1e262]:
          - generic [ref=f1e263]: City
          - textbox "City" [ref=f1e264]:
            - /placeholder: Enter a city
          - button "Search" [ref=f1e265] [cursor=pointer]
  - contentinfo [ref=f1e266]:
    - generic [ref=f1e267]:
      - generic [ref=f1e268]:
        - link "AutoHire KE" [ref=f1e269] [cursor=pointer]:
          - /url: /
        - paragraph [ref=f1e275]: Your journey, our drive.
      - generic [ref=f1e276]:
        - heading "Address" [level=2] [ref=f1e277]
        - paragraph [ref=f1e278]: Mombasa Road, Nairobi, Kenya
        - paragraph [ref=f1e283]:
          - button "Email" [ref=f1e288] [cursor=pointer]
        - paragraph [ref=f1e289]:
          - link "+254 700 123 456" [ref=f1e293] [cursor=pointer]:
            - /url: tel:254700123456
      - generic [ref=f1e294]:
        - heading "Useful links" [level=2] [ref=f1e295]
        - link "Home" [ref=f1e296] [cursor=pointer]:
          - /url: /
        - link "Vehicles" [ref=f1e297] [cursor=pointer]:
          - /url: /vehicles
        - link "About Us" [ref=f1e298] [cursor=pointer]:
          - /url: /about
        - link "Contact Us" [ref=f1e299] [cursor=pointer]:
          - /url: /contact
      - generic [ref=f1e300]:
        - heading "Vehicles" [level=2] [ref=f1e301]
        - link "SUVs" [ref=f1e302] [cursor=pointer]:
          - /url: /vehicles
        - link "Sedans" [ref=f1e303] [cursor=pointer]:
          - /url: /vehicles
        - link "Vans" [ref=f1e304] [cursor=pointer]:
          - /url: /vehicles
    - generic [ref=f1e305]:
      - generic [ref=f1e306]: © 2026 AutoHire KE. All rights reserved.
      - generic [ref=f1e307]: Your journey, our drive.
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import AxeBuilder from '@axe-core/playwright'
  3  | 
  4  | test('homepage matches desktop and mobile layout constraints', async ({ page }) => {
  5  |   for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  6  |     await page.setViewportSize(viewport)
  7  |     await page.goto('/')
  8  |     await expect(page.getByRole('heading', { name: 'Experience the road like never before', level: 1 })).toBeVisible({ timeout: 15000 })
  9  |     await expect(page.getByRole('heading', { name: 'Book your car', level: 2 })).toBeVisible()
  10 |     await expect(page.getByRole('button', { name: 'Book now' })).toBeVisible()
  11 |     await expect(page.locator('h1')).toHaveCount(1)
> 12 |     const dimensions = await page.locator('body').evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }))
     |                                                   ^ Error: locator.evaluate: Test timeout of 30000ms exceeded.
  13 |     expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client)
  14 |     expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  15 |   }
  16 | })
  17 | 
```