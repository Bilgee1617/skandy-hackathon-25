/**
 * Test Recipe Service
 * 
 * Simple test to verify recipe recommendations work
 */

import { getRecipeRecommendations, getMockRecipeRecommendations, Ingredient } from './recipeService';

// Test ingredients with expiry dates
const testIngredients: Ingredient[] = [
  {
    name: "bananas",
    quantity: 3,
    unit: "ea",
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  },
  {
    name: "bell peppers",
    quantity: 2,
    unit: "ea", 
    expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
  },
  {
    name: "milk",
    quantity: 1,
    unit: "gallon",
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  },
  {
    name: "eggs",
    quantity: 12,
    unit: "ea",
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
  },
  {
    name: "flour",
    quantity: 2,
    unit: "lb",
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  }
];

export async function testRecipeService() {
  console.log('🧪 Testing Recipe Service...');
  
  try {
    // Test mock recommendations first
    console.log('📋 Testing mock recommendations...');
    const mockResult = getMockRecipeRecommendations();
    console.log('✅ Mock recommendations:', {
      totalRecipes: mockResult.totalRecipes,
      expiringIngredients: mockResult.expiringIngredients.length,
      processingTime: mockResult.processingTime
    });
    
    // Test GPT recommendations (if API key available)
    console.log('🤖 Testing GPT recommendations...');
    const gptResult = await getRecipeRecommendations(testIngredients);
    console.log('✅ GPT recommendations:', {
      totalRecipes: gptResult.totalRecipes,
      expiringIngredients: gptResult.expiringIngredients.length,
      processingTime: gptResult.processingTime,
      model: gptResult.model
    });
    
    // Log sample recipe
    if (gptResult.recipes.length > 0) {
      const sampleRecipe = gptResult.recipes[0];
      console.log('🍳 Sample recipe:', {
        name: sampleRecipe.name,
        category: sampleRecipe.category,
        difficulty: sampleRecipe.difficulty,
        prepTime: sampleRecipe.prepTime,
        cookTime: sampleRecipe.cookTime,
        servings: sampleRecipe.servings,
        ingredientsCount: sampleRecipe.ingredients.length,
        instructionsCount: sampleRecipe.instructions.length
      });
    }
    
    console.log('🎉 Recipe service test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Recipe service test failed:', error);
    return false;
  }
}

// Export for use in other files
export { testIngredients };
