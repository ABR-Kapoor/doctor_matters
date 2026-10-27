import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

export const NameText = ({ name, fallback = 'Unknown', style }: { name?: string, fallback?: string, style?: StyleProp<TextStyle> }) => {
  return <Text style={style}>{name || fallback}</Text>;
};
