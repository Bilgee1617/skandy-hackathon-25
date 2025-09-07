/**
 * Recipe Recommendation Service
 * 
 * Uses GPT API to recommend recipes based on ingredients that are about to expire
 */

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: Date;
  daysUntilExpiry?: number;
}

export interface Recipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  confidence: number;
}

export interface RecipeRecommendation {
  recipes: Recipe[];
  expiringIngredients: Ingredient[];
  totalRecipes: number;
  processingTime: number;
  model: string;
}

export interface RecipeSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  maxRecipes: number;
}

// Default settings for recipe recommendations
const DEFAULT_SETTINGS: RecipeSettings = {
  model: 'gpt-3.5-turbo',
  temperature: 0.3, // Higher temperature for more creative recipes
  maxTokens: 2000,
  maxRecipes: 5,
};

/**
 * Get OpenAI API key (reuse from gptService)
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
  
  return apiKey;
}

/**
 * Create the system prompt for recipe recommendations
 */
function createRecipeSystemPrompt(): string {
  return `You are an expert chef and recipe developer. Your task is to recommend delicious, practical recipes that help people use up ingredients before they expire.

Your recommendations should:
1. Prioritize ingredients that are expiring soon
2. Be practical and achievable for home cooks
3. Include clear, step-by-step instructions
4. Provide accurate prep and cook times
5. Suggest appropriate serving sizes
6. Rate difficulty level appropriately

CRITICAL: Return ONLY a valid JSON object with this exact structure. Do NOT include any markdown formatting, code blocks, explanations, or additional text. Start your response with { and end with }. Return only the raw JSON:

{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description of the dish",
      "ingredients": ["ingredient 1", "ingredient 2", "..."],
      "instructions": ["step 1", "step 2", "..."],
      "prepTime": "X minutes",
      "cookTime": "X minutes", 
      "servings": number,
      "difficulty": "Easy|Medium|Hard",
      "category": "category name",
      "confidence": 0.0-1.0
    }
  ]
}

Focus on recipes that:
- Use the expiring ingredients as main components
- Are quick to make (under 1 hour total time)
- Require minimal additional ingredients
- Are family-friendly and nutritious`;
}

/**
 * Create the user prompt with expiring ingredients
 */
function createRecipeUserPrompt(expiringIngredients: Ingredient[], allIngredients: Ingredient[]): string {
  const expiringList = expiringIngredients.map(ing => 
    `- ${ing.name} (${ing.quantity} ${ing.unit}) - expires in ${ing.daysUntilExpiry} days`
  ).join('\n');
  
  const allList = allIngredients.map(ing => 
    `- ${ing.name} (${ing.quantity} ${ing.unit})`
  ).join('\n');

  return `Please recommend recipes to help use up these expiring ingredients:

EXPIRING SOON (priority ingredients):
${expiringList}

ALL AVAILABLE INGREDIENTS:
${allList}

Please recommend ${DEFAULT_SETTINGS.maxRecipes} recipes that:
1. Use the expiring ingredients as much as possible
2. Can be made with the available ingredients
3. Are quick and practical for busy people
4. Help reduce food waste

CRITICAL: Return ONLY valid JSON with the exact structure specified. Start with { and end with }. No markdown, no explanations, no additional text - just the JSON object.`;
}

/**
 * Calculate days until expiry
 */
function calculateDaysUntilExpiry(expiryDate: Date): number {
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Identify ingredients that are expiring soon (within 3 days)
 */
export function getExpiringIngredients(ingredients: Ingredient[], daysThreshold: number = 3): Ingredient[] {
  return ingredients.filter(ingredient => {
    if (!ingredient.expiryDate) return false;
    
    const daysUntilExpiry = calculateDaysUntilExpiry(ingredient.expiryDate);
    ingredient.daysUntilExpiry = daysUntilExpiry;
    
    return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0;
  });
}

/**
 * Get recipe recommendations using GPT
 */
export async function getRecipeRecommendations(
  ingredients: Ingredient[],
  settings: Partial<RecipeSettings> = {}
): Promise<RecipeRecommendation> {
  const startTime = Date.now();
  const finalSettings = { ...DEFAULT_SETTINGS, ...settings };
  
  try {
    const apiKey = getOpenAIApiKey();
    
    // Identify expiring ingredients
    const expiringIngredients = getExpiringIngredients(ingredients);
    
    if (expiringIngredients.length === 0) {
      return {
        recipes: [],
        expiringIngredients: [],
        totalRecipes: 0,
        processingTime: Date.now() - startTime,
        model: finalSettings.model,
      };
    }
    
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
            content: createRecipeSystemPrompt(),
          },
          {
            role: 'user',
            content: createRecipeUserPrompt(expiringIngredients, ingredients),
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
    let recipes: Recipe[] = [];
    let jsonContent = '';
    
    try {
      // Handle markdown-wrapped JSON responses
      jsonContent = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Clean up any trailing characters or extra content
      jsonContent = jsonContent.trim();
      
      // Find the first { and last } to extract just the JSON object
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      }
      
      console.log('Cleaned JSON content:', jsonContent);
      
      const parsed = JSON.parse(jsonContent);
      recipes = parsed.recipes || [];
    } catch (parseError) {
      console.error('Failed to parse GPT response:', content);
      console.error('Parse error:', parseError);
      console.error('Cleaned content that failed:', jsonContent);
      
      // Try to extract recipes using regex as a fallback
      try {
        console.log('Attempting regex fallback extraction...');
        const recipeMatches = content.match(/"name":\s*"([^"]+)"/g);
        if (recipeMatches && recipeMatches.length > 0) {
          console.log('Found recipe names via regex:', recipeMatches);
          // Create basic recipe objects from extracted names
          recipes = recipeMatches.map((match: string, index: number) => {
            const name = match.match(/"name":\s*"([^"]+)"/)?.[1] || `Recipe ${index + 1}`;
            return {
              name,
              description: `A delicious recipe using your expiring ingredients`,
              ingredients: ['Your available ingredients'],
              instructions: ['Follow your favorite cooking method'],
              prepTime: '15 minutes',
              cookTime: '30 minutes',
              servings: 4,
              difficulty: 'Easy' as const,
              category: 'Main Dish',
              confidence: 0.7
            };
          });
          console.log('Created fallback recipes:', recipes);
        } else {
          throw new Error('Could not extract any recipe information');
        }
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
        throw new Error('Invalid JSON response from GPT API');
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      recipes,
      expiringIngredients,
      totalRecipes: recipes.length,
      processingTime,
      model: finalSettings.model,
    };

  } catch (error) {
    console.error('Recipe recommendation error:', error);
    throw error;
  }
}

/**
 * Get mock recipe recommendations for testing
 */
export function getMockRecipeRecommendations(): RecipeRecommendation {
  const mockRecipes: Recipe[] = [
    {
      name: "Quick Banana Bread",
      description: "Use up overripe bananas in this moist and delicious bread",
      ingredients: ["bananas", "flour", "sugar", "eggs", "butter", "baking soda"],
      instructions: [
        "Preheat oven to 350°F (175°C)",
        "Mash bananas in a bowl",
        "Mix in melted butter, sugar, and eggs",
        "Add flour and baking soda, mix until combined",
        "Pour into greased loaf pan",
        "Bake for 50-60 minutes until golden brown"
      ],
      prepTime: "15 minutes",
      cookTime: "60 minutes",
      servings: 8,
      difficulty: "Easy",
      category: "Baking",
      confidence: 0.9
    },
    {
      name: "Stir-Fry with Expiring Vegetables",
      description: "Quick and healthy stir-fry using vegetables that need to be used soon",
      ingredients: ["bell peppers", "onions", "carrots", "soy sauce", "garlic", "oil"],
      instructions: [
        "Cut vegetables into thin strips",
        "Heat oil in a large pan or wok",
        "Add garlic and stir for 30 seconds",
        "Add vegetables and stir-fry for 5-7 minutes",
        "Add soy sauce and cook for 1 more minute",
        "Serve over rice or noodles"
      ],
      prepTime: "10 minutes",
      cookTime: "10 minutes",
      servings: 4,
      difficulty: "Easy",
      category: "Main Course",
      confidence: 0.85
    }
  ];

  const mockExpiringIngredients: Ingredient[] = [
    {
      name: "bananas",
      quantity: 3,
      unit: "ea",
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      daysUntilExpiry: 2
    },
    {
      name: "bell peppers",
      quantity: 2,
      unit: "ea",
      expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      daysUntilExpiry: 1
    }
  ];

  return {
    recipes: mockRecipes,
    expiringIngredients: mockExpiringIngredients,
    totalRecipes: mockRecipes.length,
    processingTime: 1500,
    model: 'mock'
  };
}
