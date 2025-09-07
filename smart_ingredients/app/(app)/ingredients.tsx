
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

// --- Helper Functions ---
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

const toISODateString = (date: Date) => date.toISOString().split('T')[0];

const formatDisplayDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Adjust for timezone to prevent off-by-one day errors
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    const month = correctedDate.getMonth() + 1;
    const day = correctedDate.getDate();
    const year = correctedDate.getFullYear();
    return `${month}/${day}/${year}`;
};

export default function IngredientsScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');

  // Add Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemExpDate, setNewItemExpDate] = useState('');
  const [newItemBoughtOn, setNewItemBoughtOn] = useState('');


  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    if(loading) return;
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

  // --- Edit Handlers ---
  const handleOpenEditModal = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setEditQuantity(ingredient.quantity.toString());
    setEditUnit(ingredient.unit || '');
    setEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setEditModalVisible(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedIngredient) return;

    const quantityValue = parseFloat(editQuantity);
    if (isNaN(quantityValue) || quantityValue < 0) {
        Alert.alert('Invalid Quantity', 'Please enter a valid, non-negative number.');
        return;
    }

    setLoading(true);
    let error;

    if (quantityValue <= 0) {
        const { error: deleteError } = await supabase.from('ingredients').delete().eq('id', selectedIngredient.id);
        error = deleteError;
    } else {
        const { error: updateError } = await supabase.from('ingredients').update({ quantity: quantityValue, unit: editUnit }).eq('id', selectedIngredient.id);
        error = updateError;
    }

    if (error) {
      Alert.alert('Error saving ingredient', error.message);
    } else {
        await fetchIngredients();
        handleCloseEditModal();
    }
    setLoading(false);
  };

  // --- Add Handlers ---
  const handleOpenAddModal = () => {
      setNewItemName('');
      setNewItemQuantity('1');
      setNewItemUnit('');
      setNewItemExpDate('');
      setNewItemBoughtOn(toISODateString(new Date()));
      setAddModalVisible(true);
  };

  const handleCloseAddModal = () => {
      setAddModalVisible(false);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
        Alert.alert('Missing Name', 'Please enter a name for the ingredient.');
        return;
    }
    const quantityValue = parseFloat(newItemQuantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
        Alert.alert('Invalid Quantity', 'Please enter a valid, positive number for the quantity.');
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        Alert.alert('Not Authenticated', 'You must be logged in to add an ingredient.');
        return;
    }

    setLoading(true);
    const { error } = await supabase.from('ingredients').insert([{
        name: newItemName.trim(),
        quantity: quantityValue,
        unit: newItemUnit.trim(),
        expiration_date: newItemExpDate || null,
        bought_on: newItemBoughtOn || toISODateString(new Date()),
        user_id: session.user.id, // Associate ingredient with the logged-in user
    }]);

    if (error) {
        Alert.alert('Error adding ingredient', error.message);
    } else {
        await fetchIngredients();
        handleCloseAddModal();
    }
    setLoading(false);
  }

  // --- Render Functions ---
  const renderItem = ({ item }: { item: Ingredient }) => {
    const expiration = getExpirationInfo(item.expiration_date);
    return (
      <TouchableOpacity onPress={() => handleOpenEditModal(item)}>
          <View style={styles.itemContainer}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={[styles.itemDate, { color: expiration.color, fontWeight: 'bold' }]}>{expiration.text}</Text>
              <Text style={styles.itemSubDate}>({formatDisplayDate(item.expiration_date)})</Text>
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

        <View style={styles.addButtonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.addButtonText}>Add Ingredient</Text>
            </TouchableOpacity>
        </View>

      {/* --- Edit Quantity Modal --- */}
      <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={handleCloseEditModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexOne}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{selectedIngredient?.name}</Text>
                    <View style={styles.inputRow}>
                        <TextInput style={styles.quantityInput} onChangeText={setEditQuantity} value={editQuantity} keyboardType="numeric" placeholder="Quantity"/>
                        <TextInput style={styles.unitInput} onChangeText={setEditUnit} value={editUnit} placeholder="Unit" autoCapitalize="none"/>
                    </View>
                    <View style={styles.quickActionsContainer}>
                        <TouchableOpacity style={styles.quickActionButton} onPress={() => setEditQuantity(q => String(Math.max(0, parseFloat(q || '0') - 1)))}><Text style={styles.quickActionButtonText}>-1</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionButton} onPress={() => setEditQuantity('0' )}><Text style={styles.quickActionButtonText}>Use All</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.quickActionButton} onPress={() => setEditQuantity(q => String(parseFloat(q || '0') + 1))}><Text style={styles.quickActionButtonText}>+1</Text></TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.button} onPress={handleSaveEdit} disabled={loading}><Text style={styles.buttonText}>Save</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCloseEditModal}><Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text></TouchableOpacity>
                </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- Add Ingredient Modal --- */}
      <Modal animationType="slide" transparent={true} visible={addModalVisible} onRequestClose={handleCloseAddModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexOne}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Add New Ingredient</Text>
                    
                    <View style={styles.modalInputContainer}>
                        <Ionicons name="pricetag-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput style={styles.modalInput} placeholder="Ingredient Name (e.g., Milk)" value={newItemName} onChangeText={setNewItemName} />
                    </View>

                    <View style={styles.inputRow}>
                        <View style={[styles.modalInputContainer, styles.quantityInput]}>
                            <Ionicons name="apps-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput style={styles.modalInput} placeholder="Quantity" value={newItemQuantity} onChangeText={setNewItemQuantity} keyboardType="numeric"/>
                        </View>
                        <View style={[styles.modalInputContainer, styles.unitInput]}>
                             <Ionicons name="options-outline" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput style={styles.modalInput} placeholder="Unit" value={newItemUnit} onChangeText={setNewItemUnit} autoCapitalize="none"/>
                        </View>
                    </View>

                    <View style={styles.modalInputContainer}>
                        <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput style={styles.modalInput} placeholder="Expiration Date (YYYY-MM-DD)" value={newItemExpDate} onChangeText={setNewItemExpDate} />
                    </View>

                    <View style={styles.modalInputContainer}>
                        <Ionicons name="today-outline" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput style={styles.modalInput} placeholder="Bought On (YYYY-MM-DD)" value={newItemBoughtOn} onChangeText={setNewItemBoughtOn} />
                    </View>
                    
                    <TouchableOpacity style={styles.button} onPress={handleAddItem} disabled={loading}><Text style={styles.buttonText}>Add to Pantry</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCloseAddModal}><Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text></TouchableOpacity>
                </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  listContent: { paddingHorizontal: 20, paddingBottom: 80 },
  itemContainer: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 18, fontWeight: '500', marginBottom: 4 },
  itemDate: { fontSize: 14 },
  itemSubDate: { fontSize: 12, color: '#888' },
  itemQuantity: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', paddingLeft: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#555', marginTop: 15 },
  emptySubtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginTop: 5 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 3, paddingBottom: 30 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', borderRadius: 10, marginBottom: 12, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  modalInput: { flex: 1, height: 50, fontSize: 16, color: '#333' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quantityInput: { flex: 2, marginRight: 10 },
  unitInput: { flex: 1 },
  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  quickActionButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#f2f2f2', borderRadius: 10 },
  quickActionButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  button: { backgroundColor: '#007AFF', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  cancelButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#007AFF' },
  cancelButtonText: { color: '#007AFF' },
  addButtonContainer: { paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff', position: 'absolute', bottom: 0, left: 0, right: 0 },
  addButton: { backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: 'white', fontSize: 18, fontWeight: '600', marginLeft: 8 },
});
