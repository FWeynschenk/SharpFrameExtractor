import init, {
    calculate_color_similarity,
    compute_sharpness,
    average_color,
    average_color_per_line
} from '../sharp-frame-extractor-wasm/pkg/sharp_frame_extractor.js';

let initialized = false;

async function initializeWasm() {
    await init({});
    initialized = true;
}

self.onmessage = async function ({ data }) {
    if (!initialized) await initializeWasm();

    const { buffer, width, height, targetColor } = data;
    const pixelData = new Uint8ClampedArray(buffer);

    const sharpScore    = compute_sharpness(pixelData, width, height);
    const colorScore    = calculate_color_similarity(pixelData, targetColor);
    const avgColor      = average_color(pixelData);
    const avgColorPerLine = average_color_per_line(pixelData, width);

    self.postMessage({ sharpScore, colorScore, avgColor, avgColorPerLine });
};
