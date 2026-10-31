# Shared navigation

The root layout renders one SiteHeader (defined in `src/components/content-header.tsx`) inside AuthProvider and outside SiteMotion. Pages render their own content and never render another site header. Next client navigation retains the header, navigation links and account controls across homepage, Pricing, Blogs, Saved Results, login and billing return routes.

SiteHeader reads usePathname only to update active links and close a mobile menu when the route changes. The homepage and content pages share the same responsive layout: inline links on larger screens and a toggle menu on small screens. Menu links, outside pointer presses and Escape close the mobile menu; Escape restores focus to its toggle.

SiteMotion scopes route-dependent GSAP entrances, scroll reveals and hover handlers to page content. The shared header is outside that scope and never receives a route entrance opacity or transform animation. AuthProvider and BillingProvider also remain mounted above page navigation.

`scripts/header-persistence-check.mjs` checks real DOM identity and samples every animation frame for header opacity/transforms during guest/authenticated navigation, with normal/reduced motion at390/768/1440px. It covers active links, mobile menu closing, Escape, back/forward, homepage/hash navigation and a guest login round trip. Synthetic sessions only; no email, checkout or payment. Run with BASE_URL matching the local server and canonical login hostname. Results and header screenshots are in `artifacts/header-persistence/`.

`scripts/navigation-check.mjs` additionally covers375–1440px, all content links, hash positioning, responsive Pricing, same-route navigation and content without JavaScript. Both checks assert no full-document requests after the initial load.
