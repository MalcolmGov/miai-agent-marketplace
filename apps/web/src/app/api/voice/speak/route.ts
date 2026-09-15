import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    let body: { text?: string; voiceId?: string; modelId?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const text = (body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY || "";
    // Default to Malcolm's custom Zara Neural Voice ID, or allow fallback to ElevenLabs' premier voices (e.g. Rachel / custom)
    const voiceId = body.voiceId || process.env.ELEVENLABS_VOICE_ID || "QeKcckTBICc3UuWL7ETc";
    const modelId = body.modelId || process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";

    if (!apiKey) {
      // In local dev without ElevenLabs API key, signal browser speech fallback
      return NextResponse.json({
        ok: true,
        fallback: true,
        provider: "browser_speech_synthesis",
        voiceId,
        message: "ElevenLabs API key not set on local server. Using high-fidelity Web Speech fallback.",
      });
    }

    // Call ElevenLabs Neural Streaming API with optimized latency and premier warmth settings
    let elResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.38,
            similarity_boost: 0.88,
            style: 0.24,
            use_speaker_boost: true,
          },
        }),
      }
    );

    // Universal fallback: if the custom voice ID is not found or fails on this account, retry with standard voice (Rachel)
    const universalFallbackVoice = "21m00Tcm4TlvDq8ikWAM";
    if ((!elResp.ok || !elResp.body) && voiceId !== universalFallbackVoice) {
      const errDetail = await elResp.text().catch(() => "");
      console.warn(`[Voice API] Voice ${voiceId} failed (${elResp.status}: ${errDetail}). Retrying with universal voice ${universalFallbackVoice}...`);
      elResp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${universalFallbackVoice}/stream?optimize_streaming_latency=3`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability: 0.38,
              similarity_boost: 0.88,
              style: 0.24,
              use_speaker_boost: true,
            },
          }),
        }
      );
    }

    if (!elResp.ok || !elResp.body) {
      const errText = await elResp.text().catch(() => "ElevenLabs upstream error");
      console.warn("[Voice API] ElevenLabs final error:", elResp.status, errText);
      return NextResponse.json({
        ok: true,
        fallback: true,
        provider: "browser_speech_synthesis",
        error: errText,
      });
    }

    return new Response(elResp.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal voice error";
    return NextResponse.json({
      ok: true,
      fallback: true,
      provider: "browser_speech_synthesis",
      error: errorMsg,
    });
  }
}
