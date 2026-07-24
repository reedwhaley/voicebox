export interface VoiceboxGenerationRequest {
  profileId: string;
  text: string;
  language?: string;
}

export class VoiceboxClient {
  public constructor(private readonly baseUrl: string) {}

  public async generateWav(request: VoiceboxGenerationRequest): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/generate/stream`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profile_id: request.profileId,
        text: request.text,
        language: request.language ?? "en",
        normalize: true,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Voicebox generation failed (${response.status}): ${detail}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("audio/wav") && !contentType.includes("audio/x-wav")) {
      throw new Error(`Voicebox returned unexpected content type: ${contentType || "missing"}`);
    }

    const wav = Buffer.from(await response.arrayBuffer());
    if (wav.length < 44 || wav.subarray(0, 4).toString("ascii") !== "RIFF") {
      throw new Error("Voicebox returned an invalid WAV payload");
    }
    return wav;
  }
}
