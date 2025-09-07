
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StyleSheet, View, Text, FlatList, Alert, SafeAreaView, TouchableOpacity, Modal, TextInput } from 'react-native';

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
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedIngredient(null);
    setNewQuantity('');
  };

  const handleUpdateQuantity = async () => {
    if (!selectedIngredient) return;

    const quantityValue = parseFloat(newQuantity);
    if (isNaN(quantityValue) || quantityValue < 0) {
        Alert.alert('Invalid Quantity', 'Please enter a valid, non-negative number.');
        return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('ingredients')
      .update({ quantity: quantityValue })
      .eq('id', selectedIngredient.id);

    if (error) {
      Alert.alert('Error updating quantity', error.message);
    } else {
        await fetchIngredients(); // Refresh list
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
        ListEmptyComponent={<Text style={styles.emptyText}>No ingredients yet. Go shopping!</Text>}
        contentContainerStyle={styles.listContent}
      />

      {/* --- Edit Quantity Modal --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{selectedIngredient?.name}</Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        onChangeText={setNewQuantity}
                        value={newQuantity}
                        keyboardType="numeric"
                        placeholder="Enter quantity"
                    />
                    <Text style={styles.unitText}>{selectedIngredient?.unit}</Text>
                </View>

                <View style={styles.quickActionsContainer}>
                    <TouchableOpacity style={styles.quickActionButton} onPress={() => setNewQuantity(q => String(Math.max(0, parseFloat(q || '0') - 1)))}><Text style={styles.quickActionButtonText}>-1</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionButton} onPress={() => setNewQuantity('0' )}><Text style={styles.quickActionButtonText}>Use All</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionButton} onPress={() => setNewQuantity(q => String(parseFloat(q || '0') + 1))}><Text style={styles.quickActionButtonText}>+1</Text></TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleUpdateQuantity} disabled={loading}>
                    <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCloseModal}>
                    <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
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
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
  // Modal Styles
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
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 18,
  },
  unitText: {
    fontSize: 18,
    color: '#666',
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
  // Button styles from login.tsx
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
