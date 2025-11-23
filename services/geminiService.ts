import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, ModelType, SOCRATIC_SYSTEM_INSTRUCTION } from "../types";

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
 * Sends a message to the Gemini model with history and optional images
 */
export const sendMessageToGemini = async (
  history: Message[],
  currentText: string,
  currentImages: string[] = []
): Promise<AsyncGenerator<string, void, unknown>> => {
  
  // Robust API Key Retrieval
  // Default to the user's hardcoded key immediately
  let apiKey = "AIzaSyA9sVYVJDLiMk57790CSw3syh0LM2nKZxU";

  // Attempt to override with environment variable if present and valid
  try {
    if (process.env.API_KEY && process.env.API_KEY.trim() !== '') {
      apiKey = process.env.API_KEY;
    }
  } catch (e) {
    // process is not defined, ignore and use default
  }

  // Double check window polyfill just in case
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.process?.env?.API_KEY && win.process.env.API_KEY.trim() !== '') {
      apiKey = win.process.env.API_KEY;
    }
  }

  if (!apiKey) {
    // This should theoretically never happen due to the default let declaration above
    throw new Error("API Key is missing. Please check your configuration.");
  }

  // Initialize inside the function to avoid module-level crashes
  const ai = new GoogleGenAI({ 
    apiKey: apiKey
  });
  
  // Construct the history for the chat
  const previousHistory: Content[] = history.map(msg => {
    const parts: Part[] = [];
    
    // Add existing images from history
    if (msg.images && msg.images.length > 0) {
      msg.images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: getMimeType(img),
            data: cleanBase64(img)
          }
        });
      });
    }
    
    // Add text part
    parts.push({ text: msg.text });

    return {
      role: msg.role,
      parts: parts
    };
  });

  const chat = ai.chats.create({
    model: ModelType.GEMINI_FLASH,
    history: previousHistory,
    config: {
      systemInstruction: SOCRATIC_SYSTEM_INSTRUCTION,
      thinkingConfig: {
        thinkingBudget: 16000, // Adjusted budget for Flash model
      },
    }
  });

  // Prepare the current message parts
  const currentParts: Part[] = [];
  
  // Add new images
  if (currentImages && currentImages.length > 0) {
    currentImages.forEach(img => {
      currentParts.push({
        inlineData: {
          mimeType: getMimeType(img),
          data: cleanBase64(img)
        }
      });
    });
  }
  
  if (currentText) {
    currentParts.push({ text: currentText });
  } else if (currentParts.length === 0) {
    // If no text and no images (shouldn't happen due to UI checks, but safe fallback)
    currentParts.push({ text: "Please help me with this." }); 
  }

  // Use sendMessageStream for a better UX
  // Note: For gemini-2.5-flash, passing content parts directly is supported
  const messageContent = currentParts.length === 1 && currentParts[0].text 
    ? currentParts[0].text 
    : currentParts;

  const result = await chat.sendMessageStream({
    message: messageContent
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
