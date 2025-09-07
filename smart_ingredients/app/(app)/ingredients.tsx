
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    StyleSheet, View, Text, FlatList, Alert, 
    SafeAreaView, TouchableOpacity, Modal, TextInput, 
    KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Ingredient {
  id: string;
  name: string;
  expiration_date: string;
  bought_on: string;
  quantity: number;
  unit: string;
}

const getExpirationInfo = (expirationDate: string) => {
  if (!expirationDate) {
    return { text: 'No expiration date', color: '#666', days: Infinity };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `Expired ${Math.abs(diffDays)} days ago`, color: '#d32f2f', days: diffDays };
  }
  if (diffDays === 0) {
    return { text: 'Expires today', color: '#d32f2f', days: diffDays };
  }
  if (diffDays <= 7) {
    return { text: `Expires in ${diffDays} days`, color: '#ed6c02', days: diffDays };
  }
  return { text: `Expires in ${diffDays} days`, color: '#2e7d32', days: diffDays };
};

export default function IngredientsScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('expiration_date', { ascending: true, nullsFirst: false });

    if (error) {
      Alert.alert('Error fetching ingredients', error.message);
    } else {
      setIngredients(data as Ingredient[]);
    }
    setLoading(false);
  };

  const handleOpenModal = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setNewQuantity(ingredient.quantity.toString());
    setNewUnit(ingredient.unit || '');
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedIngredient(null);
    setNewQuantity('');
    setNewUnit('');
  };

  const handleSave = async () => {
    if (!selectedIngredient) return;

    const quantityValue = parseFloat(newQuantity);
    if (isNaN(quantityValue) || quantityValue < 0) {
        Alert.alert('Invalid Quantity', 'Please enter a valid, non-negative number.');
        return;
    }

    setLoading(true);
    let error;

    if (quantityValue <= 0) {
        // If quantity is 0 or less, delete the ingredient
        const { error: deleteError } = await supabase
            .from('ingredients')
            .delete()
            .eq('id', selectedIngredient.id);
        error = deleteError;
    } else {
        // Otherwise, update the quantity and unit
        const { error: updateError } = await supabase
            .from('ingredients')
            .update({ quantity: quantityValue, unit: newUnit })
            .eq('id', selectedIngredient.id);
        error = updateError;
    }

    if (error) {
      Alert.alert('Error saving ingredient', error.message);
    } else {
        await fetchIngredients();
        handleCloseModal();
    }
    setLoading(false);
  };

  const renderItem = ({ item }: { item: Ingredient }) => {
    const expiration = getExpirationInfo(item.expiration_date);
    return (
      <TouchableOpacity onPress={() => handleOpenModal(item)}>
          <View style={styles.itemContainer}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={[styles.itemDate, { color: expiration.color, fontWeight: 'bold' }]}>
                {expiration.text}
              </Text>
              <Text style={styles.itemSubDate}>
                ({item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A'})
              </Text>
            </View>
            {item.quantity != null && item.unit && <Text style={styles.itemQuantity}>{`${item.quantity} ${item.unit}`}</Text>}
          </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
        <Ionicons name="basket-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>Pantry's empty!</Text>
        <Text style={styles.emptySubtitle}>Time for a grocery run?</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Your Pantry</Text>
            <Text style={styles.subtitle}>What's fresh and what's... not so fresh?</Text>
        </View>
      <FlatList
        data={ingredients}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onRefresh={fetchIngredients}
        refreshing={loading}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={ingredients.length === 0 ? styles.flexOne : styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flexOne}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{selectedIngredient?.name}</Text>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.quantityInput}
                            onChangeText={setNewQuantity}
                            value={newQuantity}
                            keyboardType="numeric"
                            placeholder="Quantity"
                        />
                        <TextInput
                            style={styles.unitInput}
                            onChangeText={setNewUnit}
                            value={newUnit}
                            placeholder="Unit"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.quickActionsContainer}>
                        <TouchableOpacity style={styles.quickActionButton} onPress={() => setNewQuantity(q => String(Math.max(0, parseFloat(q || '0') - 1)))}><Text style={styles.quickActionButtonText}>-1</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionButton} onPress={() => setNewQuantity('0' )}><Text style={styles.quickActionButtonText}>Use All</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionButton} onPress={() => setNewQuantity(q => String(parseFloat(q || '0') + 1))}><Text style={styles.quickActionButtonText}>+1</Text></TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
                        <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCloseModal}>
                        <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  itemContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 14,
  },
  itemSubDate: {
    fontSize: 12,
    color: '#888',
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    paddingLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  quantityInput: {
    flex: 2,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 18,
  },
  unitInput: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 18,
    marginLeft: 10,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  quickActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
  },
  quickActionButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#007AFF',
  },
});
