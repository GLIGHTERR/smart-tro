# Home review evidence

`home-multiple-active-contracts-375x812.png` is the initial Chrome web capture at 375 x 812 using the preview-only mock auth fixture.

`home-fixed-multiple-375x812.png` validates the corrected full-screen Home shell: managed icons, bootstrap typography, continuous gradient, no bottom tab bar, and no normal-state refresh CTA.

The deployed GitHub Pages preview enables non-sensitive fixtures without rebuilding or signing in:

- `?home=none`
- `?home=single` (the default)
- `?home=multiple`
- `?home=error`

Android validation exported successfully with the same scenario using `npx expo export --platform android`; the generated Hermes bundle is not committed.
