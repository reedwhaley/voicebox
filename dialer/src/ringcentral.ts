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
  cancel(): void;
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
    answerTimeoutMs: number;
    hangupAfterPlayback: boolean;
  }): Promise<void> {
    const session = (await this.softphone.call(params.destination)) as unknown as CallSessionLike;
    console.info("Outbound call created", {
      callId: session.callId,
      sessionId: session.sessionId,
      partyId: session.partyId,
      destination: params.destination,
    });

    const answered = await waitForAnswer(session, params.answerTimeoutMs);
    if (!answered) {
      session.cancel();
      throw new Error(`Call was not answered within ${params.answerTimeoutMs}ms`);
    }

    const streamer = session.streamAudio(params.pcm);
    await waitForEvent(streamer, "finished");
    console.info("Greeting playback finished");

    if (params.hangupAfterPlayback) {
      session.hangup();
      await waitForEvent(session, "disposed", 10_000).catch(() => undefined);
    }
  }
}

async function waitForAnswer(session: CallSessionLike, timeoutMs: number): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    const finish = (value: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    session.once("answered", () => finish(true));
    session.once("busy", () => finish(false));
    session.once("disposed", () => finish(false));
    session.once("failed", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error("RingCentral call failed"));
    });

    const timer = setTimeout(() => finish(false), timeoutMs);
  });
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
