import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { MemberCard } from '@/components/MemberCard';
import { TextField } from '@/components/TextField';
import { useDirectory, useProfessions } from '@/api/hooks';
import { ApiError } from '@/api/client';
import { NO_CATEGORY } from '@/api/types';
import { colors, radius, spacing, typography } from '@/theme';
import type { DirectoryStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<DirectoryStackParamList, 'DirectoryList'>;

export function DirectoryScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [profCatId, setProfCatId] = useState<string | null>(null);

  const debouncedQuery = useDeferredValue(query.trim());

  const filter = useMemo(
    () => ({
      q: debouncedQuery || undefined,
      professionCategoryId: profCatId ?? undefined,
    }),
    [debouncedQuery, profCatId],
  );

  const professionsQuery = useProfessions();
  const directory = useDirectory(filter);

  const items = useMemo(
    () => directory.data?.pages.flatMap((p) => p.items) ?? [],
    [directory.data?.pages],
  );
  const total = directory.data?.pages[0]?.total ?? 0;

  const hasActiveFilter = !!debouncedQuery || !!profCatId;
  function clearAll() {
    setQuery('');
    setProfCatId(null);
  }

  function handleOpenPerson(personId: string) {
    navigation.navigate('MemberDetail', { personId });
  }

  // Currently selected chip label — drives the "Showing X" caption.
  const activeChipLabel = (() => {
    if (!profCatId) return null;
    if (profCatId === NO_CATEGORY) return 'Other';
    const c = professionsQuery.data?.categories.find((x) => x.id === profCatId);
    return c?.name ?? null;
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <MemberCard person={item} onPress={handleOpenPerson} />}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <TextField
              placeholder="Search by name (English or Gujarati)…"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />

            {professionsQuery.data ? (
              <View style={styles.filterBlock}>
                <View style={styles.filterHeaderRow}>
                  <Text style={styles.filterTitle}>Profession</Text>
                  {hasActiveFilter ? (
                    <Pressable onPress={clearAll} hitSlop={8}>
                      <Text style={styles.clearLink}>Clear filters</Text>
                    </Pressable>
                  ) : null}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                  keyboardShouldPersistTaps="handled"
                >
                  <Chip
                    label={`All · ${professionsQuery.data.totalPersons}`}
                    active={!profCatId}
                    onPress={() => setProfCatId(null)}
                  />
                  {professionsQuery.data.categories
                    .filter((c) => c.personsCount > 0)
                    .map((c) => (
                      <Chip
                        key={c.id}
                        label={c.name}
                        count={c.personsCount}
                        active={profCatId === c.id}
                        onPress={() => setProfCatId(profCatId === c.id ? null : c.id)}
                      />
                    ))}
                  {professionsQuery.data.uncategorizedCount > 0 ? (
                    <Chip
                      label="Other"
                      count={professionsQuery.data.uncategorizedCount}
                      active={profCatId === NO_CATEGORY}
                      onPress={() =>
                        setProfCatId(profCatId === NO_CATEGORY ? null : NO_CATEGORY)
                      }
                    />
                  ) : null}
                </ScrollView>
              </View>
            ) : null}

            {total > 0 ? (
              <Text style={styles.totalLine}>
                Showing {total.toLocaleString()}
                {activeChipLabel ? ` ${activeChipLabel.toLowerCase()}` : ''}
                {debouncedQuery ? ` matching "${debouncedQuery}"` : ''}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          directory.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : directory.error ? (
            <ErrorState error={directory.error} onRetry={() => void directory.refetch()} />
          ) : (
            <View style={styles.center}>
              <Ionicons name="search-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No matches</Text>
              <Text style={styles.emptyHint}>Try a different search or clear the filter.</Text>
              {hasActiveFilter ? (
                <Pressable onPress={clearAll} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
        ListFooterComponent={
          directory.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (directory.hasNextPage && !directory.isFetchingNextPage) {
            void directory.fetchNextPage();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={directory.isRefetching && !directory.isFetchingNextPage}
            onRefresh={() => void directory.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const msg = error instanceof ApiError ? error.message : 'Something went wrong';
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
      <Text style={styles.emptyText}>Couldn't load directory</Text>
      <Text style={styles.emptyHint}>{msg}</Text>
      <Text style={[styles.emptyHint, styles.retry]} onPress={onRetry}>
        Tap to retry
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.lg, marginBottom: spacing.md },
  filterBlock: { gap: spacing.sm },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearLink: { ...typography.caption, color: colors.primary },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  totalLine: { ...typography.bodySmall, color: colors.textMuted },
  listContent: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  gap: { height: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  footer: { padding: spacing.lg, alignItems: 'center' },
  emptyText: { ...typography.h3, color: colors.text, marginTop: spacing.md },
  emptyHint: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  retry: { color: colors.primary, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
  clearBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  clearBtnText: { ...typography.button, color: colors.primaryDark },
});
