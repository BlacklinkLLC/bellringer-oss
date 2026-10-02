# BellRinger Open Source (OSS)

<small>Beta release v0.2</small>

A small, configurable, self-hosted school schedule dashboard built by **Blacklink, Inc.**

BellRinger Open is a lightweight, open-source project that shows what is happening in a school day on any screen: a classroom projector, a hallway TV, a Raspberry Pi kiosk, or a phone. It is designed to be simple enough to learn from, customize, and contribute to.

> [!NOTE]
> BellRinger Open is a separate open-source project. It does **not** contain or expose the proprietary source code of Blacklink's internal BellRinger platform, and it has no *required* dependency on Blacklink services. By default the page does load
> decorative icons and UI component styles from Blacklink's public CDN (see [Privacy](#privacy)); the
> dashboard works without them.

## Features

- **Live clock and date** rendered in the school's configured timezone
- **Current period detection**: before school, homeroom, class, passing period, lunch, after school, or no-school day — all *derived* from your schedule
- **Current-period progress**: elapsed time, remaining time, and percentage
- **Next period** card with a live "starts in …" countdown during passing time
- **Passing periods** detected automatically from gaps between periods
- **Schedule presets** (`regular`, `early-release`, `late-start`, `assembly`, `testing`, …) with a calendar to override specific dates
- **Announcements** with optional date windows and daily rotation
- **School-status badge** with a glanceable state (In Session, Lunch, Passing, No School, …)
- **Responsive design** for phones, tablets, laptops, 1080p TVs, and 4K TVs
- **TV / display mode** at `/?mode=display` with large type and minimal chrome
- **Light / dark / system themes**
- **PWA / offline support**: installable, and keeps working when the network drops
- **Read-only JSON API** (`/api/config`, `/api/schedule`, `/api/current`, `/api/next`, `/healthz`)
- **Accessible**: semantic HTML, keyboard focus, screen-reader announcements, reduced-motion and high-contrast support
- **Widget dashboard**: rearrange, resize, add and remove widgets (current period, schedule,
  announcements, clock, countdown, upcoming calendar events, notes, quick links); see [Widgets](#widgets)
- **Customizable per device**: theme, accent color, density, heading style and reduced motion, saved in the browser
- No database, no accounts, no telemetry, no build step. The only outside requests are the optional
  Blacklink CDN assets described under [Privacy](#privacy)

## Getting Started

### Requirements

You only need:

- Node.js 18 or newer
- A web browser

### Clone and run

```bash
git clone https://github.com/BlacklinkLLC/bellringer-oss.git
cd bellringer-oss
node server.js
```

Open <http://localhost:3000>.

On a school network, start it with `HOST=0.0.0.0` (the default) and open
`http://<this-machine-ip>:3000` from any device.

### Run with Docker or Podman

The project ships a `Dockerfile` and a `docker-compose.yml`. The image is
dependency-free (no build/install step) and runs as an unprivileged user on
port 3000 with a built-in healthcheck against `/healthz`.

Docker:

```bash
docker build -t bellringer-open .
docker run --rm -p 3000:3000 \
    -v "$PWD/config.json:/app/config.json:ro" \
    bellringer-open
```

Podman is a drop-in alternative for Docker:

```bash
podman build -t bellringer-open .
podman run --rm -p 3000:3000 \
    -v "$PWD/config.json:/app/config.json:ro" \
    bellringer-open
```

Or with Compose (same file works with both; mounting `config.json`
read-only means edits apply on the next page reload, no rebuild needed):

```bash
docker compose up -d --build
podman compose up -d --build
```

### Configuration

Edit `config.json` — no code changes required. Changes are picked up on the next
page reload (the server re-reads the file on every request).

```json
{
  "school": {
    "name": "Lincoln Middle School",
    "district": "Lincoln Public Schools"
  },
  "settings": {
    "timezone": "America/Chicago",
    "theme": "system",
    "defaultSchedule": "regular",
    "showClock": true,
    "showDate": true,
    "showStatus": true,
    "showAnnouncements": true,
    "showProgress": true,
    "showNextPeriod": true
  },
  "schedules": { … },
  "calendar": { … },
  "announcements": [ … ]
}
```

#### Settings

| Key | Values | Default | Purpose |
| --- | --- | --- | --- |
| `timezone` | any IANA name | local time | Wall-clock / date used everywhere |
| `theme` | `light`, `dark`, `system` | `system` | Color theme |
| `defaultSchedule` | a schedule key | `regular` | Schedule used unless the calendar overrides it |
| `showClock` / `showDate` | `true` / `false` | `true` | Header clock + date |
| `showStatus` | `true` / `false` | `true` | Status badge |
| `showAnnouncements` | `true` / `false` | `true` | Announcements panel |
| `showProgress` | `true` / `false` | `true` | Progress bar + elapsed/remaining |
| `showNextPeriod` | `true` / `false` | `true` | Next period card |
| `cdnIcons` | `true` / `false` | `true` | Load decorative icons from `cdn.blacklink.net`. `false` makes no icon requests |

#### Widgets

The dashboard is a grid of widgets. Click **Customize** in the header to add widgets, choose
**Edit layout on the page** to move, resize, configure or remove them, and change the theme, accent
color, density and heading style. Layout and appearance are saved **per device** in the browser
(`localStorage`), so the principal's laptop and the hallway TV can look different. The Export/Import
box in the drawer copies a setup between devices.

| Widget | What it shows | Shown in display mode |
| --- | --- | --- |
| Current period | Current state, progress bar, what's next | yes |
| Today's schedule | Every period today, current one highlighted | no |
| Announcements | Messages from `config.json` | no |
| Clock | Large clock and date | no (display mode has its own) |
| Countdown | Days until a date you choose | yes |
| Coming up | Upcoming no-school days and schedule changes | no |
| Note | A message you type | no |
| Quick links | Links to pages you use often | no |

To set the **default layout for every device** (used until someone customizes their own), add a
`layout` list to `config.json`. Sizes are `third`, `half`, `two-thirds` and `full`:

```json
"layout": [
  { "type": "current-period", "size": "full" },
  { "type": "schedule", "size": "two-thirds" },
  { "type": "countdown", "size": "third",
    "config": { "label": "Winter Break", "date": "2026-12-23" } },
  { "type": "announcements", "size": "third" }
]
```

Unknown widget types and invalid values are ignored rather than breaking the page. **Reset layout** in
the drawer returns a device to this default.

##### Writing your own widget

A widget is one small module in `src/widgets/builtin/`. It declares a settings schema (which also
generates its settings form), builds its DOM once in `create`, and updates it every second in `update`:

```js
export default {
    id: "hello",
    name: "Hello",
    description: "Says hello.",
    icon: "Bell",              // any name from the Blacklink icon library, optional
    defaultSize: "third",
    display: false,            // true = also shown in TV display mode
    schema: { name: { type: "string", label: "Name", default: "world" } },
    create() {
        const element = document.createElement("section");
        element.className = "panel";
        return {
            element,
            update(ctx, config) { element.textContent = `Hello, ${config.name}!`; }
        };
    }
};
```

Register it in `src/widgets/builtin/index.js` and add its file to `CORE_ASSETS` in `public/sw.js`.
Field types: `boolean`, `string`, `textarea`, `number`, `select`, `color`, `date`. `ctx` is
`{ config, time, daily, snapshot, upcoming }`. A widget that throws is isolated, so it can't take
down the rest of the dashboard.

#### Schedule presets

Schedules live under `schedules`. Each preset has a `name`, a `periods` list,
and an optional `days` list restricting it to certain weekdays
(`"days": ["mon","tue","wed","thu","fri"]` means weekends are "no school").

Each period has:

- `name` — shown to students ("Period 1", "Homeroom", …)
- `start` / `end` — 24-hour `"HH:MM"`
- `kind` *(optional)* — `class`, `homeroom`, `lunch`, `break`, `advisory`, `passing`

```json
"schedules": {
  "regular": {
    "name": "Regular Schedule",
    "days": ["mon", "tue", "wed", "thu", "fri"],
    "periods": [
      { "name": "Period 1", "start": "08:25", "end": "09:15" },
      { "name": "Lunch",    "kind": "lunch", "start": "11:10", "end": "11:40" }
    ]
  },
  "early-release": {
    "name": "Early Release",
    "days": ["mon", "tue", "wed", "thu", "fri"],
    "periods": [ … ]
  }
}
```

Gaps between periods become automatic **passing periods** along with a
countdown to the next class. You do not need to write passing blocks yourself,
unless you want an explicitly scheduled one (`"kind": "passing"`).

> The old flat `schedule: [ … ]` format is still supported and migrates to a
> `regular` preset automatically.

#### Calendar overrides

A calendar entry replaces the default schedule on a specific date:

```json
"calendar": {
  "2026-09-21": { "type": "no-school",          "name": "Teacher Work Day" },
  "2026-10-02": { "type": "schedule",           "name": "Early Release", "schedule": "early-release" },
  "2026-10-09": { "type": "schedule",           "name": "Testing Day",   "schedule": { "name": "Testing", "periods": [ … ] } }
}
```

- `no-school` — the dashboard shows "No School" and the reason.
- `schedule` — reference an existing preset by name, or inline a whole
  schedule object.

#### Announcements

```json
"announcements": [
  { "title": "Welcome", "message": "Have a great school day!" },
  { "title": "Concert", "message": "Band concert Thursday at 7pm.", "from": "2026-10-12", "until": "2026-10-16" },
  { "title": "Word of the Day", "message": "Endeavor: …", "rotate": true }
]
```

- `from` / `until` — optional `YYYY-MM-DD` visibility window.
- `rotate` — show this announcement on a one-per-day rotation.
- `hidden: true` — hides an announcement without deleting it.

#### Validation

`config.json` is validated every time it loads, on both the server and the
browser. Problems — bad times, times that end before they start, duplicate or
overlapping periods, invalid dates, missing preset references, a bad
timezone, malformed JSON — are reported on a readable error screen instead of
a blank page. The API returns them as `422` responses with an `errors` array.

## TV / Display Mode

Press **Esc** to leave display mode.

Open `/?mode=display` (or use the footer link) to turn any screen into a bell
display:

- Huge current-period text and countdown
- Next period shown prominently
- Schedule list, announcements, and footer hidden
- No mouse needed; cursor hidden

## PWA / Offline

BellRinger Open is a progressive web app:

- Installable (see the manifest in `public/manifest.json`, icons regenerated
  with `npm run icons`)
- A service worker (`public/sw.js`) caches the app shell and every module, so
  once loaded, the schedule keeps calculating locally even if the network or
  server disappears
- The API is cached as a fallback, so the last known configuration also works
  offline

Bump the `VERSION` constant in `public/sw.js` when shipping asset changes.

## API

All endpoints are read-only and return JSON.

| Endpoint | Description |
| --- | --- |
| `GET /healthz` | Liveness + whether the config is valid |
| `GET /api/config` | The validated configuration |
| `GET /api/schedule` | Today's resolved schedule (blocks, schedule name, no-school reason) |
| `GET /api/schedule?date=2026-10-02` | Same, for a specific date (great for previewing presets) |
| `GET /api/current` | Current state snapshot (state, current block, progress, next block) |
| `GET /api/next` | Next block + seconds until it starts |

Example:

```bash
curl http://localhost:3000/api/current
```

```json
{
  "ok": true,
  "state": "in-period",
  "label": "Period 4",
  "current": { "name": "Period 4", "start": 705, "end": 755, "kind": "class", "passing": false },
  "progress": { "elapsedMinutes": 25, "remainingMinutes": 25, "blockMinutes": 50, "percentage": 50 },
  "next": { "name": "Period 5", "start": 760, "end": 810, "kind": "class", "passing": false }
}
```

## Development

No build step is required — refresh the browser to pick up changes.

```bash
node server.js          # start, default port 3000
PORT=8080 node server.js
npm test                # run the test suite (Node's built-in test runner)
npm run icons           # regenerate PWA icons
```

The schedule engine is shared verbatim between the browser and the API, so the
dashboard and `/api/current` always agree.

### Project architecture

```text
bellringer-oss/
├── config.json          # all configuration (school, presets, calendar, announcements)
├── server.js            # entry point: wires static + API together
├── package.json
├── README.md
├── LICENSE
├── public/              # static app shell (served exactly as-is)
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js            # service worker (offline / PWA)
│   └── icons/
├── server/              # Node server modules
│   ├── api.js           # /api/* + /healthz
│   ├── config.js        # reads + validates config.json
│   └── static.js        # safe static serving (public/ + src/)
├── src/                 # browser code, also imported by the server + tests
│   ├── app.js           # entry point: load config, theme, render loop
│   ├── components/      # header clock + status badge, error screen
│   │   ├── clock.js ├── school-status.js └── error-screen.js
│   ├── widgets/         # the widget system (registry, layout, host, customize drawer)
│   │   ├── registry.js  schema.js  layout.js  prefs.js  storage.js
│   │   ├── host.js      controller.js  appearance.js
│   │   └── builtin/     # one file per widget (current-period, schedule, clock, ...)
│   ├── schedule/        # domain logic (UI-free)
│   │   ├── schedule-engine.js └── calendar.js, presets.js
│   ├── config/          # defaults.js, validate.js, loader.js
│   ├── theme/           # theme.js, display-mode.js
│   ├── utils/           # time.js, format.js, dom.js, icons.js
│   └── styles/          # split CSS: main/layout/themes, nova-bridge.css + component styles
└── tests/               # schedule-engine + time/format tests
```

Where new code belongs:

- **Schedule math** → `src/schedule/`
- **Config handling** → `src/config/`
- **Wall-clock / formatting** → `src/utils/`
- **Dashboard widgets** → `src/widgets/builtin/` (one file per widget)
- **Other UI** → `src/components/`
- **CSS** → `src/styles/` (either `components/` or the shared sheets)
- **Server routes** → `server/`
- **Tests** → `tests/`

Keep files small and focused. If a component, module, or stylesheet starts to
feel large, split it the same way the existing code is split.

## Security

- The HTTP server only ever serves files from `public/` and the shared `src/`
  tree. `config.json`, `server.js`, package files, dotfiles, and anything
  outside those roots are never exposed (404).
- Path traversal is blocked; a strict extension allow-list controls what can be
  served; security headers (CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`)
  are applied to every response.
- The API is read-only and predictable.
- Do **not** put passwords, API keys, tokens, student information, or other
  sensitive data into `config.json` — this project is meant for schedule
  information only.

## Privacy

No accounts, no database, no cloud backend, no telemetry. BellRinger Open does
not transmit school or user data anywhere, and the dashboard works offline once
it has loaded.

**Blacklink CDN requests.** By default each browser also fetches two kinds of
public, static assets from Blacklink-operated hosts (served through Cloudflare),
which means those hosts can see the requesting device's IP address and the usual
request headers:

| Host | What | Used for | Turn off |
| --- | --- | --- | --- |
| `cdn.blacklink.net` | Icon library (`blacklink-icons.js` + SVGs) | Decorative icons | `"cdnIcons": false` in `settings`. Icons simply don't appear |
| `nova.blacklink.net` | [NOVA](https://nova.blacklink.net) component CSS (buttons, forms, toggles) | Styling the Customize drawer and edit controls | Copy the four `<link>` files into `public/` and point `index.html` at them. A built-in fallback keeps the drawer usable if they can't load |

The Content-Security-Policy allows only these two hosts, and only for scripts,
styles and images respectively. Once cached by the service worker they keep
working offline. No school data, schedule data or user input is ever sent to
them. For a fully air-gapped install, set `cdnIcons` to `false` and self-host
the NOVA CSS as described above. If you add other third-party integrations,
review their privacy implications before deploying in a school environment.

## Contributing

Contributions are welcome and the codebase is intentionally small enough for a
first pull request. Good places to start:

- New dashboard components
- More schedule presets or calendar handling
- Accessibility improvements
- Mobile / TV polish
- Tests
- Documentation

Before submitting:

1. Fork the repository.
2. Create a branch for your change.
3. Make and test your changes (`npm test`).
4. Commit and open a pull request.

Please keep changes focused and explain what they do.

## License

BellRinger Open is released under the **MIT License**. See [`LICENSE`](LICENSE).

## About Blacklink

BellRinger Open is developed by **Blacklink, Inc.**

**Learning today, Leading tomorrow.**

© 2026 Blacklink, Inc. All Rights Reserved.