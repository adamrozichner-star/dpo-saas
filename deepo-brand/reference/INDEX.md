# Deepo marketing brand kit (reference)

Supporting brand material for building the marketing site. These are REFERENCE docs, not for deployment. `CC-SPEC-marketing-site.md` is authoritative for voice, IA, pages, and copy rules; if anything here conflicts with the spec, the spec wins.

Place in `deepo-brand/reference/` (alongside the existing radar-hero reference).

| File | Use it for |
|---|---|
| `marketing-reference-he.html` | Brand-execution baseline: the radar "on guard" hero motif, dark ember-glow comparison band, icon usage, tagline. Match this language. |
| `voice.html` | Tone and voice rules. Pair with the spec's humor playbook (section 5). |
| `positioning.html` | Positioning and messaging hierarchy. |
| `brand-statements-he.html` | Approved Hebrew taglines and brand statements (e.g. "איתכם בהגנה על הפרטיות", "אתם בעסק, אנחנו על המשמר"). |
| `patterns.html` | Visual patterns: dot-grid, radar/coverage rings, ember-glow recipe. Source for the reusable RadarMotif. |
| `regulation.html` | How to talk about תיקון 13 and the regulation: plain, calm, non-fear. |
| `Brand_Foundations.html` | The consolidated brand book (color, type, logo, voice, values). One-stop reference. |
| `logo.html` | Logo lockup and clear-space rules. |
| `iconography.html` | Duotone icon usage (already ported to React at `src/brand/icons.tsx` as DeepoIcon). |
| `flyer-appraisers-voice-example.html` | A real shipped marketing flyer. The single best example of Deepo's actual marketing voice in the wild. Calibrate copy against it. |

Note: the icon set is already React (`src/brand/icons.tsx`), tokens are at `src/brand/`, warm logos at `public/brand/logos/`. Nothing here needs porting; it is context, not code.
