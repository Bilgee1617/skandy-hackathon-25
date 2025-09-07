import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface Ingredient {
  id: string;
  name: string;
  expiration_date: string;
  bought_on: string;
}
export default function IngredientsScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [name, setName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    fetchIngredients();
  }, []);
  const fetchIngredients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('expiration_date', { ascending: true });
    if (error) {
      Alert.alert('Error fetching ingredients', error.message);
    } else {
      setIngredients(data as Ingredient[]);
    }
    setLoading(false);
  };
  const addIngredient = async () => {
    if (!name) {
      Alert.alert('Please enter an ingredient name.');
      return;
    }
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to add ingredients.');
        setLoading(false);
        return;
    }
    
    const { error } = await supabase.from('ingredients').insert([
      { name, expiration_date: expirationDate || null, user_id: user.id },
    ]);
    if (error) {
      Alert.alert('Error adding ingredient', error.message);
    } else {
      setName('');
      setExpirationDate('');
      fetchIngredients(); // Refresh the list
    }
    setLoading(false);
  };
  const renderItem = ({ item }: { item: Ingredient }) => (
    <View style={styles.itemContainer}>
      <View>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.expiration_date && <Text style={styles.itemDate}>Expires: {new Date(item.expiration_date).toLocaleDateString()}</Text>}
        <Text style={styles.itemDate}>Bought: {new Date(item.bought_on).toLocaleDateString()}</Text>
      </View>
    </View>
  );
  return (
<View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ingredient Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Expiration Date (YYYY-MM-DD)"
          value={expirationDate}
          onChangeText={setExpirationDate}
        />
        <TouchableOpacity style={styles.addButton} onPress={addIngredient} disabled={loading}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={ingredients}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onRefresh={fetchIngredients}
        refreshing={loading}
        ListEmptyComponent={<Text style={styles.emptyText}>No ingredients yet. Add some!</Text>}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  itemContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '500',
  },
  itemDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
});
