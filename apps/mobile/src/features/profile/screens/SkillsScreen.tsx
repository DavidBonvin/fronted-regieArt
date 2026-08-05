import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getMySkills, addSkill, removeSkill, listSkillCategories } from '@regieart/api';
import type { UserSkill, SkillCategory, ExpertiseLevel } from '@regieart/types';
import { useTheme } from '../../../shared/theme';
import type { ThemeColors } from '@regieart/ui';

const EXPERTISE_ORDER: ExpertiseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'];
const EXPERTISE_COLORS: Record<ExpertiseLevel, string> = {
  BEGINNER: '#565D63',
  INTERMEDIATE: '#649D98',
  ADVANCED: '#4A827E',
  PROFESSIONAL: '#F59E0B',
};

export function SkillsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = makeStyles(theme);

  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingCat, setAddingCat] = useState<SkillCategory | null>(null);

  const loadData = useCallback(async () => {
    const [sk, cats] = await Promise.all([getMySkills(), listSkillCategories()]);
    setSkills(sk);
    setCategories(cats);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleRemove(skillId: string) {
    await removeSkill(skillId);
    setSkills((prev) => prev.filter((s) => s.id !== skillId));
  }

  async function handleAdd(category: SkillCategory, level: ExpertiseLevel) {
    setAddingCat(null);
    const newSkill = await addSkill({ skillCategoryId: category.id, expertiseLevel: level });
    setSkills((prev) => [...prev, newSkill]);
  }

  const mySkillIds = new Set(skills.map((s) => s.skillCategory.id));
  const availableCategories = categories.filter((c) => !mySkillIds.has(c.id));

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color={theme.actionBrand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <FlatList
        data={skills}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.actionBrand} />
        }
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>{t('profile.skills_label')}</Text>
          </View>
        }
        ListFooterComponent={
          <View style={s.addSection}>
            <Text style={s.addSectionLabel}>{t('common.add').toUpperCase()}</Text>
            {addingCat ? (
              <View>
                <Text style={s.pickLevelLabel}>{t('profile.pick_level')}</Text>
                <View style={s.levelRow}>
                  {EXPERTISE_ORDER.map((level) => (
                    <Pressable
                      key={level}
                      style={[s.levelChip, { borderColor: EXPERTISE_COLORS[level] }]}
                      onPress={() => handleAdd(addingCat, level)}
                    >
                      <Text style={[s.levelChipText, { color: EXPERTISE_COLORS[level] }]}>{level}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => setAddingCat(null)}>
                  <Text style={s.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.categoryGrid}>
                {availableCategories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [s.catChip, pressed && s.catChipPressed]}
                    onPress={() => setAddingCat(cat)}
                  >
                    <Text style={s.catChipText}>{cat.icon ? `${cat.icon} ` : '+'} {cat.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}><Text style={s.emptyText}>{t('common.no_results')}</Text></View>
        }
        renderItem={({ item }) => (
          <View style={s.skillRow}>
            <View style={s.skillInfo}>
              <Text style={s.skillName}>{item.skillCategory.name}</Text>
              <View style={[s.levelBadge, { borderColor: EXPERTISE_COLORS[item.expertiseLevel] }]}>
                <Text style={[s.levelBadgeText, { color: EXPERTISE_COLORS[item.expertiseLevel] }]}>
                  {item.expertiseLevel}
                </Text>
              </View>
            </View>
            <Pressable style={s.removeBtn} onPress={() => handleRemove(item.id)}>
              <Text style={s.removeBtnText}>×</Text>
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        contentContainerStyle={s.list}
      />
    </SafeAreaView>
  );
}

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.surfaceApp },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { padding: 16, paddingBottom: 8 },
    title: { fontSize: 26, fontWeight: '700', color: theme.textHeading, letterSpacing: -0.3 },
    list: { paddingHorizontal: 16, paddingBottom: 40 },
    skillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceCard,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    skillInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    skillName: { fontSize: 15, fontWeight: '600', color: theme.textHeading },
    levelBadge: { borderRadius: 6, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 3 },
    levelBadgeText: { fontSize: 10, fontWeight: '700' },
    removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    removeBtnText: { fontSize: 22, color: theme.actionDanger, lineHeight: 24 },
    separator: { height: 6 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 15, color: theme.textSecondary },
    addSection: { padding: 4, paddingTop: 20 },
    addSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: theme.textSecondary, marginBottom: 10, paddingHorizontal: 4 },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: {
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.borderDefault,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    catChipPressed: { backgroundColor: theme.surfaceRaised },
    catChipText: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
    pickLevelLabel: { fontSize: 14, fontWeight: '600', color: theme.textHeading, marginBottom: 10 },
    levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    levelChip: {
      borderRadius: 8,
      borderWidth: 1.5,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    levelChipText: { fontSize: 12, fontWeight: '700' },
    cancelText: { fontSize: 13, color: theme.textSecondary, textAlign: 'center', paddingVertical: 8 },
  });
}

