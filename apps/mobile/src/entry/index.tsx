import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from '../navigation';
import { ThemeProvider } from '../shared/theme';
import { PlayerProvider } from '../shared/player/PlayerContext';
import { initI18n } from '../shared/i18n';
import '../shared/api/client';
import { installFetchInterceptor } from '../features/dev/requestLog';

if (__DEV__) installFetchInterceptor();

const deepLinkingConfig = {
  prefixes: ['regieart://', 'regiart://'],
  config: {
    screens: {
      InvitationResponse: 'invitations/:token',
    },
  },
};

function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <ThemeProvider>
        <SafeAreaProvider>
          <PlayerProvider>
            <NavigationContainer linking={deepLinkingConfig}>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </PlayerProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
