import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { ToastProvider } from './components/ui/ToastProvider';
import { ThemeProvider, useTheme } from './components/ui/ThemeProvider';
import { HomePage } from './pages/HomePage';

const SessionPage = React.lazy(() =>
  import('./pages/SessionPage').then((module) => ({ default: module.SessionPage }))
);

function LoadingFallback() {
  const { theme } = useTheme();
  return (
    <div className={`flex items-center justify-center h-screen ${
      theme === 'dark' ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'
    }`}>
      <div className="flex flex-col items-center gap-3">
        <div className={`w-8 h-8 border-2 rounded-full animate-spin ${
          theme === 'dark' ? 'border-gray-600 border-t-blue-400' : 'border-gray-300 border-t-blue-500'
        }`} />
        <span className="text-sm">
          {(() => {
            try {
              // Access i18n is not available here (outside I18nProvider scope for lazy routes)
              // Use a simple locale detection as fallback
              const lang = navigator.language;
              return lang.startsWith('zh') ? '加载中...' : 'Loading...';
            } catch {
              return 'Loading...';
            }
          })()}
        </span>
      </div>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/:dir/session/:id?" element={<SessionPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
