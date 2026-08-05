import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'src/shared/theme';

import { OrgHomeScreen } from '../features/organizations/screens/OrgHomeScreen';
import { SongListScreen } from '../features/songs/screens/SongListScreen';
import { MessagesScreen } from '../features/messages/screens/MessagesScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { GlobalCreateModal } from '../features/events';

export type MainTabParamList = {
  Home: undefined;
  Repertoire: undefined;
  Create: undefined;
  Messages: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function CreatePlaceholder() {
  return <View style={{ flex: 1, backgroundColor: '#181B1E' }} />;
}

type TabBarProps = BottomTabBarProps & { onCreatePress: () => void };

function TabBar({ state, descriptors, navigation, onCreatePress }: TabBarProps) {
  const { theme } = useTheme();
  const { bottom } = useSafeAreaInsets();

  const icons: Record<string, string> = {
    Home: '⬜',
    Repertoire: '♩',
    Create: '+',
    Messages: '✉',
    Profile: '◯',
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.navBackground, borderTopColor: theme.navBorder, paddingBottom: bottom + 8, height: 64 + bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : route.name;
        const isFocused = state.index === index;
        const isCreate = route.name === 'Create';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCreate) {
          return (
            <View key={route.key} style={styles.fabWrapper}>
              <Pressable
                style={[styles.fab, { backgroundColor: theme.navFab }]}
                onPress={onCreatePress}
                accessibilityRole="button"
                accessibilityLabel="Create"
              >
                <Text style={styles.fabIcon}>+</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
          >
            <TabIcon name={route.name} active={isFocused} theme={theme} icon={icons[route.name] ?? '•'} />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? theme.navIconActive : theme.navIconRest },
              ]}
            >
              {label}
            </Text>
            {isFocused && <View style={[styles.activeDot, { backgroundColor: theme.navIconActive }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({
  name,
  active,
  theme,
  icon,
}: {
  name: string;
  active: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
  icon: string;
}) {
  const size = 24;
  const color = active ? theme.navIconActive : theme.navIconRest;

  const svgPaths: Record<string, React.ReactNode> = {
    Home: (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.iconHome, { borderColor: color, borderBottomColor: color }]}>
          <View style={[styles.iconHomeDoor, { borderColor: color }]} />
        </View>
      </View>
    ),
    Repertoire: (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.iconRepertoire, { borderColor: color }]}>
          <View style={[styles.iconRepertoireLine, { backgroundColor: color }]} />
          <View style={[styles.iconRepertoireLine, { backgroundColor: color }]} />
          <View style={[styles.iconRepertoireLine, { backgroundColor: color, width: '70%' }]} />
        </View>
      </View>
    ),
    Messages: (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.iconChat, { borderColor: color }]}>
          <View style={[styles.iconChatDot, { backgroundColor: color }]} />
          <View style={[styles.iconChatDot, { backgroundColor: color }]} />
          <View style={[styles.iconChatDot, { backgroundColor: color }]} />
        </View>
      </View>
    ),
    Profile: (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.iconProfileHead, { borderColor: color }]} />
        <View style={[styles.iconProfileBody, { borderColor: color }]} />
      </View>
    ),
  };

  return svgPaths[name] ?? (
    <Text style={{ fontSize: 20, color }}>{icon}</Text>
  );
}

export function MainTabNavigator() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => (
          <TabBar {...props} onCreatePress={() => setShowCreateModal(true)} />
        )}
        screenOptions={{ headerShown: false }}
      >
      <Tab.Screen
        name="Home"
        component={OrgHomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Repertoire"
        component={SongListScreen}
        options={{ tabBarLabel: 'Repertoire' }}
      />
      <Tab.Screen
        name="Create"
        component={CreatePlaceholder}
        options={{ tabBarLabel: '' }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarLabel: 'Messages' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
    {showCreateModal && (
      <GlobalCreateModal onClose={() => setShowCreateModal(false)} />
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    height: '100%',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    marginTop: -24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
    fontWeight: '300',
  },
  iconHome: {
    width: 18,
    height: 16,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderRadius: 1,
    marginTop: 2,
  },
  iconHomeDoor: {
    width: 6,
    height: 8,
    borderWidth: 1.5,
    borderRadius: 1,
    alignSelf: 'center',
    marginTop: 6,
  },
  iconRepertoire: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderRadius: 3,
    padding: 3,
    justifyContent: 'space-between',
  },
  iconRepertoireLine: {
    height: 1.5,
    width: '100%',
    borderRadius: 1,
  },
  iconChat: {
    width: 18,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconChatDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  iconProfileHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  iconProfileBody: {
    width: 18,
    height: 8,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    marginTop: 1,
  },
});
