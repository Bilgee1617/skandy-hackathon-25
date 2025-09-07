
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    StyleSheet, View, Text, Alert, 
    SafeAreaView, TextInput, TouchableOpacity
} from 'react-native';
import { User } from '@supabase/supabase-js';

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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Your Profile</Text>
                {user?.email && <Text style={styles.email}>{user.email}</Text>}

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
                    <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    email: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f2f2f2',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        width: '100%',
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
});
