# Dashboard UI Kit

Status: accepted

AOHYS uses a Dashboard UI Kit module for private dashboard workflow composition, with shadcn/ui treated as a primitive adapter rather than the dashboard interface. This is deliberate because the private dashboard will span leads, content, media, site settings, and resume workflows; letting each route compose raw primitives directly would make mobile behavior, accessibility, state handling, and publishing invariants shallow and inconsistent.

## Considered Options

- Route files compose shadcn/ui primitives directly: fast initially, but workflow states, mobile behavior, forms, tables, and empty/error handling would duplicate across routes.
- Build custom primitives from scratch: maximum control, but unnecessary because shadcn/ui already provides accessible source primitives.
- Dashboard UI Kit over shadcn/ui: more upfront structure, but it gives dashboard routes a stable seam while preserving shadcn/ui as editable source implementation.

## Consequences

- Dashboard route modules should consume workflow surfaces from the Dashboard UI Kit instead of reaching for primitive UI everywhere.
- shadcn/ui should be installed and managed through its CLI during implementation.
- Mobile dashboard behavior should be a first-class acceptance surface, including 390px checks.
- Public Content Graph publishing invariants and Environment Contract failures should surface through dashboard workflow states.
