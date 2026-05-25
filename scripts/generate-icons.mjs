/**
 * Genera tutti i PNG necessari per PWA (iOS, Android, Windows, Mac, notifiche)
 * a partire da scripts/icon-source.svg
 *
 * Uso:  node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = resolve(__dirname, '..');
const svgBuf    = readFileSync(resolve(__dirname, 'icon-source.svg'));

const ICONS = [
  // iOS "Aggiungi a Home" — link apple-touch-icon
  { size: 180,  out: 'public/apple-touch-icon-180.png' },
  // iOS notifiche (usato da Firebase / Web Push)
  { size: 192,  out: 'public/icon-192.png' },
  // Windows / Android splash
  { size: 512,  out: 'public/icon-512.png' },
  // Mac dock (alta risoluzione) + store / splash screen
  { size: 1024, out: 'public/icon-1024.png' },
];

// Icona con bordi arrotondati (stile iOS)
const ROUNDED_ICONS = [
  { size: 180, out: 'public/apple-touch-icon.png' }, // default apple-touch-icon
];

async function makeRounded(size) {
  const r = Math.round(size * 0.22); // iOS corner-radius ≈ 22%
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/>
  </svg>`;
  return Buffer.from(svg);
}

async function run() {
  console.log('Generazione icone PWA...\n');

  // Icone quadrate standard
  for (const { size, out } of ICONS) {
    const dest = resolve(root, out);
    await sharp(svgBuf)
      .resize(size, size)
      .png()
      .toFile(dest);
    console.log(`✓  ${out}  (${size}×${size})`);
  }

  // Icone con bordi arrotondati stile iOS
  for (const { size, out } of ROUNDED_ICONS) {
    const dest     = resolve(root, out);
    const mask     = await makeRounded(size);
    await sharp(svgBuf)
      .resize(size, size)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toFile(dest);
    console.log(`✓  ${out}  (${size}×${size}, arrotondata)`);
  }

  console.log('\nDone! Tutti i file sono in /public/');
}

run().catch(err => { console.error(err); process.exit(1); });
