/**
 * Smart Ingredient Detection System
 * 
 * This module intelligently filters OCR text to identify actual food ingredients
 * while filtering out prices, store information, dates, and other non-food text.
 */

export interface IngredientMatch {
  name: string;
  confidence: number;
  context: string; // The surrounding text that helped identify it
  category: 'food' | 'beverage' | 'spice' | 'dairy' | 'protein' | 'vegetable' | 'fruit' | 'grain' | 'unknown';
}

export interface ReceiptAnalysis {
  ingredients: IngredientMatch[];
  storeInfo: string[];
  prices: string[];
  dates: string[];
  totalAmount: string | null;
  confidence: number;
}

// Comprehensive food ingredient database
const FOOD_INGREDIENTS = {
  // Proteins
  protein: [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'salmon', 'tuna', 'cod', 'halibut',
    'shrimp', 'crab', 'lobster', 'scallops', 'mussels', 'oysters', 'eggs', 'egg whites', 'egg yolks',
    'tofu', 'tempeh', 'seitan', 'beans', 'lentils', 'chickpeas', 'black beans', 'kidney beans',
    'pinto beans', 'navy beans', 'edamame', 'peanuts', 'almonds', 'walnuts', 'cashews', 'pecans',
    'pistachios', 'hazelnuts', 'macadamia nuts', 'sunflower seeds', 'pumpkin seeds', 'sesame seeds',
    'chia seeds', 'flax seeds', 'hemp seeds', 'quinoa', 'barley', 'oats', 'wheat', 'rice', 'corn'
  ],
  
  // Dairy
  dairy: [
    'milk', 'whole milk', 'skim milk', '2% milk', 'buttermilk', 'cream', 'heavy cream', 'half and half',
    'sour cream', 'yogurt', 'greek yogurt', 'plain yogurt', 'vanilla yogurt', 'cheese', 'cheddar cheese',
    'mozzarella', 'parmesan', 'swiss cheese', 'feta cheese', 'goat cheese', 'ricotta cheese', 'cottage cheese',
    'cream cheese', 'butter', 'unsalted butter', 'salted butter', 'ghee', 'margarine', 'ice cream',
    'frozen yogurt', 'sorbet', 'gelato'
  ],
  
  // Vegetables
  vegetable: [
    'tomato', 'tomatoes', 'cherry tomatoes', 'roma tomatoes', 'beefsteak tomatoes', 'onion', 'onions',
    'red onion', 'yellow onion', 'white onion', 'green onion', 'scallions', 'shallots', 'leeks',
    'garlic', 'garlic cloves', 'minced garlic', 'garlic powder', 'carrot', 'carrots', 'baby carrots',
    'potato', 'potatoes', 'russet potatoes', 'red potatoes', 'sweet potato', 'yams', 'lettuce',
    'romaine lettuce', 'iceberg lettuce', 'butter lettuce', 'arugula', 'spinach', 'baby spinach',
    'kale', 'swiss chard', 'collard greens', 'broccoli', 'cauliflower', 'brussels sprouts', 'cabbage',
    'red cabbage', 'bell pepper', 'bell peppers', 'red bell pepper', 'green bell pepper', 'yellow bell pepper',
    'jalapeño', 'serrano pepper', 'habanero pepper', 'cucumber', 'cucumbers', 'english cucumber',
    'pickling cucumber', 'celery', 'celery stalks', 'celery root', 'mushrooms', 'button mushrooms',
    'shiitake mushrooms', 'portobello mushrooms', 'oyster mushrooms', 'zucchini', 'yellow squash',
    'eggplant', 'asparagus', 'artichoke', 'beets', 'radish', 'turnip', 'parsnip', 'rutabaga',
    'fennel', 'bok choy', 'napa cabbage', 'daikon', 'jicama', 'kohlrabi', 'okra', 'snow peas',
    'sugar snap peas', 'green beans', 'wax beans', 'lima beans', 'corn', 'sweet corn', 'baby corn'
  ],
  
  // Fruits
  fruit: [
    'apple', 'apples', 'granny smith', 'red delicious', 'gala apples', 'honeycrisp', 'fuji apples',
    'banana', 'bananas', 'ripe bananas', 'green bananas', 'orange', 'oranges', 'navel oranges',
    'blood oranges', 'mandarin oranges', 'clementines', 'tangerines', 'lemon', 'lemons', 'lime',
    'limes', 'grapefruit', 'pink grapefruit', 'white grapefruit', 'strawberry', 'strawberries',
    'blueberry', 'blueberries', 'raspberry', 'raspberries', 'blackberry', 'blackberries',
    'cranberry', 'cranberries', 'cherry', 'cherries', 'peach', 'peaches', 'nectarine', 'nectarines',
    'plum', 'plums', 'apricot', 'apricots', 'pear', 'pears', 'avocado', 'avocados', 'ripe avocado',
    'mango', 'mangoes', 'pineapple', 'papaya', 'kiwi', 'kiwifruit', 'passion fruit', 'dragon fruit',
    'pomegranate', 'figs', 'dates', 'raisins', 'prunes', 'coconut', 'coconut milk', 'coconut cream',
    'coconut flakes', 'coconut water'
  ],
  
  // Grains & Starches
  grain: [
    'flour', 'wheat flour', 'all-purpose flour', 'bread flour', 'cake flour', 'whole wheat flour',
    'almond flour', 'coconut flour', 'rice flour', 'corn flour', 'buckwheat flour', 'oat flour',
    'rice', 'brown rice', 'white rice', 'wild rice', 'basmati rice', 'jasmine rice', 'arborio rice',
    'pasta', 'spaghetti', 'penne', 'macaroni', 'fettuccine', 'linguine', 'ravioli', 'lasagna',
    'bread', 'sourdough', 'whole grain bread', 'white bread', 'rye bread', 'pita bread', 'naan',
    'tortillas', 'corn tortillas', 'flour tortillas', 'oats', 'rolled oats', 'steel cut oats',
    'instant oats', 'quinoa', 'barley', 'bulgur', 'couscous', 'farro', 'millet', 'amaranth',
    'teff', 'spelt', 'kamut', 'cornmeal', 'polenta', 'grits', 'crackers', 'breadcrumbs',
    'panko breadcrumbs', 'croutons'
  ],
  
  // Spices & Herbs
  spice: [
    'salt', 'sea salt', 'kosher salt', 'table salt', 'himalayan salt', 'pepper', 'black pepper',
    'white pepper', 'cayenne pepper', 'red pepper flakes', 'paprika', 'smoked paprika', 'chili powder',
    'garlic powder', 'onion powder', 'ginger', 'fresh ginger', 'ground ginger', 'cinnamon',
    'ground cinnamon', 'cinnamon sticks', 'nutmeg', 'cloves', 'allspice', 'cardamom', 'vanilla',
    'vanilla extract', 'vanilla bean', 'bay leaves', 'star anise', 'fennel seeds', 'caraway seeds',
    'poppy seeds', 'sesame seeds', 'cumin', 'coriander', 'turmeric', 'curry powder', 'garam masala',
    'basil', 'fresh basil', 'dried basil', 'oregano', 'thyme', 'rosemary', 'sage', 'parsley',
    'cilantro', 'mint', 'dill', 'chives', 'tarragon', 'marjoram', 'rosemary', 'thyme', 'sage',
    'oregano', 'basil', 'parsley', 'cilantro', 'mint', 'dill', 'chives', 'tarragon', 'marjoram'
  ],
  
  // Oils & Condiments
  condiment: [
    'olive oil', 'extra virgin olive oil', 'vegetable oil', 'canola oil', 'coconut oil', 'sesame oil',
    'avocado oil', 'walnut oil', 'almond oil', 'peanut oil', 'sunflower oil', 'grapeseed oil',
    'balsamic vinegar', 'red wine vinegar', 'white wine vinegar', 'apple cider vinegar', 'rice vinegar',
    'sherry vinegar', 'champagne vinegar', 'ketchup', 'mustard', 'dijon mustard', 'yellow mustard',
    'whole grain mustard', 'mayonnaise', 'sriracha', 'hot sauce', 'soy sauce', 'worcestershire sauce',
    'honey', 'maple syrup', 'agave nectar', 'molasses', 'tomato sauce', 'marinara sauce', 'pesto',
    'tahini', 'hummus', 'salsa', 'guacamole', 'ranch dressing', 'italian dressing', 'caesar dressing',
    'vinaigrette', 'barbecue sauce', 'teriyaki sauce', 'hoisin sauce', 'fish sauce', 'oyster sauce'
  ],
  
  // Beverages
  beverage: [
    'water', 'sparkling water', 'seltzer', 'club soda', 'tonic water', 'coffee', 'espresso', 'latte',
    'cappuccino', 'americano', 'tea', 'green tea', 'black tea', 'herbal tea', 'chai tea', 'matcha',
    'juice', 'orange juice', 'apple juice', 'cranberry juice', 'grape juice', 'pineapple juice',
    'coconut water', 'soda', 'cola', 'ginger ale', 'lemonade', 'iced tea', 'sports drink',
    'energy drink', 'beer', 'wine', 'red wine', 'white wine', 'champagne', 'spirits', 'whiskey',
    'vodka', 'rum', 'gin', 'tequila', 'bourbon', 'scotch', 'cognac', 'brandy', 'liqueur'
  ]
};

// Non-food words to filter out
const NON_FOOD_WORDS = [
  // Store information
  'store', 'market', 'grocery', 'supermarket', 'pharmacy', 'dollar', 'general', 'target', 'walmart',
  'costco', 'sams', 'kroger', 'safeway', 'whole foods', 'trader joes', 'aldi', 'lidl',
  
  // Receipt information
  'receipt', 'invoice', 'bill', 'total', 'subtotal', 'tax', 'discount', 'coupon', 'sale',
  'price', 'amount', 'quantity', 'qty', 'item', 'product', 'sku', 'barcode', 'upc',
  
  // Dates and times
  'date', 'time', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december', 'am', 'pm', 'morning', 'afternoon', 'evening',
  
  // Payment information
  'cash', 'credit', 'debit', 'card', 'visa', 'mastercard', 'amex', 'american express',
  'paypal', 'apple pay', 'google pay', 'venmo', 'zelle', 'check', 'change', 'refund',
  
  // Store policies
  'return', 'exchange', 'policy', 'warranty', 'guarantee', 'satisfaction', 'customer service',
  'help', 'support', 'contact', 'phone', 'email', 'website', 'hours', 'open', 'closed',
  
  // Common non-food items
  'bag', 'receipt', 'thank', 'you', 'visit', 'again', 'welcome', 'come', 'back', 'soon',
  'have', 'nice', 'day', 'good', 'great', 'excellent', 'service', 'quality', 'fresh',
  'organic', 'natural', 'healthy', 'diet', 'low', 'fat', 'sugar', 'free', 'gluten', 'free',
  
  // Numbers and symbols
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '$', '%', '#', '@', '&', '*', '+', '=',
  'lb', 'lbs', 'oz', 'kg', 'g', 'ml', 'l', 'pt', 'qt', 'gal', 'dozen', 'each', 'per'
];

/**
 * Analyze receipt text and extract food ingredients
 */
export function analyzeReceiptText(text: string): ReceiptAnalysis {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const ingredients: IngredientMatch[] = [];
  const storeInfo: string[] = [];
  const prices: string[] = [];
  const dates: string[] = [];
  let totalAmount: string | null = null;
  
  // Extract prices (patterns like $1.99, 2.50, etc.)
  const pricePattern = /\$?\d+\.\d{2}|\$\d+/g;
  const foundPrices = text.match(pricePattern) || [];
  prices.push(...foundPrices);
  
  // Look for total amount (usually the largest number or last price)
  if (foundPrices.length > 0) {
    const amounts = foundPrices.map(p => parseFloat(p.replace('$', '')));
    const maxAmount = Math.max(...amounts);
    totalAmount = `$${maxAmount.toFixed(2)}`;
  }
  
  // Extract dates
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+ \d{1,2},? \d{4}/g;
  const foundDates = text.match(datePattern) || [];
  dates.push(...foundDates);
  
  // Analyze each line for ingredients
  lines.forEach(line => {
    const lineLower = line.toLowerCase();
    
    // Skip lines that are clearly non-food
    if (isNonFoodLine(lineLower)) {
      if (isStoreInfo(lineLower)) {
        storeInfo.push(line);
      }
      return;
    }
    
    // Look for food ingredients in this line
    const foundIngredients = findIngredientsInLine(line, lineLower);
    ingredients.push(...foundIngredients);
  });
  
  // Remove duplicates and sort by confidence
  const uniqueIngredients = removeDuplicateIngredients(ingredients);
  const sortedIngredients = uniqueIngredients.sort((a, b) => b.confidence - a.confidence);
  
  // Calculate overall confidence
  const confidence = calculateOverallConfidence(sortedIngredients, text);
  
  return {
    ingredients: sortedIngredients,
    storeInfo,
    prices,
    dates,
    totalAmount,
    confidence
  };
}

/**
 * Check if a line is clearly non-food content
 */
function isNonFoodLine(line: string): boolean {
  // Check for common non-food patterns
  const nonFoodPatterns = [
    /^total/i,
    /^subtotal/i,
    /^tax/i,
    /^discount/i,
    /^coupon/i,
    /^sale/i,
    /^receipt/i,
    /^invoice/i,
    /^thank you/i,
    /^visit us/i,
    /^store hours/i,
    /^phone/i,
    /^website/i,
    /^email/i,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // Date patterns
    /^\d{1,2}:\d{2}/, // Time patterns
    /^qty/i,
    /^item/i,
    /^sku/i,
    /^upc/i,
    /^barcode/i
  ];
  
  return nonFoodPatterns.some(pattern => pattern.test(line));
}

/**
 * Check if a line contains store information
 */
function isStoreInfo(line: string): boolean {
  const storePatterns = [
    /store/i,
    /market/i,
    /grocery/i,
    /supermarket/i,
    /pharmacy/i,
    /dollar/i,
    /general/i,
    /target/i,
    /walmart/i,
    /costco/i,
    /sams/i,
    /kroger/i,
    /safeway/i,
    /whole foods/i,
    /trader joes/i,
    /aldi/i,
    /lidl/i
  ];
  
  return storePatterns.some(pattern => pattern.test(line));
}

/**
 * Find food ingredients in a specific line
 */
function findIngredientsInLine(line: string, lineLower: string): IngredientMatch[] {
  const ingredients: IngredientMatch[] = [];
  
  // Check each food category
  Object.entries(FOOD_INGREDIENTS).forEach(([category, foods]) => {
    foods.forEach(food => {
      const foodLower = food.toLowerCase();
      
      // Check for exact match
      if (lineLower.includes(foodLower)) {
        const confidence = calculateIngredientConfidence(food, line, category);
        if (confidence > 0.3) { // Only include if confidence is reasonable
          ingredients.push({
            name: food,
            confidence,
            context: line,
            category: category as any
          });
        }
      }
    });
  });
  
  return ingredients;
}

/**
 * Calculate confidence for a specific ingredient match
 */
function calculateIngredientConfidence(food: string, line: string, category: string): number {
  let confidence = 0.5; // Base confidence
  
  const lineLower = line.toLowerCase();
  const foodLower = food.toLowerCase();
  
  // Increase confidence for exact word matches
  if (lineLower.includes(` ${foodLower} `) || lineLower.startsWith(`${foodLower} `) || lineLower.endsWith(` ${foodLower}`)) {
    confidence += 0.3;
  }
  
  // Increase confidence if it's not near price information
  if (!/\$?\d+\.\d{2}|\$\d+/.test(line)) {
    confidence += 0.2;
  }
  
  // Decrease confidence if it's near non-food words
  const nonFoodWordsInLine = NON_FOOD_WORDS.filter(word => lineLower.includes(word.toLowerCase()));
  confidence -= nonFoodWordsInLine.length * 0.1;
  
  // Increase confidence for certain categories
  if (['vegetable', 'fruit', 'protein', 'dairy'].includes(category)) {
    confidence += 0.1;
  }
  
  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Remove duplicate ingredients, keeping the one with highest confidence
 */
function removeDuplicateIngredients(ingredients: IngredientMatch[]): IngredientMatch[] {
  const seen = new Map<string, IngredientMatch>();
  
  ingredients.forEach(ingredient => {
    const key = ingredient.name.toLowerCase();
    if (!seen.has(key) || seen.get(key)!.confidence < ingredient.confidence) {
      seen.set(key, ingredient);
    }
  });
  
  return Array.from(seen.values());
}

/**
 * Calculate overall confidence for the analysis
 */
function calculateOverallConfidence(ingredients: IngredientMatch[], text: string): number {
  if (ingredients.length === 0) return 0;
  
  const avgConfidence = ingredients.reduce((sum, ing) => sum + ing.confidence, 0) / ingredients.length;
  const textLength = text.length;
  const ingredientCount = ingredients.length;
  
  // Adjust confidence based on text length and ingredient count
  let confidence = avgConfidence;
  
  if (textLength > 100 && ingredientCount > 3) {
    confidence += 0.1;
  }
  
  if (ingredientCount > 10) {
    confidence += 0.1;
  }
  
  return Math.min(1, confidence);
}
