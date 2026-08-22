import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import { skillsCatalog, type SkillCatalogEntry } from '../../data/skills-catalog';

/**
 * Renders the skills catalog table from the single source of truth in
 * `src/data/skills-catalog.ts`. Used on `/docs/skills` so the catalog page
 * can never drift from the data file the way a hand-written table could.
 */
export default function SkillsCatalogTable(): ReactNode {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Purpose</th>
          <th>Use Case</th>
        </tr>
      </thead>
      <tbody>
        {skillsCatalog.map((entry: SkillCatalogEntry) => (
          <tr key={entry.name}>
            <td>
              <Link to={`/docs/skills/${entry.slug}`}>
                <code>{entry.name}</code>
              </Link>
            </td>
            <td>{entry.purpose}</td>
            <td>{entry.useCase}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
