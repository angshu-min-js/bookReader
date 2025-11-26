const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withDevanagariModel(config) {
    return withAppBuildGradle(config, (config) => {
        if (!config.modResults.contents.includes('text-recognition-devanagari')) {
            config.modResults.contents = config.modResults.contents.replace(
                /dependencies\s?{/,
                `dependencies {
    implementation 'com.google.mlkit:text-recognition-devanagari:16.0.0'`
            );
        }
        return config;
    });
};
