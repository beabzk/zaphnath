import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { NavigationProvider } from '@/components/layout/Navigation';
import { ViewRouter } from '@/components/layout/ViewRouter';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { SettingsProvider } from '@/components/settings/SettingsProvider';
import { StoreDebuggerWrapper } from '@/components/debug/StoreDebugger';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { logger } from '@/services/logger';
import { performanceMonitor } from '@/services/performanceMonitor';
import { getDesktopPlatform } from '@/lib/platform';

function App() {
  // Initialize logging and performance monitoring
  React.useEffect(() => {
    const platform = getDesktopPlatform();
    document.documentElement.dataset.platform = platform;

    logger.info(
      'Application started',
      {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        platform,
      },
      'app'
    );

    // Log user actions for debugging
    logger.logUserAction({
      type: 'navigation',
      target: 'app-start',
      details: { url: window.location.href },
    });

    // Start performance monitoring
    const appStartTiming = performanceMonitor.startTiming('app-initialization', 'page-load');

    // End timing after a short delay to capture initial render
    setTimeout(() => {
      performanceMonitor.endTiming(appStartTiming, {
        component: 'App',
        initialLoad: true,
      });
    }, 100);

    return () => {
      delete document.documentElement.dataset.platform;
      logger.info('Application unmounting', {}, 'app');
    };
  }, []);

  return (
    <ErrorBoundary name="AppRoot" isolate={false}>
      <SettingsProvider>
        <ThemeProvider defaultTheme="system" storageKey="zaphnath-ui-theme">
          <ErrorBoundary name="Navigation" isolate={true}>
            <NavigationProvider initialView="reader">
              <ErrorBoundary name="Layout" isolate={true}>
                <Layout>
                  <ErrorBoundary name="ViewRouter" isolate={true}>
                    <ViewRouter />
                  </ErrorBoundary>
                </Layout>
              </ErrorBoundary>
              <StoreDebuggerWrapper />
            </NavigationProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

export default App;
