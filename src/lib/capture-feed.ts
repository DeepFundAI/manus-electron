// src/utils/window-capture.ts
type CaptureFn = (windowNumber: number, scale?: number) => {
  width: number;
  height: number;
  stride: number;   // Usually = width * 4
  data: Uint8Array | Buffer; // RGBA or BGRA
};

export interface CaptureOptions {
  fps?: number;           // Default 30
  scale?: number;         // Scale passed to native capture, default 1
  pixelFormat?: 'rgba' | 'bgra'; // Native output pixel format, default 'rgba'
}

/**
 * Use native capture function to continuously capture frames, generate MediaStream, and feed directly to <video>.srcObject
 * Won't use offscreen rendering/transparent/scaled window methods.
 */
export function createWindowCaptureStreamUsing(
  captureFn: CaptureFn,
  windowNumber: number,
  options: CaptureOptions = {}
): MediaStream {
  const fps = Math.max(1, options.fps ?? 30);
  const scale = options.scale ?? 1;
  const fmt = options.pixelFormat ?? 'rgba';
  const interval = Math.max(5, Math.floor(1000 / fps));

  // Generate video track
  // Electron(Chromium) supports MediaStreamTrackGenerator
  const generator = new (window as any).MediaStreamTrackGenerator({ kind: 'video' });
  const writer: WritableStreamDefaultWriter<any> = generator.writable.getWriter();
  const stream = new MediaStream([generator]);

  // Reuse a canvas for copying, prefer OffscreenCanvas to avoid page reflow
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    'OffscreenCanvas' in window ? new (window as any).OffscreenCanvas(2, 2) : (() => {
      const c = document.createElement('canvas'); c.width = 2; c.height = 2; return c;
    })();

  const ctx = (canvas as any).getContext('2d', { willReadFrequently: true }) as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  let running = true;
  let timer: any = null;

  function ensureCanvas(w: number, h: number) {
    if ((canvas as any).width !== w) (canvas as any).width = w;
    if ((canvas as any).height !== h) (canvas as any).height = h;
  }

  // If native outputs BGRA, convert to RGBA here (ImageData requires RGBA)
  function bgraToRgba(buf: Uint8ClampedArray) {
    // Swap R/B: [B,G,R,A] -> [R,G,B,A]
    for (let i = 0; i < buf.length; i += 4) {
      const b = buf[i], r = buf[i + 2];
      buf[i] = r;        // R
      buf[i + 2] = b;    // B
      // G, A unchanged
    }
    return buf;
  }

  async function tick() {
    if (!running) return;

    try {
      const frame = await captureFn(windowNumber, scale);
      const { width, height, stride } = frame;
      if (!width || !height) throw new Error('empty frame');

      ensureCanvas(width, height);

      // Extract RGBA pixels
      const raw = frame.data instanceof Uint8Array ? frame.data : new Uint8Array(frame.data as any);
      // Usually stride = width*4; if not, underlying data has row alignment, need row-by-row copy
      let rgba: Uint8ClampedArray;

      if (stride === width * 4) {
        rgba = new Uint8ClampedArray(raw.buffer, raw.byteOffset, width * height * 4);
      } else {
        // Row alignment handling: copy valid pixels from each row to compact memory
        rgba = new Uint8ClampedArray(width * height * 4);
        let src = raw.byteOffset;
        const srcView = new Uint8Array(raw.buffer);
        let dst = 0;
        for (let y = 0; y < height; y++) {
          // Copy one row of valid pixels
          rgba.set(srcView.subarray(src, src + width * 4), dst);
          src += stride;
          dst += width * 4;
        }
      }

      if (fmt === 'bgra') {
        bgraToRgba(rgba); // Convert to RGBA
      }

      // Draw to Canvas
      const imgData = new ImageData(rgba, width, height);
      (ctx as any).putImageData(imgData, 0, 0);

      // Use WebCodecs to generate VideoFrame and write to track
      // timestamp unit is microseconds (us)
      const vf = new (window as any).VideoFrame(canvas, { timestamp: Math.floor(performance.now() * 1000) });
      // Backpressure: yield when desiredSize<=0
      if ((writer as any).desiredSize !== undefined && (writer as any).desiredSize <= 0) {
        // Can drop frame or wait; here choose to drop frame to reduce latency
        // await new Promise(r => setTimeout(r, 0));
      }
      await writer.write(vf);
      vf.close();
    } catch (err) {
      console.error('[createWindowCaptureStreamUsing] capture error:', err);
      // Don't interrupt, continue to next frame
    } finally {
      if (running) timer = setTimeout(tick, interval);
    }
  }

  tick();

  // Provide close: attach to track.stop()
  const [videoTrack] = stream.getVideoTracks();
  const origStop = videoTrack.stop.bind(videoTrack);
  (videoTrack as any).stop = () => {
    running = false;
    clearTimeout(timer);
    try { writer.close(); } catch {}
    origStop();
  };

  return stream;
}
