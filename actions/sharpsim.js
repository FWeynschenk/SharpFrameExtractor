import TopXTupleList from '../util/TopXTupleList.js';
import { getAspectRatioDimensions } from "../util/util.js";

class SharpSim {
    async init(topx, thumbsize, videoElement) {
        this.topFrames = new TopXTupleList(topx, 1);
        this.video = videoElement;

        this.intermediaryCanvas = document.createElement("canvas");
        this.intermediaryCanvas.width = this.video.videoWidth;
        this.intermediaryCanvas.height = this.video.videoHeight;
        this.intermediaryCTX = this.intermediaryCanvas.getContext('2d', { willReadFrequently: true });

        this.cdimensions = getAspectRatioDimensions(this.video.videoWidth, this.video.videoHeight, thumbsize, thumbsize);

        const outputListEl = document.getElementById('sharplist');
        const outputs = [];
        this.outputsCTX = [];
        for (let i = 0; i < topx; i++) {
            const newCanvas = document.createElement('canvas');
            newCanvas.width = Math.round(this.cdimensions.width);
            newCanvas.height = Math.round(this.cdimensions.height);
            const newCanvasContainer = document.createElement('div');
            newCanvasContainer.appendChild(newCanvas);
            outputs.push(newCanvasContainer);
            const ctx = newCanvas.getContext('2d');
            ctx.font = "bold 13px Segoe UI";
            this.outputsCTX.push(ctx);
        }
        outputListEl.replaceChildren(...outputs);
        return this;
    }

    addResult(frame, score) {
        this.topFrames.insert([frame, score]);
    }

    finish() {
        this._updateOutputs();
    }

    _updateOutputs() {
        let i = 0;
        const w = Math.round(this.cdimensions.width);
        const h = Math.round(this.cdimensions.height);
        for (const [frame, score] of this.topFrames.getSortedArray()) {
            this.intermediaryCTX.putImageData(frame, 0, 0);
            this.outputsCTX[i].drawImage(
                this.intermediaryCanvas,
                0, 0, this.video.videoWidth, this.video.videoHeight,
                0, 0, w, h
            );
            this.outputsCTX[i].fillStyle = 'rgba(0,0,0,0.55)';
            this.outputsCTX[i].fillRect(0, 0, 130, 22);
            this.outputsCTX[i].fillStyle = '#fff';
            this.outputsCTX[i].fillText(`score: ${score.toFixed(1)}`, 6, 15);
            i++;
        }
    }
}

export default SharpSim;
