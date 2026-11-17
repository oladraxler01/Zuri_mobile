import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

/**
 * Crash and error reporting (roadmap Phase 0). Off unless
 * EXPO_PUBLIC_SENTRY_DSN is set, so local and CI builds never report.
 *
 * Privacy: no personal data in events. Users are never attached, request
 * bodies, cookies and headers are dropped, and breadcrumbs keep only
 * navigation and UI interactions (no console output, no network URLs with
 * query strings).
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const monitoringEnabled = !!DSN;

let started = false;

export function initMonitoring() {
  if (!DSN || started) return;
  started = true;
  Sentry.init({
    dsn: DSN,
    environment: Updates.channel || (__DEV__ ? 'development' : 'unknown'),
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
        if (event.request.url) event.request.url = event.request.url.split('?')[0];
      }
      return event;
    },
    beforeBreadcrumb(crumb) {
      if (crumb.category === 'console') return null;
      if (crumb.data && typeof crumb.data.url === 'string') {
        crumb.data = { ...crumb.data, url: crumb.data.url.split('?')[0] };
      }
      return crumb;
    },
  });
}

/** Wraps the root component so Sentry can track app start and touches. A no-op without a DSN. */
export function withMonitoring(Root: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
  return DSN ? Sentry.wrap(Root) : Root;
}

/** Report an error caught by an error boundary. */
export function reportError(error: unknown) {
  if (DSN) Sentry.captureException(error);
}

/** For checking a build's setup: sends a test error and returns whether reporting is on. */
export function sendTestError(): boolean {
  if (!DSN) return false;
  Sentry.captureException(new Error(`Zuri test error (${Updates.channel || 'no channel'})`));
  return true;
}
