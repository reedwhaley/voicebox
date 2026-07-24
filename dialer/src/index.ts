import { wavToRingCentralPcm } from "./audio.js";
import { loadConfig } from "./config.js";
import { RingCentralPhone } from "./ringcentral.js";
import { VoiceboxClient } from "./voicebox.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const voicebox = new VoiceboxClient(config.voiceboxBaseUrl);
  const phone = new RingCentralPhone(config);

  console.info("Generating greeting through Voicebox");
  const wav = await voicebox.generateWav({
    profileId: config.voiceboxProfileId,
    text: config.greeting,
  });

  console.info("Converting greeting to RingCentral telephony PCM");
  const pcm = await wavToRingCentralPcm(wav);

  console.info("Registering RingCentral softphone");
  await phone.register();

  console.info("Placing supervised test call", { destination: config.dialToNumber });
  await phone.callAndPlay({
    destination: config.dialToNumber,
    pcm,
    mediaStartDelayMs: config.mediaStartDelayMs,
    hangupAfterPlayback: config.hangupAfterGreeting,
  });

  console.info("Test call completed");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
