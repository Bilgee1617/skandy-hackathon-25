
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    StyleSheet, View, Text, FlatList, Alert, 
    SafeAreaView, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { User } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

interface Ingredient {
  id: string;
  name: string;
  expiration_date: string;
  quantity: number;
  unit: string;
  user_id: string;
  latitude?: number;
  longitude?: number;
  profiles: {
    username: string;
  } | null;
  distance?: number; // Distance in kilometers
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

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Format distance for display
const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

export default function CommunityScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUser(session.user);
        }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  const fetchExpiringIngredients = async () => {
    if (loading || !user) return;
    setLoading(true);

    const today = new Date();
    const twoDaysFromNow = new Date(new Date().setDate(today.getDate() + 2));
    const isoDate = twoDaysFromNow.toISOString();

    const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .lte('expiration_date', isoDate)
        .neq('user_id', user.id)
        .order('expiration_date', { ascending: true, nullsFirst: false });

    if (ingredientsError) {
        Alert.alert('Error fetching ingredients', ingredientsError.message);
        setLoading(false);
        return;
    }

    if (!ingredientsData || ingredientsData.length === 0) {
        setIngredients([]);
        setLoading(false);
        return;
    }

    const userIds = [...new Set(ingredientsData.map(ing => ing.user_id))];

    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError.message);
    }

    const profilesMap = new Map(profilesData?.map(p => [p.id, p.username]) || []);

    const combinedData = ingredientsData.map(ingredient => {
        return {
            ...ingredient,
            profiles: {
                username: profilesMap.get(ingredient.user_id) || 'Unknown'
            }
        };
    });

    setIngredients(combinedData as Ingredient[]);
    setLoading(false);
  };

  const renderItem = ({ item }: { item: Ingredient }) => {
    const { text, color } = getExpirationInfo(item.expiration_date);
    const owner = item.profiles?.username || 'Unknown';

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text>
          <Text style={styles.itemOwner}>From: {owner}</Text>
        </View>
        <Text style={[styles.itemExpiration, { color }]}>{text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>See what others are sharing!</Text>
        </View>
        {loading && <ActivityIndicator />}
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
      padding: 20, 
      alignItems: 'center', 
      borderBottomWidth: 1, 
      borderBottomColor: '#eee' 
  },
  title: { 
      fontSize: 28, 
      fontWeight: 'bold', 
      color: '#333' 
  },
  subtitle: { 
      fontSize: 16, 
      color: '#666', 
      marginTop: 5 
  },
  list: {
      padding: 10,
  },
  itemContainer: { 
      backgroundColor: '#f9f9f9', 
      padding: 15, 
      borderRadius: 10, 
      marginVertical: 8, 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
  },
  itemInfo: {
      flex: 1,
  },
  itemName: { 
      fontSize: 18, 
      fontWeight: '500', 
      marginBottom: 4 
  },
  itemQuantity: {
      fontSize: 14,
      color: '#666',
      marginTop: 5,
  },
  itemOwner: {
      fontSize: 12,
      color: '#888',
      marginTop: 5,
  },
  itemExpiration: {
      fontSize: 14,
      fontWeight: 'bold',
  },
});
