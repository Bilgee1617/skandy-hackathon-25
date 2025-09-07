import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { extractTextFromReceipt, extractTextFromReceiptMock, OCRResult } from '../lib/ocrService';
import { getOCRConfig, getOCRMethodName } from '../lib/ocrConfig';

interface CameraScreenProps {
  onClose: () => void;
}

export default function CameraScreen({ onClose }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        
        if (photo) {
          // Process the image for OCR
          await processReceiptImage(photo.uri);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processReceiptImage = async (imageUri: string) => {
    try {
      setIsScanning(true);
      const config = getOCRConfig();
      const methodName = getOCRMethodName(config.method);
      
      setOcrStatus(`Processing image with ${methodName}...`);
      
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOcrStatus(`Extracting text with ${methodName}...`);
      
      // Use real OCR (Tesseract.js or Google Vision API)
      const ocrResult: OCRResult = await extractTextFromReceipt(imageUri);
      
      setOcrStatus('Analyzing ingredients...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use the ingredients already extracted by the OCR service
      const allIngredients = ocrResult.ingredients;
      
      setOcrStatus('Complete!');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Show results with smart analysis
      if (allIngredients.length > 0) {
        const ingredientsList = allIngredients.join('\n• ');
        const smartAnalysis = ocrResult.smartAnalysis;
        
        let message = `Found ${allIngredients.length} food ingredients:\n\n• ${ingredientsList}`;
        
        if (smartAnalysis) {
          message += `\n\n📊 Analysis Details:`;
          message += `\n• Confidence: ${Math.round(smartAnalysis.confidence * 100)}%`;
          message += `\n• Store: ${smartAnalysis.storeInfo.length > 0 ? smartAnalysis.storeInfo[0] : 'Unknown'}`;
          message += `\n• Total: ${smartAnalysis.totalAmount || 'Not found'}`;
          message += `\n• Prices found: ${smartAnalysis.prices.length}`;
        }
        
        Alert.alert(
          '🍎 Smart Ingredient Detection',
          message,
          [
            {
              text: 'Add to Inventory',
              onPress: () => {
                // TODO: Add ingredients to Supabase database
                console.log('Adding ingredients to inventory:', allIngredients);
                onClose();
              },
            },
            {
              text: 'View Analysis',
              onPress: () => {
                if (smartAnalysis) {
                  const analysisDetails = `Smart Analysis Results:\n\n` +
                    `Food Ingredients (${smartAnalysis.ingredients.length}):\n` +
                    smartAnalysis.ingredients.map(ing => `• ${ing.name} (${ing.category}, ${Math.round(ing.confidence * 100)}%)`).join('\n') +
                    `\n\nStore Info: ${smartAnalysis.storeInfo.join(', ')}\n` +
                    `Prices: ${smartAnalysis.prices.join(', ')}\n` +
                    `Total: ${smartAnalysis.totalAmount || 'Not found'}`;
                  
                  Alert.alert('Detailed Analysis', analysisDetails, [
                    { text: 'OK' },
                    {
                      text: 'Add Ingredients',
                      onPress: () => {
                        console.log('Adding ingredients to inventory:', allIngredients);
                        onClose();
                      },
                    },
                  ]);
                }
              },
            },
            {
              text: 'View Raw Text',
              onPress: () => {
                Alert.alert(
                  'Raw OCR Text',
                  ocrResult.text,
                  [
                    { text: 'OK' },
                    {
                      text: 'Add Ingredients',
                      onPress: () => {
                        console.log('Adding ingredients to inventory:', allIngredients);
                        onClose();
                      },
                    },
                  ]
                );
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => onClose(),
            },
          ]
        );
      } else {
        Alert.alert(
          'No Ingredients Found',
          'We couldn\'t identify any ingredients in this receipt. You can view the raw text to see what was detected.',
          [
            {
              text: 'View Raw Text',
              onPress: () => {
                Alert.alert(
                  'Raw OCR Text',
                  ocrResult.text || 'No text detected',
                  [{ text: 'OK' }]
                );
              },
            },
            {
              text: 'OK',
              onPress: () => onClose(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      setOcrStatus('Error occurred');
      
      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Processing Error', 
        `Failed to process receipt: ${errorMessage}\n\nPlease try again with a clearer image.`,
        [
          {
            text: 'Try Again',
            onPress: () => {
              setIsScanning(false);
              setOcrStatus('');
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => onClose(),
          },
        ]
      );
    } finally {
      setIsScanning(false);
      setOcrStatus('');
    }
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'on' : 'off');
  };

  const flipCamera = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={80} color="#FF3B30" />
          <Text style={styles.permissionTitle}>Camera Access Denied</Text>
          <Text style={styles.permissionText}>
            Please enable camera access in your device settings to scan receipts.
          </Text>
          <TouchableOpacity style={styles.settingsButton} onPress={getCameraPermissions}>
            <Text style={styles.settingsButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Receipt</Text>
            <TouchableOpacity style={styles.headerButton} onPress={flipCamera}>
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Scanning Area */}
          <View style={styles.scanningArea}>
            <View style={[styles.scanFrame, isScanning && styles.scanFrameActive]}>
              <View style={[styles.corner, styles.topLeft, isScanning && styles.cornerActive]} />
              <View style={[styles.corner, styles.topRight, isScanning && styles.cornerActive]} />
              <View style={[styles.corner, styles.bottomLeft, isScanning && styles.cornerActive]} />
              <View style={[styles.corner, styles.bottomRight, isScanning && styles.cornerActive]} />
            </View>
            <Text style={styles.scanInstruction}>
              {isScanning ? 'Processing receipt...' : 'Position the receipt within the frame'}
            </Text>
          </View>

          {/* OCR Status Indicator */}
          {isScanning && (
            <View style={styles.ocrStatusContainer}>
              <View style={styles.ocrStatusBox}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.ocrStatusText}>{ocrStatus}</Text>
              </View>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.controlButton} onPress={pickImageFromGallery}>
              <Ionicons name="images" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isScanning}
            >
              <View style={styles.captureButtonInner}>
                {isScanning ? (
                  <Ionicons name="hourglass" size={30} color="white" />
                ) : (
                  <Ionicons name="camera" size={30} color="white" />
                )}
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Ionicons 
                name={flashMode === 'on' ? "flash" : "flash-off"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: 280,
    height: 200,
    position: 'relative',
  },
  scanFrameActive: {
    opacity: 0.8,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  cornerActive: {
    borderColor: '#4CAF50',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanInstruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ocrStatusContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  ocrStatusBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  ocrStatusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});
