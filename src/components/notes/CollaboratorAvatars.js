import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const PALETTE = ['#FF8A00', '#0A84FF', '#BF5AF2', '#FF375F', '#64D2FF', '#00E676'];

function initialsFor(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function CollaboratorAvatars({ collaborators = [], size = 26 }) {
  const { colors } = useTheme();
  if (!collaborators.length) return null;

  return (
    <View style={styles.row}>
      {collaborators.slice(0, 3).map((person, i) => (
        <View
          key={person.id || person.name || i}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: PALETTE[i % PALETTE.length],
              marginLeft: i === 0 ? 0 : -8,
              borderColor: colors.background,
            },
          ]}
        >
          <Text style={styles.initials}>{initialsFor(person.name)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  initials: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
