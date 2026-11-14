# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timeline.spec.ts >> staff creates a booking from an empty timeline cell
- Location: e2e\timeline.spec.ts:4:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - region "System alerts" [ref=f1e4]:
    - link "Open breakdown incidents need attention. 1 Open incident" [ref=f1e5] [cursor=pointer]:
      - /url: /admin/incidents
      - text: Open breakdown incidents need attention.
      - generic [ref=f1e9]: "1"
      - generic [ref=f1e10]: Open incident
  - generic [ref=f1e11]:
    - complementary [ref=f1e12]:
      - link "AutoHire KE" [ref=f1e13] [cursor=pointer]:
        - /url: /admin
      - navigation "Staff navigation" [ref=f1e19]:
        - link "Dashboard" [ref=f1e20] [cursor=pointer]:
          - /url: /admin
        - link "Fleet" [ref=f1e25] [cursor=pointer]:
          - /url: /admin/vehicles
        - link "Bookings" [ref=f1e30] [cursor=pointer]:
          - /url: /admin/bookings
        - link "Approvals" [ref=f1e35] [cursor=pointer]:
          - /url: /admin/approvals
        - link "Handover" [ref=f1e40] [cursor=pointer]:
          - /url: /admin/handover
        - link "Timeline" [ref=f1e45] [cursor=pointer]:
          - /url: /admin/timeline
        - link "Drivers" [ref=f1e49] [cursor=pointer]:
          - /url: /admin/drivers
        - link "Mechanics" [ref=f1e56] [cursor=pointer]:
          - /url: /admin/mechanics
        - link "Incidents" [ref=f1e60] [cursor=pointer]:
          - /url: /admin/incidents
        - link "Staff" [ref=f1e64] [cursor=pointer]:
          - /url: /admin/staff
      - button "Sign out" [ref=f1e71] [cursor=pointer]
    - generic [ref=f1e76]:
      - banner [ref=f1e77]:
        - generic [ref=f1e78]:
          - button "Collapse sidebar" [ref=f1e79] [cursor=pointer]
          - heading "Timeline" [level=1] [ref=f1e82]
        - generic [ref=f1e83]:
          - button "Search fleet, bookings and customers Ctrl K" [ref=f1e84] [cursor=pointer]:
            - generic [ref=f1e88]: Search fleet, bookings and customers
            - generic [ref=f1e89]: Ctrl K
          - generic [ref=f1e90]:
            - button "Notifications 4" [ref=f1e91] [cursor=pointer]
            - generic "4" [ref=f1e95]
          - button "Dark" [ref=f1e96] [cursor=pointer]
          - button "Brian Otieno" [ref=f1e100] [cursor=pointer]:
            - generic [aria-hidden] [ref=f1e101]: B
      - main [ref=f1e103]:
        - generic [ref=f1e104]:
          - generic [ref=f1e105]:
            - generic [ref=f1e106]:
              - paragraph [ref=f1e107]: Fleet operations
              - heading "Fleet timeline" [level=1] [ref=f1e108]
              - paragraph [ref=f1e109]: Bookings, turnaround time and maintenance by vehicle.
            - group "Timeline range" [ref=f1e110]:
              - button "7 days" [pressed] [ref=f1e111] [cursor=pointer]
              - button "30 days" [ref=f1e114] [cursor=pointer]
          - generic "Booking status legend" [ref=f1e117]:
            - generic [ref=f1e118]: Reserved
            - generic [ref=f1e120]: Confirmed
            - generic [ref=f1e122]: Checked out
            - generic [ref=f1e124]: Overdue
            - generic [ref=f1e126]: Turnaround buffer
            - generic [ref=f1e128]: Maintenance
          - group [ref=f1e132]:
            - generic "Keyboard-accessible bookings and vehicle actions" [ref=f1e133] [cursor=pointer]
          - generic [ref=f1e135]:
            - generic [ref=f1e136]:
              - generic [ref=f1e137]: Vehicle
              - generic [ref=f1e139]:
                - generic [ref=f1e140]: November 2026
                - generic [ref=f1e143]:
                  - generic [ref=f1e144] [cursor=pointer]: Sunday, November 8, 2026
                  - generic [ref=f1e146] [cursor=pointer]: Monday, November 9, 2026
                  - generic [ref=f1e148] [cursor=pointer]: Tuesday, November 10, 2026
                  - generic [ref=f1e150] [cursor=pointer]: Wednesday, November 11, 2026
                  - generic [ref=f1e152] [cursor=pointer]: Thursday, November 12, 2026
                  - generic [ref=f1e154] [cursor=pointer]: Friday, November 13, 2026
                  - generic [ref=f1e156] [cursor=pointer]: Saturday, November 14, 2026
                  - generic [ref=f1e158] [cursor=pointer]: Sunday, November 15, 2026
                  - generic [ref=f1e160] [cursor=pointer]: Monday, November 16, 2026
                  - generic [ref=f1e162] [cursor=pointer]: Tuesday, November 17, 2026
                  - generic [ref=f1e164] [cursor=pointer]: Wednesday, November 18, 2026
                  - generic [ref=f1e166] [cursor=pointer]: Thursday, November 19, 2026
                  - generic [ref=f1e168] [cursor=pointer]: Friday, November 20, 2026
                  - generic [ref=f1e170] [cursor=pointer]: Saturday, November 21, 2026
                  - generic [ref=f1e172] [cursor=pointer]: Sunday, November 22, 2026
                  - generic [ref=f1e174] [cursor=pointer]: Monday, November 23, 2026
                  - generic [ref=f1e176] [cursor=pointer]: Tuesday, November 24, 2026
                  - generic [ref=f1e178] [cursor=pointer]: Wednesday, November 25, 2026
                  - generic [ref=f1e180] [cursor=pointer]: Thursday, November 26, 2026
                  - generic [ref=f1e182] [cursor=pointer]: Friday, November 27, 2026
                  - generic [ref=f1e184] [cursor=pointer]: Saturday, November 28, 2026
            - generic [ref=f1e186]:
              - generic [ref=f1e188]:
                - generic [ref=f1e190]:
                  - strong [ref=f1e191]: KDA 101A
                  - generic: Toyota Prado TX
                - generic [ref=f1e193]:
                  - strong [ref=f1e194]: KDB 202B
                  - generic: Toyota Axio
                - generic [ref=f1e196]:
                  - strong [ref=f1e197]: KDC 303C
                  - generic: Nissan X-Trail
                - generic [ref=f1e199]:
                  - strong [ref=f1e200]: KDD 404D
                  - generic: Toyota Noah
                - generic [ref=f1e202]:
                  - strong [ref=f1e203]: KDE 505E
                  - generic: Mazda Demio
                - generic [ref=f1e205]:
                  - strong [ref=f1e206]: KDF 606F
                  - generic: Toyota RAV4
                - generic [ref=f1e208]:
                  - strong [ref=f1e209]: KDG 707G
                  - generic: Subaru Forester
                - generic [ref=f1e211]:
                  - strong [ref=f1e212]: KDH 808H
                  - generic: Toyota Hiace
                - generic [ref=f1e214]:
                  - strong [ref=f1e215]: KDJ 909J
                  - generic: Toyota Land Cruiser V8
                - generic [ref=f1e217]:
                  - strong [ref=f1e218]: KDK 010K
                  - generic: Honda Fit
                - generic [ref=f1e220]:
                  - strong [ref=f1e221]: KDL 111L
                  - generic: Mazda CX-5
                - generic [ref=f1e223]:
                  - strong [ref=f1e224]: KDM 212M
                  - generic: Toyota Fielder
              - generic [ref=f1e226]:
                - generic:
                  - generic "BK-2611-0021" [ref=f1e240] [cursor=pointer]
                  - generic [ref=f1e242] [cursor=pointer]
                  - generic "BK-2611-0015" [ref=f1e244] [cursor=pointer]
                  - generic [ref=f1e246] [cursor=pointer]
                  - generic "BK-2611-0016" [ref=f1e248] [cursor=pointer]
                  - generic [ref=f1e250] [cursor=pointer]
                  - generic "OVERDUE · BK-2611-0017" [ref=f1e252] [cursor=pointer]
                  - generic [ref=f1e254] [cursor=pointer]
                  - generic "BK-2611-0018" [ref=f1e256] [cursor=pointer]
                  - generic [ref=f1e258] [cursor=pointer]
                  - generic "BK-2611-0019" [ref=f1e260] [cursor=pointer]
                  - generic [ref=f1e262] [cursor=pointer]
                  - generic "BK-2611-0020" [ref=f1e264] [cursor=pointer]
                  - generic [ref=f1e266] [cursor=pointer]
                  - generic "Maintenance · Scheduled service" [ref=f1e268] [cursor=pointer]
                  - generic "Maintenance · Inspection and repairs" [ref=f1e270] [cursor=pointer]
                  - generic "IMMOBILISING · SOS-101" [ref=f1e272] [cursor=pointer]
          - dialog "BK-2611-0021" [ref=f1e275]:
            - generic [ref=f1e276]:
              - heading "BK-2611-0021" [level=2] [ref=f1e277]
              - button "Cancel" [active] [ref=f1e278] [cursor=pointer]
            - generic [ref=f1e282]:
              - generic [ref=f1e283]: reserved
              - generic [ref=f1e284]:
                - generic [ref=f1e285]:
                  - term [ref=f1e286]: Customer
                  - definition [ref=f1e287]: Timeline Test Customer
                - generic [ref=f1e288]:
                  - term [ref=f1e289]: Vehicle
                  - definition [ref=f1e290]: KDA 101A
                - generic [ref=f1e291]:
                  - term [ref=f1e292]: Pickup
                  - definition [ref=f1e293]: 18 Nov 2026, 02:15
                - generic [ref=f1e294]:
                  - term [ref=f1e295]: Return
                  - definition [ref=f1e296]: 19 Nov 2026, 02:15
                - generic [ref=f1e297]:
                  - term [ref=f1e298]: Amount
                  - definition [ref=f1e299]: KES 20,880
              - link "Open booking" [ref=f1e300] [cursor=pointer]:
                - /url: /admin/bookings/booking-21
```