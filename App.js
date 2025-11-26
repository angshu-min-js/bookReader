import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, ActivityIndicator, Image, TouchableOpacity, Switch } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { generateAudioFromImage } from './services/gemini';
import { speakWelcome, speakProcessing, speakFinished, speakError, speakPermission } from './services/voice';

// Custom Button Component inline for easier styling control
const ControlButton = ({ onPress, label, subLabel, disabled, isRetake }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.controlButton,
      disabled && styles.disabledButton,
      isRetake && styles.retakeButton
    ]}
  >
    <Text style={styles.controlButtonText}>{label}</Text>
    {subLabel && <Text style={styles.controlButtonSubText}>{subLabel}</Text>}
  </TouchableOpacity>
);

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = Audio.usePermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [sound, setSound] = useState();
  const [isOffline, setIsOffline] = useState(true); // Default to Offline
  const cameraRef = useRef(null);

  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio mode set');

        // Check available voices for debugging
        const voices = await Speech.getAvailableVoicesAsync();
        const bengaliVoices = voices.filter(v => v.language.includes('bn'));
        console.log('Available Bengali Voices:', bengaliVoices.map(v => `${v.name} (${v.identifier})`));
      } catch (e) {
        console.error('Error setting up audio:', e);
      }
    }

    setupAudio();

    if (permission?.granted && audioPermission?.granted) {
      speakWelcome();
    }
  }, [permission, audioPermission]);

  // Cleanup sound on unmount
  useEffect(() => {
    return sound
      ? () => {
        console.log('Unloading Sound');
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  if (!permission || !audioPermission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted || !audioPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera and play audio</Text>
        <ControlButton
          onPress={() => {
            requestPermission();
            requestAudioPermission();
            speakPermission();
          }}
          label="অনুমতি দিন"
          subLabel="শুরু করতে এখানে টিপুন"
        />
      </View>
    );
  }

  const stopPlayback = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(undefined);
    }
    Speech.stop();
    setIsPlaying(false);
    setCapturedImage(null);
  };

  const handlePress = async () => {
    if (isProcessing || isPlaying) {
      if (isPlaying) {
        await stopPlayback();
        return;
      }
      return;
    }

    if (capturedImage) {
      setCapturedImage(null);
      return;
    }

    setIsProcessing(true);
    speakProcessing();

    try {
      console.log("Button pressed");
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
        console.log("Photo taken");
        setCapturedImage(photo.uri);

        // Call Gemini or Offline Service
        const result = await generateAudioFromImage(photo.base64, isOffline);
        console.log("Service response received:", result.type);

        if (result.type === 'text') {
          setIsPlaying(true);
          Speech.speak(result.content, {
            language: 'bn-IN',
            pitch: 1.0,
            rate: 0.9,
            onDone: () => {
              setIsPlaying(false);
              setCapturedImage(null);
              speakFinished();
            },
            onError: () => {
              setIsPlaying(false);
              setCapturedImage(null);
              speakError();
            }
          });
        } else if (result.type === 'audio') {
          setIsPlaying(true);
          console.log('Loading Sound');
          const { sound: newSound } = await Audio.Sound.createAsync({ uri: result.content });
          setSound(newSound);

          console.log('Playing Sound');
          await newSound.playAsync();

          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
              setCapturedImage(null);
              // Unload sound to free resources
              newSound.unloadAsync();
              setSound(undefined);
              speakFinished();
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
      speakError();
      alert("Error: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header & Toggle - Moved outside CameraView for better touch response */}
      <View style={styles.topBar}>
        <Text style={styles.headerText}>বইয়ের পাতা দেখান</Text>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Offline Mode</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isOffline ? "#4CAF50" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={(value) => {
              console.log("Switch toggled to:", value);
              setIsOffline(value);
            }}
            value={isOffline}
          />
        </View>
      </View>

      {/* Camera Section */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} facing="back">
          {capturedImage && (
            <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          )}
          <View style={styles.overlay}>
            {/* Guide Frame - Only show when not reviewing an image */}
            {!capturedImage && <View style={styles.guideFrame} />}
          </View>
        </CameraView>
      </View>

      {/* Bottom Section: Controls */}
      <View style={styles.controlsContainer}>
        <ControlButton
          onPress={handlePress}
          disabled={isProcessing}
          isRetake={!!capturedImage && !isPlaying}
          label={isProcessing ? "অপেক্ষা করুন..." : (isPlaying ? "থামুন" : (capturedImage ? "আবার তুলুন" : "পড়ে শোনাও"))}
          subLabel={isProcessing ? "পড়ছি..." : (isPlaying ? "শোনা হচ্ছে" : (capturedImage ? "ছবি ঠিক নেই?" : "বড় বোতাম টিপুন"))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 3, // Takes up 75% of screen
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  topBar: {
    paddingTop: 50, // For status bar
    paddingBottom: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    zIndex: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  toggleLabel: {
    color: 'white',
    marginRight: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  guideFrame: {
    position: 'absolute',
    top: '5%',
    alignSelf: 'center',
    width: '95%',
    height: '90%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  controlsContainer: {
    flex: 1, // Takes up 25% of screen
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  controlButton: {
    width: '90%',
    height: 80,
    backgroundColor: '#4CAF50', // Green
    borderRadius: 40, // Oval shape
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  retakeButton: {
    backgroundColor: '#FF9800', // Orange for retake
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  controlButtonSubText: {
    color: '#EEE',
    fontSize: 14,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
    fontSize: 20,
  },
});
