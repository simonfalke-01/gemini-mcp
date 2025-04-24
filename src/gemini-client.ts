/**
 * Gemini Client - Provides access to Google's Generative AI models
 * 
 * This module initializes and manages the connection to Google's Gemini API.
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { logger } from "./utils/logger.js";

// Global clients
let genAI: GoogleGenerativeAI;
let geminiProModel: GenerativeModel;
let geminiFlashModel: GenerativeModel;

/**
 * Initialize the Gemini client with configured models
 */
export async function initGeminiClient(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  
  try {
    // Initialize the API client
    genAI = new GoogleGenerativeAI(apiKey);
    
    // Set up models
    const proModelName = process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro-preview-03-25";
    const flashModelName = process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash-preview-04-17";
    
    geminiProModel = genAI.getGenerativeModel({ model: proModelName });
    geminiFlashModel = genAI.getGenerativeModel({ model: flashModelName });
    
    // Test connection with timeout and retry
    let connected = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!connected && attempts < maxAttempts) {
      try {
        attempts++;
        logger.info(`Connecting to Gemini API (attempt ${attempts}/${maxAttempts})...`);
        
        // Set up a timeout for the connection test
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Connection timeout")), 10000);
        });
        
        // Test connection
        const connectionPromise = geminiFlashModel.generateContent("Test connection");
        const result = await Promise.race([connectionPromise, timeoutPromise]);
        
        if (!result) {
          throw new Error("Failed to connect to Gemini API: empty response");
        }
        
        connected = true;
        logger.info(`Successfully connected to Gemini API`);
        logger.info(`Pro model: ${proModelName}`);
        logger.info(`Flash model: ${flashModelName}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Connection attempt ${attempts} failed: ${errorMessage}`);
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to connect to Gemini API after ${maxAttempts} attempts: ${errorMessage}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    logger.error("Failed to initialize Gemini client:", error);
    throw error;
  }
}

/**
 * Generate content using the Gemini Pro model
 */
export async function generateWithGeminiPro(prompt: string): Promise<string> {
  try {
    logger.prompt(prompt);
    
    const result = await geminiProModel.generateContent(prompt);
    const response = result.response.text();
    
    logger.response(response);
    return response;
  } catch (error) {
    logger.error("Error generating content with Gemini Pro:", error);
    throw error;
  }
}

/**
 * Generate content using the Gemini Flash model
 */
export async function generateWithGeminiFlash(prompt: string): Promise<string> {
  try {
    logger.prompt(prompt);
    
    const result = await geminiFlashModel.generateContent(prompt);
    const response = result.response.text();
    
    logger.response(response);
    return response;
  } catch (error) {
    logger.error("Error generating content with Gemini Flash:", error);
    throw error;
  }
}

/**
 * Generate content with a structured chat history
 */
export async function generateWithChat(
  messages: { role: "user" | "model"; content: string }[],
  useProModel = true
): Promise<string> {
  try {
    const model = useProModel ? geminiProModel : geminiFlashModel;
    const chat = model.startChat();
    
    logger.debug("Starting chat with messages:", JSON.stringify(messages, null, 2));
    
    // Add all messages to the chat
    for (const message of messages) {
      if (message.role === "user") {
        logger.prompt(message.content);
        await chat.sendMessage(message.content);
      }
    }
    
    // Send the last message if it's from the user
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") {
      logger.prompt(lastMessage.content);
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response.text();
      
      logger.response(response);
      return response;
    } else {
      // If the last message is from the model, we don't need to send anything
      return lastMessage.content;
    }
  } catch (error) {
    logger.error("Error generating content with chat:", error);
    throw error;
  }
}