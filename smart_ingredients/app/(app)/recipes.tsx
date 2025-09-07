import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getRecipeRecommendations, getMockRecipeRecommendations, Recipe, Ingredient, RecipeRecommendation } from '../../lib/recipeService';

export default function RecipesScreen() {
  const [recommendations, setRecommendations] = useState<RecipeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Mock ingredients data - in real app, this would come from your inventory
  const mockIngredients: Ingredient[] = [
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

  const loadRecipeRecommendations = async () => {
    setLoading(true);
    try {
      // Try GPT recommendations first, fallback to mock if API key not available
      const result = await getRecipeRecommendations(mockIngredients);
      setRecommendations(result);
    } catch (error) {
      console.log('GPT recommendations failed, using mock data:', error);
      // Fallback to mock recommendations
      const mockResult = getMockRecipeRecommendations();
      setRecommendations(mockResult);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipeRecommendations();
  }, []);

  const renderRecipeCard = (recipe: Recipe) => (
    <TouchableOpacity 
      key={recipe.name}
      style={styles.recipeCard}
      onPress={() => setSelectedRecipe(recipe)}
    >
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeName}>{recipe.name}</Text>
        <View style={styles.recipeMeta}>
          <Text style={styles.recipeCategory}>{recipe.category}</Text>
          <Text style={styles.recipeDifficulty}>{recipe.difficulty}</Text>
        </View>
      </View>
      
      <Text style={styles.recipeDescription}>{recipe.description}</Text>
      
      <View style={styles.recipeStats}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.statText}>{recipe.prepTime}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="restaurant-outline" size={16} color="#666" />
          <Text style={styles.statText}>{recipe.servings} servings</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="flame-outline" size={16} color="#666" />
          <Text style={styles.statText}>{recipe.cookTime}</Text>
        </View>
      </View>
      
      <View style={styles.ingredientsPreview}>
        <Text style={styles.ingredientsLabel}>Key ingredients:</Text>
        <Text style={styles.ingredientsText}>
          {recipe.ingredients.slice(0, 3).join(', ')}
          {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3} more`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecipeDetail = (recipe: Recipe) => (
    <View style={styles.recipeDetail}>
      <View style={styles.detailHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSelectedRecipe(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.detailTitle}>{recipe.name}</Text>
      </View>
      
      <ScrollView style={styles.detailContent}>
        <Text style={styles.detailDescription}>{recipe.description}</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => (
            <Text key={index} style={styles.ingredientItem}>• {ingredient}</Text>
          ))}
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>{index + 1}</Text>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  if (selectedRecipe) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        {renderRecipeDetail(selectedRecipe)}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.title}>Recipe Recommendations</Text>
        <Text style={styles.subtitle}>Recipes to use up expiring ingredients</Text>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadRecipeRecommendations}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finding recipes for your expiring ingredients...</Text>
        </View>
      ) : recommendations ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {recommendations.expiringIngredients.length > 0 && (
            <View style={styles.expiringSection}>
              <Text style={styles.expiringTitle}>⚠️ Expiring Soon</Text>
              {recommendations.expiringIngredients.map((ingredient, index) => (
                <Text key={index} style={styles.expiringItem}>
                  {ingredient.name} - {ingredient.daysUntilExpiry} days left
                </Text>
              ))}
            </View>
          )}
          
          <View style={styles.recipesSection}>
            <Text style={styles.sectionTitle}>
              Recommended Recipes ({recommendations.totalRecipes})
            </Text>
            {recommendations.recipes.map(renderRecipeCard)}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No recipe recommendations available</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadRecipeRecommendations}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  refreshText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  expiringSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  expiringTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  expiringItem: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  recipesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  recipeMeta: {
    alignItems: 'flex-end',
  },
  recipeCategory: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  recipeDifficulty: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  ingredientsPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  ingredientsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  ingredientsText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Recipe Detail Styles
  recipeDetail: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  ingredientItem: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});
