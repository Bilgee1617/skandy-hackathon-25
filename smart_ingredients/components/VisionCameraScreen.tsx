import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { performOcr } from '@bear-block/vision-camera-ocr';
import { processRealTimeOCR, VisionOCRResult } from '../lib/visionCameraOCR';

interface VisionCameraScreenProps {
  onClose: () => void;
}

export default function VisionCameraScreen({ onClose }: VisionCameraScreenProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedText, setDetectedText] = useState<string>('');
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [ocrResult, setOcrResult] = useState<VisionOCRResult | null>(null);
  
  const devices = useCameraDevices();
  const device = devices.back;
  const camera = useRef<Camera>(null);

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'authorized');
  };

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    if (!isScanning) return;
    
    try {
      const ocrResult = performOcr(frame);
      if (ocrResult?.text) {
        const result = processRealTimeOCR(ocrResult);
        runOnJS(updateDetectedText)(result);
      }
    } catch (error) {
      console.error('OCR processing error:', error);
    }
  }, [isScanning]);

  const updateDetectedText = (result: VisionOCRResult) => {
    setDetectedText(result.text);
    setDetectedIngredients(result.ingredients);
    setOcrResult(result);
  };

  const startScanning = () => {
    setIsScanning(true);
    setShowResults(false);
    setDetectedText('');
    setDetectedIngredients([]);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setShowResults(true);
  };

  const processResults = () => {
    if (ocrResult && ocrResult.ingredients.length > 0) {
      const ingredientsList = ocrResult.ingredients.join('\n• ');
      Alert.alert(
        'Ingredients Found!',
        `Found ${ocrResult.ingredients.length} ingredients:\n\n• ${ingredientsList}`,
        [
          {
            text: 'Add to Inventory',
            onPress: () => {
              // TODO: Add ingredients to Supabase database
              console.log('Adding ingredients to inventory:', ocrResult.ingredients);
              onClose();
            },
          },
          {
            text: 'Scan Again',
            onPress: () => startScanning(),
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
        'We couldn\'t identify any ingredients. Please try scanning again with better lighting or a clearer receipt.',
        [
          {
            text: 'Try Again',
            onPress: () => startScanning(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => onClose(),
          },
        ]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
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

  if (device == null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>No camera device found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        ref={camera}
        style={styles.camera}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={5}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Receipt</Text>
            <View style={styles.headerButton} />
          </View>

          {/* Scanning Area */}
          <View style={styles.scanningArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            
            {isScanning ? (
              <Text style={styles.scanInstruction}>
                Point camera at receipt text
              </Text>
            ) : (
              <Text style={styles.scanInstruction}>
                Tap "Start Scanning" to begin
              </Text>
            )}

            {/* Real-time text display */}
            {detectedText && isScanning && (
              <View style={styles.detectedTextContainer}>
                <Text style={styles.detectedTextLabel}>Detected Text:</Text>
                <Text style={styles.detectedText} numberOfLines={3}>
                  {detectedText}
                </Text>
                {detectedIngredients.length > 0 && (
                  <Text style={styles.ingredientsCount}>
                    Found {detectedIngredients.length} ingredients
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {!isScanning ? (
              <TouchableOpacity style={styles.startButton} onPress={startScanning}>
                <Ionicons name="scan" size={24} color="white" />
                <Text style={styles.startButtonText}>Start Scanning</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopScanning}>
                <Ionicons name="stop" size={24} color="white" />
                <Text style={styles.stopButtonText}>Stop & Process</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Results Overlay */}
          {showResults && (
            <View style={styles.resultsOverlay}>
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Scan Results</Text>
                {ocrResult && ocrResult.ingredients.length > 0 ? (
                  <View>
                    <Text style={styles.resultsText}>
                      Found {ocrResult.ingredients.length} ingredients:
                    </Text>
                    {ocrResult.ingredients.slice(0, 5).map((ingredient, index) => (
                      <Text key={index} style={styles.ingredientItem}>
                        • {ingredient}
                      </Text>
                    ))}
                    {ocrResult.ingredients.length > 5 && (
                      <Text style={styles.moreText}>
                        ... and {ocrResult.ingredients.length - 5} more
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.noResultsText}>
                    No ingredients detected. Try scanning again.
                  </Text>
                )}
                
                <View style={styles.resultsButtons}>
                  <TouchableOpacity style={styles.processButton} onPress={processResults}>
                    <Text style={styles.processButtonText}>Process Results</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rescanButton} onPress={startScanning}>
                    <Text style={styles.rescanButtonText}>Scan Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Camera>
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
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
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
  detectedTextContainer: {
    position: 'absolute',
    bottom: -100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    maxHeight: 150,
  },
  detectedTextLabel: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  detectedText: {
    color: 'white',
    fontSize: 12,
    lineHeight: 16,
  },
  ingredientsCount: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  bottomControls: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  stopButton: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  resultsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultsText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  moreText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  resultsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  processButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
  },
  processButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  rescanButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    marginLeft: 10,
  },
  rescanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
