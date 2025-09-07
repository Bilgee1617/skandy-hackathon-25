import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface IngredientItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  isSelected: boolean;
  source: 'detected' | 'manual';
  confidence?: number; // OCR confidence score for detected items
}

interface DetectedIngredient {
  name: string;
  confidence?: number;
}

interface IngredientConfirmationModalProps {
  visible: boolean;
  detectedIngredients: DetectedIngredient[];
  onSave: (ingredients: IngredientItem[]) => void;
  onCancel: () => void;
  confidenceThreshold?: number; // Default confidence threshold for auto-selection
}

const UNITS = [
  { value: 'ea', label: 'Each' },
  { value: 'pack', label: 'Pack' },
  { value: 'lb', label: 'Pound' },
  { value: 'oz', label: 'Ounce' },
  { value: 'g', label: 'Gram' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'ml', label: 'Milliliter' },
  { value: 'L', label: 'Liter' },
];

export default function IngredientConfirmationModal({
  visible,
  detectedIngredients,
  onSave,
  onCancel,
  confidenceThreshold = 0.7,
}: IngredientConfirmationModalProps) {
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [nextId, setNextId] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Initialize ingredients from detected list
  useEffect(() => {
    if (visible && detectedIngredients.length > 0) {
      const initialIngredients: IngredientItem[] = detectedIngredients.map((ingredient, index) => ({
        id: `detected-${index}`,
        name: ingredient.name,
        quantity: 1,
        unit: 'ea',
        isSelected: (ingredient.confidence || 0) >= confidenceThreshold,
        source: 'detected' as const,
        confidence: ingredient.confidence,
      }));
      setIngredients(initialIngredients);
      setNextId(detectedIngredients.length + 1);
    }
  }, [visible, detectedIngredients, confidenceThreshold]);

  const addNewItem = () => {
    const newItem: IngredientItem = {
      id: `manual-${nextId}`,
      name: '',
      quantity: 1,
      unit: 'ea',
      isSelected: true,
      source: 'manual',
    };
    setIngredients([...ingredients, newItem]);
    setNextId(nextId + 1);
  };

  const updateIngredient = (id: string, field: keyof IngredientItem, value: any) => {
    setIngredients(ingredients.map(ingredient => 
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  const toggleSelection = (id: string) => {
    updateIngredient(id, 'isSelected', !ingredients.find(i => i.id === id)?.isSelected);
  };

  const selectAll = () => {
    setIngredients(ingredients.map(ingredient => ({ ...ingredient, isSelected: true })));
  };

  const clearAll = () => {
    setIngredients(ingredients.map(ingredient => ({ ...ingredient, isSelected: false })));
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const validateAndSave = () => {
    try {
      const selectedIngredients = ingredients.filter(ingredient => ingredient.isSelected);
      
      if (selectedIngredients.length === 0) {
        Alert.alert('No Items Selected', 'Please select at least one ingredient to save.');
        return;
      }
      
      // Validation
      const errors: string[] = [];
      
      selectedIngredients.forEach((ingredient, index) => {
        if (!ingredient.name.trim()) {
          errors.push(`Item ${index + 1}: Name is required`);
        }
        if (ingredient.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
      });

      if (errors.length > 0) {
        Alert.alert('Validation Error', errors.join('\n'));
        return;
      }

      // Normalize units and merge duplicates
      const normalizedIngredients = selectedIngredients.map(ingredient => ({
        ...ingredient,
        unit: normalizeUnit(ingredient.unit),
      }));

      // Merge duplicates (same name + unit) by summing quantities
      const mergedIngredients = mergeDuplicates(normalizedIngredients);

      console.log('Validated ingredients:', mergedIngredients);
      onSave(mergedIngredients);
      
    } catch (error) {
      console.error('Error in validateAndSave:', error);
      Alert.alert('Error', 'An error occurred while saving ingredients. Please try again.');
    }
  };

  const mergeDuplicates = (ingredients: IngredientItem[]): IngredientItem[] => {
    const merged = new Map<string, IngredientItem>();
    
    ingredients.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase().trim()}_${ingredient.unit}`;
      
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.quantity += ingredient.quantity;
        // Keep the higher confidence if both are detected
        if (ingredient.confidence && existing.confidence) {
          existing.confidence = Math.max(existing.confidence, ingredient.confidence);
        }
      } else {
        merged.set(key, { ...ingredient });
      }
    });
    
    return Array.from(merged.values());
  };

  const normalizeUnit = (unit: string): string => {
    try {
      if (!unit || typeof unit !== 'string') {
        return 'ea'; // Default unit
      }
      
      const unitMap: Record<string, string> = {
        'each': 'ea',
        'piece': 'ea',
        'pound': 'lb',
        'pounds': 'lb',
        'ounce': 'oz',
        'ounces': 'oz',
        'gram': 'g',
        'grams': 'g',
        'kilogram': 'kg',
        'kilograms': 'kg',
        'milliliter': 'ml',
        'milliliters': 'ml',
        'liter': 'L',
        'liters': 'L',
      };
      
      return unitMap[unit.toLowerCase()] || unit;
    } catch (error) {
      console.error('Error in normalizeUnit:', error);
      return 'ea'; // Default fallback
    }
  };

  const selectedCount = ingredients.filter(i => i.isSelected).length;
  const totalCount = ingredients.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Ingredients</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {selectedCount} of {totalCount} items selected
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={selectAll} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ingredients List */}
        <TouchableOpacity style={styles.ingredientsList} activeOpacity={1} onPress={closeDropdown}>
          <ScrollView showsVerticalScrollIndicator={false}>
          {ingredients.map((ingredient) => (
            <View key={ingredient.id} style={[
              styles.ingredientRow,
              openDropdown === ingredient.id && styles.ingredientRowWithDropdown
            ]}>
              {/* Checkbox */}
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => toggleSelection(ingredient.id)}
              >
                <Ionicons
                  name={ingredient.isSelected ? "checkbox" : "square-outline"}
                  size={20}
                  color={ingredient.isSelected ? "#007AFF" : "#999"}
                />
              </TouchableOpacity>

              {/* Name Input */}
              <TextInput
                style={styles.nameInput}
                value={ingredient.name}
                onChangeText={(text) => updateIngredient(ingredient.id, 'name', text)}
                placeholder="Ingredient name"
                placeholderTextColor="#999"
              />

              {/* Quantity Input */}
              <TextInput
                style={styles.quantityInput}
                value={ingredient.quantity.toString()}
                onChangeText={(text) => {
                  const num = parseFloat(text) || 0;
                  updateIngredient(ingredient.id, 'quantity', num);
                }}
                keyboardType="numeric"
                placeholder="1"
              />

              {/* Unit Dropdown */}
              <View style={styles.unitContainer}>
                <TouchableOpacity
                  style={styles.unitDropdown}
                  onPress={() => setOpenDropdown(openDropdown === ingredient.id ? null : ingredient.id)}
                >
                  <Text style={styles.unitDropdownText}>{ingredient.unit}</Text>
                  <Ionicons 
                    name={openDropdown === ingredient.id ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {openDropdown === ingredient.id && (
                  <View style={styles.unitDropdownList}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {UNITS.map((unit) => (
                        <TouchableOpacity
                          key={unit.value}
                          style={[
                            styles.unitDropdownItem,
                            ingredient.unit === unit.value && styles.unitDropdownItemSelected
                          ]}
                          onPress={() => {
                            updateIngredient(ingredient.id, 'unit', unit.value);
                            setOpenDropdown(null);
                          }}
                        >
                          <Text style={[
                            styles.unitDropdownItemText,
                            ingredient.unit === unit.value && styles.unitDropdownItemTextSelected
                          ]}>
                            {unit.value}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

            </View>
          ))}
          </ScrollView>
        </TouchableOpacity>

        {/* Add Item Button */}
        <TouchableOpacity style={styles.addButton} onPress={addNewItem}>
          <Ionicons name="add" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.saveButton} onPress={validateAndSave}>
            <Text style={styles.saveButtonText}>
              Save {selectedCount} Items
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  ingredientsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginVertical: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    gap: 8,
  },
  ingredientRowWithDropdown: {
    zIndex: 1000,
    elevation: 5,
  },
  checkbox: {
    width: 24,
    alignItems: 'center',
  },
  nameInput: {
    flex: 2,
    minWidth: 120,
    fontSize: 14,
    color: '#333',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 32,
  },
  quantityInput: {
    width: 50,
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    minHeight: 32,
  },
  unitContainer: {
    width: 100,
    position: 'relative',
  },
  unitDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 32,
  },
  unitDropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  unitDropdownList: {
    position: 'absolute',
    top: 32,
    left: -20,
    right: -20,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 9999,
    maxHeight: 200,
    minWidth: 120,
  },
  unitDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unitDropdownItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  unitDropdownItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  unitDropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 15,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
