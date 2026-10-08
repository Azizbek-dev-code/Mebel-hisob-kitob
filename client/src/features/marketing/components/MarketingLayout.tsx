import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { ROUTES } from '@/routes/paths';
import { PRODUCT_ORDER, type ProductId } from '../marketing-copy';
import { useMarketing } from '../marketing-context';
import { MarketingProvider } from '../marketing-provider';
import './marketing-layout.css';

type MenuId = 'products' | 'business' | 'resources' | null;

function MarketingShell() {
  const { locale, setLocale, copy, setProduct } = useMarketing();
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileBusinessOpen, setMobileBusinessOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.hash) return;
    const targetId = decodeURIComponent(location.hash.slice(1));
    let frame = 0;
    let attempts = 0;
    const scrollWhenReady = () => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      } else if (attempts++ < 90) {
        frame = window.requestAnimationFrame(scrollWhenReady);
      }
    };
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(scrollWhenReady);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [location.hash, location.pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const chooseProduct = (product: ProductId) => {
    setProduct(product);
    setOpenMenu(null);
    setMobileOpen(false);
    const target = `${ROUTES.home}#product-detail`;
    if (location.pathname === ROUTES.home) {
      navigate(target);
      window.setTimeout(
        () =>
          document
            .getElementById('product-detail')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        60,
      );
    } else {
      navigate(target);
    }
  };

  const productButton = (id: ProductId, compact = false) => {
    const detail = copy.productDetails[id];
    const title =
      id === 'personal'
        ? copy.nav.personal
        : (copy.coming.products.find((item) => item.id === id)?.name ?? detail.name);
    const isAvailable = id === 'personal' || id === 'furniture';
    return (
      <button
        key={id}
        type="button"
        className={cn('mega-product', compact && 'mega-product-compact')}
        onClick={() => chooseProduct(id)}
      >
        <span className="mega-product-icon">
          {id === 'personal' ? 'P' : id === 'furniture' ? 'F' : detail.name.charAt(0)}
        </span>
        <span className="mega-product-copy">
          <span className="mega-product-title">{title}</span>
          <span className="mega-product-description">{detail.description}</span>
        </span>
        <span
          className={cn('mega-product-status', isAvailable ? 'status-available' : 'status-soon')}
        >
          {isAvailable ? copy.coming.available : copy.coming.soon}
        </span>
        <ArrowUpRight className="mega-product-arrow" size={15} />
      </button>
    );
  };

  const localeButtons = (mobile = false) => (
    <div
      className={cn('marketing-locales', mobile && 'marketing-locales-mobile')}
      role="group"
      aria-label={copy.header.language}
    >
      {(['uz', 'ru', 'en'] as const).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={locale === item}
          onClick={() => setLocale(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );

  const navMenuButton = (id: Exclude<MenuId, null>, label: string) => (
    <button
      type="button"
      className={cn('marketing-nav-button', openMenu === id && 'is-open')}
      aria-expanded={openMenu === id}
      aria-haspopup="true"
      onMouseEnter={() => setOpenMenu(id)}
      onClick={() => setOpenMenu(id)}
    >
      {label}
      <ChevronDown size={13} />
    </button>
  );

  return (
    <div className="marketing-surface marketing-layout min-h-screen text-ink">
      <header className="marketing-header sticky top-0 z-40" onMouseLeave={() => setOpenMenu(null)}>
        <div className="marketing-header-inner mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-7">
          <Link
            to={ROUTES.home}
            className="marketing-brand"
            onClick={() => {
              setProduct('overview');
              setOpenMenu(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="brand-symbol">b</span>
            <span>
              Balancy <span className="brand-light">Space</span>
            </span>
          </Link>
          <nav className="marketing-desktop-nav" aria-label={copy.nav.products}>
            <div className="marketing-nav-item" onMouseEnter={() => setOpenMenu('products')}>
              {navMenuButton('products', copy.nav.products)}
            </div>
            <div className="marketing-nav-item" onMouseEnter={() => setOpenMenu('business')}>
              {navMenuButton('business', copy.nav.business)}
            </div>
            <Link to={`${ROUTES.home}#pricing`} onMouseEnter={() => setOpenMenu(null)}>
              {copy.nav.pricing}
            </Link>
            <div className="marketing-nav-item" onMouseEnter={() => setOpenMenu('resources')}>
              {navMenuButton('resources', copy.nav.resources)}
            </div>
          </nav>
          <div className="marketing-header-actions">
            {localeButtons()}
            <Link to={ROUTES.login} className="marketing-login">
              {copy.header.login}
            </Link>
            <Link to={ROUTES.onboarding} className="marketing-get-started">
              {copy.header.start}
              <ArrowUpRight size={14} />
            </Link>
            <button
              type="button"
              className="marketing-menu-button"
              aria-label={mobileOpen ? copy.header.close : copy.header.open}
              aria-expanded={mobileOpen}
              aria-controls="marketing-mobile-navigation"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {openMenu && (
          <div className="marketing-mega-wrap" onMouseEnter={() => setOpenMenu(openMenu)}>
            <div className="marketing-mega-menu" role="region" aria-label={copy.nav[openMenu]}>
              {openMenu === 'products' && (
                <>
                  <div className="mega-intro">
                    <span className="mega-kicker">{copy.nav.products.toUpperCase()}</span>
                    <h2>{copy.hero.selector}</h2>
                    <p>{copy.overview.text}</p>
                    <Link
                      to={`${ROUTES.home}#coming-soon`}
                      onClick={() => {
                        setProduct('overview');
                        setOpenMenu(null);
                      }}
                    >
                      {copy.nav.explore}
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="mega-group">
                    <span className="mega-group-title">{copy.nav.personal.toUpperCase()}</span>
                    {productButton('personal')}
                  </div>
                  <div className="mega-group mega-group-business">
                    <span className="mega-group-title">{copy.nav.business.toUpperCase()}</span>
                    {productButton('furniture')}
                    {productButton('restaurant', true)}
                    {productButton('smm', true)}
                    <button
                      className="mega-view-all"
                      onClick={() => {
                        setOpenMenu('business');
                      }}
                    >
                      {copy.nav.explore}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              )}
              {openMenu === 'business' && (
                <>
                  <div className="mega-intro">
                    <span className="mega-kicker">{copy.nav.business.toUpperCase()}</span>
                    <h2>{copy.coming.title.replace('\n', ' ')}</h2>
                    <p>{copy.coming.text}</p>
                    <Link to={`${ROUTES.home}#coming-soon`} onClick={() => setOpenMenu(null)}>
                      {copy.nav.coming}
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                  <div className="mega-group mega-business-list">
                    <span className="mega-group-title">
                      {copy.nav.business.toUpperCase()} · {copy.nav.furniture}
                    </span>
                    {PRODUCT_ORDER.filter((id) => id !== 'personal').map((id) =>
                      productButton(id, true),
                    )}
                  </div>
                </>
              )}
              {openMenu === 'resources' && (
                <div className="mega-resources">
                  <span className="mega-kicker">{copy.nav.resources.toUpperCase()}</span>
                  <Link to={`${ROUTES.home}#faq`} onClick={() => setOpenMenu(null)}>
                    <span>
                      <b>{copy.footer.faq}</b>
                      <small>{copy.overview.text}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </Link>
                  <Link to={`${ROUTES.home}#finder`} onClick={() => setOpenMenu(null)}>
                    <span>
                      <b>{copy.finder.title.replace('\n', ' ')}</b>
                      <small>{copy.finder.text}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {mobileOpen && (
          <nav
            id="marketing-mobile-navigation"
            className="marketing-mobile-nav"
            aria-label={copy.header.mobile}
          >
            <button
              className="mobile-accordion-trigger"
              aria-controls="mobile-products-panel"
              aria-expanded={mobileProductsOpen}
              onClick={() => setMobileProductsOpen((open) => !open)}
            >
              {copy.nav.products}
              <ChevronDown size={16} />
            </button>
            {mobileProductsOpen && (
              <div className="mobile-product-list" id="mobile-products-panel">
                {productButton('personal', true)}
                {productButton('furniture', true)}
                {productButton('restaurant', true)}
                {productButton('smm', true)}
              </div>
            )}
            <button
              className="mobile-accordion-trigger"
              aria-controls="mobile-business-panel"
              aria-expanded={mobileBusinessOpen}
              onClick={() => setMobileBusinessOpen((open) => !open)}
            >
              {copy.nav.business}
              <ChevronDown size={16} />
            </button>
            {mobileBusinessOpen && (
              <div className="mobile-product-list" id="mobile-business-panel">
                {PRODUCT_ORDER.filter((id) => id !== 'personal').map((id) =>
                  productButton(id, true),
                )}
              </div>
            )}
            <Link to={`${ROUTES.home}#pricing`} onClick={() => setMobileOpen(false)}>
              {copy.nav.pricing}
              <ArrowUpRight size={14} />
            </Link>
            <Link to={`${ROUTES.home}#faq`} onClick={() => setMobileOpen(false)}>
              {copy.nav.resources}
              <ArrowUpRight size={14} />
            </Link>
            <div className="mobile-account-actions">
              {localeButtons(true)}
              <Link to={ROUTES.login} onClick={() => setMobileOpen(false)}>
                {copy.header.login}
              </Link>
              <Link to={ROUTES.onboarding} onClick={() => setMobileOpen(false)}>
                {copy.header.start}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </nav>
        )}
      </header>

      <Outlet />

      <footer className="marketing-footer">
        <div className="marketing-footer-grid mx-auto grid max-w-7xl gap-9 px-5 py-11 sm:grid-cols-4 sm:px-7">
          <div>
            <Link to={ROUTES.home} className="marketing-brand">
              <span className="brand-symbol">b</span>
              <span>
                Balancy <span className="brand-light">Space</span>
              </span>
            </Link>
            <p>{copy.footer.tagline}</p>
          </div>
          <div>
            <p className="footer-heading">{copy.footer.explore}</p>
            <ul>
              <li>
                <button onClick={() => chooseProduct('personal')}>{copy.nav.personal}</button>
              </li>
              <li>
                <button onClick={() => chooseProduct('furniture')}>{copy.nav.furniture}</button>
              </li>
              <li>
                <Link to={`${ROUTES.home}#coming-soon`}>{copy.nav.coming}</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="footer-heading">{copy.footer.resources}</p>
            <ul>
              <li>
                <Link to={`${ROUTES.home}#faq`}>{copy.footer.faq}</Link>
              </li>
              <li>
                <Link to={`${ROUTES.home}#pricing`}>{copy.nav.pricing}</Link>
              </li>
              <li>
                <button onClick={() => chooseProduct('furniture')}>{copy.nav.business}</button>
              </li>
            </ul>
          </div>
          <div>
            <p className="footer-heading">{copy.footer.account}</p>
            <ul>
              <li>
                <Link to={ROUTES.login}>{copy.header.login}</Link>
              </li>
              <li>
                <Link to={ROUTES.onboarding}>{copy.footer.create}</Link>
              </li>
            </ul>
            {localeButtons(true)}
          </div>
        </div>
        <p className="marketing-copyright">© {new Date().getFullYear()} Balancy Space</p>
      </footer>
    </div>
  );
}

export function MarketingLayout() {
  return (
    <MarketingProvider>
      <MarketingShell />
    </MarketingProvider>
  );
}
