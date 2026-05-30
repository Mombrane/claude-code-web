import { useState } from 'react';
import { useI18n, type Locale } from '../../i18n';

interface Settings {
  theme: 'dark' | 'light';
  model: string;
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  lineHeight: number;
}

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-white">{t('settings.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                Language / 语言
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  locale === 'en'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
                }`}
              >
                English
              </button>
              <button
                onClick={() => handleLanguageChange('zh')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  locale === 'zh'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
                }`}
              >
                中文
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-gray-700/50" />

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.theme')}</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleChange('theme', 'dark')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  localSettings.theme === 'dark'
                    ? 'bg-gray-600/80 text-white border border-gray-500/50'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                {t('settings.theme.dark')}
              </button>
              <button
                onClick={() => handleChange('theme', 'light')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                  localSettings.theme === 'light'
                    ? 'bg-gray-200 text-gray-900 border border-gray-300'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {t('settings.theme.light')}
              </button>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.model')}</label>
            <select
              value={localSettings.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700/50 text-white rounded-lg border border-gray-600/50 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            >
              <option value="">{t('settings.modelDefault')}</option>
              <option value="mimo-v2.5-pro">mimo-v2.5-pro</option>
            </select>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('settings.fontSize')}: <span className="text-blue-400">{localSettings.fontSize}px</span>
            </label>
            <input
              type="range"
              min="10"
              max="24"
              value={localSettings.fontSize}
              onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Tab Size */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.tabSize')}</label>
            <select
              value={localSettings.tabSize}
              onChange={(e) => handleChange('tabSize', parseInt(e.target.value))}
              className="w-full px-3 py-2.5 bg-gray-700/50 text-white rounded-lg border border-gray-600/50 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            >
              <option value="2">{t('settings.spaces', { count: 2 })}</option>
              <option value="4">{t('settings.spaces', { count: 4 })}</option>
              <option value="8">{t('settings.spaces', { count: 8 })}</option>
            </select>
          </div>

          {/* Word Wrap */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.wordWrap')}</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleChange('wordWrap', 'on')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  localSettings.wordWrap === 'on'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
                }`}
              >
                {t('settings.on')}
              </button>
              <button
                onClick={() => handleChange('wordWrap', 'off')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  localSettings.wordWrap === 'off'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700/70'
                }`}
              >
                {t('settings.off')}
              </button>
            </div>
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <label htmlFor="minimap" className="text-sm text-gray-300 cursor-pointer">
              {t('settings.minimap')}
            </label>
            <button
              onClick={() => handleChange('minimap', !localSettings.minimap)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                localSettings.minimap ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                localSettings.minimap ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700/50 bg-gray-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            {t('settings.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/25"
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
