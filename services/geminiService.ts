import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, ModelType, SOCRATIC_SYSTEM_INSTRUCTION } from "../types";

// Initialize the client
// NOTE: We are using the provided API key as a fallback. 
// In a production environment, it is recommended to use process.env.API_KEY exclusively.
const ai = new GoogleGenAI({ 
  apiKey: process.env.API_KEY || "AIzaSyA9sVYVJDLiMk57790CSw3syh0LM2nKZxU" 
});

/**
 * Converts a base64 string (data URL) to a clean base64 string for the API
 */
const cleanBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1] || dataUrl;
};

/**
 * Determines the mime type from a data URL
 */
const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
  return match ? match[1] : 'image/jpeg';
};

/**
 * Sends a message to the Gemini model with history and optional image
 */
export const sendMessageToGemini = async (
  history: Message[],
  currentText: string,
  currentImage?: string
): Promise<AsyncGenerator<string, void, unknown>> => {
  
  // Construct the history for the chat
  const previousHistory: Content[] = history.map(msg => ({
    role: msg.role,
    parts: msg.image 
      ? [
          {
             inlineData: {
               mimeType: getMimeType(msg.image),
               data: cleanBase64(msg.image)
             }
          },
          { text: msg.text }
        ]
      : [{ text: msg.text }]
  }));

  const chat = ai.chats.create({
    model: ModelType.GEMINI_3_PRO,
    history: previousHistory,
    config: {
      systemInstruction: SOCRATIC_SYSTEM_INSTRUCTION,
      thinkingConfig: {
        thinkingBudget: 32768, // Max budget for deep reasoning
      },
      // Explicitly ensuring maxOutputTokens is not set to allow full thinking + response
      maxOutputTokens: undefined, 
    }
  });

  // Prepare the current message parts
  const parts: Part[] = [];
  
  if (currentImage) {
    parts.push({
      inlineData: {
        mimeType: getMimeType(currentImage),
        data: cleanBase64(currentImage)
      }
    });
  }
  
  if (currentText) {
    parts.push({ text: currentText });
  } else if (!currentImage) {
    parts.push({ text: "Please help me with this." }); 
  }

  // Use sendMessageStream for a better UX
  const result = await chat.sendMessageStream({
    message: parts.length === 1 && parts[0].text ? parts[0].text : parts
  });

  // Generator to yield chunks as they arrive
  async function* streamGenerator() {
    for await (const chunk of result) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  return streamGenerator();
};