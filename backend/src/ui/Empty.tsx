import type { ReactNode } from 'react';
import { Icon, type IconName } from './bits';

/** What a screen shows when there is nothing yet: centered, with a way out, never a blank area. */
export function EmptyState({ icon, title, text, children }: { icon?: IconName; title: string; text: string; children?: ReactNode }) {
    return (
        <section className="emptystate dashed">
            {icon && (
                <span className="emptyicon">
                    <Icon name={icon} size={24} />
                </span>
            )}
            <h2 className="name">{title}</h2>
            <p className="body mute">{text}</p>
            {children}
        </section>
    );
}
