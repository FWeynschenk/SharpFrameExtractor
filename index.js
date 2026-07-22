import ColorSim from './actions/colorsim.js';
import Rainbow from './actions/rainbow.js';
import RainbowDetailed from './actions/rainbow-detailed.js';
import SharpSim from './actions/sharpsim.js';
import FrameSampler from './actions/framesampler.js';
import LocalSharpest from './actions/localsharpest.js';
import { getVideoInfo } from './util/getVideoInfo.js';

const THUMBSIZE = 270;
const OUTPUT_INTERVAL = 30;

function formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

let _modalFrames = [];
let _modalIdx    = 0;

const _modal   = document.getElementById('modal');
const _mCanvas = document.getElementById('modal-canvas');
const _mCtx    = _mCanvas.getContext('2d');
const _mLabel  = document.getElementById('modal-label');
const _mPrev   = document.getElementById('modal-prev');
const _mNext   = document.getElementById('modal-next');

function openModal(frames, idx) {
    _modalFrames = frames;
    _modalIdx    = idx;
    _renderModal();
    _modal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function _renderModal() {
    const { imageData, label } = _modalFrames[_modalIdx];
    _mCanvas.width  = imageData.width;
    _mCanvas.height = imageData.height;
    _mCtx.putImageData(imageData, 0, 0);
    _mLabel.textContent = label ?? '';
    _mPrev.style.visibility = _modalIdx > 0 ? 'visible' : 'hidden';
    _mNext.style.visibility = _modalIdx < _modalFrames.length - 1 ? 'visible' : 'hidden';
}

document.getElementById('modal-close').addEventListener('click', () => {
    _modal.hidden = true;
    document.body.style.overflow = '';
});
_modal.addEventListener('click', e => {
    if (e.target === _modal) { _modal.hidden = true; document.body.style.overflow = ''; }
});
_mPrev.addEventListener('click', () => { if (_modalIdx > 0)                              { _modalIdx--; _renderModal(); } });
_mNext.addEventListener('click', () => { if (_modalIdx < _modalFrames.length - 1) { _modalIdx++; _renderModal(); } });
document.getElementById('modal-download').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `frame-${_modalIdx + 1}.png`;
    a.href = _mCanvas.toDataURL('image/png');
    a.click();
});
document.addEventListener('keydown', e => {
    if (_modal.hidden) return;
    if (e.key === 'Escape')     { _modal.hidden = true; document.body.style.overflow = ''; }
    if (e.key === 'ArrowLeft'  && _modalIdx > 0)                          { _modalIdx--; _renderModal(); }
    if (e.key === 'ArrowRight' && _modalIdx < _modalFrames.length - 1)   { _modalIdx++; _renderModal(); }
});

// ── Barcode download ──────────────────────────────────────────────────────────

function _dlCanvas(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (!canvas.width) return;
    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    a.click();
}
document.getElementById('dl-rainbow').addEventListener('click',
    () => _dlCanvas('rainbow', 'barcode.png'));
document.getElementById('dl-rainbow-detailed').addEventListener('click',
    () => _dlCanvas('rainbow-detailed', 'barcode-detailed.png'));

// ── Thumbnail interactivity ───────────────────────────────────────────────────

function setupInteractivity(colorSim, sharpSim, sampler, localSharp) {
    const groups = [
        { containerId: 'sharplist',      frames: sharpSim.getFrames() },
        { containerId: 'outputlist',     frames: colorSim.getFrames() },
        { containerId: 'sampler-output', frames: sampler.getFrames() },
        { containerId: 'localsharplist', frames: localSharp.getFrames() },
    ];
    for (const { containerId, frames } of groups) {
        const canvases = [...document.getElementById(containerId).querySelectorAll('canvas')];
        const pairs    = frames.map((frame, i) => ({ frame, canvas: canvases[i] }))
                               .filter(p => p.frame && p.canvas);
        const list     = pairs.map(p => p.frame);
        pairs.forEach(({ canvas }, i) => {
            canvas.style.cursor = 'pointer';
            canvas.addEventListener('click', () => openModal(list, i));
        });
    }
}

// ── Theme ─────────────────────────────────────────────────────────────────────

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = savedTheme ?? (prefersDark ? 'dark' : 'light');

document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
});

// ── Settings persistence ──────────────────────────────────────────────────────

const SETTINGS_KEY = 'sfe-settings';
const PERSISTED_SETTING_IDS = [
    'color-input', 'speed-input', 'sample-input',
    'sampler-count', 'sharp-count', 'color-count', 'scene-count',
];

function _loadSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch {
        return {};
    }
}

for (const id of PERSISTED_SETTING_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;

    const saved = _loadSettings()[id];
    if (saved !== undefined) el.value = saved;

    el.addEventListener('change', () => {
        const settings = _loadSettings();
        settings[id] = el.value;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    });
}

// ── File label & drag-drop ────────────────────────────────────────────────────

document.getElementById('video-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    document.getElementById('file-name').textContent = file ? file.name : 'Choose or drop a video…';
});

const dropZone = document.getElementById('drop-zone');

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('video/')) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('video-input').files = dt.files;
    document.getElementById('file-name').textContent = file.name;
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

    const speedSetting = document.getElementById('speed-input').value;
    const autoSpeed     = speedSetting === 'auto';
    const MIN_RATE = 1;
    const MAX_RATE = 16;
    let currentRate = autoSpeed ? 4 : (parseFloat(speedSetting) || 4);

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

    // Backpressure: cap how far capture can get ahead of the worker so the
    // queue can't grow unbounded at high speeds. Capture pauses at MAX_PENDING
    // and resumes once the backlog drains below RESUME_PENDING.
    const MAX_PENDING    = 40;
    const RESUME_PENDING = 15;
    let pausedForBacklog = false;
    let deferredSeek      = null;
    let lastDropped        = 0;
    const startTime        = performance.now();

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

            setupInteractivity(colorSim, sharpSim, sampler, localSharp);

            progressBar.style.width = '100%';
            progressText.textContent = 'Done!';
            resolve();
        }
    }

    await new Promise((resolve, reject) => {
        const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

        worker.onmessage = ({ data: { sharpScore, colorScore, avgColor, avgColorPerLine } }) => {
            const { frameData, width, height, capture, mediaTime } = pending.shift();
            received++;

            if (pending.length <= RESUME_PENDING) {
                if (pausedForBacklog && !videoEl.ended) {
                    pausedForBacklog = false;
                    videoEl.play().catch(() => {});
                }
                if (deferredSeek !== null) {
                    const seekTo = deferredSeek;
                    deferredSeek = null;
                    videoEl.currentTime = seekTo;
                }
            }

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

                if (autoSpeed && supportsRVFC) {
                    const quality  = videoEl.getVideoPlaybackQuality ? videoEl.getVideoPlaybackQuality() : null;
                    const dropped  = quality ? quality.droppedVideoFrames : 0;
                    const strained = dropped > lastDropped || pending.length > MAX_PENDING / 2;
                    lastDropped    = dropped;
                    currentRate    = strained
                        ? Math.max(MIN_RATE, currentRate / 1.5)
                        : Math.min(MAX_RATE, currentRate * 1.25);
                    videoEl.playbackRate = currentRate;
                }

                const elapsedSec = (performance.now() - startTime) / 1000;
                const fracDone    = mediaTime / videoEl.duration;
                const etaText     = fracDone > 0.01
                    ? `, ~${formatDuration(elapsedSec * (1 - fracDone) / fracDone)} left`
                    : '';
                const speedText = autoSpeed ? `, ${currentRate.toFixed(1)}× speed` : '';

                progressText.textContent = `${pct}%  (${processedFrames} frames processed${speedText}${etaText})`;
                rainbow._updateOutput();
                rainbowDet._updateOutput();
            }

            checkDone(resolve);
        };

        worker.onerror = reject;

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

                    if (pending.length >= MAX_PENDING && !pausedForBacklog) {
                        pausedForBacklog = true;
                        videoEl.pause();
                    }
                }

                if (!videoEl.ended) {
                    videoEl.requestVideoFrameCallback(onFrame);
                } else {
                    videoEnded = true;
                    checkDone(resolve);
                }
            };

            videoEl.addEventListener('ended', () => {
                videoEnded = true;
                checkDone(resolve);
            }, { once: true });

            videoEl.requestVideoFrameCallback(onFrame);
            videoEl.playbackRate = currentRate;
            videoEl.play().catch(reject);

        } else {
            // Fallback: seek-based for browsers without RVFC. Auto speed doesn't
            // apply here — seeking is already frame-accurate with no drop risk.
            progressText.textContent = 'Analyzing… (seek mode)';
            const frameDuration = 1 / videoInfo.frameRate;
            let currentTime = 0;

            const advance = () => {
                currentTime += frameDuration * SAMPLEFREQUENCY;
                if (currentTime > videoEl.duration) {
                    videoEnded = true;
                    checkDone(resolve);
                    return;
                }
                if (pending.length >= MAX_PENDING) {
                    deferredSeek = currentTime;
                } else {
                    videoEl.currentTime = currentTime;
                }
            };

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

                advance();
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
