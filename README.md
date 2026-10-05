# SJCEM SmartNav

A self-contained, phone-friendly campus navigation prototype based on the attached project plan. It runs in a browser without an account, server, build step, or package install.

## Open it

Open `index.html` in a modern browser. Camera QR scanning needs a local web server because browsers require a secure context for camera access. Manual QR code entry also works.

## Change the campus map

Edit `campus-data.js`. This is the single source for destination names, the schematic map, route connections and QR codes. The included entries are sample data only. Confirm actual names, floors, paths, accessibility and distances at SJCEM before using the map for real directions.

- `locations`: destination names, categories, connected node, and map point.
- `nodes`: graph junctions and their x/y position on the 720 × 440 map.
- `buildings`: rectangles and labels drawn on the map.
- `edges`: two-way walkable connections, metre distance, and type (`road`, `corridor`, `stairs`, or `lift`).
- `qrCodes`: QR code text mapped to a node ID. A QR can contain a node code or a URL such as `...?start=main_gate`.

IDs must match across these lists. Add an edge once; the app treats every edge as two-way. Accessible routing skips connections whose type is `stairs` and can use a verified lift or ramp connection instead.

## Included features

- Destination search and quick picks
- Dijkstra shortest-path routing
- Route distance, estimated walking time, and ordered waypoints
- Schematic route drawing
- Accessible routing that avoids stairs
- QR code manual entry and camera scan where the browser supports it
- Start location using `?start=main_gate` and destination using `?to=library`
- Responsive mobile layout

This is a frontend prototype. The plan's FastAPI/PostgreSQL backend and admin panel are not included yet. Keeping the sample campus data separate makes it easy to edit now or connect a backend later.
