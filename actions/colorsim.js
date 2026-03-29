import TopXTupleList from '../util/TopXTupleList.js';
import { getAspectRatioDimensions } from "../util/util.js";

class ColorSim {
    async init(topx, thumbsize, videoElement) {
        this.topFrames = new TopXTupleList(topx, 1);
        this.video = videoElement;

        this.intermediaryCanvas = document.createElement("canvas");
        this.intermediaryCanvas.width = this.video.videoWidth;
        this.intermediaryCanvas.height = this.video.videoHeight;
        this.intermediaryCTX = this.intermediaryCanvas.getContext('2d', { willReadFrequently: true });

        this.cdimensions = getAspectRatioDimensions(this.video.videoWidth, this.video.videoHeight, thumbsize, thumbsize);

        const outputListEl = document.getElementById('outputlist');
        const outputs = [];
        this.outputsCTX = [];
        for (let i = 0; i < topx; i++) {
            const newCanvas = document.createElement('canvas');
            newCanvas.width = Math.round(this.cdimensions.width);
            newCanvas.height = Math.round(this.cdimensions.height);
            const newCanvasContainer = document.createElement('div');
            newCanvasContainer.appendChild(newCanvas);
            outputs.push(newCanvasContainer);
            this.outputsCTX.push(newCanvas.getContext('2d'));
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
        for (const [frame, score] of this.topFrames.getSortedArray()) {
            this.intermediaryCTX.putImageData(frame, 0, 0);
            this.outputsCTX[i].drawImage(
                this.intermediaryCanvas,
                0, 0, this.video.videoWidth, this.video.videoHeight,
                0, 0, Math.round(this.cdimensions.width), Math.round(this.cdimensions.height)
            );
            i++;
        }
    }
}

export default ColorSim;
