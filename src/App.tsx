import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from './state/useProject';
import { SetupView } from './views/SetupView';
import { ProfilesView } from './views/ProfilesView';
import { MatrixView } from './views/MatrixView';
import { RolesView } from './views/RolesView';
import { ResultsView } from './views/ResultsView';
import { DisclaimerModal } from './components/DisclaimerModal';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { currentLanguage } from './i18n';
import { download, projectFileName, readProjectFile, saveProjectFile } from './export/projectFile';

const DISCLAIMER_KEY = 'd365lic.disclaimerAccepted';
const TABS = ['setup', 'profiles', 'matrix', 'roles', 'results'] as const;
type Tab = (typeof TABS)[number];

/** The two profiling tabs are mutually exclusive; only the active mode's is shown. */
const HIDDEN_BY_MODE: Record<string, Tab> = { processes: 'roles', roles: 'matrix' };

export default function App() {
  const { t } = useTranslation();
  const api = useProject();
  const [tab, setTab] = useState<Tab>('setup');
  const [accepted, setAccepted] = useState(() => localStorage.getItem(DISCLAIMER_KEY) === 'true');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const hiddenTab = HIDDEN_BY_MODE[api.project.profilingMode];
  const visibleTabs = TABS.filter((name) => name !== hiddenTab);
  // Changing mode in Setup must not leave the user stranded on a hidden step.
  const activeTab = tab === hiddenTab ? (api.project.profilingMode === 'roles' ? 'roles' : 'matrix') : tab;

  const acceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setAccepted(true);
    setShowDisclaimer(false);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      api.replace(await readProjectFile(file));
      setTab('profiles');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const handleExcel = async () => {
    setBusy(true);
    setError(null);
    try {
      // ExcelJS is ~800 kB; keep it out of the initial bundle.
      const { exportToExcel } = await import('./export/excel');
      const blob = await exportToExcel(api.project, currentLanguage());
      download(blob, projectFileName(api.project, 'xlsx'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const done: Record<Tab, boolean> = {
    setup: api.project.legalEntities.some((entity) => entity.name.trim().length > 0),
    profiles: api.project.profiles.some((profile) => profile.name.trim().length > 0),
    matrix: api.project.profiles.some((profile) => Object.keys(profile.selections).length > 0),
    roles: api.project.profiles.some((profile) => Object.keys(profile.standardRoles ?? {}).length > 0),
    results: false,
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">365</span>
          <div>
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
          </div>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <span className="header-sep" />
          <button type="button" className="subtle" onClick={() => fileInput.current?.click()}>
            {t('actions.open')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".d365lic,application/json"
            hidden
            onChange={(e) => {
              void handleImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button type="button" className="subtle" onClick={() => saveProjectFile(api.project)}>
            {t('actions.save')}
          </button>
          <button type="button" className="primary" disabled={busy} onClick={() => void handleExcel()}>
            {t('actions.exportExcel')}
          </button>
          <button
            type="button"
            className="subtle"
            onClick={() => {
              if (confirm(t('common.confirmNewProject'))) api.reset();
            }}
          >
            {t('actions.newProject')}
          </button>
        </div>
      </header>

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button type="button" className="ghost" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      <nav className="steps" role="tablist">
        {visibleTabs.map((name, index) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={activeTab === name}
            className={`${activeTab === name ? 'active' : ''} ${done[name] ? 'done' : ''}`}
            onClick={() => setTab(name)}
          >
            <span className="step-num">{done[name] && activeTab !== name ? '✓' : index + 1}</span>
            {t(`nav.${name}`)}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'setup' && <SetupView {...api} />}
        {activeTab === 'profiles' && <ProfilesView {...api} />}
        {activeTab === 'matrix' && <MatrixView {...api} />}
        {activeTab === 'roles' && <RolesView {...api} />}
        {activeTab === 'results' && <ResultsView project={api.project} />}
      </main>

      <footer className="app-footer">
        <button type="button" className="link" onClick={() => setShowDisclaimer(true)}>
          {t('nav.disclaimer')}
        </button>
        <span>{t('disclaimer.note')}</span>
      </footer>

      {(!accepted || showDisclaimer) && (
        <DisclaimerModal onAccept={accepted ? () => setShowDisclaimer(false) : acceptDisclaimer} />
      )}
    </div>
  );
}
