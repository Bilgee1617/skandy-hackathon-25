
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    StyleSheet, View, Text, Alert, 
    SafeAreaView, TextInput, TouchableOpacity, ScrollView, Dimensions
} from 'react-native';
import { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Function to generate profile avatar based on username/email
const getProfileAvatar = (name: string, email: string) => {
    const displayName = name || email || 'User';
    const firstLetter = displayName.charAt(0).toUpperCase();
    
    // Generate a color based on the first letter
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
    const backgroundColor = colors[colorIndex];
    
    return { firstLetter, backgroundColor };
};

// Function to get user stats (mock data for now)
const getUserStats = () => {
    return {
        ingredientsCount: 12,
        recipesTried: 8,
        daysActive: 45,
        favoriteCategory: 'Vegetable'
    };
};

export default function ProfileScreen() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [username, setUsername] = useState('');

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                getProfile(session.user);
            } else {
                setLoading(false);
            }
        };

        fetchUserAndProfile();
    }, []);

    const getProfile = async (user: User) => {
        try {
            setLoading(true);
            const { data, error, status } = await supabase
                .from('profiles')
                .select(`username`)
                .eq('id', user.id)
                .single();

            if (error && status !== 406) {
                throw error;
            }

            if (data) {
                setUsername(data.username || '');
            }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('Error fetching profile', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const updates = {
                id: user.id,
                username,
                updated_at: new Date(),
            };
            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) {
                throw error;
            }
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('Error updating profile', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        const { error } = await supabase.auth.signOut();
                        if (error) {
                            Alert.alert('Error signing out', error.message);
                            setLoading(false);
                        } else {
                            // Success message - the root layout will handle redirecting
                            Alert.alert('Success', 'You have been signed out successfully.');
                        }
                    },
                },
            ]
        );
    };

    const avatar = getProfileAvatar(username, user?.email || '');
    const stats = getUserStats();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header with Profile Picture */}
                <View style={styles.header}>
                    <View style={styles.profilePictureContainer}>
                        <View style={[styles.profilePicture, { backgroundColor: avatar.backgroundColor }]}>
                            <Text style={styles.profilePictureText}>{avatar.firstLetter}</Text>
                        </View>
                        <TouchableOpacity style={styles.editPictureButton}>
                            <Ionicons name="camera" size={16} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.displayName}>{username || 'Smart Cook'}</Text>
                    {user?.email && <Text style={styles.email}>{user.email}</Text>}
                </View>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Ionicons name="basket" size={24} color="#FF6B6B" />
                            <Text style={styles.statNumber}>{stats.ingredientsCount}</Text>
                            <Text style={styles.statLabel}>Ingredients</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="restaurant" size={24} color="#4ECDC4" />
                            <Text style={styles.statNumber}>{stats.recipesTried}</Text>
                            <Text style={styles.statLabel}>Recipes</Text>
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Ionicons name="calendar" size={24} color="#45B7D1" />
                            <Text style={styles.statNumber}>{stats.daysActive}</Text>
                            <Text style={styles.statLabel}>Days Active</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons name="heart" size={24} color="#96CEB4" />
                            <Text style={styles.statNumber}>{stats.favoriteCategory}</Text>
                            <Text style={styles.statLabel}>Favorite</Text>
                        </View>
                    </View>
                </View>

                {/* Profile Settings */}
                <View style={styles.settingsContainer}>
                    <Text style={styles.sectionTitle}>Profile Settings</Text>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            onChangeText={setUsername}
                            value={username}
                            placeholder="Your public username"
                            autoCapitalize="none"
                            placeholderTextColor="#888"
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={updateProfile} disabled={loading}>
                        <Ionicons name="checkmark" size={20} color="white" style={styles.buttonIcon} />
                        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Actions */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="settings" size={20} color="#666" />
                        <Text style={styles.actionButtonText}>Settings</Text>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="help-circle" size={20} color="#666" />
                        <Text style={styles.actionButtonText}>Help & Support</Text>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="information-circle" size={20} color="#666" />
                        <Text style={styles.actionButtonText}>About</Text>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.actionButton, styles.signOutAction]} onPress={handleSignOut} disabled={loading}>
                        <Ionicons name="log-out" size={20} color="#FF3B30" />
                        <Text style={[styles.actionButtonText, styles.signOutText]}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    profilePictureContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    profilePicture: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    profilePictureText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    editPictureButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    displayName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    email: {
        fontSize: 16,
        color: '#666',
    },
    statsContainer: {
        padding: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginHorizontal: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    settingsContainer: {
        backgroundColor: '#fff',
        margin: 20,
        marginTop: 0,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    actionsContainer: {
        backgroundColor: '#fff',
        margin: 20,
        marginTop: 0,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    actionButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginLeft: 15,
    },
    signOutAction: {
        borderBottomWidth: 0,
        marginTop: 10,
    },
    signOutText: {
        color: '#FF3B30',
        fontWeight: '500',
    },
});
