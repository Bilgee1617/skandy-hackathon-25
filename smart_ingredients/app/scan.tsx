import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import CameraScreen from '../components/CameraScreen';

export default function ScanScreen() {
  const [showCamera, setShowCamera] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="scan" size={80} color="#007AFF" />
        </View>
        <Text style={styles.title}>Scan More</Text>
        <Text style={styles.subtitle}>Scan receipts to extract ingredients and add them to your inventory</Text>
        
        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => setShowCamera(true)}
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.scanButtonText}>Start Scanning</Text>
        </TouchableOpacity>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="receipt" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Receipt OCR</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="add-circle" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Auto-add Ingredients</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="text" size={20} color="#007AFF" />
            <Text style={styles.featureText}>Text Recognition</Text>
          </View>
        </View>
      </View>
      
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <CameraScreen onClose={() => setShowCamera(false)} />
      </Modal>
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
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 40,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  features: {
    width: '100%',
    maxWidth: 300,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
});
