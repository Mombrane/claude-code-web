import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { ToastProvider } from './components/ui/ToastProvider';
import { HomePage } from './pages/HomePage';

const SessionPage = React.lazy(() =>
  import('./pages/SessionPage').then((module) => ({ default: module.SessionPage }))
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-400">Loading...</div>
);

function App() {
  return (
    <I18nProvider>
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
    </I18nProvider>
  );
}

export default App;
