# Real-phone pilot checklist

Run this checklist on a real Android or iOS phone before tagging a release. This repository cannot verify a physical device or mobile carrier network.

## Setup

1. Deploy the pilot build to a reachable HTTPS environment with the backend or documented MSW demo enabled.
2. Use a phone with a current supported browser and a real Kenyan mobile number.
3. Use a network throttle or a weak cellular connection. Record device, OS/browser, network type, and build revision.

## Checks

- [ ] Header language selector changes public navigation and About/Contact headings to Kiswahili and back to English.
- [ ] At 390 CSS pixels, Home, Vehicles, Vehicle details, About, Contact, Checkout, and confirmation have no horizontal page overflow.
- [ ] Submit a contact message and verify validation, success, network failure, honeypot, and rate-limit states.
- [ ] Search for a vehicle, reserve it, and verify dates and price remain correct through guest checkout.
- [ ] Upload a licence photo over cellular. Confirm the form remains usable while uploading and that invalid type/size is rejected.
- [ ] Complete an M-Pesa STK request, confirm the phone display is masked, and verify the booking stays unconfirmed until the server returns a confirmed payment.
- [ ] On the waiting state, background the browser briefly and return; verify payment status resumes safely.
- [ ] Test an expired hold and an invalid or expired manage-booking token. Verify no unrelated customer details are shown.
- [ ] Verify keyboard focus and screen-reader labels in checkout controls and any open dialog/drawer.
- [ ] Repeat a primary public flow using the slowest available network and record load time and any failed requests.

Record pass/fail, evidence, and defects beside each item. A release owner must complete and sign off this checklist; automated browser tests are not a substitute.
