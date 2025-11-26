# Amar Boi (আমার বই)

**Amar Boi** is an accessible reading assistant application designed specifically for visually impaired elderly Bengali speakers. It empowers users to read books, documents, and other printed materials independently by converting images of text into clear, spoken Bengali audio.

## Motivation

For many elderly individuals, especially those with visual impairments, reading printed text becomes a significant challenge. While there are many OCR and TTS tools available, few are tailored to the specific needs of:
1.  **Bengali Language**: Accurate recognition and natural-sounding speech for Bengali script.
2.  **Elderly Users**: A simplified, high-contrast, and voice-guided interface that requires minimal technical knowledge.
3.  **Accessibility**: Removing barriers to information and literature for the visually impaired community in Bengal.

This project aims to bridge that gap, providing a simple "Point, Click, and Listen" experience.

## Features

*   **Dual Mode Operation**:
    *   **Online Mode (Gemini)**: Utilizes Google's powerful Gemini 2.0 Flash model for superior OCR accuracy and Gemini TTS for natural, warm, and human-like voice synthesis.
    *   **Offline Mode (ML Kit)**: A robust fallback using on-device ML Kit (Devanagari model) and Expo Speech, ensuring functionality even without an internet connection.
*   **Smart Audio Handling**: Automatically handles raw audio data from Gemini, converting it to playable WAV format on the fly.
*   **Elderly-Friendly UI**:
    *   Large, high-contrast buttons.
    *   Voice guidance for every action (Welcome, Processing, Error, Completion).
    *   Simple "One-Tap" interaction model.
*   **Bengali-First Design**: Optimized prompts and models specifically for the Bengali language and cultural context.

## How to Run

### Prerequisites
*   Node.js and npm installed.
*   Expo CLI installed globally (`npm install -g expo-cli`).
*   An Android device or emulator.
*   A Google Gemini API Key.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/angshu-min-js/bookReader.git
    cd bookReader
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory and add your Gemini API key:
    ```
    EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run the App**:
    ```bash
    npx expo run:android
    ```

### Building the APK (Android)

To generate a standalone APK for installation:

1.  **Install EAS CLI**: `npm install -g eas-cli`
2.  **Login**: `eas login`
3.  **Build**:
    ```bash
    eas build -p android --profile preview
    ```
4.  Download and install the generated APK.

## Future Plans

*   **Enhanced Offline Accuracy**: Train or fine-tune a custom Tesseract or ML Kit model specifically for Bengali script to improve offline performance.
*   **Document Scanning Mode**: Add edge detection and auto-cropping to handle curved book pages better.
*   **Voice Commands**: Implement full voice control (e.g., "Read page", "Stop", "Repeat") to make the app completely touch-free.
*   **Save & Library**: Allow users to save scanned pages and create a digital audio library of their books.
*   **Multi-Language Support**: Expand to other Indic languages while maintaining the elderly-friendly focus.
