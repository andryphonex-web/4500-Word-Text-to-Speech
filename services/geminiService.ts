import { GoogleGenAI, Modality } from "@google/genai";
import { Mode, Speaker } from "../types";

const API_KEY = process.env.API_KEY;

interface GenerateSpeechParams {
  text: string;
  mode: Mode;
  singleSpeakerVoice: string;
  multiSpeakers: Speaker[];
  temperature: number;
}

export async function generateSpeech({
  text,
  mode,
  singleSpeakerVoice,
  multiSpeakers,
  temperature,
}: GenerateSpeechParams): Promise<string> {
  if (!API_KEY) {
    throw new Error("API_KEY is not set in environment variables.");
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  let speechConfig;

  if (mode === Mode.Single) {
    speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: singleSpeakerVoice },
      },
    };
  } else {
    speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: multiSpeakers.map((speaker) => ({
          speaker: speaker.name,
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: speaker.voice },
          },
        })),
      },
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig,
        temperature: temperature,
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data received from API.");
    }
    
    return base64Audio;

  } catch (error) {
    console.error("Error generating speech:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate speech: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating speech.");
  }
}
