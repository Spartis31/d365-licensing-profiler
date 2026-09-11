# Dynamics 365 F&O Licensing Profiler

Web tool for profiling Dynamics 365 Finance & Operations licences by business process.
Replicates and replaces the Excel workbook `Microsoft_profiling_licencesDyn365_Sample.xlsx`
(sheets `Disclaimer` and `Profiling_By_Business Process`).

## What the tool does

1. **Setup** — project name, customer, legal entities, and the profiling method.
2. **User profiles** — department, profile name, headcount per legal entity.
3. **Business processes** *or* **Standard roles** — tick responsibilities for each profile.
4. **Results** — Base, Attach and cross-application licences, per profile and per legal entity.
5. **Administration console** — review and decide requests to extend the standard catalog.

The interface is bilingual **EN / FR** and switches instantly. Source code, comments, commit
messages and GitHub labels are English; French exists only as UI translations in
[src/i18n](src/i18n) and in the label dictionaries of the catalog.

## Profiling methods are exclusive

A project is profiled either **by business process** or **by standard role**, never both.
The choice is made in Setup; only the matching step is shown and only that dataset feeds the
results. Switching method never deletes the hidden dataset, so the previous totals come back
unchanged if you switch back.

## Privacy

No project data leaves the browser.

- Autosaved to the browser `localStorage`.
- Shared through a `.d365lic` (JSON) file, exported and imported manually.
- Excel export generated client-side.
- No backend, no telemetry, no cookies.

## Calculation engine

The engine ([src/engine/licensing.ts](src/engine/licensing.ts)) reproduces the formulas of
the reference workbook (rows 158 to 182):

| Step | Rule |
| --- | --- |
| Base families | A family (Finance, SCM, Commerce, Project Operations, HR, cross-app) is activated as soon as a ticked process requires it. |
| Base | `users × 1` if at least one family is activated. |
| Add-on | `users × (number of families − 1)`. |
| Activity | `users` if no Base licence and at least one "Activity" process. |
| Team Members | `users` if neither Base nor Activity and at least one "Team Members" process. |
| Device | `users` if no Base licence and at least one "Device" process. |
| Base per product | The most expensive family takes the Base. List prices (September 2026 guide): SCM Premium $300, Finance Premium $300, SCM $210, Commerce $210, Finance $210, Project Operations $135, HR $135. |
| Attach per product | Every remaining family becomes an Attach licence. |

The order between families of equal price is arbitrary but cost-neutral for the Base. Attach
prices are not published in the guide, so ties cannot be broken any further.

Regression tests ([src/engine/licensing.test.ts](src/engine/licensing.test.ts)) replay the
dataset of the original workbook and check the totals: Base 29, Add-on 4, Activity 65,
Team Members 8, Device 90, Base Finance 17, Base SCM 12, Attach Finance 2,
Attach Project Operations 2.

## Updating the business-process catalog

The Licensing Guide is published monthly. To align the catalog:

1. Edit [src/data/catalog.ts](src/data/catalog.ts) (labels, minimum licence, new processes).
2. Bump `CATALOG_VERSION` (`2026-09` → `2026-10`).
3. Run `npm test` to confirm no calculation rule was broken.

Base/Attach priority rules live in the engine, not in the catalog.

## Updating the standard roles

[src/data/standardRoles.ts](src/data/standardRoles.ts) is **generated** — never edit it by
hand. The [update-roles](.github/workflows/update-roles.yml) workflow downloads the current
guide from the Microsoft permalink, derives the edition from the PDF file name, re-extracts
the security-role matrices, runs a quality gate and the test suite, then opens a pull request
only when the catalog actually changed. It runs monthly and can also be started from the
application by a signed-in Microsoft employee.

Locally:

```powershell
python tools/fetch_guide.py
python tools/extract_roles_plumber.py
python tools/generate_roles_ts.py
python tools/check_generated.py
```

## Catalog extension requests

Signed-in Microsoft employees can add **custom processes**, which stay in their own project
and travel with the `.d365lic` file. They can also submit them as a request to extend the
shared catalog: the application opens a prefilled GitHub issue labelled `process-request`,
carrying the author's alias.

Moderators handle those requests inside the application, in the administration console —
reading, commenting and deciding without leaving the tool. Levels (`contributor`,
`moderator`, `admin`) live in [public/governance.json](public/governance.json), so they are
data rather than code and can be edited from the console.

Adding the `ai-translation` label triggers the
[translate-request](.github/workflows/translate-request.yml) workflow, which proposes FR/EN
translations of the submitted labels. It calls any OpenAI-compatible endpoint configured
through the `TRANSLATION_ENDPOINT` and `TRANSLATION_API_KEY` secrets; when unconfigured it
posts a comment asking a moderator to translate manually, so the flow never breaks.

## Excel export

The generated workbook is built for sharing with an executive who did not enter the data: a
summary first, then profiles, then the per-legal-entity split, then what was selected, then
the calculation detail. Headcounts stay editable and every total is a **live formula**, so
the reader can simulate. Licence decisions themselves are frozen.

## Development

```powershell
npm install
npm run dev      # http://localhost:5173
npm test         # engine and export tests
npm run build    # production build in dist/
```

## GitHub Pages deployment

1. Push the repository to GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. The [deploy](.github/workflows/deploy.yml) workflow builds and publishes on every push to
   `main`. `BASE_PATH` is derived from the repository name. Tests run first: if one fails,
   nothing is published.

## Deliberate differences from the original workbook

- Two duplicated rows were renamed: `Taxes` (2nd occurrence) → `Tax reporting`,
  `Forecasting/Budget` (2nd occurrence) → `Project invoicing`.
- The typo `Auality inspection` is corrected to `Quality inspection`.
- A per-legal-entity split was added (indicative: licences are purchased at tenant level).

## Disclaimer

This tool is an estimation aid. The Microsoft Dynamics 365 Licensing Guide, updated monthly,
always prevails.
