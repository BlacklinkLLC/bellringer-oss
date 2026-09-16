# BellRinger Open Source (OSS)

<small>This product is in Beta.</small>

A small, configurable school schedule dashboard built by **Blacklink, Inc.**

BellRinger Open is a lightweight, open-source project inspired by the idea of making school schedules easier to view and understand. It is designed to be simple enough to learn from, customize, and contribute to.

> [!NOTE]
> BellRinger Open is a separate open-source project. It does **not** contain or expose the proprietary source code of Blacklink's internal BellRinger platform.

## Features

- Live clock
- Current period detection
- Current-period progress
- Daily schedule
- Announcements
- Responsive design
- Configuration through `config.json`
- Lightweight Node.js server
- No database required
- No external dependencies
- Works on a local network
- Easy to customize

## Getting Started

### Requirements

You only need:

- Node.js 18 or newer
- A web browser

### Clone the repository

```bash
git clone https://github.com/BlacklinkLLC/bellringer-oss.git
cd bellringer-open
```

### Start the server

```bash
node server.js
```

BellRinger Open will start on:

```text
http://localhost:3000
```

Open that address in your browser.

## Configuration

BellRinger Open is designed to be configured without modifying the application code.

Most of the site's data is stored in:

```text
config.json
```

A basic configuration looks like:

```json
{
  "school": {
    "name": "Lincoln Middle School",
    "district": "Lincoln Public Schools"
  },

  "settings": {
    "timezone": "America/Chicago",
    "showClock": true,
    "showAnnouncements": true,
    "showProgress": true
  },

  "schedule": [
    {
      "name": "Period 1",
      "start": "08:25",
      "end": "09:15"
    },
    {
      "name": "Period 2",
      "start": "09:20",
      "end": "10:10"
    }
  ],

  "announcements": [
    {
      "title": "Welcome",
      "message": "Have a great school day!"
    }
  ]
}
```

You can change the school, schedule, announcements, and display settings without changing `index.html` or `app.js`.

## Project Structure

```text
bellringer-open/
├── index.html
├── config.json
├── server.js
├── README.md
├── LICENSE
└── src/
    ├── app.js
    └── style.css
```

### `index.html`

The main application page. It provides the structure that BellRinger Open uses to display the dashboard.

### `config.json`

Contains configurable school information, schedule data, announcements, and application settings.

### `server.js`

A small dependency-free Node.js HTTP server used to serve the application and `config.json`.

### `src/app.js`

Handles configuration loading, schedule calculations, the live clock, progress tracking, and rendering.

### `src/style.css`

Contains the application's visual design and responsive layout.

## Development

You can modify the application while the server is running.

After changing `config.json`, refresh the browser to load the new configuration.

After changing JavaScript or CSS, refresh the page to see your changes.

No build system is required.

## Contributing

Contributions are welcome.

If you're new to development, BellRinger Open is intentionally small and approachable. Good places to start include:

- Improving the user interface
- Adding accessibility improvements
- Adding schedule configuration options
- Improving mobile support
- Adding new dashboard components
- Improving documentation
- Fixing bugs
- Adding tests

Before submitting a change:

1. Fork the repository.
2. Create a branch for your change.
3. Make and test your changes.
4. Commit your changes.
5. Open a pull request.

Please keep contributions focused and explain what your change does.

## Security

BellRinger Open is designed to be a simple local or self-hosted application.

Do not put passwords, API keys, tokens, student information, or other sensitive information into `config.json`.

If you discover a security vulnerability, please report it privately rather than publicly disclosing it.

## Privacy

BellRinger Open does not require an account, database, or external service.

The default application runs locally and does not intentionally transmit school or user data to Blacklink.

If you add third-party services or integrations, review their privacy implications before deploying them in a school environment.

## License

BellRinger Open is released under the **MIT License**.

See [`LICENSE`](LICENSE) for the complete license text.

## About Blacklink

BellRinger Open is developed by **Blacklink, Inc.**

**Learning today, Leading tomorrow.**

© 2026 Blacklink, Inc. All Rights Reserved.