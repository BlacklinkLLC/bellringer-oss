/**
 * Generates the BellRinger PWA icons as PNG files (dependency-free, using
 * Node's built-in zlib).
 *
 *   npm run icons
 *
 * Writes:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/maskable-512.png
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

/* ---------- PNG encoder ---------- */

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i += 1) {
        c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type: RGBA
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y += 1) {
        raw[y * (stride + 1)] = 0; // filter type: none
        pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }

    const idat = deflateSync(raw, { level: 9 });
    return Buffer.concat([
        signature,
        chunk("IHDR", ihdr),
        chunk("IDAT", idat),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

/* ---------- Bell drawing ---------- */

const BG = [10, 10, 16];
const AMBER = [255, 176, 32];

function inRoundedRect(x, y, size, radius) {
    const r = radius * size;
    const cx = Math.min(Math.max(x, size / 2 - r), size / 2 + r);
    const cy = Math.min(Math.max(y, size / 2 - r), size / 2 + r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inBell(nx, ny) {
    const dx = nx - 0.5;
    const domeY = 0.27;
    const bodyTop = 0.27;
    const bodyBottom = 0.64;
    const lipCenterY = 0.62;
    const lipRadius = 0.24;

    // Dome
    if ((nx - 0.5) ** 2 + (ny - domeY) ** 2 <= 0.105 ** 2) {
        return true;
    }

    // Flared body
    if (ny >= bodyTop && ny <= bodyBottom) {
        const t = (ny - bodyTop) / (bodyBottom - bodyTop);
        const half = 0.105 + t * (0.235 - 0.105);
        if (Math.abs(dx) <= half) {
            return true;
        }
    }

    // Rounded lip at the bottom flare
    if (ny >= lipCenterY && ny <= lipCenterY + lipRadius) {
        const dy = ny - lipCenterY;
        const half = Math.sqrt(Math.max(0, lipRadius * lipRadius - dy * dy));
        if (Math.abs(dx) <= half) {
            return true;
        }
    }

    return false;
}

/**
 * @param {number} size raster size
 * @param {{ rounded?: boolean, bellScale?: number }} options
 */
function drawIcon(size, { rounded = true, bellScale = 1 } = {}) {
    const pixels = Buffer.alloc(size * size * 4);
    const cornerRadius = rounded ? 0.18 : 0;

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            // Map pixel into bell-space around the canvas center.
            const bx = 0.5 + (x / size - 0.5) / bellScale;
            const by = 0.5 + (y / size - 0.5) / bellScale;

            const px = x / size;
            const py = y / size;

            let rgb;
            let alpha;

            if (!rounded || inRoundedRect(x, y, size, cornerRadius)) {
                alpha = 255;
                // Soft amber glow behind the bell.
                const glow = Math.max(0, 1 - Math.hypot(px - 0.5, py - 0.62) / 0.62);
                rgb = [
                    Math.round(BG[0] + (AMBER[0] - BG[0]) * glow * 0.09),
                    Math.round(BG[1] + (AMBER[1] - BG[1]) * glow * 0.09),
                    Math.round(BG[2] + (AMBER[2] - BG[2]) * glow * 0.09)
                ];

                if (inBell(bx, by)) {
                    rgb = AMBER;
                }
            } else {
                rgb = [0, 0, 0];
                alpha = 0;
            }

            const offset = (y * size + x) * 4;
            pixels[offset] = rgb[0];
            pixels[offset + 1] = rgb[1];
            pixels[offset + 2] = rgb[2];
            pixels[offset + 3] = alpha;
        }
    }

    return encodePng(size, size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(join(OUT_DIR, "icon-192.png"), drawIcon(192));
writeFileSync(join(OUT_DIR, "icon-512.png"), drawIcon(512));
writeFileSync(join(OUT_DIR, "maskable-512.png"), drawIcon(512, { rounded: false, bellScale: 0.62 }));

console.log("Icons written to " + OUT_DIR);