import Softphone from "ringcentral-softphone";
import type { DialerConfig } from "./config.js";

interface EventEmitterLike {
  once(event: string, listener: (...args: unknown[]) => void): this;
}

interface AudioStreamerLike extends EventEmitterLike {
  stop(): void;
}

interface CallSessionLike extends EventEmitterLike {
  callId?: string;
  sessionId?: string;
  partyId?: string;
  streamAudio(audio: Buffer): AudioStreamerLike;
  hangup(): void;
}

export class RingCentralPhone {
  private readonly softphone: Softphone;

  public constructor(config: DialerConfig) {
    this.softphone = new Softphone({
      domain: config.sip.domain,
      outboundProxy: config.sip.outboundProxy,
      username: config.sip.username,
      password: config.sip.password,
      authorizationId: config.sip.authorizationId,
      codec: "OPUS/16000",
    });

    if (config.ringCentralDebug) {
      this.softphone.enableDebugMode();
    }
  }

  public async register(): Promise<void> {
    await this.softphone.register();
  }

  public async callAndPlay(params: {
    destination: string;
    pcm: Buffer;
    mediaStartDelayMs: number;
    hangupAfterPlayback: boolean;
  }): Promise<void> {
    const session = (await this.softphone.call(params.destination)) as unknown as CallSessionLike;
    console.info("Outbound call created", {
      callId: session.callId,
      sessionId: session.sessionId,
      partyId: session.partyId,
      destination: params.destination,
    });

    // RingCentral's outbound SIP flow emits `answered` immediately, before the
    // remote party necessarily answers. This delay is only for the first media
    // proof. Reliable answer detection will come from Call Control events.
    await delay(params.mediaStartDelayMs);

    const streamer = session.streamAudio(params.pcm);
    await waitForEvent(streamer, "finished");
    console.info("Greeting playback finished");

    if (params.hangupAfterPlayback) {
      session.hangup();
      await waitForEvent(session, "disposed", 10_000).catch(() => undefined);
    }
  }
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForEvent(emitter: EventEmitterLike, event: string, timeoutMs = 120_000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    emitter.once(event, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
