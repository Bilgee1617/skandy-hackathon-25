
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    StyleSheet, View, Text, FlatList, Alert, 
    SafeAreaView, ActivityIndicator, TouchableOpacity, Dimensions, ScrollView
} from 'react-native';
import { User } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

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

// Generate HTML for OpenStreetMap with Leaflet (free alternative)
const generateMapHTML = (userLocation: Location.LocationObject, ingredients: Ingredient[]): string => {
  const userLat = userLocation.coords.latitude;
  const userLon = userLocation.coords.longitude;
  
  // Create markers for food items
  const markers = ingredients
    .filter(ing => ing.latitude && ing.longitude)
    .map(ing => {
      const { text, color } = getExpirationInfo(ing.expiration_date);
      const owner = ing.profiles?.username || 'Unknown';
      const markerColor = color === '#d9534f' ? 'red' : color === '#f0ad4e' ? 'orange' : 'green';
      
      return `
        L.marker([${ing.latitude}, ${ing.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: \`<div style="background-color: ${markerColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><span style="color: white; font-size: 12px;">🍎</span></div>\`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(map).bindPopup(\`
          <div style="padding: 8px; min-width: 150px;">
            <h4 style="margin: 0 0 5px 0; color: #333;">${ing.name}</h4>
            <p style="margin: 0 0 3px 0; color: #666; font-size: 14px;">${ing.quantity} ${ing.unit}</p>
            <p style="margin: 0 0 3px 0; color: #888; font-size: 12px;">From: ${owner}</p>
            <p style="margin: 0 0 3px 0; color: ${color}; font-weight: bold; font-size: 12px;">${text}</p>
            ${ing.distance !== undefined ? `<p style="margin: 0; color: #007AFF; font-size: 12px;">📍 ${formatDistance(ing.distance)} away</p>` : ''}
          </div>
        \`);`;
    })
    .join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100%; }
        .custom-marker { background: transparent !important; border: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        // Initialize the map
        const map = L.map('map').setView([${userLat}, ${userLon}], 13);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);
        
        // Add user location marker
        L.marker([${userLat}, ${userLon}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background-color: #007AFF; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"><span style="color: white; font-size: 14px;">📍</span></div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })
        }).addTo(map).bindPopup('<div style="padding: 8px;"><strong>Your Location</strong><br>You are here!</div>');
        
        // Add food item markers
        ${markers}
      </script>
    </body>
    </html>
  `;
};

export default function CommunityScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setUser(session.user);
        }
    };
    fetchUser();
    
    // Fetch dummy data immediately for testing
    fetchExpiringIngredients();
  }, []);

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermission(true);
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
        } else {
          setLocationPermission(false);
          Alert.alert(
            'Location Permission',
            'Location permission is needed to show distances to food items. You can enable it in your device settings.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationPermission(false);
      }
    };

    requestLocationPermission();
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

  // Refetch data when user location changes
  useEffect(() => {
    if (user && userLocation) {
      fetchExpiringIngredients();
    }
  }, [userLocation]);

  const fetchExpiringIngredients = async () => {
    if (loading) return;
    console.log('Fetching expiring ingredients...', { user: !!user, userLocation: !!userLocation });
    setLoading(true);

    // Create dummy data with location information for testing
    // Use a default location (San Francisco) if user location is not available yet
    const defaultLat = 37.7749;
    const defaultLon = -122.4194;
    const currentLat = userLocation?.coords.latitude || defaultLat;
    const currentLon = userLocation?.coords.longitude || defaultLon;

    const dummyIngredients: Ingredient[] = [
      {
        id: '1',
        name: 'Fresh Bananas',
        expiration_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        quantity: 5,
        unit: 'ea',
        user_id: 'user1',
        latitude: currentLat + 0.01, // ~1km away
        longitude: currentLon + 0.01,
        profiles: { username: 'Sarah' }
      },
      {
        id: '2',
        name: 'Organic Milk',
        expiration_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        quantity: 1,
        unit: 'gallon',
        user_id: 'user2',
        latitude: currentLat - 0.005, // ~500m away
        longitude: currentLon - 0.005,
        profiles: { username: 'Mike' }
      },
      {
        id: '3',
        name: 'Bell Peppers',
        expiration_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        quantity: 3,
        unit: 'ea',
        user_id: 'user3',
        latitude: currentLat + 0.02, // ~2km away
        longitude: currentLon - 0.01,
        profiles: { username: 'Emma' }
      },
      {
        id: '4',
        name: 'Greek Yogurt',
        expiration_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        quantity: 2,
        unit: 'pack',
        user_id: 'user4',
        latitude: currentLat - 0.015, // ~1.5km away
        longitude: currentLon + 0.02,
        profiles: { username: 'Alex' }
      },
      {
        id: '5',
        name: 'Fresh Spinach',
        expiration_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        quantity: 1,
        unit: 'bunch',
        user_id: 'user5',
        latitude: currentLat + 0.03, // ~3km away
        longitude: currentLon + 0.03,
        profiles: { username: 'Lisa' }
      },
      {
        id: '6',
        name: 'Bread Loaf',
        expiration_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        quantity: 1,
        unit: 'loaf',
        user_id: 'user6',
        latitude: currentLat - 0.008, // ~800m away
        longitude: currentLon - 0.008,
        profiles: { username: 'David' }
      }
    ];

    // Calculate distances for dummy data
    const combinedData = dummyIngredients.map(ingredient => {
        let distance: number | undefined;
        
        // Calculate distance if user location is available and ingredient has coordinates
        if (userLocation && ingredient.latitude && ingredient.longitude) {
            distance = calculateDistance(
                userLocation.coords.latitude,
                userLocation.coords.longitude,
                ingredient.latitude,
                ingredient.longitude
            );
        }

        return {
            ...ingredient,
            distance
        };
    });

    // Sort by distance if location is available, otherwise by expiration date
    const sortedData = userLocation 
        ? combinedData.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
        : combinedData.sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime());

    console.log('Setting ingredients:', sortedData.length, 'items');
    setIngredients(sortedData);
    setLoading(false);

    // Uncomment the code below to use real database data instead of dummy data
    /*
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
        let distance: number | undefined;
        
        // Calculate distance if user location is available and ingredient has coordinates
        if (userLocation && ingredient.latitude && ingredient.longitude) {
            distance = calculateDistance(
                userLocation.coords.latitude,
                userLocation.coords.longitude,
                ingredient.latitude,
                ingredient.longitude
            );
        }

        return {
            ...ingredient,
            distance,
            profiles: {
                username: profilesMap.get(ingredient.user_id) || 'Unknown'
            }
        };
    });

    // Sort by distance if location is available, otherwise by expiration date
    const sortedData = userLocation 
        ? combinedData.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
        : combinedData;

    setIngredients(sortedData as Ingredient[]);
    setLoading(false);
    */
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
          {item.distance !== undefined && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location-outline" size={14} color="#007AFF" />
              <Text style={styles.distanceText}>{formatDistance(item.distance)} away</Text>
            </View>
          )}
        </View>
        <View style={styles.rightSection}>
          <Text style={[styles.itemExpiration, { color }]}>{text}</Text>
        </View>
      </View>
    );
  };

  const refreshLocation = async () => {
    if (!locationPermission) return;
    
    try {
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
      // Refresh ingredients to recalculate distances
      if (user) {
        fetchExpiringIngredients();
      }
    } catch (error) {
      console.error('Error refreshing location:', error);
    }
  };

  const renderMapView = () => {
    if (!userLocation) {
      return (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="location-outline" size={64} color="#ccc" />
          <Text style={styles.mapPlaceholderText}>Location required to view map</Text>
          <Text style={styles.mapPlaceholderSubtext}>Enable location permission to see food items on a map</Text>
        </View>
      );
    }

    const mapHTML = generateMapHTML(userLocation, ingredients);

    return (
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: mapHTML }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.mapLoadingText}>Loading map...</Text>
            </View>
          )}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>
              {locationPermission ? 'Food near you' : 'See what others are sharing!'}
            </Text>
            
            <View style={styles.headerControls}>
              <View style={styles.viewToggle}>
                <TouchableOpacity 
                  style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons name="list" size={20} color={viewMode === 'list' ? '#fff' : '#007AFF'} />
                  <Text style={[styles.toggleButtonText, viewMode === 'list' && styles.toggleButtonTextActive]}>
                    List
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
                  onPress={() => setViewMode('map')}
                >
                  <Ionicons name="map" size={20} color={viewMode === 'map' ? '#fff' : '#007AFF'} />
                  <Text style={[styles.toggleButtonText, viewMode === 'map' && styles.toggleButtonTextActive]}>
                    Map
                  </Text>
                </TouchableOpacity>
              </View>
              
              {locationPermission && (
                <TouchableOpacity style={styles.locationButton} onPress={refreshLocation}>
                  <Ionicons name="refresh" size={16} color="#007AFF" />
                  <Text style={styles.locationButtonText}>Refresh</Text>
                </TouchableOpacity>
              )}
            </View>
        </View>
        {loading && <ActivityIndicator />}
        {console.log('Rendering with ingredients:', ingredients.length, 'items')}
        {viewMode === 'list' ? (
          <FlatList
              data={ingredients}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              onRefresh={fetchExpiringIngredients}
              refreshing={loading}
          />
        ) : (
          renderMapView()
        )}
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
      alignItems: 'flex-start' 
  },
  itemInfo: {
      flex: 1,
      marginRight: 10,
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
  distanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
  },
  distanceText: {
      fontSize: 12,
      color: '#007AFF',
      marginLeft: 4,
      fontWeight: '500',
  },
  rightSection: {
      alignItems: 'flex-end',
  },
  itemExpiration: {
      fontSize: 14,
      fontWeight: 'bold',
  },
  locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f8ff',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 10,
  },
  locationButtonText: {
      fontSize: 12,
      color: '#007AFF',
      marginLeft: 4,
      fontWeight: '500',
  },
  // Map View Styles
  mapContainer: {
      flex: 1,
  },
  map: {
      flex: 1,
      width: Dimensions.get('window').width,
  },
  mapLoading: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      zIndex: 1,
  },
  mapLoadingText: {
      marginTop: 12,
      fontSize: 16,
      color: '#666',
      fontWeight: '500',
  },
  mapPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      padding: 40,
  },
  mapPlaceholderText: {
      fontSize: 16,
      color: '#666',
      marginTop: 16,
      textAlign: 'center',
      fontWeight: '500',
  },
  mapPlaceholderSubtext: {
      fontSize: 14,
      color: '#999',
      marginTop: 8,
      textAlign: 'center',
  },
  // Header Controls Styles
  headerControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 15,
  },
  viewToggle: {
      flexDirection: 'row',
      backgroundColor: '#f0f0f0',
      borderRadius: 20,
      padding: 2,
  },
  toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 18,
  },
  toggleButtonActive: {
      backgroundColor: '#007AFF',
  },
  toggleButtonText: {
      fontSize: 14,
      color: '#007AFF',
      marginLeft: 6,
      fontWeight: '500',
  },
  toggleButtonTextActive: {
      color: '#fff',
  },
});
