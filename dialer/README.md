# Voicebox Dialer Media Gateway

This directory contains the first supervised outbound-call proof for Voicebox and RingCentral.

The current slice does exactly one thing:

1. Generate a greeting with an existing Voicebox profile.
2. Convert the WAV output to 16 kHz mono signed PCM.
3. Register a headless RingCentral softphone.
4. Place one outbound test call.
5. Stream the generated greeting into the call.
6. Optionally hang up after playback.

It does not yet implement campaign dialing, CRM synchronization, speech recognition, LLM turn-taking, human takeover, or reliable remote-answer detection.

## Requirements

- Node.js 20 or newer
- Bun or another npm-compatible package manager
- FFmpeg available on `PATH`
- Voicebox running locally or at a reachable URL
- A RingCentral **Existing Phone** device with manual SIP credentials

RingCentral API device type `OtherPhone` corresponds to **Existing Phone** in the Admin Portal. A RingCentral Desktop App device cannot be used by the headless softphone SDK.

## Setup

```bash
cd dialer
cp .env.example .env
bun install
```

Fill in `.env`:

- `VOICEBOX_PROFILE_ID`: an existing Voicebox voice profile ID
- `DIAL_TO_NUMBER`: an approved test destination
- `SIP_*`: credentials from RingCentral manual SIP provisioning

Export the values before running. Node does not load `.env` automatically in this initial scaffold.

```bash
set -a
source .env
set +a
bun run dev
```

On Windows PowerShell, set the values in the current session or use a local environment loader.

## RingCentral outbound-answer limitation

The RingCentral headless softphone SDK receives an outbound `answered` event immediately because the SIP service returns `200 OK` before the remote party actually answers. The event therefore cannot be used as trustworthy answer detection.

For this first media proof, `CALL_MEDIA_START_DELAY_MS` controls how long the gateway waits after creating the call before streaming the greeting. This is intentionally temporary. The next integration layer should correlate the SIP call with RingCentral Call Control or telephony-session events and begin media only after the remote party is truly connected.

## Audio format

Voicebox returns a normal WAV file. The RingCentral SDK's default `OPUS/16000` media path expects uncompressed signed 16-bit little-endian PCM at 16 kHz. `src/audio.ts` uses FFmpeg to perform that conversion before calling `streamAudio()`.

## Next milestones

1. Add RingCentral Call Control answer-state correlation.
2. Capture inbound PCM from `audioPacket` events.
3. Feed buffered speech into Voicebox transcription.
4. Add interruption and end-of-turn detection.
5. Add a constrained conversation orchestrator and approved knowledge retrieval.
6. Add supervisor monitoring and audio-level human takeover.
