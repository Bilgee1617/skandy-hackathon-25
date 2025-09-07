import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { getRecipeRecommendations, Recipe, Ingredient, RecipeRecommendation } from '../../lib/recipeService';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';

// Function to get recipe theme based on recipe name/type
const getRecipeTheme = (recipeName: string) => {
  const name = recipeName.toLowerCase();
  
  // Breakfast recipes
  if (name.includes('pancake') || name.includes('waffle') || name.includes('breakfast')) {
    return {
      emoji: '🥞',
      gradient: ['#FFE4B5', '#FFD700'],
      accentColor: '#FF8C00',
      textColor: '#8B4513'
    };
  }
  
  // Italian recipes
  if (name.includes('pasta') || name.includes('pizza') || name.includes('italian') || name.includes('spaghetti')) {
    return {
      emoji: '🍝',
      gradient: ['#FFE4E1', '#FFB6C1'],
      accentColor: '#DC143C',
      textColor: '#8B0000'
    };
  }
  
  // Asian recipes
  if (name.includes('stir') || name.includes('fried') || name.includes('asian') || name.includes('noodle')) {
    return {
      emoji: '🥢',
      gradient: ['#FFF8DC', '#F0E68C'],
      accentColor: '#FF6347',
      textColor: '#B8860B'
    };
  }
  
  // Mexican recipes
  if (name.includes('taco') || name.includes('burrito') || name.includes('mexican') || name.includes('salsa')) {
    return {
      emoji: '🌮',
      gradient: ['#FFE4B5', '#FFA500'],
      accentColor: '#FF4500',
      textColor: '#8B4513'
    };
  }
  
  // Salad recipes
  if (name.includes('salad') || name.includes('green') || name.includes('fresh')) {
    return {
      emoji: '🥗',
      gradient: ['#F0FFF0', '#90EE90'],
      accentColor: '#228B22',
      textColor: '#006400'
    };
  }
  
  // Soup recipes
  if (name.includes('soup') || name.includes('broth') || name.includes('stew')) {
    return {
      emoji: '🍲',
      gradient: ['#FFF8DC', '#DEB887'],
      accentColor: '#CD853F',
      textColor: '#8B4513'
    };
  }
  
  // Dessert recipes
  if (name.includes('cake') || name.includes('cookie') || name.includes('dessert') || name.includes('sweet')) {
    return {
      emoji: '🍰',
      gradient: ['#FFE4E1', '#FFB6C1'],
      accentColor: '#FF69B4',
      textColor: '#8B008B'
    };
  }
  
  // Smoothie/Juice recipes
  if (name.includes('smoothie') || name.includes('juice') || name.includes('drink')) {
    return {
      emoji: '🥤',
      gradient: ['#E6E6FA', '#DDA0DD'],
      accentColor: '#9370DB',
      textColor: '#4B0082'
    };
  }
  
  // Default theme
  return {
    emoji: '🍽️',
    gradient: ['#F5F5F5', '#E0E0E0'],
    accentColor: '#666666',
    textColor: '#333333'
  };
};

export default function RecipesScreen() {
  const [recommendations, setRecommendations] = useState<RecipeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Fetch user session
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        fetchIngredients(session.user);
      }
    };
    fetchUser();
  }, []);

  // Fetch ingredients from database
  const fetchIngredients = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.id)
        .order('expiration_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching ingredients:', error);
        Alert.alert('Error', 'Failed to load ingredients');
        return;
      }

      // Convert database ingredients to recipe service format
      const convertedIngredients: Ingredient[] = (data || []).map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || 'ea',
        expiryDate: item.expiration_date ? new Date(item.expiration_date) : undefined,
      }));

      setIngredients(convertedIngredients);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      Alert.alert('Error', 'Failed to load ingredients');
    }
  };

  const loadRecipeRecommendations = async () => {
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please add some ingredients to your pantry first to get recipe recommendations.');
      return;
    }

    setLoading(true);
    try {
      const result = await getRecipeRecommendations(ingredients);
      setRecommendations(result);
    } catch (error) {
      console.error('Recipe recommendations failed:', error);
      Alert.alert('Error', 'Failed to get recipe recommendations. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load recommendations when ingredients are available
  useEffect(() => {
    if (ingredients.length > 0) {
      loadRecipeRecommendations();
    }
  }, [ingredients]);

  const renderRecipeCard = (recipe: Recipe) => {
    const theme = getRecipeTheme(recipe.name);
    
    return (
      <TouchableOpacity 
        key={recipe.name}
        style={[styles.recipeCard, { backgroundColor: theme.gradient[0] }]}
        onPress={() => setSelectedRecipe(recipe)}
      >
        <View style={styles.recipeCardContent}>
          <View style={styles.recipeHeader}>
            <View style={styles.recipeIconContainer}>
              <Text style={styles.recipeEmoji}>{theme.emoji}</Text>
            </View>
            <View style={styles.recipeInfo}>
              <Text style={[styles.recipeName, { color: theme.textColor }]}>{recipe.name}</Text>
              <View style={styles.recipeMeta}>
                <Text style={[styles.recipeCategory, { color: theme.accentColor }]}>{recipe.category}</Text>
                <Text style={[styles.recipeDifficulty, { color: theme.accentColor }]}>{recipe.difficulty}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.accentColor} />
          </View>
          
          <Text style={[styles.recipeDescription, { color: theme.textColor }]}>{recipe.description}</Text>
          
          <View style={[styles.recipeStats, { backgroundColor: theme.gradient[1] }]}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={theme.accentColor} />
              <Text style={[styles.statText, { color: theme.textColor }]}>{recipe.prepTime}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="restaurant-outline" size={16} color={theme.accentColor} />
              <Text style={[styles.statText, { color: theme.textColor }]}>{recipe.servings} servings</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={16} color={theme.accentColor} />
              <Text style={[styles.statText, { color: theme.textColor }]}>{recipe.cookTime}</Text>
            </View>
          </View>
          
          <View style={styles.ingredientsPreview}>
            <Text style={[styles.ingredientsLabel, { color: theme.textColor }]}>Key ingredients:</Text>
            <Text style={[styles.ingredientsText, { color: theme.textColor }]}>
              {recipe.ingredients.slice(0, 3).join(', ')}
              {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3} more`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
      ) : ingredients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No ingredients in your pantry</Text>
          <Text style={styles.emptySubtext}>Add some ingredients to get personalized recipe recommendations!</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No recipe recommendations available</Text>
          <Text style={styles.emptySubtext}>Try refreshing or check your internet connection</Text>
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
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  recipeCardContent: {
    padding: 16,
  },
  recipeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeEmoji: {
    fontSize: 24,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    padding: 12,
    borderRadius: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
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
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
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
