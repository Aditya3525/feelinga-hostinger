'use client';
import Link from 'next/link';
import AppIcon from './AppIcon';

type EmptyStateProps = {
    icon?: string;
    iconSize?: 'md' | 'lg';
    title?: string;
    message: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    className?: string;
};

export default function EmptyState({
    icon,
    iconSize = 'md',
    title,
    message,
    actionLabel,
    actionHref,
    onAction,
    className,
}: EmptyStateProps) {
    const iconClass = iconSize === 'lg' ? 'state-emoji-xl mb-lg' : 'state-emoji';
    const actionClass = iconSize === 'lg' ? 'btn btn--primary mt-xl inline-block' : 'btn btn--primary mt-md inline-block';
    const iconPixelSize = iconSize === 'lg' ? 56 : 32;

    return (
        <div className={`state-center ${className || ''}`.trim()}>
            {icon && (
                <div className={iconClass}>
                    <AppIcon name={icon} size={iconPixelSize} aria-hidden />
                </div>
            )}
            {title && <h2>{title}</h2>}
            <p className="mt-md state-text">{message}</p>
            {actionLabel && actionHref && (
                <Link href={actionHref} className={actionClass}>{actionLabel}</Link>
            )}
            {actionLabel && onAction && !actionHref && (
                <button className={actionClass} onClick={onAction}>{actionLabel}</button>
            )}
        </div>
    );
}
