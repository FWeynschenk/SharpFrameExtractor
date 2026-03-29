import { exports as MP4Box } from '../util/mp4box.all.js'

export async function getVideoInfo(videoFile) {
    const abuffer = await videoFile.arrayBuffer();
    abuffer.fileStart = 0;

    const mp4boxfile = MP4Box.createFile();
    const result = await new Promise((resolve, reject) => {
        mp4boxfile.onError = (e) => {
            console.warn("getVideoInfo: mp4box parse error (will use fallback frameRate):", e);
            mp4boxfile.flush();
            reject(e);
        }
        mp4boxfile.onReady = (data) => {
            mp4boxfile.flush();
            if (!data.hasMoov) {
                reject();
                console.error("getVideoInfo: NO MOOV");
                return;
            }

            const trk = data.videoTracks[0]; 
            const result = {
                codec: trk.codec,
                codedWidth: trk.video.width,
                codedHeight: trk.video.height,
                frameRate: (trk.nb_samples * trk.movie_timescale)/trk.movie_duration,
            }

            const avcVideoTrack = data.tracks.find(track => track.codec.startsWith('avc1') || track.codec.startsWith('avc3'));
            if (avcVideoTrack) {
                const avcC = avcVideoTrack.sample_desc.avcC;
                if (avcC) {
                    const sps = avcC.SPS[0].nalu; // First SPS
                    const pps = avcC.PPS[0].nalu; // First PPS
                    result.description = new Uint8Array(4 + sps.length + 4 + pps.length);
                    result.description.set([0x00, 0x00, 0x00, 0x01], 0);
                    result.description.set(sps, 4);

                    // Add start code and PPS
                    result.description.set([0x00, 0x00, 0x00, 0x01], 4 + sps.length);
                    result.description.set(pps, 8 + sps.length);
                }
            }
            resolve(result);
        }
        mp4boxfile.appendBuffer(abuffer);
    });

    return result;
}