import { GoogleGenAI, Modality } from "@google/genai";
import { OCR_PROMPT, VISION_MODEL, TTS_MODEL } from "../constants";
import { performOfflineOCR } from "./ocrFallback";
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// --- Helper Functions for PCM to WAV Conversion ---

const base64ToUint8Array = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const uint8ArrayToBase64 = (bytes) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const convertPCMtoWAV = (pcmData, sampleRate = 24000) => {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + pcmData.length, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count (mono)
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcmData.length, true);

    const wavHeader = new Uint8Array(header);
    const wavFile = new Uint8Array(wavHeader.length + pcmData.length);
    wavFile.set(wavHeader);
    wavFile.set(pcmData, wavHeader.length);

    return wavFile;
};

// --- Main Function ---

export const generateAudioFromImage = async (base64Image, useOfflineMode = true) => {
    // Ensure base64 string is clean
    const cleanBase64 = base64Image.includes(',')
        ? base64Image.split(',')[1]
        : base64Image;

    // Offline Mode
    if (useOfflineMode) {
        console.log("Mode: Offline (ML Kit & Expo Speech)");
        const offlineText = await performOfflineOCR(cleanBase64);
        if (offlineText) {
            return { type: 'text', content: offlineText };
        } else {
            throw new Error('Offline OCR failed to extract text');
        }
    }

    // Online Mode
    try {
        if (!API_KEY) {
            throw new Error('Gemini API Key is missing');
        }

        const ai = new GoogleGenAI({ apiKey: API_KEY });

        // --- STEP 1: VISION (OCR) ---
        console.log("Step 1: Extracting text with", VISION_MODEL);

        const response = await ai.models.generateContent({
            model: VISION_MODEL,
            contents: [
                {
                    parts: [
                        { text: OCR_PROMPT },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: cleanBase64,
                            },
                        },
                    ],
                },
            ],
        });

        const extractedText = response.text;

        if (!extractedText || extractedText.trim().length < 2) {
            throw new Error('OCR found no text');
        }

        console.log("Extracted Text:", extractedText.substring(0, 50) + "...");

        // --- STEP 2: TTS (Text-to-Speech) ---
        console.log("Step 2: Generating audio with", TTS_MODEL);

        const ttsPrompt = `Read the following Bengali text slowly and with warmth: ${extractedText}`;

        const ttsResponse = await ai.models.generateContent({
            model: TTS_MODEL,
            contents: {
                parts: [{ text: ttsPrompt }]
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }
                    }
                }
            }
        });

        const candidates = ttsResponse.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content?.parts;
            if (parts && parts.length > 0) {
                // Look for the part containing inlineData with audio
                const audioPart = parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio'));
                if (audioPart && audioPart.inlineData) {
                    const audioBase64 = audioPart.inlineData.data;
                    const mimeType = audioPart.inlineData.mimeType;

                    console.log("Audio MIME Type:", mimeType);

                    // Convert PCM to WAV
                    // Default sample rate for Gemini TTS is 24000Hz
                    let sampleRate = 24000;
                    if (mimeType && mimeType.includes('rate=')) {
                        const rateMatch = mimeType.match(/rate=(\d+)/);
                        if (rateMatch) {
                            sampleRate = parseInt(rateMatch[1], 10);
                        }
                    }
                    console.log(`Converting PCM to WAV with sample rate: ${sampleRate}Hz`);

                    const pcmData = base64ToUint8Array(audioBase64);
                    const wavData = convertPCMtoWAV(pcmData, sampleRate);
                    const wavBase64 = uint8ArrayToBase64(wavData);

                    // Unique filename
                    const timestamp = new Date().getTime();
                    const audioUri = FileSystem.cacheDirectory + `gemini_tts_${timestamp}.wav`;

                    // Write file
                    await FileSystem.writeAsStringAsync(audioUri, wavBase64, {
                        encoding: 'base64',
                    });

                    // Verify file exists and has size
                    const fileInfo = await FileSystem.getInfoAsync(audioUri);
                    if (!fileInfo.exists || fileInfo.size === 0) {
                        throw new Error("Audio file was not written correctly");
                    }
                    console.log(`Audio saved to ${audioUri}, size: ${fileInfo.size} bytes`);

                    return { type: 'audio', content: audioUri };
                }
            }
        }

        console.warn("Gemini TTS failed to generate audio, falling back to text.");
        return { type: 'text', content: extractedText };

    } catch (error) {
        console.error('Gemini API Call Failed:', error);
        console.log("Switching to Offline Fallback...");

        const offlineText = await performOfflineOCR(cleanBase64);

        if (offlineText) {
            return { type: 'text', content: offlineText };
        }

        throw error;
    }
};
