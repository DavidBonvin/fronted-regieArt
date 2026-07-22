import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OnboardingScreen, LoginScreen } from '../features/auth';
import { DashboardScreen, TimelineScreen, VenueDetailScreen } from '../features/daysheet';
import { MusicianProfileScreen, SkillsScreen, TalentSearchScreen } from '../features/profile';
import { RepertoireScreen, ScoreViewerScreen, UploadScoreScreen } from '../features/songs';
import { FinanceScreen, ExpensesScreen, ReceiptCameraScreen } from '../features/finance';
import { ConvoyScreen, PassengersScreen } from '../features/convoy';
import { BacklineScreen, ChecklistScreen, QRScannerScreen } from '../features/inventory';
import { BandChatScreen, DirectMessageScreen, NotificationsScreen } from '../features/messages';
import { BandManagementScreen, InvitationsScreen } from '../features/organizations';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Dashboard: undefined;
  Timeline: undefined;
  VenueDetail: { venueId: string };
  MusicianProfile: { userId: string };
  Skills: undefined;
  TalentSearch: undefined;
  Repertoire: undefined;
  ScoreViewer: { songId: string };
  UploadScore: { songId: string };
  Finance: undefined;
  Expenses: { daysheetId: string };
  ReceiptCamera: { expenseId?: string };
  Convoy: { daysheetId: string };
  Passengers: { vehicleId: string };
  Backline: undefined;
  Checklist: { daysheetId: string };
  QRScanner: undefined;
  BandChat: { channelId: string };
  DirectMessage: { userId: string };
  Notifications: undefined;
  BandManagement: undefined;
  Invitations: { organizationId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Onboarding">
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Timeline" component={TimelineScreen} />
      <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
      <Stack.Screen name="MusicianProfile" component={MusicianProfileScreen} />
      <Stack.Screen name="Skills" component={SkillsScreen} />
      <Stack.Screen name="TalentSearch" component={TalentSearchScreen} />
      <Stack.Screen name="Repertoire" component={RepertoireScreen} />
      <Stack.Screen name="ScoreViewer" component={ScoreViewerScreen} />
      <Stack.Screen name="UploadScore" component={UploadScoreScreen} />
      <Stack.Screen name="Finance" component={FinanceScreen} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} />
      <Stack.Screen name="ReceiptCamera" component={ReceiptCameraScreen} />
      <Stack.Screen name="Convoy" component={ConvoyScreen} />
      <Stack.Screen name="Passengers" component={PassengersScreen} />
      <Stack.Screen name="Backline" component={BacklineScreen} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BandChat" component={BandChatScreen} />
      <Stack.Screen name="DirectMessage" component={DirectMessageScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="BandManagement" component={BandManagementScreen} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} />
    </Stack.Navigator>
  );
}
