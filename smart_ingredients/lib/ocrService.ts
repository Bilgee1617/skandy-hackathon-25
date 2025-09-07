import * as FileSystem from 'expo-file-system';

// Google Vision API configuration
const GOOGLE_VISION_API_KEY = 'YOUR_GOOGLE_VISION_API_KEY'; // You'll need to get this from Google Cloud Console
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export interface OCRResult {
  text: string;
  confidence: number;
  ingredients: string[];
}

export interface VisionAPIResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: {
        vertices: Array<{ x: number; y: number }>;
      };
    }>;
    fullTextAnnotation?: {
      text: string;
    };
  }>;
}

/**
 * Convert image to base64 for Google Vision API
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Call Google Vision API to extract text from image
 */
async function callGoogleVisionAPI(base64Image: string): Promise<string> {
  try {
    const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data: VisionAPIResponse = await response.json();
    
    if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
      return data.responses[0].fullTextAnnotation.text;
    }
    
    return '';
  } catch (error) {
    console.error('Error calling Google Vision API:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Parse text to extract potential ingredients
 * This is a simple implementation - you can make it more sophisticated
 */
function extractIngredients(text: string): string[] {
  const ingredients: string[] = [];
  
  // Common ingredient keywords to look for
  const ingredientKeywords = [
    'flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'milk', 'eggs', 'cheese',
    'tomato', 'onion', 'garlic', 'carrot', 'potato', 'chicken', 'beef', 'pork',
    'rice', 'pasta', 'bread', 'lettuce', 'spinach', 'broccoli', 'pepper',
    'lemon', 'lime', 'orange', 'apple', 'banana', 'strawberry', 'blueberry',
    'vanilla', 'cinnamon', 'ginger', 'basil', 'oregano', 'thyme', 'rosemary',
    'parsley', 'cilantro', 'mint', 'chili', 'paprika', 'cumin', 'coriander',
    'nutmeg', 'cloves', 'bay leaves', 'sage', 'dill', 'tarragon', 'marjoram',
    'honey', 'maple syrup', 'vinegar', 'soy sauce', 'worcestershire sauce',
    'ketchup', 'mustard', 'mayonnaise', 'sour cream', 'yogurt', 'cream',
    'almonds', 'walnuts', 'pecans', 'cashews', 'peanuts', 'sesame seeds',
    'sunflower seeds', 'pumpkin seeds', 'chia seeds', 'flax seeds',
    'quinoa', 'barley', 'oats', 'wheat', 'corn', 'beans', 'lentils',
    'chickpeas', 'black beans', 'kidney beans', 'pinto beans', 'navy beans',
    'tofu', 'tempeh', 'seitan', 'mushrooms', 'bell peppers', 'jalapeño',
    'avocado', 'cucumber', 'celery', 'radish', 'beet', 'turnip', 'parsnip',
    'sweet potato', 'yam', 'squash', 'zucchini', 'eggplant', 'asparagus',
    'artichoke', 'cauliflower', 'cabbage', 'kale', 'arugula', 'watercress',
    'endive', 'fennel', 'leek', 'shallot', 'scallion', 'chive', 'ginger',
    'turmeric', 'cardamom', 'star anise', 'fennel seeds', 'caraway seeds',
    'poppy seeds', 'sesame oil', 'olive oil', 'coconut oil', 'vegetable oil',
    'canola oil', 'sunflower oil', 'grapeseed oil', 'avocado oil', 'walnut oil',
    'almond oil', 'peanut oil', 'corn oil', 'soybean oil', 'palm oil',
    'balsamic vinegar', 'red wine vinegar', 'white wine vinegar', 'apple cider vinegar',
    'rice vinegar', 'sherry vinegar', 'champagne vinegar', 'malt vinegar',
    'distilled vinegar', 'white vinegar', 'coconut milk', 'almond milk',
    'soy milk', 'oat milk', 'rice milk', 'hemp milk', 'cashew milk',
    'macadamia milk', 'flax milk', 'quinoa milk', 'spelt milk', 'kamut milk',
    'amaranth milk', 'teff milk', 'buckwheat milk', 'millet milk', 'sorghum milk'
  ];

  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Look for ingredient keywords in the text
  ingredientKeywords.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      // Capitalize first letter of each word
      const capitalizedKeyword = keyword.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      if (!ingredients.includes(capitalizedKeyword)) {
        ingredients.push(capitalizedKeyword);
      }
    }
  });

  // Also look for common patterns like "ingredients:" followed by a list
  const ingredientsMatch = lowerText.match(/ingredients?[:\s]+(.*?)(?:\n|$)/i);
  if (ingredientsMatch) {
    const ingredientsList = ingredientsMatch[1];
    // Split by common separators and clean up
    const listItems = ingredientsList.split(/[,;•\n]/).map(item => 
      item.trim().replace(/^\d+\.?\s*/, '').replace(/\([^)]*\)/g, '').trim()
    ).filter(item => item.length > 2);
    
    listItems.forEach(item => {
      if (!ingredients.includes(item)) {
        ingredients.push(item);
      }
    });
  }

  return ingredients;
}

/**
 * Main OCR function that processes an image and extracts ingredients
 */
export async function extractTextFromReceipt(imageUri: string): Promise<OCRResult> {
  try {
    // Convert image to base64
    const base64Image = await imageToBase64(imageUri);
    
    // Call Google Vision API
    const extractedText = await callGoogleVisionAPI(base64Image);
    
    // Extract ingredients from the text
    const ingredients = extractIngredients(extractedText);
    
    return {
      text: extractedText,
      confidence: 0.9, // Google Vision API doesn't return confidence in this response
      ingredients: ingredients,
    };
  } catch (error) {
    console.error('Error in OCR processing:', error);
    throw error;
  }
}

/**
 * Fallback OCR function using a mock implementation for testing
 * This can be used when Google Vision API is not available
 */
export async function extractTextFromReceiptMock(imageUri: string): Promise<OCRResult> {
  try {
    console.log('Starting mock OCR processing for image:', imageUri);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock receipt text
    const mockReceiptText = `
    GROCERY STORE RECEIPT
    ====================
    
    Ingredients:
    - Organic Flour
    - Sugar
    - Salt
    - Olive Oil
    - Fresh Tomatoes
    - Onions
    - Garlic
    - Basil
    - Mozzarella Cheese
    - Parmesan Cheese
    
    Total: $25.99
  `;
    
    console.log('Extracting ingredients from mock text...');
    const ingredients = extractIngredients(mockReceiptText);
    console.log('Found ingredients:', ingredients);
    
    const result = {
      text: mockReceiptText,
      confidence: 0.85,
      ingredients: ingredients,
    };
    
    console.log('Mock OCR result:', result);
    return result;
  } catch (error) {
    console.error('Error in mock OCR:', error);
    throw new Error(`Mock OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
