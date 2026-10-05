# NetPulse Figma design assets

Included assets:

- `NetPulse_Desktop.svg` — 1440 × 1140 desktop reference layout.
- `NetPulse_Mobile.svg` — 390 × 1210 mobile reference layout.
- `design-tokens.json` — colors, typography, spacing, and radii.

These are SVG import assets, not a native `.fig` file or an already-created Figma project. The charts and service values depict the demo fixture; the layouts are reference designs rather than screenshots from an interactive browser.

## Import

1. Create a blank design file in Figma.
2. Drag the two SVG files onto the canvas, or use File → Place image where supported.
3. Name the pages **Desktop**, **Mobile**, and **Components**.
4. Ungroup the imported vectors as needed and place each layout inside a frame of the documented dimensions.
5. Install Inter, or use Segoe UI / Arial consistently if Inter is unavailable.

## Create reusable components

Rebuild the metric card, primary/secondary button, service row, status badge, sidebar item, and incident card as components. Add appropriate variants for Operational / Degraded / Down / Unknown / Paused and selected/unselected navigation. Use auto layout with the spacing tokens rather than treating imported absolute positions as responsive constraints.

## Prototype the main journey

Connect Overview → service details → close; Overview → Incidents → acknowledged state; Overview → add-service dialog; and the desktop/mobile frame variants. Imported SVGs are static; these interactions must be created in Figma or demonstrated in the actual running app.

## Visual rules

- Dark navy navigation; light gray workspace; white panels; violet actions and charts.
- Green indicates successful check status, amber slow responses, rose failures, and gray missing measurements.
- Body text 16 px; regular labels 14 px; secondary metadata 12 px.
- Control radius 7 px; panel radius 10 px; base spacing 4 px.
- Include status text as well as color. Keep primary actions visible above the service table.

The running application is the functional reference. The SVGs help you learn and iterate on the design; they do not provide native auto-layout behavior or complete component variants automatically.
