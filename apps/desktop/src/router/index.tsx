import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

import { Layout } from '../shared/layout/Layout';
import { OnboardingPage, LoginPage, RegisterPage } from '../features/auth';
import { DashboardPage, TimelinePage, VenueDetailPage } from '../features/daysheet';
import { MusicianProfilePage, SkillsPage, TalentSearchPage } from '../features/profile';
import { RepertoirePage, ScoreViewerPage, UploadScorePage } from '../features/songs';
import { FinancePage, ExpensesPage, ReceiptCapturePage } from '../features/finance';
import { ConvoyPage, PassengersPage } from '../features/convoy';
import { BacklinePage, ChecklistPage, QRScannerPage } from '../features/inventory';
import { BandChatPage, DirectMessagePage, NotificationsPage } from '../features/messages';
import { BandManagementPage, InvitationsPage, OrganizationProfileView } from '../features/organizations';
import { EventDetailPage } from '../features/events';
import { IconsPage } from '../features/icons';

const ApiPlayground = import.meta.env.DEV
  ? React.lazy(() => import('../features/dev/ApiPlayground'))
  : null;

function ProtectedRoute() {
  const tokens = localStorage.getItem('regieart_tokens');
  if (!tokens) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
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
          { path: '/convoy', element: <ConvoyPage /> },
          { path: '/convoy/:daysheetId', element: <ConvoyPage /> },
          { path: '/convoy/:daysheetId/passengers/:vehicleId', element: <PassengersPage /> },
          { path: '/backline', element: <BacklinePage /> },
          { path: '/inventory/:daysheetId/checklist', element: <ChecklistPage /> },
          { path: '/inventory/scanner', element: <QRScannerPage /> },
          { path: '/messages', element: <BandChatPage /> },
          { path: '/messages/direct/:userId', element: <DirectMessagePage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/band', element: <BandManagementPage /> },
          { path: '/organization/:orgId', element: <OrganizationProfileView /> },
          { path: '/organization/:orgId/invitations', element: <InvitationsPage /> },
          { path: '/events/:eventId', element: <EventDetailPage /> },
          ...(import.meta.env.DEV ? [{ path: '/icons', element: <IconsPage /> }] : []),
          ...(import.meta.env.DEV && ApiPlayground
            ? [{ path: '/dev/playground', element: <React.Suspense fallback={null}><ApiPlayground /></React.Suspense> }]
            : []),
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
