import { getAspectRatioDimensions } from "../util/util.js";

class FrameSampler {
    /**
     * count:    number of frames to capture
     * thumbsize: thumbnail size in px
     * duration:  video duration in seconds
     * videoElement: the video element
     */
    async init(count, thumbsize, duration, videoElement) {
        this.count = count;
        this.video = videoElement;
        this.capturedCount = 0;

        this.cdimensions = getAspectRatioDimensions(
            this.video.videoWidth, this.video.videoHeight, thumbsize, thumbsize
        );

        // Evenly-spaced target timestamps (seconds) across the full duration.
        // Cap at 99.9% of duration so the last frame isn't missed when
        // RVFC doesn't fire at the exact final timestamp.
        const safeDuration = duration * 0.999;
        this.targetTimes = Array.from({ length: count }, (_, i) =>
            (i / Math.max(count - 1, 1)) * safeDuration
        );
        this.nextTargetIdx = 0;
        this.capturedFrames = [];

        this.intermediaryCanvas = document.createElement('canvas');
        this.intermediaryCanvas.width = this.video.videoWidth;
        this.intermediaryCanvas.height = this.video.videoHeight;
        this.intermediaryCTX = this.intermediaryCanvas.getContext('2d', { willReadFrequently: true });

        const container = document.getElementById('sampler-output');
        this.outputsCTX = [];
        const canvases = [];
        for (let i = 0; i < count; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = this.cdimensions.width;
            canvas.height = this.cdimensions.height;
            this.outputsCTX.push(canvas.getContext('2d'));
            canvases.push(canvas);
        }
        container.replaceChildren(...canvases);
        return this;
    }

    /**
     * Check if the frame at this media time should be captured.
     * Advances the internal pointer when a target is hit.
     */
    isTargetTime(mediaTime) {
        if (this.nextTargetIdx >= this.count) return false;
        if (mediaTime >= this.targetTimes[this.nextTargetIdx]) {
            this.nextTargetIdx++;
            return true;
        }
        return false;
    }

    /** Draw a captured frame into the next available slot immediately */
    captureFrame(frame) {
        const slot = this.capturedCount;
        if (slot >= this.count) return;
        this.capturedCount++;
        this.capturedFrames.push(frame);
        this.intermediaryCTX.putImageData(frame, 0, 0);
        this.outputsCTX[slot].drawImage(
            this.intermediaryCanvas,
            0, 0, this.video.videoWidth, this.video.videoHeight,
            0, 0, this.cdimensions.width, this.cdimensions.height
        );
    }

    finish() { /* frames drawn live in captureFrame */ }

    getFrames() {
        return this.capturedFrames.map((imageData, i) => ({
            imageData,
            label: `sample ${i + 1} of ${this.capturedFrames.length}`
        }));
    }
}

export default FrameSampler;
