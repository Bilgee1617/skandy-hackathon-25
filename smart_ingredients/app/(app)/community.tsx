
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    StyleSheet, View, Text, FlatList, Alert, 
    SafeAreaView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Ingredient {
  id: string;
  name: string;
  expiration_date: string;
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

  if (diffDays < 0) return { text: `Expired ${-diffDays}d ago`, color: '#d9534f', days: diffDays };
  if (diffDays === 0) return { text: 'Expires Today', color: '#d9534f', days: diffDays };
  if (diffDays === 1) return { text: 'Expires Tomorrow', color: '#f0ad4e', days: diffDays };
  if (diffDays <= 7) return { text: `Expires in ${diffDays} days`, color: '#f0ad4e', days: diffDays };
  return { text: `Expires in ${diffDays} days`, color: '#5cb85c', days: diffDays };
};

export default function CommunityScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExpiringIngredients();
    const subscription = supabase
      .channel('public:ingredients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => {
        fetchExpiringIngredients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchExpiringIngredients = async () => {
    if(loading) return;
    setLoading(true);

    const today = new Date();
    const twoDaysFromNow = new Date(today.setDate(today.getDate() + 2));
    const isoDate = twoDaysFromNow.toISOString();

    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .lte('expiration_date', isoDate)
      .order('expiration_date', { ascending: true, nullsFirst: false });

    if (error) Alert.alert('Error fetching ingredients', error.message);
    else setIngredients(data as Ingredient[]);
    setLoading(false);
  };

  const renderItem = ({ item }: { item: Ingredient }) => {
    const { text, color } = getExpirationInfo(item.expiration_date);
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text>
        </View>
        <Text style={[styles.itemExpiration, { color }]}>{text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community Ingredients</Text>
        {loading && <ActivityIndicator />}
      </View>
      <FlatList
        data={ingredients}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={fetchExpiringIngredients}
        refreshing={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    list: {
        padding: 10,
    },
    itemContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '500',
    },
    itemQuantity: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    itemExpiration: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});
