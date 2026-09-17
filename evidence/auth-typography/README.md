# Auth typography correction evidence

> Historical evidence for the Poppins correction merged in PR #7. The application subsequently adopted **Be Vietnam Pro 400/600** as the approved typography. The current source and the root `README.md` are authoritative; the screenshots and computed styles in this folder are retained only as the before-migration record.

Captured at 375x812 from the review-enabled Expo Web build based on merge SHA `4ab31c44fa71ef33ae4b78167b9a829f48ef31ad`.

- Before images: `../auth-visual/*-375x812.png`
- After images: `after-*-375x812.png`
- Side-by-side summary: `before-after-375x812.png`
- Runtime computed styles: `computed-typography.json`

Typography mapping:

- Title: Poppins SemiBold (600), 48px
- Input and placeholder: Poppins Light (300), 15px
- CTA, separator, social labels: Poppins Bold (700)
- Links: Poppins Bold (700), 12px
- Secondary and helper text: Poppins Regular (400)

No spacing changes were needed: the corrected title remains inside its existing header box, and field, link, and social-label positions retain the established layout rhythm.
