const { Resvg } = require("@resvg/resvg-js");
const { PNG } = require("pngjs");
const GIFEncoder = require("gif-encoder");
const fs = require("fs");
const path = require("path");

const WIDTH = 600;
const HEIGHT = 800;
const FRAME_DELAY = 3000;
const OUTPUT = "petit-prince-story-watercolor.gif";
const ROOT = path.resolve(__dirname, "..", "..", "..", "..");

// The 6 watercolor scenes from the grid, extracted as individual SVGs
const scenes = [
  {
    title: "旧 巷 的 雨",
    quote: "雨落青瓦 · 旧味如昨",
    meaning: "离别与重逢",
    file: "wc-01-snake.svg",
  },
  {
    title: "龙 舟 的 影 子",
    quote: "顺着它的性子来",
    meaning: "心静手才巧",
    file: "wc-02-fox.svg",
  },
  {
    title: "艾草与五色线",
    quote: "系在腕上的祝福",
    meaning: "爱在无声处",
    file: "wc-03-rose.svg",
  },
  {
    title: "河 水 记 得",
    quote: "鼓声是河的喘息",
    meaning: "魂归流水",
    file: "wc-04-pilot.svg",
  },
  {
    title: "留 下 的 味 道",
    quote: "味道里有了自己的时间",
    meaning: "手艺即记忆",
    file: "wc-05-lamplighter.svg",
  },
  {
    title: "河 灯 与 归 途",
    quote: "每盏灯都有自己的路",
    meaning: "周而复始",
    file: "wc-06-prince.svg",
  },
];

async function main() {
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

    const svgPath = path.join(
      ROOT,
      "assets",
      "illustrations",
      scene.file,
    );
    if (!fs.existsSync(svgPath)) {
      console.error(`\n  FAIL: ${scene.file} not found`);
      continue;
    }

    let svgStr = fs.readFileSync(svgPath, "utf-8");

    // Inject dynamic text into SVG
    svgStr = svgStr.replace(
      /(<text[^>]*id="title"[^>]*>)(.*?)(<\/text>)/,
      `$1${scene.title}$3`,
    );
    svgStr = svgStr.replace(
      /(<text[^>]*id="title"[^>]*font-size=")40(")/,
      `$138$2`,
    );
    svgStr = svgStr.replace(
      /(<text[^>]*id="quote"[^>]*>)(.*?)(<\/text>)/,
      `$1${scene.quote}$3`,
    );
    svgStr = svgStr.replace(
      /(<text[^>]*id="meaning"[^>]*>)(.*?)(<\/text>)/,
      `$1${scene.meaning}$3`,
    );

    let pngBuffer;
    try {
      const resvg = new Resvg(svgStr, {
        fitTo: { mode: "width", value: WIDTH },
      });
      pngBuffer = resvg.render().asPng();
    } catch (err) {
      console.error(`\n  FAIL: render error: ${err.message}`);
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
    console.log(` OK`);
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
