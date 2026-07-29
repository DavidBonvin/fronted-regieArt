import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { OnboardingPage, LoginPage } from '../features/auth';
import { DashboardPage, TimelinePage, VenueDetailPage } from '../features/daysheet';
import { MusicianProfilePage, SkillsPage, TalentSearchPage } from '../features/profile';
import { RepertoirePage, ScoreViewerPage, UploadScorePage } from '../features/songs';
import { FinancePage, ExpensesPage, ReceiptCapturePage } from '../features/finance';
import { ConvoyPage, PassengersPage } from '../features/convoy';
import { BacklinePage, ChecklistPage, QRScannerPage } from '../features/inventory';
import { BandChatPage, DirectMessagePage, NotificationsPage } from '../features/messages';
import { BandManagementPage, InvitationsPage } from '../features/organizations';
import IconsPage from '../features/icons/pages/IconsPage';
import ApiPlayground from '../features/dev/ApiPlayground';

export const router = createBrowserRouter([
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <DashboardPage /> },
  { path: '/timeline', element: <TimelinePage /> },
  { path: '/venue/:venueId', element: <VenueDetailPage /> },
  { path: '/profile/:userId', element: <MusicianProfilePage /> },
  { path: '/profile/skills', element: <SkillsPage /> },
  { path: '/talents', element: <TalentSearchPage /> },
  { path: '/repertoire', element: <RepertoirePage /> },
  { path: '/songs/:songId/score', element: <ScoreViewerPage /> },
  { path: '/songs/:songId/upload', element: <UploadScorePage /> },
  { path: '/finance', element: <FinancePage /> },
  { path: '/finance/:daysheetId/expenses', element: <ExpensesPage /> },
  { path: '/finance/receipt', element: <ReceiptCapturePage /> },
  { path: '/convoy/:daysheetId', element: <ConvoyPage /> },
  { path: '/convoy/:vehicleId/passengers', element: <PassengersPage /> },
  { path: '/inventory', element: <BacklinePage /> },
  { path: '/inventory/:daysheetId/checklist', element: <ChecklistPage /> },
  { path: '/inventory/scanner', element: <QRScannerPage /> },
  { path: '/messages/:channelId', element: <BandChatPage /> },
  { path: '/messages/direct/:userId', element: <DirectMessagePage /> },
  { path: '/notifications', element: <NotificationsPage /> },
  { path: '/organization', element: <BandManagementPage /> },
  { path: '/organization/:orgId/invitations', element: <InvitationsPage /> },
  { path: '/icons', element: <IconsPage /> },
  ...(import.meta.env.DEV
    ? [{ path: '/dev/playground', element: <ApiPlayground /> }]
    : []),
  // Catch-all: redirect unknown routes to home instead of showing React Router's default 404
  { path: '*', element: <Navigate to="/" replace /> },
]);
