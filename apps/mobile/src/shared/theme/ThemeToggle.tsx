import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeContext';

export function ThemeToggle() {
  const { mode, toggleTheme, theme } = useTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceRaised,
          borderColor: theme.borderDefault,
        },
      ]}
      hitSlop={8}
    >
      <Text style={styles.icon}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
});
