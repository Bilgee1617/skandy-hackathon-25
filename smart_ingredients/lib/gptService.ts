/**
 * GPT Service for Ingredient Processing
 * 
 * Uses OpenAI GPT API to intelligently extract and process ingredients from receipt text
 */

export interface GPTIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  confidence: number;
  category?: string;
}

export interface GPTIngredientResponse {
  ingredients: GPTIngredient[];
  totalItems: number;
  processingTime: number;
  model: string;
}

export interface GPTSettings {
  model: string;
  temperature: number;
  maxTokens: number;
}

// Default settings for ingredient processing
const DEFAULT_SETTINGS: GPTSettings = {
  model: 'gpt-3.5-turbo',
  temperature: 0.1, // Low temperature for consistent results
  maxTokens: 1000,
};

/**
 * Get OpenAI API key from environment or Constants
 */
function getOpenAIApiKey(): string {
  // Try environment variable first
  const envApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  
  // Try Constants as fallback
  const constantsApiKey = require('expo-constants').default.expoConfig?.extra?.openaiApiKey;
  
  const apiKey = envApiKey || constantsApiKey;
  
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in your .env file or openaiApiKey in app.json extra section.');
  }
  
  console.log('✅ OpenAI API key loaded successfully');
  return apiKey;
}

/**
 * Create the system prompt for ingredient extraction
 */
function createSystemPrompt(): string {
  return `You are an expert at analyzing grocery receipts and extracting food ingredients. 

Your task is to:
1. Identify all food items and ingredients from receipt text
2. Extract the name, quantity, and unit for each item
3. Categorize items (produce, dairy, meat, pantry, etc.)
4. Provide confidence scores for each detection

Rules:
- Only include actual food items and ingredients
- Ignore non-food items (cleaning supplies, toiletries, etc.)
- Ignore store information, prices, taxes, totals
- Ignore promotional text and advertisements
- Extract quantities and units when available
- If quantity/unit is unclear, make reasonable estimates
- Provide confidence scores (0.0 to 1.0) based on clarity

Return your response as a JSON object with this exact structure:
{
  "ingredients": [
    {
      "name": "item name",
      "quantity": number,
      "unit": "unit type",
      "confidence": 0.0-1.0,
      "category": "category name"
    }
  ]
}`;
}

/**
 * Create the user prompt with receipt text
 */
function createUserPrompt(receiptText: string): string {
  return `Please analyze this receipt text and extract all food ingredients:

${receiptText}

Remember to:
- Only include food items and ingredients
- Extract quantities and units when available
- Provide confidence scores
- Categorize items appropriately
- Return valid JSON format`;
}

/**
 * Process ingredients using GPT API
 */
export async function processIngredientsWithGPT(
  receiptText: string,
  settings: Partial<GPTSettings> = {}
): Promise<GPTIngredientResponse> {
  const startTime = Date.now();
  const finalSettings = { ...DEFAULT_SETTINGS, ...settings };
  
  try {
    const apiKey = getOpenAIApiKey();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: finalSettings.model,
        messages: [
          {
            role: 'system',
            content: createSystemPrompt(),
          },
          {
            role: 'user',
            content: createUserPrompt(receiptText),
          },
        ],
        temperature: finalSettings.temperature,
        max_tokens: finalSettings.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content from GPT API');
    }

    // Parse the JSON response
    let ingredients: GPTIngredient[] = [];
    try {
      const parsed = JSON.parse(content);
      ingredients = parsed.ingredients || [];
    } catch (parseError) {
      console.error('Failed to parse GPT response:', content);
      throw new Error('Invalid JSON response from GPT API');
    }

    const processingTime = Date.now() - startTime;

    return {
      ingredients,
      totalItems: ingredients.length,
      processingTime,
      model: finalSettings.model,
    };

  } catch (error) {
    console.error('GPT processing error:', error);
    throw error;
  }
}

/**
 * Fallback function for when GPT API is not available
 */
export function getFallbackIngredients(receiptText: string): GPTIngredient[] {
  // Simple fallback - extract potential food items using basic patterns
  const lines = receiptText.split('\n');
  const ingredients: GPTIngredient[] = [];
  
  const foodKeywords = [
    'milk', 'bread', 'eggs', 'cheese', 'butter', 'chicken', 'beef', 'pork', 'fish',
    'apple', 'banana', 'orange', 'tomato', 'onion', 'carrot', 'potato', 'lettuce',
    'rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar',
    'yogurt', 'cream', 'juice', 'water', 'soda', 'coffee', 'tea'
  ];
  
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    const foundKeyword = foodKeywords.find(keyword => lowerLine.includes(keyword));
    
    if (foundKeyword) {
      ingredients.push({
        name: foundKeyword,
        quantity: 1,
        unit: 'ea',
        confidence: 0.6,
        category: 'general',
      });
    }
  });
  
  return ingredients;
}

/**
 * Test GPT connection and API key
 */
export async function testGPTConnection(): Promise<boolean> {
  try {
    await processIngredientsWithGPT('Test receipt: 1 Apple $1.50, 2 Milk $3.00');
    return true;
  } catch (error) {
    console.error('GPT connection test failed:', error);
    return false;
  }
}
