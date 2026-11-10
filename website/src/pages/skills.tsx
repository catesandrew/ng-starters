import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {usePluginData} from '@docusaurus/useGlobalData';
import SkillsBrowser, {type Catalog} from '@cogs/skills-site/SkillsBrowser';

export default function Skills(): ReactNode {
  const catalog = usePluginData('skills-site') as Catalog;
  return (
    <Layout title="Skills" description="Browse, search and download every skill.">
      <SkillsBrowser
        catalog={catalog}
        zipHref={useBaseUrl(catalog.zipBase)}
        docsHref={useBaseUrl(catalog.docsBase)}
        Link={Link}
      />
    </Layout>
  );
}
