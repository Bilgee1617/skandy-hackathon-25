/**
 * OCR Configuration
 * 
 * This file allows you to easily configure which OCR method to use
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface OCRConfig {
  method: 'mock' | 'tesseract' | 'google-vision' | 'simple';
  googleVisionApiKey?: string;
  tesseractConfig?: {
    language: string;
    pageSegMode: string;
    charWhitelist?: string;
  };
}

// Default configuration
export const DEFAULT_OCR_CONFIG: OCRConfig = {
  method: 'google-vision', // Using Google Vision API for real OCR
  tesseractConfig: {
    language: 'eng',
    pageSegMode: '6', // Uniform block of text
    charWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?@#$%^&*()_+-=[]{}|;:,.<>?/~` ',
  },
};

// Google Vision API configuration
export const GOOGLE_VISION_CONFIG = {
  apiKey: getGoogleVisionApiKey(),
  apiUrl: 'https://vision.googleapis.com/v1/images:annotate',
};

/**
 * Get Google Vision API key from app configuration
 */
function getGoogleVisionApiKey(): string {
  console.log('=== DEBUGGING API KEY RETRIEVAL ===');
  
  // Get from Constants (Expo managed workflow) - primary method
  const constantsApiKey = Constants.expoConfig?.extra?.googleVisionApiKey;
  console.log('Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
  console.log('Constants API key:', constantsApiKey);
  
  if (constantsApiKey && constantsApiKey !== 'YOUR_GOOGLE_VISION_API_KEY' && constantsApiKey !== 'YOUR_GOOGLE_VISION_API_KEY_HERE') {
    console.log('✅ Using Constants API key');
    return constantsApiKey;
  }
  
  // Try environment variables as fallback
  const envApiKey = process.env.GOOGLE_VISION_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;
  console.log('Environment variables check:');
  console.log('process.env.GOOGLE_VISION_API_KEY:', process.env.GOOGLE_VISION_API_KEY);
  console.log('process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY:', process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY);
  
  if (envApiKey && envApiKey !== 'YOUR_GOOGLE_VISION_API_KEY' && envApiKey !== 'YOUR_GOOGLE_VISION_API_KEY_HERE') {
    console.log('✅ Using environment variable API key (fallback)');
    return envApiKey;
  }
  
  // Return placeholder if no key found
  console.log('❌ No valid API key found, using placeholder');
  return 'YOUR_GOOGLE_VISION_API_KEY';
}

/**
 * Get the current OCR configuration
 */
export function getOCRConfig(): OCRConfig {
  console.log('Getting OCR config, method:', DEFAULT_OCR_CONFIG.method);
  return DEFAULT_OCR_CONFIG;
}

/**
 * Check if Google Vision API is properly configured
 */
export function isGoogleVisionConfigured(): boolean {
  return (
    DEFAULT_OCR_CONFIG.method === 'google-vision' &&
    GOOGLE_VISION_CONFIG.apiKey !== 'YOUR_GOOGLE_VISION_API_KEY' &&
    GOOGLE_VISION_CONFIG.apiKey.length > 0
  );
}

/**
 * Get OCR method display name
 */
export function getOCRMethodName(method: string): string {
  switch (method) {
    case 'mock':
      return 'Mock OCR (Testing)';
    case 'tesseract':
      return 'Tesseract.js (Offline)';
    case 'google-vision':
      return 'Google Vision API (Online)';
    case 'simple':
      return 'Simple OCR (Reliable)';
    default:
      return 'Unknown';
  }
}
