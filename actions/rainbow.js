class Rainbow {
    async init(height, sampleSize = 1) {
        this.canvasHeight = height;
        this.sampleSize = sampleSize;
        this.outputCanvas = document.getElementById('rainbow');
        this.outputCanvas.height = height;
        this.avgColors = [];
        return this;
    }

    /** Called with pre-computed avgColor from worker */
    addAvgColor(color) {
        this.avgColors.push(color);
    }

    finish() {
        this._updateOutput();
    }

    _updateOutput() {
        const sampled = [];
        let acc = { r: 0, g: 0, b: 0 };
        for (const [index, color] of this.avgColors.entries()) {
            acc.r += color.r;
            acc.g += color.g;
            acc.b += color.b;
            if ((index + 1) % this.sampleSize === 0) {
                sampled.push({ r: acc.r / this.sampleSize, g: acc.g / this.sampleSize, b: acc.b / this.sampleSize });
                acc = { r: 0, g: 0, b: 0 };
            }
        }

        this.outputCanvas.width = sampled.length;
        const ctx = this.outputCanvas.getContext('2d');
        for (const [index, color] of sampled.entries()) {
            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            ctx.fillRect(index, 0, 1, this.canvasHeight);
        }
    }
}

export default Rainbow;
