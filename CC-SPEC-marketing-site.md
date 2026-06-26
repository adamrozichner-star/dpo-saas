# CC BUILD SPEC: Deepo marketing site redesign (v3 warm brand, multi-page)

Paste-ready for Claude Code. Read this whole file, then run the investigation pass (section 10) before building anything.

---

## 0. What changed (read first)
This supersedes any earlier draft. Verified against the design-system project:
- The warm logo set EXISTS (logofull, logoondark, logomark, logo, logoreverse). The navy logo on the live site is stale.
- An official 15-icon duotone set exists (deepo-icons.js). Use it. Never emoji.
- An on-brand marketing reference exists: marketing-reference-he.html (the radar "on guard" hero motif, dark ember-glow comparison band, official tagline). This is the brand-execution baseline.
- A brand bundle is provided (deepo-brand-bundle/) to migrate these into dpo-saas. See Phase 0.
- Pricing follows the LIVE site, not the reference.

---

## 1. Goal
Rebuild the public marketing site (deepo.co.il) on the v3 warm brand, in the separate dpo-saas repo where the site lives. Replace the look (old navy brand), the voice (current fear-based copy violates our voice guide), and the IA. Add trust, security, press, FAQ, and partner pages.

Scope is the public marketing site ONLY. Do not touch the app (login, dashboard, DPO console, owner app).

Two references:
- marketing-reference-he.html = brand execution baseline (motif, icons, tagline, dark bands, tokens).
- The trust/security/press/partners/FAQ sections and the calmer, funnier voice are NEW on top of that baseline.

---

## 2. Hard constraints (do not violate)
1. Brand tokens are law. Use colors_and_type.css (warm crimson to amber gradient, sand surfaces, Onyx/garnet dark, Rubik/Assistant/Heebo). Never invent colors or fonts; never hardcode hex except inside ember-glow multi-stop gradients.
2. No em-dashes anywhere (code, copy, comments). Hyphen, colon, parentheses, or split sentences. En-dash only for numeric ranges.
3. "Deepo" always capital D, rest lowercase. Never DeePO or DEEPO (URLs excepted).
4. Icons: use deepo-icons.js duotone set only. Never emoji. Markup: <svg class="dpi"><use href="#dp-shield"></use></svg>.
5. Gradient is precious: logo, hero accent, one CTA per surface. Never a full-bleed body wash.
6. Dark surfaces use the ember-glow recipe from the reference (radial glow rising from a corner).
7. Voice per section 5. Calm, warm, plain, lightly funny. Never fear theater.
8. Banned marketing words per section 6.
9. Legal/responsibility framing is fixed: the human DPO carries professional and legal responsibility; Deepo is a tool that makes them fast. Never imply the software is the legal authority or guarantees compliance. Keep the footer disclaimer.
10. Calculator logic is gated on Roy. Brand shell only; wrap logic behind a placeholder with a TODO(roy-gate) comment. Do not finalize the תיקון 13 decision tree.
11. Trust names pending approval. No partner names or logos (Kreston, named experts) until cleared. Use role-based copy + a clearly-marked TrustSlot, easy to fill later.
12. Legal pages = chrome only. New header/footer/type on /privacy /terms /accessibility /cookie-policy. Do not rewrite legal text.

---

## 3. Brand fundamentals to apply
- Tagline: "איתכם בהגנה על הפרטיות". Closing line motif: "אתם בעסק, אנחנו על המשמר."
- Values order (let copy reflect this priority): 1 שומרים עליכם, 2 פשטות, 3 תמחור הוגן, 4 פרואקטיביות, 5 AI ייעודי. AI is the tool, never the hero.
- Signature visual: the radar/coverage rings ("on guard") motif in the hero, per the reference. Reuse it as the recurring brand device.
- Logo usage: logofull.png on light, logoondark.png on dark, logomark.png for header lockup + favicon source. Replace the navy logo everywhere.

Feature-to-icon map (use these, not emoji):
- Human DPO -> dp-seal or dp-shield
- Documents -> dp-doc
- AI chat / agents -> dp-sparkle
- Monitoring / reminders -> dp-bell
- Compliance score / coverage -> dp-radar or dp-shield
- Audit log -> dp-database
- Security / data -> dp-lock
- Vendors / links -> dp-link
- Verticals -> dp-health, dp-finance, dp-education

---

## 4. Information architecture
Multi-page. Shared header + footer everywhere. RTL, dir="rtl", lang="he", logo top-right.

Top nav (RTL): המוצר . מחירים . לרואי חשבון . מי אנחנו  + primary CTA "התחילו" + quiet "התחברות".

Pages:
- / Home
- /product המוצר
- /pricing מחירים
- /partners לרואי חשבון ושותפים (channel landing; highest-leverage new page)
- /about מי אנחנו (story + experts role-based + press strip)
- /security אבטחת מידע (NEW, section 8)
- /press בתקשורת (NEW, section 8)
- /faq שאלות ותשובות (NEW page + sections, section 8)
- /calculator בדיקת חובת DPO (brand shell, gated)
- /lead-signup התחלה (funny, low-friction onboarding microcopy)
- /contact צרו קשר
- /privacy /terms /accessibility /cookie-policy (chrome only)

Footer groups: ניווט (Product, Pricing, Partners, About) . מידע (Security, Press, FAQ, Contact) . משפטי (Privacy, Terms, Accessibility, Cookies) + disclaimer line.

---

## 5. Voice and copy playbook (the engine)
Blend our brand voice (calm, clear, a warm champion who fights exposure FOR the customer) with iCount-style Hebrew wit. Synthesis: the core promise stays clear and competent; humor lives in the seams (eyebrows, subheads, parenthetical asides, button microcopy, empty/success states, footnotes, tooltips).

Five humor moves (seasoning, not the meal):
1. Parenthetical aside that undercuts the formal line: "הכול מנוהל ברקע (כן, גם בזמן שאתם ישנים. אתם, לא אנחנו)."
2. Self-correction footnote: "יש דברים שכל עסק צריך. סליחה, חייב לפי החוק."
3. Cheeky question as CTA: "שנסדר לכם את זה?" over "צור קשר".
4. Plain-talk reframe of a scary thing: "תיקון 13 נשמע כמו קוד טילים. זו בעצם רשימת דברים מסודרים שצריך לעשות, ואנחנו עושים אותם."
5. Light exaggeration for warmth, never for fear: "חמש דקות. פחות זמן ממה שלוקח להסביר לאמא מה זה DPO."

Rules:
- One joke per section, max. The value sentence reads fully if the parenthetical is removed.
- Never joke at the customer's expense; never inflate a real risk for effect. We defuse tension.
- Security and legal pages: one warm line is the ceiling. Competence first.

Before/after calibration (rewrites of current live copy):
- "האכיפה כבר התחילה, קנסות עד 3.2 מיליון" -> "כן, יש אכיפה ויש קנסות. לא נפרט אותם פה כדי להלחיץ. נפרט מה צריך לעשות כדי להיות בצד הנכון."
- "70% מהעסקים לא עומדים בדרישות" -> "רוב העסקים בישראל עוד לא מסודרים מול תיקון 13. זה לא אסון, זו רשימת מטלות. בואו נסמן וי."
- CTA "בחירת חבילה" -> "יאללה, מתחילים" or "זה מתאים לי".

---

## 6. Banned marketing words and replacements
Applies to marketing + onboarding copy. NOT to legal pages or legally-precise terms (e.g. the real document name "מסמך הגדרות מאגר").
- "מערכת" -> "Deepo", "השירות", "זה", or drop ("המערכת שלנו תייצר" -> "Deepo מכין לכם")
- "רשומות"/"רשומה" -> "מידע על אנשים", "פרטים", "לקוחות"
- "מאגר מידע" in casual marketing -> "המידע שאתם שומרים", "פרטי הלקוחות שלכם" (keep legal term only where precise)
- "ממשק" -> "מסך", "דף", or drop
- "פלטפורמה" -> "Deepo", "השירות"
- "תשתית"/"ארכיטקטורה"/"מודול"/dev jargon -> drop; say what the person gets
Add a grep check for these in verification.

---

## 7. Shared layer to build first (one PR, after Phase 0)
1. Token source wired (colors_and_type.css / styles.css from the bundle).
2. SiteHeader: logo (logomark + wordmark or logofull), nav (section 4), CTA + login, mobile menu, sticky + blur (see reference .nav).
3. SiteFooter: three groups + disclaimer.
4. Icon loader: port deepo-icons.js so <svg class="dpi"><use href="#dp-*"></use></svg> works in Next (client effect or React components).
5. Primitives matching the reference + prototype: Button (grad / primary / secondary / ghost-dark), Eyebrow, SectionHead, Card, Badge/Pill, RadarMotif (reusable), TrustSlot (dashed placeholder for future partner names/logos).
6. RTL at layout level, reduced-motion respected, visible keyboard focus on all interactive elements.
Verify the shared layer on a throwaway page before pages.

---

## 8. New pages, detailed
### /security אבטחת מידע
Reassuring and competent, minimal humor. Sections: hero ("המידע שלכם, שמור.") + one warm line; principles (data minimization: we do not store your end-customers' personal details; clear access roles; sysadmin and vendor links expose nothing sensitive; full audit trail; Israeli-law-native); practices (encrypted storage, least-privilege access, append-only event log, human review on uncertainty, incident handling with a clear reporting window); a "what we will never do" honesty block; TrustSlot for future certifications. State only what is TRUE for our stack (no subject PII in primary DB, RLS-scoped reads, append-only events, tokenized no-login links). Do not claim certifications we do not hold. Leave TODO(security-review) for Roy/Amir wording sign-off.

### /press בתקשורת
PressItem component (outlet logo slot, headline, date, blurb, link). On-brand funny empty state so it never looks broken: "עוד לא כתבו עלינו? תנו לזה רגע. בינתיים, אתם מוזמנים להיות הראשונים שמספרים עלינו." Home press strip slot, hidden until at least one item. Items come from a simple config array so non-devs can add later.

### /faq שאלות ותשובות
FAQ in three places: Home section, Pricing section (pricing-specific), full /faq page. Reuse accordion from the prototype. Seed with the 5 current questions rewritten in the new voice, plus: "האם זה מחליף עורך דין?", "מה אתם עושים עם המידע שלי?" (link /security), "אני רואה חשבון, איך זה עובד עבור הלקוחות שלי?" (link /partners).

### /partners לרואי חשבון ושותפים
Channel landing. Explain how an accountant offers Deepo to clients, the value to the accountant (new recurring line, clients stay compliant, less manual work), how it works for them, and a "become a partner" CTA. Use "שותפי הפצה", never "שותף מייסד" (implies equity).

---

## 9. Per-page section outlines (match the reference rhythm)
- Home: radar hero (signature motif + dashboard/score preview + tagline + dual CTA) -> calculator section (the 3-question DPO check as its own band right below hero) -> trust strip (roles) -> what you get (feature cards, real icons) -> how it works (4 steps) -> experts (role-based + TrustSlot) -> responsibility band ("התוכנה לא מחליפה אדם, היא מאיצה אותו") -> security teaser (link /security) -> pricing -> testimonials slot -> FAQ -> press strip (hidden if empty) -> final CTA -> footer.
- /product: hero ("כל מה שתיקון 13 דורש, קורה מעצמו") -> the loop in plain words (we find what you need, collect it, close it, keep it fresh, prove it) -> the four people Deepo serves (DPO full view, owner light app, sysadmin no-login link, vendor no-login link) framed as "מי נוגע במה, בלי כאב ראש" -> feature deep-dive -> responsibility -> CTA.
- /pricing: comparison table + plans + add-ons (DPIA, legal opinion, training, audit, incident support) + pricing FAQ + CTA. Pricing per section 11.
- /about: warm-champion story, mission, experts, press strip, CTA.
- /contact: cheeky header ("שנדבר?"), minimal fields, clear next step.
- /calculator: expanded brand shell of the 3-question check; logic gated (2.10).
- /lead-signup: funny low-friction onboarding microcopy across steps, reassuring progress, personality in empty/success states, minimal fields.

---

## 10. How to work (CC discipline)
1. Investigate first, do not build. Report: dpo-saas marketing structure (App Router? marketing dir? shared layout?), where styles live, WHETHER the warm bundle assets are already present (this answers the open access question), current implementation of home/calculator/pricing/legal, and how the live navy logo is referenced. Confirm bundle destination paths. Propose build order + shared-component list. Stop for Adam's review.
2. Phase 0: migrate the brand bundle into dpo-saas (tokens, logos, deepo-icons, swap navy logo references). One PR. Skip only if investigation shows assets already present and current. Verify, stop.
3. Shared layer (section 7). One PR. Verify, stop.
4. Pages, one PR per page or tight group: (a) Home, (b) Product + Pricing, (c) Partners + About, (d) Security + Press + FAQ, (e) Calculator shell + Contact, (f) Lead-signup, (g) Legal chrome.
5. Per-PR verification, all must pass before commit:
   - npx tsc --noEmit clean.
   - Headless Chromium render of each new/changed page with behavioral assertions: renders, header/footer present, nav resolves, FAQ accordion opens, calculator chips select, icons inline correctly (no raw <use> left, no emoji), no console errors.
   - RTL correct, responsive to mobile, visible keyboard focus, reduced-motion respected.
   - Copy greps: zero em-dashes, no banned words (section 6) in marketing copy, "Deepo" casing correct.
   - Contrast check on text over gradient/dark surfaces.
6. CC commits, does not push. Adam approves, then push + PR + merge (--merge, no squash), sync main, tsc, delete branch.
7. Log new lessons in tasks/lessons.md. No time budgets in prompts.

---

## 11. Pricing (per live site, this pass)
Use the live tiers, not the reference's 500/1000:
- בסיסי: 1,000 ש"ח / חודש (self-serve, no DPO)
- מומלצת: 1,499 ש"ח / חודש (includes appointed human DPO)
- פרימיום: 7,500 ש"ח / חודש (complex orgs)
- ארגוני: בהתאמה (multi-entity, SLA)
Keep the comparison vs classic DPO (about 85% less, year one). Flag to Adam that the design-system reference still shows old pricing; that is a separate cleanup.

---

## 12. Open flags
- Asset availability in dpo-saas: resolved by the investigation pass (10.1).
- Calculator decision tree: gated on Roy (2.10).
- Security page wording: needs Roy/Amir review (8).
- Partner names/logos: pending Adam's clearance (2.11).
- Press items + testimonials: real content pending; ship on-brand empty states.
- Design-system marketing reference pricing: stale (500/1000); separate fix.
