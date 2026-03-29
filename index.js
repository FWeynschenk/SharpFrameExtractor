import ColorSim from './actions/colorsim.js';
import Rainbow from './actions/rainbow.js';
import RainbowDetailed from './actions/rainbow-detailed.js';
import SharpSim from './actions/sharpsim.js';
import FrameSampler from './actions/framesampler.js';
import LocalSharpest from './actions/localsharpest.js';
import { getVideoInfo } from './util/getVideoInfo.js';

const THUMBSIZE = 270;
const OUTPUT_INTERVAL = 30;

// ── Theme ────────────────────────────────────────────────────────────────────

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = savedTheme ?? (prefersDark ? 'dark' : 'light');

document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
});

// ── File label ───────────────────────────────────────────────────────────────

document.getElementById('video-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    document.getElementById('file-name').textContent = file ? file.name : 'Choose a video file…';
});

// ── Run ──────────────────────────────────────────────────────────────────────

document.getElementById('process-frames').addEventListener('click', run);

let running = false;

async function _run() {
    if (running) return;
    running = true;

    const videoFile = document.getElementById('video-input').files[0];
    if (!videoFile) { running = false; return; }

    const SAMPLEFREQUENCY = Math.max(1, parseInt(document.getElementById('sample-input').value) || 1);
    const samplerCount    = Math.max(1, parseInt(document.getElementById('sampler-count').value) || 10);
    const sharpCount      = Math.max(1, parseInt(document.getElementById('sharp-count').value) || 10);
    const colorCount      = Math.max(1, parseInt(document.getElementById('color-count').value) || 10);
    const sceneCount      = Math.max(1, parseInt(document.getElementById('scene-count').value) || 10);
    const playbackRate    = parseFloat(document.getElementById('speed-input').value) || 4;

    const colorInput = document.getElementById('color-input').value;
    const r = parseInt(colorInput.slice(1, 3), 16);
    const g = parseInt(colorInput.slice(3, 5), 16);
    const b = parseInt(colorInput.slice(5, 7), 16);
    const targetColor = new Uint8Array([r, g, b]);

    const progressBar  = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressWrap = document.getElementById('progress-wrap');
    progressWrap.style.display = 'flex';
    progressBar.style.width = '0%';
    progressText.textContent = 'Reading video…';

    let videoInfo;
    try {
        videoInfo = await getVideoInfo(videoFile);
    } catch {
        videoInfo = { frameRate: 30 };
    }
    const url = URL.createObjectURL(videoFile);

    const videoEl = document.createElement('video');
    videoEl.preload = 'auto';
    videoEl.muted = true;
    videoEl.src = url;

    await new Promise(r => videoEl.onloadedmetadata = r);

    const canvas = new OffscreenCanvas(videoEl.videoWidth, videoEl.videoHeight);
    const ctx    = canvas.getContext('2d', { willReadFrequently: true });
    ctx.globalCompositeOperation = 'copy';

    const colorSim    = await new ColorSim().init(colorCount, THUMBSIZE, videoEl);
    const rainbow     = await new Rainbow().init(300, 1);
    const rainbowDet  = await new RainbowDetailed().init(videoEl.videoWidth, videoEl.videoHeight);
    const sharpSim    = await new SharpSim().init(sharpCount, THUMBSIZE, videoEl);
    const sampler     = await new FrameSampler().init(samplerCount, THUMBSIZE, videoEl.duration, videoEl);
    const localSharp  = await new LocalSharpest().init(sceneCount, THUMBSIZE, videoEl.duration, videoEl);

    const worker = new Worker('./workers/worker.js', { type: 'module' });

    // Each pending entry carries the frame copy AND the mediaTime so the
    // worker response handler can use it for time-based decisions.
    const pending = []; // { frameData, width, height, capture, mediaTime }
    let sent = 0, received = 0, processedFrames = 0;
    let videoEnded = false;

    function checkDone(resolve) {
        if (videoEnded && sent === received) {
            worker.terminate();
            URL.revokeObjectURL(url);
            videoEl.remove();

            colorSim.finish();
            rainbow.finish();
            rainbowDet.finish();
            sharpSim.finish();
            sampler.finish();
            localSharp.finish();

            progressBar.style.width = '100%';
            progressText.textContent = 'Done!';
            resolve();
        }
    }

    await new Promise((resolve, reject) => {
        worker.onmessage = ({ data: { sharpScore, colorScore, avgColor, avgColorPerLine } }) => {
            const { frameData, width, height, capture, mediaTime } = pending.shift();
            received++;

            const frame = new ImageData(frameData, width, height);

            sharpSim.addResult(frame, sharpScore);
            colorSim.addResult(frame, colorScore);
            rainbow.addAvgColor(avgColor);
            rainbowDet.addAvgLines(avgColorPerLine);
            localSharp.addResult(frame, sharpScore, mediaTime);

            if (capture) sampler.captureFrame(frame);

            processedFrames++;
            if (processedFrames % OUTPUT_INTERVAL === 0) {
                const pct = Math.min(99, Math.round((mediaTime / videoEl.duration) * 100));
                progressBar.style.width = pct + '%';
                progressText.textContent = `${pct}%  (${processedFrames} frames processed)`;
                rainbow._updateOutput();
                rainbowDet._updateOutput();
            }

            checkDone(resolve);
        };

        worker.onerror = reject;

        const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

        if (supportsRVFC) {
            let frameCount = 0;

            const onFrame = (_now, meta) => {
                frameCount++;
                if (frameCount % SAMPLEFREQUENCY === 0) {
                    ctx.drawImage(videoEl, 0, 0);
                    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    const copy      = new Uint8ClampedArray(frame.data);
                    const mediaTime = meta?.mediaTime ?? videoEl.currentTime;
                    const capture   = sampler.isTargetTime(mediaTime);

                    pending.push({ frameData: copy, width: canvas.width, height: canvas.height, capture, mediaTime });
                    worker.postMessage(
                        { buffer: frame.data.buffer, width: canvas.width, height: canvas.height, targetColor },
                        [frame.data.buffer]
                    );
                    sent++;
                }

                if (!videoEl.ended) {
                    videoEl.requestVideoFrameCallback(onFrame);
                } else {
                    videoEnded = true;
                    checkDone(resolve);
                }
            };

            videoEl.requestVideoFrameCallback(onFrame);
            videoEl.playbackRate = playbackRate;
            videoEl.play().catch(reject);

        } else {
            // Fallback: seek-based for browsers without RVFC
            progressText.textContent = 'Analyzing… (seek mode)';
            const frameDuration = 1 / videoInfo.frameRate;
            let currentTime = 0;

            videoEl.addEventListener('seeked', () => {
                ctx.drawImage(videoEl, 0, 0);
                const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

                const copy    = new Uint8ClampedArray(frame.data);
                const capture = sampler.isTargetTime(currentTime);

                pending.push({ frameData: copy, width: canvas.width, height: canvas.height, capture, mediaTime: currentTime });
                worker.postMessage(
                    { buffer: frame.data.buffer, width: canvas.width, height: canvas.height, targetColor },
                    [frame.data.buffer]
                );
                sent++;

                currentTime += frameDuration * SAMPLEFREQUENCY;
                if (currentTime <= videoEl.duration) {
                    videoEl.currentTime = currentTime;
                } else {
                    videoEnded = true;
                    checkDone(resolve);
                }
            });

            videoEl.currentTime = 0;
        }
    });

    running = false;
}

async function run() {
    try {
        await _run();
    } catch (err) {
        console.error('SharpFrameExtractor error:', err);
        document.getElementById('progress-text').textContent = 'Error — see console for details.';
        running = false;
    }
}
