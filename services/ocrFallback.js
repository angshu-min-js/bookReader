import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as FileSystem from 'expo-file-system/legacy';

export const performOfflineOCR = async (base64Image) => {
    let tempUri = FileSystem.cacheDirectory + 'temp_ocr_image.jpg';
    try {
        console.log("Attempting Offline OCR for Bengali...");

        // Ensure it starts with file://
        if (!tempUri.startsWith('file://')) {
            tempUri = 'file://' + tempUri;
        }

        await FileSystem.writeAsStringAsync(tempUri, base64Image, {
            encoding: 'base64',
        });

        // Attempt recognition with Devanagari language option
        // The native module expects the script name as a string, not an object
        const result = await TextRecognition.recognize(tempUri, 'Devanagari');

        console.log("OCR Raw Result:", JSON.stringify(result));

        if (result && result.text) {
            console.log("Offline OCR Success:", result.text.substring(0, 50));
            return result.text;
        }

        return null;
    } catch (error) {
        console.error("Offline OCR Failed:", error);
        return null;
    } finally {
        // Cleanup
        try {
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    }
};
