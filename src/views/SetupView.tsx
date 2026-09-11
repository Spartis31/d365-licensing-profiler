import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PROFILING_MODES } from '../types';
import type { ProjectApi } from '../state/useProject';
import { signOut, useIdentity } from '../auth/identity';
import { SignInModal } from '../components/SignInModal';

export function SetupView({
  project,
  updateMeta,
  setProfilingMode,
  addLegalEntity,
  updateLegalEntity,
  removeLegalEntity,
}: ProjectApi) {
  const { t } = useTranslation();
  const identity = useIdentity();
  const [showSignIn, setShowSignIn] = useState(false);

  const filled = {
    processes: project.profiles.reduce((n, p) => n + Object.keys(p.selections).length, 0),
    roles: project.profiles.reduce((n, p) => n + Object.keys(p.standardRoles ?? {}).length, 0),
  };

  return (
    <section className="view">
      <header>
        <h2>{t('setup.heading')}</h2>
        <p className="intro">{t('setup.intro')}</p>
      </header>

      <div className="card" data-tour="setup-meta">
        <div className="field-grid">
          <label>
            <span>{t('setup.projectName')}</span>
            <input value={project.meta.name} onChange={(e) => updateMeta({ name: e.target.value })} />
          </label>
          <label>
            <span>{t('setup.customer')}</span>
            <input value={project.meta.customer} onChange={(e) => updateMeta({ customer: e.target.value })} />
          </label>
          <label>
            <span>{t('setup.author')}</span>
            <input value={project.meta.author} onChange={(e) => updateMeta({ author: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="card" data-tour="setup-mode">
        <h3 style={{ marginTop: 0 }}>{t('setup.mode')}</h3>
        <p className="hint" style={{ marginBottom: 14 }}>
          {t('setup.modeHint')}
        </p>
        <div className="mode-choice" role="radiogroup" aria-label={t('setup.mode')}>
          {PROFILING_MODES.map((mode) => (
            <label key={mode} className={project.profilingMode === mode ? 'mode-card selected' : 'mode-card'}>
              <input
                type="radio"
                name="profilingMode"
                checked={project.profilingMode === mode}
                onChange={() => setProfilingMode(mode)}
              />
              <span className="mode-body">
                <span className="mode-title">{t(`setup.mode_${mode}`)}</span>
                <span className="mode-desc">{t(`setup.mode_${mode}_desc`)}</span>
                <span className="mode-meta">{t(`setup.mode_${mode}_for`)}</span>
                <span className="mode-count">{t('setup.modeFilled', { count: filled[mode] })}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 14 }}>
          {t('setup.modeSwitchHint')}
        </p>
      </div>

      <div className="card" data-tour="setup-entities">
        <h3 style={{ marginTop: 0 }}>{t('setup.legalEntities')}</h3>
        <p className="hint" style={{ marginBottom: 12 }}>
          {t('setup.legalEntitiesHint')}
        </p>
        <ul className="entity-list">
          {project.legalEntities.map((entity) => (
            <li key={entity.id}>
              <input
                value={entity.name}
                placeholder={t('setup.entityName')}
                onChange={(e) => updateLegalEntity(entity.id, { name: e.target.value })}
              />
              <button
                type="button"
                className="ghost danger icon"
                aria-label={t('actions.remove')}
                disabled={project.legalEntities.length <= 1}
                onClick={() => removeLegalEntity(entity.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addLegalEntity}>
          + {t('actions.addLegalEntity')}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t('setup.storage')}</h3>
        <p className="intro">{t('setup.storageHint')}</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t('auth.title')}</h3>
        <p className="hint" style={{ marginBottom: 12 }}>
          {t('auth.intro')}
        </p>
        {identity ? (
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <span className="identity-chip">{t('auth.signedInAs', { alias: identity.alias })}</span>
            <button type="button" onClick={signOut}>
              {t('auth.signOut')}
            </button>
          </div>
        ) : (
          <button type="button" className="primary" onClick={() => setShowSignIn(true)}>
            {t('auth.button')}
          </button>
        )}
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </section>
  );
}
