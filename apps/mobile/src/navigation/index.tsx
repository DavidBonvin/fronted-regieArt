import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OnboardingScreen, LoginScreen, ForgotPasswordScreen, RegisterScreen } from '../features/auth';
import { TimelineScreen, VenueDetailScreen } from '../features/daysheet';
import { MusicianProfileScreen, SkillsScreen, TalentSearchScreen } from '../features/profile';
import { ScoreViewerScreen, UploadScoreScreen, CreateSongWizardScreen, SongPlayerModal } from '../features/songs';
import { FinanceScreen, ExpensesScreen, ReceiptCameraScreen } from '../features/finance';
import { ConvoyScreen, PassengersScreen } from '../features/convoy';
import { BacklineScreen, ChecklistScreen, QRScannerScreen } from '../features/inventory';
import { BandChatScreen, DirectMessageScreen, NotificationsScreen } from '../features/messages';
import { BandManagementScreen, InvitationsScreen, OrgSelectorScreen, CreateOrganizationScreen, OrganizationDetailScreen } from '../features/organizations';
import { WriteSuiteScreen, DevToolsScreen, StorageSuiteScreen } from '../features/dev';
import { CreateEventWizardScreen, EventDetailScreen } from '../features/events';
import { MainTabNavigator } from './MainTabNavigator';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Register: undefined;
  OrgSelector: undefined;
  CreateOrganization: undefined;
  OrganizationDetail: { organizationId: string };
  MainTabs: undefined;
  Timeline: undefined;
  VenueDetail: { venueId: string };
  MusicianProfile: { userId: string };
  Skills: undefined;
  TalentSearch: undefined;
  ScoreViewer: { songId: string };
  UploadScore: { songId?: string };
  CreateSongWizard: undefined;
  SongPlayer: { songId: string };
  Finance: undefined;
  Expenses: { daysheetId: string };
  ReceiptCamera: { expenseId?: string };
  Convoy: { eventId: string };
  Passengers: { vehicleId: string };
  Backline: undefined;
  Checklist: { daysheetId: string };
  QRScanner: undefined;
  BandChat: { channelId: string };
  DirectMessage: { userId: string; displayName?: string };
  Notifications: undefined;
  BandManagement: undefined;
  Invitations: { organizationId: string };
  DevPlayground: undefined;
  DevTools: undefined;
  StorageSuite: undefined;
  CreateEventWizard: undefined;
  EventDetail: { eventId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: '#23272A' },
  headerTintColor: '#F6F8F9',
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 16 },
  headerShadowVisible: false,
};

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Onboarding" screenOptions={screenOptions}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrgSelector" component={OrgSelectorScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateOrganization" component={CreateOrganizationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrganizationDetail" component={OrganizationDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Timeline" component={TimelineScreen} options={{ title: 'Timeline' }} />
      <Stack.Screen name="VenueDetail" component={VenueDetailScreen} options={{ title: 'Venue' }} />
      <Stack.Screen name="MusicianProfile" component={MusicianProfileScreen} options={{ title: '' }} />
      <Stack.Screen name="Skills" component={SkillsScreen} options={{ title: 'Skills' }} />
      <Stack.Screen name="TalentSearch" component={TalentSearchScreen} options={{ title: 'Find Musicians' }} />
      <Stack.Screen name="ScoreViewer" component={ScoreViewerScreen} options={{ title: 'Score' }} />
      <Stack.Screen name="UploadScore" component={UploadScoreScreen} options={{ title: 'New Song' }} />
      <Stack.Screen
        name="CreateSongWizard"
        component={CreateSongWizardScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="SongPlayer"
        component={SongPlayerModal}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen name="Finance" component={FinanceScreen} options={{ title: 'Finance' }} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses' }} />
      <Stack.Screen name="ReceiptCamera" component={ReceiptCameraScreen} options={{ title: 'Add Expense' }} />
      <Stack.Screen name="Convoy" component={ConvoyScreen} options={{ title: 'Convoy' }} />
      <Stack.Screen name="Passengers" component={PassengersScreen} options={{ title: 'Passengers' }} />
      <Stack.Screen name="Backline" component={BacklineScreen} options={{ title: 'Backline' }} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: 'Checklist' }} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ presentation: 'modal', title: 'Scan QR' }} />
      <Stack.Screen name="BandChat" component={BandChatScreen} options={{ title: 'Band Chat' }} />
      <Stack.Screen name="DirectMessage" component={DirectMessageScreen} options={{ title: '' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="BandManagement" component={BandManagementScreen} options={{ title: 'Band Management' }} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} options={{ title: 'Invitations' }} />
      <Stack.Screen name="DevPlayground" component={WriteSuiteScreen} options={{ title: '🧪 Write Suite' }} />
      <Stack.Screen name="DevTools" component={DevToolsScreen} options={{ title: '🛠️ DevTools' }} />
      <Stack.Screen name="StorageSuite" component={StorageSuiteScreen} options={{ title: '📦 Storage Suite' }} />
      <Stack.Screen
        name="CreateEventWizard"
        component={CreateEventWizardScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export { MainTabNavigator };


