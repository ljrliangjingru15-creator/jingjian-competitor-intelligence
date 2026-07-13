# Design QA

- Source visual truth: `/Users/jingru/Desktop/微信图片_20260713164438_519_183.jpg`
- Implementation: local Next.js workspace; production-preview URL pending branch push
- Intended viewport: desktop 1440 × 1100; responsive follow-up at 390 × 844
- State: dashboard landing page plus representative list/detail routes
- Implementation screenshot: unavailable

## Full-view comparison evidence

The source image was opened at original resolution and inspected. Its defining system is a black outer canvas, warm off-white product surfaces, low-saturation lavender and pale acid-yellow accents, monospaced editorial display type, thin dark outlines, restrained corner radii, and almost-flat elevation.

The implementation has been rebuilt around those tokens while preserving the existing dashboard information architecture and workflows. ESLint, TypeScript, unit tests, and a full Next.js production build pass. The sandbox does not permit binding a local web server (`listen EPERM`), so a rendered implementation screenshot cannot be captured until the branch is pushed and Vercel creates a Preview Deployment. No generated or indirect image has been substituted as browser evidence.

## Focused region comparison evidence

Blocked pending a deployable preview. The next visual pass must inspect:

- black shell, warm-white workspace inset, and header density;
- active lavender navigation state and pale-yellow hover/status states;
- dashboard hero typography, highlight treatment, and CTA contrast;
- KPI grid, form controls, tables, review panels, and competitor insight cards;
- desktop navigation wrapping at 1240px;
- mobile navigation overflow and two-column collapse at 390px.

## Findings

- [P1] Rendered fidelity cannot yet be compared against the new reference.
  - Location: all redesigned routes.
  - Evidence: source image is available; local server startup is denied by the execution sandbox and no new Preview Deployment exists yet.
  - Impact: line wrapping, browser font rendering, content overflow, and responsive polish cannot be certified from code/build output alone.
  - Fix: push `codex/avenia-editorial-ui`, open its stable Vercel Preview, and capture the dashboard plus one dense route on desktop and mobile.

## Required fidelity surfaces

- Fonts and typography: implemented with a system monospaced stack for headings, navigation, labels, and data, while retaining a readable sans stack for body copy; rendered fidelity not yet verified.
- Spacing and layout rhythm: large decorative bubbles and heavy pastel elevation were replaced with compact 5–12px radii, thin outlines, measured gutters, and a dark-frame/light-workspace composition.
- Colors and visual tokens: primary black `#0A0A0A`, warm off-white `#F4EFEB` / `#FFFAF6`, lavender `#C9C8FF`, pale acid yellow `#EFF2A3`, and muted violet `#7771D8` are mapped across the product.
- Image quality and asset fidelity: the reference was used as a visual-system source, not copied as a landing-page composition; no third-party logo or product render was introduced.
- Copy and content: existing material submission, review, monitoring, competitor analysis, and reporting workflows remain intact.

## Comparison history

- Iteration 1: new reference analyzed and global visual tokens replaced.
- Iteration 2: header, hero, cards, forms, lists, monitoring, competitor profiles, reports, settings, modals, and mobile overrides aligned to the new editorial fintech system.
- Iteration 3: heading action contrast corrected; lint, typecheck, tests, and production build passed.
- Iteration 4: local visual capture attempted; blocked by sandbox port-binding restriction. Awaiting Preview Deployment.

## Implementation checklist

- Push `codex/avenia-editorial-ui` and wait for Vercel Preview.
- Capture dashboard at 1440 × 1100.
- Capture dashboard and competitor profile at 390 × 844.
- Verify navigation, primary actions, dense tables, drawers, and route transitions.
- Fix any P0/P1/P2 visual findings and repeat comparison.

final result: blocked
