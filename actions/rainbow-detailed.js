class RainbowDetailed {
    async init(frameWidth, frameHeight, sampleSize = 1) {
        this.frameHeight = frameHeight;
        this.frameWidth = frameWidth;
        this.sampleSize = sampleSize;
        this.outputCanvas = document.getElementById('rainbow-detailed');
        this.outputCanvas.height = frameHeight;
        this.avgColors = [];
        return this;
    }

    /** Called with pre-computed avgColorPerLine from worker */
    addAvgLines(lines) {
        this.avgColors.push(lines);
    }

    finish() {
        this._updateOutput();
    }

    _updateOutput() {
        // Group frames in batches of sampleSize, averaging per-line colors across each batch
        const sampled = [];
        for (let i = 0; i < this.avgColors.length; i += this.sampleSize) {
            const batch = this.avgColors.slice(i, i + this.sampleSize);
            const lineCount = batch[0].length;
            const avgLines = [];
            for (let y = 0; y < lineCount; y++) {
                let r = 0, g = 0, b = 0;
                for (const frame of batch) {
                    r += frame[y].r;
                    g += frame[y].g;
                    b += frame[y].b;
                }
                avgLines.push({ r: r / batch.length, g: g / batch.length, b: b / batch.length });
            }
            sampled.push(avgLines);
        }

        this.outputCanvas.width = sampled.length;
        const ctx = this.outputCanvas.getContext('2d');
        for (const [x, lines] of sampled.entries()) {
            for (const [y, color] of lines.entries()) {
                ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
}

export default RainbowDetailed;
