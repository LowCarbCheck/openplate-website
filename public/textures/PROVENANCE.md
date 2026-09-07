# Texture provenance

## hero-rings.webp

- **Origin:** generated, not sourced. It is not a stock asset and not a
  photograph. No third party holds any right in it.
- **Model:** `google/gemini-3-pro-image-preview`, called through OpenRouter.
- **Generated on:** 2026-09-07.
- **Generated for:** this repository, `LowCarbCheck/openplate-website`.
- **Licence:** the repository licence covers it. The repository is public and
  MIT, so the file is MIT. There is no third-party licence to honour, no
  attribution to carry and no usage limit to observe.
- **Post-processing:** ImageMagick 7.1.2. Converted to greyscale, cropped to a
  hero band, tone range compressed to 28 to 96 percent luminance, scaled to
  2304 px wide, and given light Gaussian grain as a dither. Encoded as WebP at
  quality 82.

### What the file is for

It is an alpha map, not a picture. The site uses it as a CSS luminance mask,
so its brightness becomes opacity and the colour comes from the design token:

```css
background-color: hsl(var(--primary) / 0.10);
mask-image: url('/textures/hero-rings.webp');
mask-mode: luminance;
mask-size: 100% 100%;
```

The file is greyscale for that reason. One file serves the light theme and the
dark theme, and each theme tints it from its own `--primary`. Do not replace it
with a coloured image, and do not add colour to it.

### Prompt

> A pure GREYSCALE abstract texture, no colour whatsoever, monochrome
> black-and-white only. Extremely soft and out of focus. Large-scale
> overlapping concentric ring shapes and slow flowing contour bands, like a
> heavily defocused long-exposure photograph of ripples, or a topographic
> contour map with the contrast pulled almost completely flat. The whole image
> sits in a narrow band of MID GREYS, roughly 35 percent to 75 percent
> luminance, with no pure black and no pure white anywhere, and no large flat
> areas. Gentle continuous gradients, very low frequency, calm, minimal, quiet.
> Fine film grain across the entire frame to prevent banding. Absolutely no
> objects, no food, no text, no letters, no logos, no grid, no circuitry, no
> illustration style.
