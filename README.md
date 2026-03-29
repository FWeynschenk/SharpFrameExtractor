# Sharp Frame Extractor

A browser-based video analysis tool that processes any video entirely client-side — no upload, no server.

## Features

- **Movie Barcode** — one pixel-wide column per frame, averaged to a single color
- **Detailed Barcode** — full vertical resolution barcode (color per scanline)
- **Frame Sampler** — evenly-spaced frames across the full video duration
- **Best Per Scene** — sharpest frame from each time segment, guaranteeing spread across the whole video
- **Sharpest Frames (Global)** — top N frames ranked by Laplacian variance (blur detection)
- **Best Color Matches** — frames closest to a chosen target color

## How it works

- Video frames are captured using the [`requestVideoFrameCallback`](https://wicg.github.io/video-rvfc/) API at up to 16× playback speed
- A Web Worker runs all per-frame analysis off the main thread
- Core algorithms (sharpness, color similarity, barcode) are implemented in **Rust/WebAssembly** via [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen)
- Everything stays local — no data leaves your browser

## Usage

Open `index.html` in a browser (requires a local server due to ES module imports):

```bash
npx serve . --listen 3000
# or
npm run dev
```

Then open `http://localhost:3000`.

## Building the WASM

Requires [wasm-pack](https://rustwasm.github.io/wasm-pack/):

```bash
cd sharp-frame-extractor-wasm
wasm-pack build --target web --out-dir pkg
```

The compiled `pkg/` is committed to the repo so you don't need Rust to run the app.

## License

MIT
