import * as Speech from 'expo-speech';

const speak = (text) => {
    Speech.speak(text, {
        language: 'bn-IN', // Bengali India
        pitch: 1.0,
        rate: 0.9, // Slightly slower for elderly
    });
};

export const speakWelcome = () => speak("স্বাগতম। বইয়ের পাতা দেখান।");
export const speakProcessing = () => speak("পড়ছি… অপেক্ষা করুন।");
export const speakFinished = () => speak("পাতা শেষ। পরের পাতা দেখাবেন?");
export const speakError = () => speak("দুঃখিত, আবার চেষ্টা করুন।");
export const speakPermission = () => speak("ক্যামেরা ও মাইক অনুমতি দিন।");
