---
name: Visual design direction
description: The app-wide look (Field Guide) the user chose, and what was ruled out.
---
The whole app uses the "Field Guide" handbook look: butter-paper background, oxblood ink, Instrument Serif headings, DM Sans body, DM Mono labels, near-square corners. There is no dark mode.

**Why:** In October 2026 the user picked Field Guide from three homepage options. They chose to restyle every screen while keeping the existing layouts, and to remove the dark/light switch.

**How to apply:** New screens should use the theme tokens in index.css and the `serif` class for headings. Don't reintroduce a dark theme or the old green/gold palette unless the user asks. Layout rework in the handbook style was offered and declined, so don't do it unprompted.
