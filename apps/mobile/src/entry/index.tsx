import React from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from '../navigation';
// Initializes the API client (tokenAdapter, fileReaderAdapter, keycloak config)
import '../shared/api/client';
// Intercepts all fetch calls for the DEV request log
import { installFetchInterceptor } from '../features/dev/requestLog';

if (__DEV__) installFetchInterceptor();

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
