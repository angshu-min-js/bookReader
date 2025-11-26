import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

const BigButton = ({ onPress, disabled, label, subLabel }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FF9800', // Warm orange
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  disabled: {
    backgroundColor: '#BDBDBD',
    borderColor: '#757575',
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  subLabel: {
    fontSize: 24,
    color: '#333333',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default BigButton;
