import '../marketing-home.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Package,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from '@/routes/paths';
import { usePageSeo } from '../hooks/use-page-seo';
import { MARKETING_SEO, SITE_URL } from '../seo';
import { type ProductFeature, type ProductId } from '../marketing-copy';
import { useMarketing } from '../marketing-context';

const FEATURE_ICONS: LucideIcon[] = [
  Package,
  ShoppingBag,
  ClipboardList,
  Boxes,
  Users,
  CreditCard,
  Users,
  Wallet,
  CircleDollarSign,
  BarChart3,
];
const NEED_ICONS: LucideIcon[] = [
  Wallet,
  Target,
  ShoppingBag,
  Boxes,
  ShoppingBag,
  Users,
  CircleDollarSign,
];

function scrollToProduct() {
  document.getElementById('product-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ProductPreview({ product }: { product: ProductId }) {
  const { copy } = useMarketing();
  const detail = copy.productDetails[product];
  const isPersonal = product === 'personal' || product === 'overview';
  const store = product === 'furniture';
  const title = detail.name;
  const productLabel = store
    ? copy.business.modules[0]
    : isPersonal
      ? copy.personal.features[0]?.title
      : copy.nav.business;
  const activityLabel = store
    ? copy.business.features[1]?.title
    : isPersonal
      ? copy.personal.features[5]?.title
      : detail.features[0]?.title;
  const chartTitle = activityLabel;

  return (
    <div className="product-window" role="img" aria-label={`${title} ${copy.hero.sample}`}>
      <div className="product-window-top">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>
        <span>
          Balancy Space / {isPersonal ? 'personal' : 'workspace'} · {copy.hero.sample}
        </span>
        <span className="preview-avatar">B</span>
      </div>
      <div className="preview-content">
        <aside className="preview-rail">
          <div className="preview-mark">b</div>
          <BarChart3 />
          <Wallet />
          <Target />
          <CreditCard />
          <div className="rail-bottom">•••</div>
        </aside>
        <div className="preview-main">
          <div className="preview-heading">
            <div>
              <span className="preview-kicker">{detail.label}</span>
              <h3>{title}</h3>
            </div>
            <span className="preview-period">{copy.hero.sample}</span>
          </div>
          <div className="preview-stats">
            <div>
              <span>{productLabel}</span>
              <strong>
                •••••• <small>{store ? 'UZS' : '••'}</small>
              </strong>
              <em>
                <ArrowDown size={12} /> {copy.overview.link}
              </em>
            </div>
            <div>
              <span>{activityLabel}</span>
              <strong>••••••</strong>
              <em>
                <ArrowUpRight size={12} /> {copy.finder.cta}
              </em>
            </div>
          </div>
          <div className="preview-chart-card">
            <div className="chart-title">
              <span>{chartTitle}</span>
              <span className="chart-legend">
                <i /> {copy.personal.features[0]?.title}
              </span>
            </div>
            <svg viewBox="0 0 560 120" role="presentation" preserveAspectRatio="none">
              <path
                d="M0 96 C38 91 44 66 82 76 S132 101 170 65 S222 72 258 43 S304 60 340 37 S390 52 425 25 S474 43 510 15 S540 30 560 8"
                fill="none"
                stroke="#5368d8"
                strokeWidth="3"
              />
              <path
                d="M0 107 C45 100 50 89 90 94 S134 78 172 89 S222 72 258 82 S300 67 340 73 S391 59 425 67 S471 50 510 57 S540 46 560 48"
                fill="none"
                stroke="#a9b3c9"
                strokeWidth="2"
                strokeDasharray="4 5"
              />
            </svg>
            <div className="chart-months">
              <span>01</span>
              <span>02</span>
              <span>03</span>
              <span>04</span>
              <span>05</span>
              <span>06</span>
            </div>
          </div>
          <div className="preview-lower">
            <div className="preview-list">
              <div className="chart-title">
                <span>
                  {store
                    ? copy.business.features[3]?.title
                    : isPersonal
                      ? copy.personal.growthLabel
                      : detail.name}
                </span>
                <ArrowRight size={14} />
              </div>
              <div className="activity-row">
                <span className="activity-icon">
                  <Package size={14} />
                </span>
                <div>
                  <b>
                    {store
                      ? copy.business.features[0]?.title
                      : isPersonal
                        ? copy.personal.features[3]?.title
                        : detail.features[0]?.title}
                  </b>
                  <small>{copy.hero.sample}</small>
                </div>
                <strong>•••</strong>
              </div>
              <div className="activity-row">
                <span className="activity-icon">
                  <Sparkles size={14} />
                </span>
                <div>
                  <b>{activityLabel}</b>
                  <small>{detail.label}</small>
                </div>
                <strong>
                  <ArrowUpRight size={12} />
                </strong>
              </div>
            </div>
            <div className="preview-side-card">
              <span className="side-spark">
                <Sparkles size={15} />
              </span>
              <b>{copy.overview.link}</b>
              <small>{detail.description}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureMockup({
  feature,
  index,
  icon: Icon,
}: {
  feature: ProductFeature;
  index: number;
  icon: LucideIcon;
}) {
  return (
    <article className="feature-detail-card" style={{ animationDelay: `${index * 45}ms` }}>
      <div className="feature-detail-preview">
        <div className="feature-preview-top">
          <span>
            <i />
            <i />
            <i />
          </span>
          <small>Balancy Space / sample</small>
          <Icon size={14} />
        </div>
        <div className="feature-preview-body">
          <div className="feature-preview-title">
            <Icon size={15} />
            <span>{feature.title}</span>
          </div>
          {index % 3 === 0 ? (
            <div className="mock-table">
              <i />
              <i />
              <i />
            </div>
          ) : index % 3 === 1 ? (
            <div className="mock-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          ) : (
            <div className="mock-lines">
              <i />
              <i />
              <i />
            </div>
          )}
          <div className="mock-chip-row">
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
      <div className="feature-detail-copy">
        <span className="feature-detail-number">{String(index + 1).padStart(2, '0')}</span>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </div>
    </article>
  );
}

export function MarketingHomePage() {
  const { copy, product, setProduct } = useMarketing();
  const [need, setNeed] = useState(0);
  const detail = copy.productDetails[product];
  const productFeatures =
    product === 'personal'
      ? copy.personal.features
      : product === 'furniture'
        ? copy.business.features
        : detail.features;
  const isAvailable = product === 'overview' || product === 'personal' || product === 'furniture';
  const finderSelection = copy.finder.options[need]!;
  const finderFeatures =
    finderSelection.product === 'personal' ? copy.personal.features : copy.business.features;
  const finderFeature = finderFeatures[finderSelection.feature]!;
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('.reveal-on-scroll');
    if (!('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -35px 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [product]);
  usePageSeo({
    ...MARKETING_SEO.home,
    title:
      product === 'overview'
        ? `Balancy Space — ${copy.hero.title.replaceAll('\n', ' ')}`
        : `${detail.name} | Balancy Space`,
    description: product === 'overview' ? copy.hero.description : detail.description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: detail.name,
      description: detail.description,
      url: `${SITE_URL}/`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
  });

  const chooseProduct = (next: ProductId) => {
    setProduct(next);
    window.setTimeout(scrollToProduct, 20);
  };

  const mainCta = () => {
    if (product === 'personal')
      return (
        <Link to={ROUTES.personalDashboard} className="button-primary">
          {detail.cta}
          <ArrowRight size={17} />
        </Link>
      );
    if (product === 'furniture')
      return (
        <Link to={ROUTES.login} className="button-primary">
          {detail.cta}
          <ArrowRight size={17} />
        </Link>
      );
    if (product !== 'overview')
      return (
        <a href="#coming-soon" className="button-primary">
          {detail.cta}
          <ArrowRight size={17} />
        </a>
      );
    return (
      <Link to={ROUTES.onboarding} className="button-primary">
        {copy.hero.start}
        <ArrowRight size={17} />
      </Link>
    );
  };

  return (
    <main className="balanc-home">
      <section className="home-hero" id="products">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />{' '}
            {product === 'overview' ? copy.hero.eyebrow : detail.label}
          </div>
          <h1>
            {(product === 'overview' ? copy.hero.title : detail.name)
              .split('\n')
              .map((line, index) => (
                <span
                  className={index ? 'hero-title-line muted-line' : 'hero-title-line'}
                  key={`${line}-${index}`}
                >
                  {line}
                  <br />
                </span>
              ))}
          </h1>
          <p>{product === 'overview' ? copy.hero.description : detail.description}</p>
          <div className="hero-actions">
            {mainCta()}
            <a
              href={product === 'overview' ? '#personal' : '#product-detail'}
              className="button-secondary"
              onClick={() => {
                if (product === 'overview')
                  document.getElementById('personal')?.scrollIntoView({ behavior: 'smooth' });
                else scrollToProduct();
              }}
            >
              {copy.hero.explore}
              <ArrowDown size={16} />
            </a>
          </div>
          <div className="hero-note">
            <span>
              <Check size={14} />
            </span>
            {copy.hero.note}
          </div>
        </div>
        <div className="hero-product" key={product}>
          <div className="product-selector">
            <div className="selector-heading">
              <span>{copy.hero.selector}</span>
              <span className="selector-live">
                <i /> {copy.hero.preview}
              </span>
            </div>
            <div className="selector-tabs" role="group" aria-label={copy.hero.selector}>
              <button
                aria-pressed={product === 'personal' || product === 'overview'}
                className={product === 'personal' || product === 'overview' ? 'active' : ''}
                onClick={() => chooseProduct('personal')}
              >
                <b>{copy.hero.personal}</b>
                <small>{copy.hero.personalHint}</small>
              </button>
              <button
                aria-pressed={product === 'furniture'}
                className={product === 'furniture' ? 'active' : ''}
                onClick={() => chooseProduct('furniture')}
              >
                <b>{copy.hero.store}</b>
                <small>{copy.hero.storeHint}</small>
              </button>
              <button
                aria-pressed={product !== 'overview' && product !== 'personal'}
                className={product !== 'overview' && product !== 'personal' ? 'active' : ''}
                onClick={() => chooseProduct('furniture')}
              >
                <b>{copy.hero.business}</b>
                <small>{copy.hero.businessHint}</small>
              </button>
            </div>
          </div>
          <ProductPreview product={product} />
          <div className="preview-caption">
            <span>{product === 'overview' ? copy.overview.text : detail.description}</span>
            <span>{product === 'overview' ? '01 / 03' : product.toUpperCase()}</span>
          </div>
        </div>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
      </section>

      {product !== 'overview' && (
        <section className="product-detail-section reveal-on-scroll" id="product-detail">
          <div className="product-detail-heading">
            <span className="section-index">{detail.label}</span>
            <h2>{detail.name}</h2>
            <p>{detail.description}</p>
            {!isAvailable && <span className="detail-coming-pill">{copy.coming.soon}</span>}
            {product === 'personal' && (
              <span className="detail-availability">{copy.personal.growthLabel}</span>
            )}
            {product === 'furniture' && (
              <span className="detail-availability">{copy.business.available}</span>
            )}
          </div>
          <div className="product-feature-grid">
            {productFeatures.map((feature, index) => (
              <FeatureMockup
                key={`${product}-${feature.title}`}
                feature={feature}
                index={index}
                icon={FEATURE_ICONS[index % FEATURE_ICONS.length]!}
              />
            ))}
          </div>
          <div className="product-detail-cta">{mainCta()}</div>
        </section>
      )}

      {product === 'overview' && (
        <>
          <section className="home-intro reveal-on-scroll">
            <span className="section-index">{copy.overview.index}</span>
            <div>
              <h2>
                {copy.overview.title.split('\n').map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </h2>
              <p>{copy.overview.text}</p>
            </div>
            <a href="#personal" className="text-link">
              {copy.overview.link}
              <ArrowDown size={15} />
            </a>
          </section>
          <section className="product-section personal-section reveal-on-scroll" id="personal">
            <div className="section-copy">
              <span className="section-index">{copy.personal.index}</span>
              <h2>
                {copy.personal.title.split('\n').map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </h2>
              <p>{copy.personal.text}</p>
              <ul className="capability-list">
                {copy.personal.features.map((feature, index) => {
                  const Icon = [
                    Wallet,
                    CreditCard,
                    CircleDollarSign,
                    Target,
                    ClipboardList,
                    Sparkles,
                  ][index]!;
                  return (
                    <li key={feature.title}>
                      <Icon />
                      {feature.title} — {feature.description}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="text-link text-button"
                onClick={() => chooseProduct('personal')}
              >
                {copy.personal.growthCta}
                <ArrowRight size={16} />
              </button>
            </div>
            <button
              type="button"
              className="personal-feature-card growth-feature"
              onClick={() => chooseProduct('personal')}
            >
              <div className="feature-card-top">
                <span className="feature-icon">
                  <Sparkles size={18} />
                </span>
                <span className="feature-label">{copy.personal.growthLabel}</span>
              </div>
              <h3>{copy.personal.growthTitle}</h3>
              <p>{copy.personal.growthText}</p>
              <div className="goal-demo growth-demo">
                <span>
                  <Check size={14} />
                  {copy.personal.features[5]?.title}
                </span>
                <span>
                  <Target size={14} />
                  {copy.personal.features[3]?.title}
                </span>
                <span>
                  <Sparkles size={14} />
                  {copy.personal.features[4]?.title}
                </span>
                <span>
                  <ArrowUpRight size={14} />
                  {copy.personal.focus}
                </span>
              </div>
              <span className="feature-foot">
                <span>
                  <Check size={14} />
                  {copy.personal.growthCta}
                </span>
                <ArrowUpRight size={17} />
              </span>
            </button>
          </section>
          <section className="business-section reveal-on-scroll" id="business">
            <div className="business-heading">
              <span className="section-index">{copy.business.index}</span>
              <h2>
                {copy.business.title.split('\n').map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </h2>
              <p>{copy.business.text}</p>
            </div>
            <div className="business-grid">
              <div className="business-main-card">
                <div className="business-card-head">
                  <span className="feature-icon dark-icon">
                    <BarChart3 size={18} />
                  </span>
                  <span>{copy.nav.furniture.toUpperCase()}</span>
                  <span className="working-badge">
                    <i />
                    {copy.business.available}
                  </span>
                </div>
                <h3>{copy.business.cardTitle}</h3>
                <p>{copy.business.cardText}</p>
                <div className="business-modules">
                  {copy.business.modules.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-link light-link text-button"
                  onClick={() => chooseProduct('furniture')}
                >
                  {copy.nav.explore}
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="business-aside">
                <div className="aside-mark">
                  <ShoppingBag size={20} />
                </div>
                <span className="section-index">{copy.business.asideLabel}</span>
                <h3>
                  {copy.business.asideTitle.split('\n').map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h3>
                <p>{copy.business.asideText}</p>
                <div className="aside-stat">
                  <span>{copy.business.daily}</span>
                  <strong>{copy.business.modules.slice(1, 4).join(' · ')}</strong>
                </div>
                <div className="aside-stat">
                  <span>{copy.business.owner}</span>
                  <strong>{copy.business.modules.slice(7, 10).join(' · ')}</strong>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="finder-section reveal-on-scroll" id="finder">
        <div className="finder-heading">
          <span className="section-index">{copy.finder.index}</span>
          <h2>
            {copy.finder.title.split('\n').map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </h2>
          <p>{copy.finder.text}</p>
        </div>
        <div className="finder-panel">
          <div className="need-options" role="list">
            {copy.finder.options.map((item, index) => (
              <button
                key={item.label}
                className={need === index ? 'selected' : ''}
                onClick={() => setNeed(index)}
              >
                <span>
                  {(() => {
                    const Icon = NEED_ICONS[index]!;
                    return <Icon size={15} />;
                  })()}
                  {item.label}
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
          <div className="need-answer" aria-live="polite">
            <span className="answer-icon">
              <Sparkles size={17} />
            </span>
            <span className="section-index">{copy.finder.hint}</span>
            <span className="finder-product-label">
              {copy.productDetails[finderSelection.product].label}
            </span>
            <h3>{finderFeature.title}</h3>
            <p>{finderFeature.description}</p>
            <div className="finder-preview-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <button
              type="button"
              className="text-link text-button"
              onClick={() => chooseProduct(finderSelection.product)}
            >
              {copy.finder.cta}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="coming-section reveal-on-scroll" id="coming-soon">
        <div>
          <span className="section-index">{copy.coming.index}</span>
          <h2>
            {copy.coming.title.split('\n').map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </h2>
          <p>{copy.coming.text}</p>
        </div>
        <div className="coming-grid">
          {copy.coming.products.map((item, index) => (
            <button
              type="button"
              className="coming-card"
              key={item.id}
              onClick={() => chooseProduct(item.id)}
            >
              <span className="coming-number">0{index + 1}</span>
              <b>{item.name}</b>
              <span
                className={
                  item.status === 'available' ? 'coming-pill available-pill' : 'coming-pill'
                }
              >
                {item.status === 'available' ? copy.coming.available : copy.coming.soon}
              </span>
              <ArrowUpRight size={14} />
            </button>
          ))}
          <div className="coming-card coming-more">
            <span className="coming-number">···</span>
            <b>{copy.coming.more}</b>
            <span className="coming-pill">{copy.coming.soon}</span>
          </div>
        </div>
        <p className="coming-footnote">{copy.coming.note}</p>
      </section>

      <section className="pricing-section reveal-on-scroll" id="pricing">
        <div className="pricing-heading">
          <span className="section-index">{copy.pricing.index}</span>
          <h2>
            {copy.pricing.title.split('\n').map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </h2>
          <p>{copy.pricing.text}</p>
        </div>
        <div className="pricing-cards">
          {copy.pricing.plans.map((plan, index) => (
            <article
              key={plan.name}
              className={`pricing-card ${index === 1 ? 'pricing-featured' : ''}`}
            >
              <div className="plan-top">
                <span>{plan.name}</span>
                {index === 1 && <span className="plan-popular">{copy.pricing.soon}</span>}
              </div>
              <p>{plan.text}</p>
              <div className="plan-price">{copy.pricing.soon}</div>
              <span className="plan-price-note">{copy.pricing.details}</span>
              <div className="plan-divider" />
              <span className="branch-note">
                <Check size={14} />
                {copy.pricing.branches}
              </span>
              <button className="plan-link" onClick={() => chooseProduct('furniture')}>
                {copy.pricing.cta}
                <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="faq-section reveal-on-scroll" id="faq">
        <div className="faq-heading">
          <span className="section-index">{copy.nav.resources.toUpperCase()}</span>
          <h2>{copy.faq.title}</h2>
        </div>
        <div className="faq-list">
          {copy.faq.items.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <span>+</span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="closing-cta reveal-on-scroll">
        <div className="cta-orb" />
        <span className="section-index">{copy.hero.eyebrow}</span>
        <h2>
          {copy.hero.title.split('\n').map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </h2>
        <p>{copy.hero.note}</p>
        <Link to={ROUTES.onboarding} className="button-primary">
          {copy.hero.start}
          <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
