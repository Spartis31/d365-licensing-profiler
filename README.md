# Dynamics 365 F&O Licensing Profiler

Outil web de profilage des licences Dynamics 365 Finance & Operations par processus métier.
Réplique et remplace le classeur Excel `Microsoft_profiling_licencesDyn365_Sample.xlsx`
(feuilles `Disclaimer` et `Profiling_By_Business Process`).

## Ce que fait l'outil

1. **Paramétrage** — nom du projet, client, entités légales à démarrer.
2. **Profils utilisateurs** — service, nom du profil, nombre d'utilisateurs par entité légale.
3. **Processus métier** — matrice processus × profils, cochage des responsabilités.
4. **Résultats** — licences Base, Attach et additionnelles, par profil et par entité légale.

Interface bilingue **FR / EN**, commutable à chaud.

## Confidentialité

Aucune donnée ne quitte le navigateur.

- Sauvegarde automatique dans le `localStorage` du navigateur.
- Partage via un fichier `.d365lic` (JSON) exporté/importé manuellement.
- Export Excel généré côté client.
- Pas de backend, pas de télémétrie, pas de cookies.

## Moteur de calcul

Le moteur ([src/engine/licensing.ts](src/engine/licensing.ts)) reproduit exactement les
formules du classeur de référence (lignes 158 à 182) :

| Étape | Règle |
| --- | --- |
| Familles Base | Une famille (Finance, SCM, Commerce, Project Operations, HR, cross-app) est activée dès qu'un processus coché l'exige. |
| Base | `utilisateurs × 1` si au moins une famille est activée. |
| Add-on | `utilisateurs × (nombre de familles − 1)`. |
| Activity | `utilisateurs` si aucune licence Base et au moins un processus « Activity ». |
| Team Members | `utilisateurs` si ni Base ni Activity et au moins un processus « Team Members ». |
| Device | `utilisateurs` si aucune licence Base et au moins un processus « Device ». |
| Base par produit | La famille la plus chère prend la Base. Prix catalogue (guide sept. 2026) : SCM Premium 300 $, Finance Premium 300 $, SCM 210 $, Commerce 210 $, Finance 210 $, Project Operations 135 $, HR 135 $. |
| Attach par produit | Chaque famille restante devient une licence Attach. |

L'ordre entre familles de même prix est arbitraire mais sans incidence sur le coût
de la Base. Les tarifs Attach ne sont pas publiés dans le guide, les égalités ne
peuvent donc pas être départagées davantage.

Les tests de non-régression ([src/engine/licensing.test.ts](src/engine/licensing.test.ts))
rejouent le jeu de données du classeur d'origine et vérifient les totaux :
Base 29, Add-on 4, Activity 65, Team Members 8, Device 90,
Base Finance 17, Base SCM 12, Attach Finance 2, Attach Project Operations 2.

## Mettre à jour le catalogue

Le Licensing Guide est publié tous les mois. Pour l'aligner :

1. Modifier [src/data/catalog.ts](src/data/catalog.ts) (libellés, licence minimale, nouveaux processus).
2. Incrémenter `CATALOG_VERSION` (`2026-09` → `2026-10`).
3. `npm test` pour vérifier qu'aucune règle de calcul n'a été cassée.

Les règles de priorité Base/Attach vivent dans le moteur, pas dans le catalogue.

## Export Excel

Le classeur généré reproduit la mise en page d'origine **avec des formules vivantes**
(`COUNTIFS`, blocs de calcul, tableau récapitulatif). Le client peut donc continuer à
travailler dans Excel après export. Les plages sont recalculées dynamiquement en fonction
du nombre d'entités légales et de profils.

## Développement

```powershell
npm install
npm run dev      # http://localhost:5173
npm test         # tests du moteur et de l'export
npm run build    # build de production dans dist/
```

## Déploiement GitHub Pages

1. Pousser le dépôt sur GitHub.
2. Settings → Pages → Source : **GitHub Actions**.
3. Le workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) construit et
   publie à chaque push sur `main`. `BASE_PATH` est déduit du nom du dépôt.

## Écarts assumés vis-à-vis du classeur d'origine

- Deux lignes dupliquées ont été renommées : `Taxes` (2e occurrence) → `Tax reporting`,
  `Forecasting/Budget` (2e occurrence) → `Project invoicing`.
- La coquille `Auality inspection` est corrigée en `Quality inspection`.
- Une répartition par entité légale a été ajoutée (indicative : les licences s'achètent au
  niveau du tenant).

## Avertissement

Cet outil est une aide à l'estimation. Le Microsoft Dynamics 365 Licensing Guide,
mis à jour mensuellement, prévaut toujours.
