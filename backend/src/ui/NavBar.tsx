import { Icon, Logo, type IconName } from './bits';

const TABS: { id: string; label: string; icon: IconName }[] = [
    { id: 'store', label: 'Store', icon: 'store' },
    { id: 'catalog', label: 'Catalog', icon: 'catalog' },
    { id: 'wishlist', label: 'Wishlist', icon: 'wishlist' },
    { id: 'accounts', label: 'Accounts', icon: 'accounts' },
];

/**
 * A floating pill on small screens (the current tab is a filled bone pill with its name, the others
 * icons only), a side rail with every name on wide ones.
 */
export const NavBar = ({ current, user, onSelect }: { current: string; user: string; onSelect: (id: string) => void }) => (
    <nav className="navbar" aria-label="Sections">
        <div className="rail-brand">
            <Logo size={40} />
            <span className="name">Recon</span>
        </div>
        {TABS.map((t) => (
            <button key={t.id} aria-current={t.id === current ? 'page' : undefined} aria-label={t.label} onClick={() => onSelect(t.id)}>
                <Icon name={t.icon} />
                <span>{t.label}</span>
            </button>
        ))}
        <p className="rail-user label">{user}</p>
    </nav>
);
