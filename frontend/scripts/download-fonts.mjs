import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': userAgent } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function run() {
  console.info('Fetching Google Fonts stylesheet...');
  const css = await fetchText(
    'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Rubik:wght@400;500;600;700&display=swap'
  );

  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  let match;
  let fontIndex = 0;
  let localCss = '';

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];
    const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?;/);
    const weightMatch = block.match(/font-weight:\s*(\d+);/);
    const styleMatch = block.match(/font-style:\s*([^;]+);/);
    const urlMatch = block.match(/src:\s*url\((https:[^)]+)\)/);
    const unicodeMatch = block.match(/unicode-range:\s*([^;]+);/);

    if (familyMatch && weightMatch && urlMatch) {
      const rawFamily = familyMatch[1].trim();
      const familySlug = rawFamily.replace(/\s+/g, '-').toLowerCase();
      const weight = weightMatch[1];
      const style = styleMatch ? styleMatch[1].trim() : 'normal';
      const fontUrl = urlMatch[1];
      const filename = `${familySlug}-${weight}-${fontIndex++}.woff2`;
      const destPath = path.join(fontsDir, filename);

      console.info(`Downloading ${rawFamily} (${weight}, ${style}) -> ${filename}`);
      await downloadFile(fontUrl, destPath);

      localCss += `@font-face {\n  font-family: '${rawFamily}';\n  font-style: ${style};\n  font-weight: ${weight};\n  font-display: swap;\n  src: url('/fonts/${filename}') format('woff2');\n`;
      if (unicodeMatch) {
        localCss += `  unicode-range: ${unicodeMatch[1].trim()};\n`;
      }
      localCss += `}\n\n`;
    }
  }

  const cssDest = path.join(__dirname, '..', 'src', 'fonts.css');
  fs.writeFileSync(cssDest, localCss);
  console.info('Successfully saved local fonts and generated src/fonts.css');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
