export interface VisionOCRResult {
  text: string;
  confidence: number;
  ingredients: string[];
  boundingBoxes: Array<{
    text: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface OCRResult {
  text: string;
  confidence?: number;
  blocks?: Array<{
    text: string;
    confidence?: number;
    frame?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

/**
 * Extract text from OCR result using React Native Vision Camera
 */
export function extractTextFromOCRFrame(ocrResult: OCRResult): VisionOCRResult {
  try {
    let fullText = '';
    const boundingBoxes: Array<{
      text: string;
      confidence: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    // Process all text blocks from the OCR result
    if (ocrResult.blocks) {
      ocrResult.blocks.forEach(block => {
        if (block.text) {
          fullText += block.text + '\n';
          
          // Store bounding box information
          if (block.frame) {
            boundingBoxes.push({
              text: block.text,
              confidence: block.confidence || 0,
              x: block.frame.x,
              y: block.frame.y,
              width: block.frame.width,
              height: block.frame.height,
            });
          }
        }
      });
    } else if (ocrResult.text) {
      fullText = ocrResult.text;
    }

    // Extract ingredients from the full text
    const ingredients = extractIngredients(fullText);

    return {
      text: fullText.trim(),
      confidence: ocrResult.confidence || 0,
      ingredients: ingredients,
      boundingBoxes: boundingBoxes,
    };
  } catch (error) {
    console.error('Error processing OCR result:', error);
    return {
      text: '',
      confidence: 0,
      ingredients: [],
      boundingBoxes: [],
    };
  }
}

/**
 * Parse text to extract potential ingredients
 * Enhanced version with better ingredient detection
 */
function extractIngredients(text: string): string[] {
  const ingredients: string[] = [];
  
  // Common ingredient keywords to look for
  const ingredientKeywords = [
    // Grains & Flours
    'flour', 'wheat flour', 'all-purpose flour', 'bread flour', 'cake flour', 'whole wheat flour',
    'rice', 'brown rice', 'white rice', 'wild rice', 'basmati rice', 'jasmine rice',
    'pasta', 'spaghetti', 'penne', 'macaroni', 'fettuccine', 'linguine', 'ravioli',
    'bread', 'sourdough', 'whole grain bread', 'white bread', 'rye bread', 'pita bread',
    'oats', 'rolled oats', 'steel cut oats', 'quinoa', 'barley', 'bulgur', 'couscous',
    
    // Proteins
    'chicken', 'chicken breast', 'chicken thigh', 'ground chicken', 'chicken wings',
    'beef', 'ground beef', 'steak', 'roast beef', 'beef tenderloin', 'ribeye',
    'pork', 'pork chops', 'ground pork', 'bacon', 'ham', 'sausage', 'prosciutto',
    'fish', 'salmon', 'tuna', 'cod', 'halibut', 'shrimp', 'crab', 'lobster',
    'eggs', 'egg whites', 'egg yolks', 'tofu', 'tempeh', 'seitan',
    
    // Dairy
    'milk', 'whole milk', 'skim milk', '2% milk', 'almond milk', 'soy milk', 'oat milk',
    'cheese', 'cheddar cheese', 'mozzarella', 'parmesan', 'swiss cheese', 'feta cheese',
    'butter', 'unsalted butter', 'salted butter', 'cream', 'heavy cream', 'sour cream',
    'yogurt', 'greek yogurt', 'plain yogurt', 'vanilla yogurt',
    
    // Vegetables
    'tomato', 'tomatoes', 'cherry tomatoes', 'roma tomatoes', 'beefsteak tomatoes',
    'onion', 'onions', 'red onion', 'yellow onion', 'white onion', 'green onion',
    'garlic', 'garlic cloves', 'minced garlic', 'garlic powder',
    'carrot', 'carrots', 'baby carrots', 'carrot sticks',
    'potato', 'potatoes', 'russet potatoes', 'red potatoes', 'sweet potato', 'yams',
    'lettuce', 'romaine lettuce', 'iceberg lettuce', 'butter lettuce', 'arugula',
    'spinach', 'baby spinach', 'frozen spinach', 'kale', 'swiss chard',
    'broccoli', 'cauliflower', 'brussels sprouts', 'cabbage', 'red cabbage',
    'bell pepper', 'bell peppers', 'red bell pepper', 'green bell pepper', 'yellow bell pepper',
    'cucumber', 'cucumbers', 'english cucumber', 'pickling cucumber',
    'celery', 'celery stalks', 'celery root',
    'mushrooms', 'button mushrooms', 'shiitake mushrooms', 'portobello mushrooms',
    'zucchini', 'yellow squash', 'eggplant', 'asparagus', 'artichoke',
    
    // Fruits
    'apple', 'apples', 'granny smith', 'red delicious', 'gala apples', 'honeycrisp',
    'banana', 'bananas', 'ripe bananas', 'green bananas',
    'orange', 'oranges', 'navel oranges', 'blood oranges', 'mandarin oranges',
    'lemon', 'lemons', 'lime', 'limes', 'grapefruit',
    'strawberry', 'strawberries', 'blueberry', 'blueberries', 'raspberry', 'raspberries',
    'blackberry', 'blackberries', 'cranberry', 'cranberries',
    'avocado', 'avocados', 'ripe avocado',
    
    // Herbs & Spices
    'basil', 'fresh basil', 'dried basil', 'oregano', 'thyme', 'rosemary', 'sage',
    'parsley', 'cilantro', 'mint', 'dill', 'chives', 'tarragon', 'marjoram',
    'salt', 'sea salt', 'kosher salt', 'table salt', 'himalayan salt',
    'pepper', 'black pepper', 'white pepper', 'cayenne pepper', 'red pepper flakes',
    'garlic powder', 'onion powder', 'paprika', 'smoked paprika', 'chili powder',
    'cumin', 'coriander', 'turmeric', 'ginger', 'fresh ginger', 'ground ginger',
    'cinnamon', 'nutmeg', 'cloves', 'allspice', 'cardamom', 'vanilla', 'vanilla extract',
    'bay leaves', 'star anise', 'fennel seeds', 'caraway seeds', 'poppy seeds',
    
    // Oils & Vinegars
    'olive oil', 'extra virgin olive oil', 'vegetable oil', 'canola oil', 'coconut oil',
    'sesame oil', 'avocado oil', 'walnut oil', 'almond oil', 'peanut oil',
    'balsamic vinegar', 'red wine vinegar', 'white wine vinegar', 'apple cider vinegar',
    'rice vinegar', 'sherry vinegar', 'champagne vinegar',
    
    // Nuts & Seeds
    'almonds', 'walnuts', 'pecans', 'cashews', 'pistachios', 'hazelnuts', 'macadamia nuts',
    'peanuts', 'peanut butter', 'almond butter', 'cashew butter',
    'sesame seeds', 'sunflower seeds', 'pumpkin seeds', 'chia seeds', 'flax seeds',
    
    // Legumes
    'beans', 'black beans', 'kidney beans', 'pinto beans', 'navy beans', 'garbanzo beans',
    'lentils', 'red lentils', 'green lentils', 'brown lentils',
    'chickpeas', 'hummus', 'edamame',
    
    // Condiments & Sauces
    'ketchup', 'mustard', 'dijon mustard', 'yellow mustard', 'whole grain mustard',
    'mayonnaise', 'sriracha', 'hot sauce', 'soy sauce', 'worcestershire sauce',
    'honey', 'maple syrup', 'agave nectar', 'molasses',
    'tomato sauce', 'marinara sauce', 'pesto', 'tahini',
    
    // Baking
    'sugar', 'brown sugar', 'powdered sugar', 'coconut sugar', 'stevia',
    'baking powder', 'baking soda', 'yeast', 'active dry yeast', 'instant yeast',
    'cornstarch', 'arrowroot powder', 'cocoa powder', 'chocolate chips',
    
    // Other
    'coconut', 'coconut milk', 'coconut cream', 'coconut flakes',
    'broth', 'chicken broth', 'beef broth', 'vegetable broth', 'bone broth',
    'wine', 'red wine', 'white wine', 'cooking wine', 'sherry',
    'stock', 'chicken stock', 'beef stock', 'vegetable stock'
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

  // Look for common receipt patterns
  const receiptPatterns = [
    /item\s*:\s*([^\n]+)/gi,
    /product\s*:\s*([^\n]+)/gi,
    /([a-z\s]+)\s+\$\d+\.\d{2}/gi, // Item name followed by price
  ];

  receiptPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const item = match[1]?.trim();
      if (item && item.length > 2 && !ingredients.includes(item)) {
        // Check if it looks like an ingredient
        if (ingredientKeywords.some(keyword => 
          item.toLowerCase().includes(keyword.toLowerCase())
        )) {
          ingredients.push(item);
        }
      }
    }
  });

  return ingredients;
}

/**
 * Real-time OCR processing function
 */
export function processRealTimeOCR(ocrResult: OCRResult): VisionOCRResult {
  return extractTextFromOCRFrame(ocrResult);
}
