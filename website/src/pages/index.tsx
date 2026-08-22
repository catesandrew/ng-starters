import type { ReactNode } from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import styles from './index.module.css';

const INSTALL_SNIPPET = `skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-testid-attributes -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-testid-catalog -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-page-objects -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-attribute-waits -g`;

const OLD_WAY = [
  <>
    <code>await page.waitForTimeout(500)</code> stacked before every
    assertion, because nothing in the app signals real readiness — flaky
    under load, slow always.
  </>,
  <>
    <code>data-testid=&quot;submit-btn&quot;</code> retyped by hand in every
    component and every spec, one typo away from a silent miss.
  </>,
  <>
    Ad-hoc polling loops hand-rolled per spec for every modal, drawer, and
    debounced search box, because there&apos;s no shared wait helper to reach
    for.
  </>,
  <>
    Page objects that are really just locator grab-bags — no selector
    priority, no readiness discipline, business flow logic tangled straight
    into the class.
  </>,
];

const NG_STARTERS_WAY = [
  <>
    <strong>ng-playwright-testid-attributes</strong> — <code>data-*</code>/
    <code>aria-*</code> attributes bound to the exact signal driving the
    render, so waits assert on real state transitions instead of racing a
    timer.
  </>,
  <>
    <strong>ng-playwright-testid-catalog</strong> — one typed,
    collision-checked <code>data-testid</code> registry per feature area,
    mirrored into the Playwright side, so app and spec code can never drift
    on an id string.
  </>,
  <>
    <strong>ng-playwright-attribute-waits</strong> — one canonical set of
    helpers for readiness, close/unmount, epoch-fencing, and search-settle
    waits, instead of a hand-rolled polling loop per spec.
  </>,
  <>
    <strong>ng-playwright-page-objects</strong> — a shared{' '}
    <code>BasePage</code> contract, role-first selector priority ladder, and
    readiness-wait discipline baked into every Page Object class.
  </>,
];

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}
    >
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroBadge}>Angular 21+ &middot; Playwright</span>
          <h1 className={styles.heroTitle}>
            Playwright tests that assert on real state, not vibes.
          </h1>
          <p className={styles.heroTagline}>{siteConfig.tagline}</p>
          <p className={styles.heroHook}>
            Four Claude Code skills that turn &ldquo;write a{' '}
            <code>data-testid</code>, cross your fingers, add a{' '}
            <code>waitForTimeout</code>&rdquo; into a disciplined, typed,
            repeatable workflow — so your Angular E2E suite stops racing the
            UI and starts reading its actual state.
          </p>
          <div className={styles.heroCtas}>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started"
            >
              Get Started
            </Link>
            <Link
              className="button button--outline button--lg"
              to="/docs/skills"
            >
              Browse the Skills Catalog
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <span className={styles.sectionKicker}>Why this exists</span>
            <h2 className={styles.sectionTitle}>
              You&apos;ve written this Playwright suite before
            </h2>
            <p className={styles.sectionLead}>
              Every Angular team reinvents the same brittle E2E patterns from
              scratch — and every team pays for it in flaky CI runs. ng-starters
              replaces that improvisation with four skills that instrument,
              catalog, wait on, and drive your app the same disciplined way,
              every time.
            </p>
            <div className={styles.compareGrid}>
              <div className={clsx(styles.compareCard, styles.compareCardBad)}>
                <h3 className={styles.compareCardTitle}>
                  The way most suites get built
                </h3>
                <ul className={styles.compareList}>
                  {OLD_WAY.map((item, index) => (
                    <li key={index} className={styles.compareItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={clsx(styles.compareCard, styles.compareCardGood)}>
                <h3 className={styles.compareCardTitle}>
                  What ng-starters wires in instead
                </h3>
                <ul className={styles.compareList}>
                  {NG_STARTERS_WAY.map((item, index) => (
                    <li key={index} className={styles.compareItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className={clsx(styles.section, styles.sectionAlt)}>
          <div className={styles.sectionInner}>
            <span className={styles.sectionKicker}>Quick install</span>
            <h2 className={styles.sectionTitle}>
              Two minutes to a disciplined test suite
            </h2>
            <p className={styles.sectionLead}>
              Install straight from this repo with the{' '}
              <a
                href="https://www.npmjs.com/package/skills"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vercel Skills CLI
              </a>{' '}
              — pick just the skill(s) you need, globally or per-project.
            </p>
            <div className={styles.installShell}>
              <div className={styles.installTitleBar}>
                <span className={styles.installDot} />
                <span className={styles.installDot} />
                <span className={styles.installDot} />
              </div>
              <CodeBlock language="bash">{INSTALL_SNIPPET}</CodeBlock>
            </div>
            <p className={styles.installNote}>
              Prefer npm packages, the Claude Code plugin marketplace, or a
              plain <code>git clone</code>? All four channels are covered in{' '}
              <Link to="/docs/getting-started">Getting Started</Link>.
            </p>
          </div>
        </section>

        <section className={styles.ctaBanner}>
          <h2 className={styles.ctaBannerTitle}>
            Stop shipping flaky Angular E2E tests
          </h2>
          <p className={styles.ctaBannerLead}>
            Instrument components, catalog testids, wait on real attributes,
            and drive pages through disciplined Page Objects — the whole
            workflow, wired together.
          </p>
          <Link
            className={clsx('button button--lg', styles.ctaBannerButton)}
            to="/docs/getting-started"
          >
            Get Started
          </Link>
        </section>
      </main>
    </Layout>
  );
}
