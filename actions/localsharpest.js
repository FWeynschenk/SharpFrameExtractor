import { getAspectRatioDimensions } from "../util/util.js";

/**
 * Divides the video into N equal time segments and keeps the single
 * sharpest frame in each segment.  This guarantees the results are
 * spread across the full video rather than clustering in one sharp scene.
 */
class LocalSharpest {
    async init(segmentCount, thumbsize, duration, videoElement) {
        this.segmentCount = segmentCount;
        this.duration = duration;
        this.segmentDuration = duration / segmentCount;
        this.video = videoElement;

        this.cdimensions = getAspectRatioDimensions(
            videoElement.videoWidth, videoElement.videoHeight, thumbsize, thumbsize
        );

        // Best frame per segment: null until first candidate arrives
        this.segments = new Array(segmentCount).fill(null);

        this.intermediaryCanvas = document.createElement('canvas');
        this.intermediaryCanvas.width = videoElement.videoWidth;
        this.intermediaryCanvas.height = videoElement.videoHeight;
        this.intermediaryCTX = this.intermediaryCanvas.getContext('2d', { willReadFrequently: true });

        const container = document.getElementById('localsharplist');
        this.outputsCTX = [];
        const canvases = [];
        for (let i = 0; i < segmentCount; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(this.cdimensions.width);
            canvas.height = Math.round(this.cdimensions.height);
            this.outputsCTX.push(canvas.getContext('2d'));
            canvases.push(canvas);
        }
        container.replaceChildren(...canvases);
        return this;
    }

    /**
     * @param {ImageData} frame
     * @param {number}    score      — Laplacian variance (higher = sharper)
     * @param {number}    mediaTime  — current position in the video (seconds)
     */
    addResult(frame, score, mediaTime) {
        const segIdx = Math.min(
            Math.floor(mediaTime / this.segmentDuration),
            this.segmentCount - 1
        );

        if (!this.segments[segIdx] || score > this.segments[segIdx].score) {
            // Clone — the same ImageData is shared with other action classes
            this.segments[segIdx] = {
                frameData: new Uint8ClampedArray(frame.data),
                width: frame.width,
                height: frame.height,
                score
            };
        }
    }

    finish() {
        this._updateOutputs();
    }

    getFrames() {
        return this.segments.map((seg, i) => {
            if (!seg) return null;
            return {
                imageData: new ImageData(new Uint8ClampedArray(seg.frameData), seg.width, seg.height),
                label: formatTime(this.segmentDuration * i)
            };
        }).filter(Boolean);
    }

    _updateOutputs() {
        const w = Math.round(this.cdimensions.width);
        const h = Math.round(this.cdimensions.height);
        for (let i = 0; i < this.segmentCount; i++) {
            const seg = this.segments[i];
            if (!seg) continue;
            const frame = new ImageData(seg.frameData, seg.width, seg.height);
            this.intermediaryCTX.putImageData(frame, 0, 0);
            this.outputsCTX[i].drawImage(
                this.intermediaryCanvas,
                0, 0, this.video.videoWidth, this.video.videoHeight,
                0, 0, w, h
            );
            // Segment label
            const ctx = this.outputsCTX[i];
            ctx.font = "bold 12px Segoe UI";
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, 80, 20);
            ctx.fillStyle = '#fff';
            const t0 = this.segmentDuration * i;
            ctx.fillText(formatTime(t0), 4, 14);
        }
    }
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
}

export default LocalSharpest;
