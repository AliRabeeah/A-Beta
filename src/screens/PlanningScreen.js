import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { usePlanning } from '../context/PlanningContext';
import PlanningCard from '../components/PlanningCard';
import SideDrawer from '../components/SideDrawer';
import { isDayCompleted } from '../utils/planningUtils';

export default function PlanningScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { planningItems, setDayCompleted, deleteTodayOnly, deletePlanningItem } = usePlanning();
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const activeItems = planningItems.filter((p) => !p.archived);
  const today = new Date();

  const handleDeletePlan = (item) => {
    Alert.alert(t('deletePlanConfirmTitle'), t('deletePlanConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deletePlanningItem(item.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={[styles.headerRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} style={styles.menuBtn}>
            <Ionicons name="menu" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('planningTitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AddEditPlanning')} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {activeItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>{t('planningEmptyTitle')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddEditPlanning')}>
            <Text style={{ color: colors.primary, marginTop: 8, fontWeight: '600' }}>{t('addFirstPlan')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <PlanningCard
              item={item}
              date={today}
              index={index}
              onPress={() => navigation.navigate('AddEditPlanning', { planningId: item.id })}
              onToggleCompleted={() => setDayCompleted(item.id, !isDayCompleted(item, today), today)}
              onDeleteToday={() => deleteTodayOnly(item.id, today)}
              onDeletePlan={() => handleDeletePlan(item)}
            />
          )}
        />
      )}

      <SideDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { padding: 4 },
  title: { fontSize: 26, fontWeight: '800' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -60 },
});
