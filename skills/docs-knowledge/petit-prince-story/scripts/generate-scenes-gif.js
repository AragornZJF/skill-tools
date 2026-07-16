const { Resvg } = require("@resvg/resvg-js");
const { PNG } = require("pngjs");
const GIFEncoder = require("gif-encoder");
const fs = require("fs");
const path = require("path");

const WIDTH = 600;
const HEIGHT = 800;
const FRAME_DELAY = 4000;
const OUTPUT = "petit-prince-story-animated.gif";
const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const ILLUSTRATIONS_DIR = path.join(ROOT, "assets", "illustrations");

// Auto-discover SVG files and extract metadata from SVG content
function discoverScenes() {
  if (!fs.existsSync(ILLUSTRATIONS_DIR)) {
    console.error(`Illustrations directory not found: ${ILLUSTRATIONS_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(ILLUSTRATIONS_DIR).filter((f) => f.endsWith(".svg"));
  if (files.length === 0) {
    console.error(`No SVG files found in ${ILLUSTRATIONS_DIR}`);
    process.exit(1);
  }
  const scenes = [];

  for (const file of files.sort()) {
    const svgContent = fs.readFileSync(path.join(ILLUSTRATIONS_DIR, file), "utf-8");

    // Extract title from SVG <text id="title">
    const titleMatch = svgContent.match(/<text[^>]*id="title"[^>]*>(.*?)<\/text>/);
    const rawTitle = titleMatch ? titleMatch[1] : "";
    const title = rawTitle.replace(/\s+/g, "");

    // Extract quote from SVG <text id="quote">
    const quoteMatch = svgContent.match(/<text[^>]*id="quote"[^>]*>(.*?)<\/text>/);
    const quote = quoteMatch ? quoteMatch[1] : "";

    // Derive meaning from quote (same as quote when not available)
    const meaning = quote || title;

    scenes.push({
      file: path.join("assets", "illustrations", file),
      title,
      quote,
      meaning,
      guest: "",
    });
  }

  return scenes;
}

// Replace SVG text content dynamically, then render
function buildDynamicSVG(scene) {
  const svgPath = path.join(ROOT, ...scene.file.split("/"));
  let svgStr = fs.readFileSync(svgPath, "utf-8");

  // Replace #title with scene title
  svgStr = svgStr.replace(
    /(<text[^>]*id="title"[^>]*>)(.*?)(<\/text>)/,
    `$1${scene.title}$3`,
  );
  // Adjust title font size to 38px for GIF
  svgStr = svgStr.replace(
    /(<text[^>]*id="title"[^>]*font-size=")40(")/,
    `$138$2`,
  );

  // Replace #quote with original quote
  svgStr = svgStr.replace(
    /(<text[^>]*id="quote"[^>]*>)(.*?)(<\/text>)/,
    `$1${scene.quote}$3`,
  );

  // Use SVG as-is — meaning text is already embedded with id="meaning"

  return svgStr;
}

async function main() {
  const scenes = discoverScenes();
  console.log(`Found ${scenes.length} scenes in ${ILLUSTRATIONS_DIR}`);

  const encoder = new GIFEncoder(WIDTH, HEIGHT);
  encoder.setDelay(FRAME_DELAY);
  encoder.setRepeat(0);
  encoder.setQuality(10);

  const writeStream = fs.createWriteStream(path.join(ROOT, OUTPUT));
  let writeStreamClosed = false;

  writeStream.on('error', (err) => {
    console.error('Write stream error:', err);
    writeStreamClosed = true;
  });
  writeStream.on('close', () => {
    writeStreamClosed = true;
  });

  const chunks = [];
  encoder.on("data", (chunk) => chunks.push(chunk));
  encoder.on("error", (err) => {
    if (!writeStreamClosed) writeStream.destroy();
    throw err;
  });
  encoder.writeHeader();

  for (const scene of scenes) {
    process.stdout.write(`Rendering ${scene.title}...`);

    const dynamicSvg = buildDynamicSVG(scene);

    let pngBuffer;
    try {
      const resvg = new Resvg(dynamicSvg, {
        fitTo: { mode: "width", value: WIDTH },
      });
      pngBuffer = resvg.render().asPng();
    } catch (err) {
      console.error(`\n  FAIL: render error for ${scene.title}: ${err.message}`);
      continue;
    }

    const png = PNG.sync.read(pngBuffer);

    const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
    for (let y = 0; y < Math.min(png.height, HEIGHT); y++) {
      for (let x = 0; x < Math.min(png.width, WIDTH); x++) {
        const srcIdx = (y * png.width + x) * 4;
        const dstIdx = (y * WIDTH + x) * 4;
        pixels[dstIdx] = png.data[srcIdx];
        pixels[dstIdx + 1] = png.data[srcIdx + 1];
        pixels[dstIdx + 2] = png.data[srcIdx + 2];
        pixels[dstIdx + 3] = png.data[srcIdx + 3];
      }
    }

    encoder.addFrame(pixels);
    while (encoder.read() !== null) {}
    console.log(` OK  ${scene.title} — ${scene.meaning}`);
  }

  encoder.finish();
  while (encoder.read() !== null) {}
  writeStream.write(Buffer.concat(chunks));
  writeStream.end();
  console.log(`\nDone! Output: ${OUTPUT}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
}).finally(() => {
  // Ensure writeStream is closed if still open
  // (Node.js will handle this on process exit, but being explicit is good practice)
});
