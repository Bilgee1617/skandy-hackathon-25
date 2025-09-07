
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StyleSheet, View, Text, FlatList, Alert, SafeAreaView } from 'react-native';

interface Ingredient {
  id: string;
  name: string;
  expiration_date: string;
  bought_on: string;
  quantity: number;
  unit: string;
}

// --- Helper Function to Calculate Expiration ---
const getExpirationInfo = (expirationDate: string) => {
  if (!expirationDate) {
    return { text: 'No expiration date', color: '#666', days: Infinity };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date
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
// -----------------------------------------

export default function IngredientsScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      // Order by expiration date to show soon-to-expire items first
      .order('expiration_date', { ascending: true, nullsFirst: false });

    if (error) {
      Alert.alert('Error fetching ingredients', error.message);
    } else {
      setIngredients(data as Ingredient[]);
    }
    setLoading(false);
  };

  const renderItem = ({ item }: { item: Ingredient }) => {
    const expiration = getExpirationInfo(item.expiration_date);

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          
          {/* Expiration Info */}
          <Text style={[styles.itemDate, { color: expiration.color, fontWeight: 'bold' }]}>
            {expiration.text}
          </Text>
          <Text style={styles.itemSubDate}>
            ({item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : 'N/A'})
          </Text>

        </View>
        
        {/* Quantity and Unit */}
        {item.quantity && item.unit && <Text style={styles.itemQuantity}>{`${item.quantity} ${item.unit}`}</Text>}
      </View>
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
});
