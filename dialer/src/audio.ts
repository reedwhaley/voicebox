import { spawn } from "node:child_process";

/** Convert a WAV payload into signed 16-bit little-endian, mono, 16 kHz PCM. */
export async function wavToRingCentralPcm(wav: Buffer): Promise<Buffer> {
  const ffmpeg = spawn(
    process.env.FFMPEG_PATH || "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      "pipe:0",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "s16le",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];

  ffmpeg.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
  ffmpeg.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

  const completed = new Promise<Buffer>((resolve, reject) => {
    ffmpeg.once("error", (error) => {
      reject(new Error(`Unable to start ffmpeg: ${error.message}`));
    });
    ffmpeg.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg conversion failed (${code}): ${Buffer.concat(stderr).toString("utf8").trim()}`));
        return;
      }
      const pcm = Buffer.concat(stdout);
      if (pcm.length === 0) {
        reject(new Error("ffmpeg produced an empty PCM payload"));
        return;
      }
      resolve(pcm);
    });
  });

  ffmpeg.stdin.end(wav);
  return completed;
}
