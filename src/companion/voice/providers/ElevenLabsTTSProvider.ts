export type ElevenLabsSpeakOptions = {
  apiKey: string;
  voiceId: string;
  modelId?: string;
  text: string;
};

export type ElevenLabsVoice = {
  voiceId: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
};

export class ElevenLabsTTSProviderError extends Error {
  code?: string;
  noBrowserFallback?: boolean;

  constructor(message: string, options?: { code?: string; noBrowserFallback?: boolean }) {
    super(message);
    this.name = 'ElevenLabsTTSProviderError';
    this.code = options?.code;
    this.noBrowserFallback = options?.noBrowserFallback;
  }
}

const getElevenLabsErrorCode = (body: string) => {
  try {
    const parsed = JSON.parse(body);
    return parsed?.detail?.status || parsed?.detail?.code || parsed?.status || parsed?.code;
  } catch {
    return body.includes('paid_plan_required') ? 'paid_plan_required' : undefined;
  }
};

const toUserFacingError = (body: string, fallback: string) => {
  const code = getElevenLabsErrorCode(body);
  if (code === 'paid_plan_required') {
    return {
      code,
      message: 'This voice requires a paid ElevenLabs subscription. Please select another voice.',
      noBrowserFallback: true,
    };
  }

  return {
    code,
    message: body || fallback,
    noBrowserFallback: false,
  };
};

export class ElevenLabsTTSProvider {
  static async listVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
    if (!apiKey.trim()) throw new Error('ElevenLabs API key is missing.');

    const endpoint = 'https://api.elevenlabs.io/v2/voices';
    console.info('[ElevenLabsTTSProvider] Fetching voices', {
      endpoint,
      apiKeyExists: Boolean(apiKey.trim()),
      headers: {
        'xi-api-key': '[redacted]',
      },
    });

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    console.info('[ElevenLabsTTSProvider] Voices response received', {
      status: response.status,
      ok: response.ok,
      contentType,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[ElevenLabsTTSProvider] Voice list request failed', {
        status: response.status,
        contentType,
        body: detail,
      });
      throw new Error(detail || `ElevenLabs voice list request failed (${response.status}).`);
    }

    const data = await response.json();
    const voices = Array.isArray(data?.voices) ? data.voices : [];
    return voices
      .map((voice: any): ElevenLabsVoice | null => {
        const voiceId = String(voice.voice_id || voice.voiceId || '').trim();
        if (!voiceId) return null;
        return {
          voiceId,
          name: String(voice.name || 'Unnamed voice'),
          category: voice.category ? String(voice.category) : undefined,
          labels: voice.labels && typeof voice.labels === 'object' ? voice.labels : undefined,
        };
      })
      .filter(Boolean) as ElevenLabsVoice[];
  }

  static async synthesize(options: ElevenLabsSpeakOptions) {
    if (!options.apiKey.trim()) throw new Error('ElevenLabs API key is missing.');
    if (!options.voiceId.trim()) throw new Error('ElevenLabs voice ID is missing.');

    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(options.voiceId)}`;
    console.info('[ElevenLabsTTSProvider] Sending TTS request', {
      endpoint,
      apiKeyExists: Boolean(options.apiKey.trim()),
      voiceIdExists: Boolean(options.voiceId.trim()),
      modelId: options.modelId || 'eleven_multilingual_v2',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': '[redacted]',
      },
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': options.apiKey,
      },
      body: JSON.stringify({
        text: options.text,
        model_id: options.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
        },
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    console.info('[ElevenLabsTTSProvider] TTS response received', {
      status: response.status,
      ok: response.ok,
      contentType,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[ElevenLabsTTSProvider] TTS request failed', {
        status: response.status,
        contentType,
        body: detail,
      });
      const parsedError = toUserFacingError(detail, `ElevenLabs request failed (${response.status}).`);
      throw new ElevenLabsTTSProviderError(parsedError.message, {
        code: parsedError.code,
        noBrowserFallback: parsedError.noBrowserFallback,
      });
    }

    if (!contentType.toLowerCase().startsWith('audio/')) {
      const detail = await response.text().catch(() => '');
      console.error('[ElevenLabsTTSProvider] TTS response was not audio', {
        status: response.status,
        contentType,
        body: detail,
      });
      const parsedError = toUserFacingError(detail, `ElevenLabs returned non-audio response (${contentType || 'unknown content type'}).`);
      throw new ElevenLabsTTSProviderError(parsedError.message, {
        code: parsedError.code,
        noBrowserFallback: parsedError.noBrowserFallback,
      });
    }

    return response.blob();
  }
}
