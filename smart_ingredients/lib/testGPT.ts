/**
 * Test GPT Integration
 * 
 * Simple test to verify GPT API integration works
 */

import { processIngredientsWithGPT, testGPTConnection } from './gptService';

export async function runGPTTest() {
  console.log('🧪 Testing GPT Integration...');
  
  try {
    // Test connection first
    console.log('1. Testing GPT connection...');
    const connectionTest = await testGPTConnection();
    
    if (!connectionTest) {
      console.error('❌ GPT connection test failed');
      return false;
    }
    
    console.log('✅ GPT connection test passed');
    
    // Test with sample receipt text
    console.log('2. Testing ingredient extraction...');
    const sampleReceipt = `
      GROCERY STORE RECEIPT
      ====================
      
      Organic Whole Milk - 1 gallon - $4.99
      Fresh Bananas - 2 lbs - $2.50
      Whole Wheat Bread - 1 loaf - $3.25
      Free Range Eggs - 1 dozen - $4.75
      Organic Spinach - 1 bag - $2.99
      Greek Yogurt - 2 containers - $5.98
      Olive Oil - 1 bottle - $8.99
      Sea Salt - 1 container - $1.99
      
      Subtotal: $36.44
      Tax: $2.91
      Total: $39.35
    `;
    
    const result = await processIngredientsWithGPT(sampleReceipt);
    
    console.log('✅ GPT processing completed:');
    console.log(`   - Ingredients found: ${result.totalItems}`);
    console.log(`   - Processing time: ${result.processingTime}ms`);
    console.log(`   - Model used: ${result.model}`);
    console.log('   - Ingredients:');
    
    result.ingredients.forEach((ingredient, index) => {
      console.log(`     ${index + 1}. ${ingredient.name} (${ingredient.quantity || 1} ${ingredient.unit || 'ea'}) - ${Math.round(ingredient.confidence * 100)}% confidence`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ GPT test failed:', error);
    return false;
  }
}

// Export for use in other files
export { runGPTTest };
