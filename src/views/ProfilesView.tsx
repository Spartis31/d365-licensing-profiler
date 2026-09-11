import { useTranslation } from 'react-i18next';
import type { ProjectApi } from '../state/useProject';
import { totalUsers } from '../engine/licensing';

export function ProfilesView({
  project,
  addProfile,
  updateProfile,
  removeProfile,
  duplicateProfile,
  setCount,
}: ProjectApi) {
  const { t } = useTranslation();
  const grandTotal = project.profiles.reduce((sum, profile) => sum + totalUsers(profile), 0);

  return (
    <section className="view">
      <header>
        <h2>{t('profiles.heading')}</h2>
        <p className="intro">{t('profiles.intro')}</p>
      </header>

      {project.profiles.length === 0 ? (
        <div className="empty">
          <strong>{t('profiles.noProfiles')}</strong>
          <button type="button" className="primary" onClick={addProfile}>
            {t('actions.addProfile')}
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="grid profiles-grid">
              <thead>
                <tr>
                  <th className="sticky-col">{t('profiles.department')}</th>
                  <th>{t('profiles.name')}</th>
                  <th>{t('profiles.description')}</th>
                  {project.legalEntities.map((entity) => (
                    <th key={entity.id} className="num">
                      {entity.name || '—'}
                    </th>
                  ))}
                  <th className="num total">{t('profiles.total')}</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {project.profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="sticky-col">
                      <input
                        value={profile.department}
                        placeholder={t('profiles.department')}
                        onChange={(e) => updateProfile(profile.id, { department: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={profile.name}
                        placeholder={t('profiles.newProfile')}
                        onChange={(e) => updateProfile(profile.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={profile.description}
                        placeholder="—"
                        onChange={(e) => updateProfile(profile.id, { description: e.target.value })}
                      />
                    </td>
                    {project.legalEntities.map((entity) => (
                      <td key={entity.id} className="num">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={profile.counts[entity.id] ?? ''}
                          placeholder="0"
                          onChange={(e) => setCount(profile.id, entity.id, Math.max(0, Number(e.target.value) || 0))}
                        />
                      </td>
                    ))}
                    <td className="num total">{totalUsers(profile)}</td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="ghost icon"
                        title={t('actions.duplicate')}
                        onClick={() => duplicateProfile(profile.id)}
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="ghost danger icon"
                        title={t('actions.remove')}
                        onClick={() => {
                          if (confirm(t('common.confirmDelete'))) removeProfile(profile.id);
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th className="sticky-col">{t('profiles.total')}</th>
                  <td colSpan={2 + project.legalEntities.length} />
                  <td className="num total">{grandTotal}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="toolbar" style={{ marginTop: 14 }}>
            <button type="button" className="primary" onClick={addProfile}>
              + {t('actions.addProfile')}
            </button>
            <span className="hint">{t('profiles.deviceHint')}</span>
          </div>
        </>
      )}
    </section>
  );
}
