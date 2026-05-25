import { AppLayout } from './components/layout/AppLayout';
import { I18nProvider } from './i18n';

function App() {
  return (
    <I18nProvider>
      <AppLayout />
    </I18nProvider>
  );
}

export default App;
