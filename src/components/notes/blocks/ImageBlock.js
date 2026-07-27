import React from 'react';
import { Image, StyleSheet } from 'react-native';

export default function ImageBlock({ block }) {
  if (!block.uri) return null;
  return (
    <Image
      source={{ uri: block.uri }}
      style={styles.image}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 14,
  },
});
