export function getAspectRatioDimensions(videoWidth, videoHeight, canvasWidth, canvasHeight) {
    const videoAspectRatio = videoWidth / videoHeight;
    const canvasAspectRatio = canvasWidth / canvasHeight;
    let newWidth, newHeight;
    if (videoAspectRatio > canvasAspectRatio) {
        newWidth = canvasWidth;
        newHeight = canvasWidth / videoAspectRatio;
    } else {
        newWidth = canvasHeight * videoAspectRatio;
        newHeight = canvasHeight;
    }
    return { width: newWidth, height: newHeight };
}
