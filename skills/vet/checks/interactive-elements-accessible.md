---
name: Buttons and links work with a keyboard
scope: [changes, project]
applies_to: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.html", "**/*.astro"]
---

AI assistants build clickable things out of `<div>` and `<span>` far more often
than a human would, because a div accepts an `onClick` handler and looks correct
in the browser. It is not correct. A div is not focusable, does not fire on
Enter or Space, is announced to a screen reader as nothing at all, and is skipped
entirely when someone navigates by Tab. The feature demos perfectly with a mouse
and is unusable without one. This is the most common single defect in
AI-generated interfaces and it is the one with legal exposure attached, so it is
worth catching before the work leaves the person who built it.

Inspect the target for elements that behave like a button or a link but are not
one, and for interactive elements that carry no accessible name.

**Pass when**

- Every element with a click, press, or key handler is a real `<button>`,
  `<a href>`, `<input>`, `<select>`, `<textarea>`, `<summary>`, or a component
  that demonstrably renders one of those (a design-system `Button`, a router
  `Link`, a Radix/Headless UI/shadcn primitive).
- Every interactive element has an accessible name: visible text content, or
  `aria-label`, or `aria-labelledby`, or an `alt` on a sole child image, or a
  `<label>` associated with the input by `htmlFor`/`for` or by wrapping it.
- Custom interactive components that genuinely cannot use a native element carry
  the full set: an appropriate `role`, `tabIndex={0}`, and a key handler that
  responds to Enter and Space (or Enter alone, for a link role).

**Fail when**

- A `<div>`, `<span>`, `<li>`, `<td>`, `<img>`, `<svg>`, or `<p>` carries
  `onClick`, `onMouseDown`, `@click`, `on:click`, or an equivalent, and does not
  carry all of `role`, `tabIndex`, and a keyboard handler.
- An element has `role="button"` or `tabIndex={0}` but no `onKeyDown`/`onKeyUp`
  handling Enter or Space — half-migrated, still keyboard-dead.
- An icon-only button or icon-only link has no `aria-label`, no `title`, and no
  visually hidden text. A bare `<button><XIcon /></button>` is announced as
  "button" and nothing else.
- A form input, select, or textarea has no associated label and no `aria-label`.
  A `placeholder` alone is not a label — it vanishes on typing and many screen
  readers do not announce it.
- An `<a>` is used with `onClick` and no `href`, or with `href="#"`, to perform
  an in-page action. That is a button wearing a link's clothes.
- The finding was previously flagged and has been made to "pass" by adding
  `aria-hidden="true"`, `role="presentation"`, or an eslint-disable comment for
  `jsx-a11y/*` rather than by fixing the element. Suppressing the warning is a
  fail, and a worse one than the original.

**Do not flag**

- Files under any of `node_modules/`, `.next/`, `dist/`, `build/`, `out/`,
  `coverage/`, `vendor/`, `.venv/`, or any minified or generated bundle.
- Scaffolded design-system primitives the person did not write: anything under
  `components/ui/`, `components/primitives/`, `@/components/ui/`, or a directory
  whose files carry a generated-by-shadcn/Radix/DaisyUI/Chakra header comment.
  These are vendored library code. Flag the *call sites* the person wrote, not
  the primitive.
- A wrapper component that spreads props onto a native element — `<div {...props}
  onClick={onClick}>` inside a component whose consumer passes `as="button"`, or
  any component where the click handler is forwarded rather than terminal. If
  you cannot see where the handler lands, do not guess.
- Click handlers used for non-interactive purposes: an overlay/backdrop div that
  closes a modal (a keyboard user closes it with Escape — check for that instead
  and mention it only if Escape is also absent), outside-click dismissal, drag
  handles, canvas or map surfaces, analytics-only handlers that do not change
  what the user sees.
- Elements with `onMouseEnter`/`onMouseLeave` only. Hover affordances are a
  different concern and are not in scope here.
- `role="presentation"` or `aria-hidden="true"` on a decorative icon that sits
  *inside* a properly labelled button. That is the correct pattern, not a
  suppression.
- Storybook stories, test files (`*.test.*`, `*.spec.*`, `__tests__/`, `e2e/`,
  `cypress/`, `playwright/`), and fixture or mock directories.
- Email templates, generated PDF or print templates, and any `<table>`-based
  layout under an `emails/` or `templates/` directory — those have their own
  rules and no keyboard user.
- Pre-existing problems in files the change merely touched. In changes scope,
  flag only what this change introduced or moved. Pre-existing debt is the
  project scope's business.
- Third-party embed snippets pasted verbatim (Stripe, Intercom, Google Maps,
  a payment iframe). You cannot fix someone else's markup and telling the person
  to try will waste their time.
- More than three instances. Name the three clearest and say how many more of
  the same kind there are.
