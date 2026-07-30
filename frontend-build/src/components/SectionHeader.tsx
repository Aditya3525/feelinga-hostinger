'use client';

type SectionHeaderProps = {
    overline?: string;
    title: string;
    description?: string;
    className?: string;
};

export default function SectionHeader({ overline, title, description, className }: SectionHeaderProps) {
    return (
        <div className={`section-header ${className || ''}`.trim()}>
            {overline && <p className="overline">{overline}</p>}
            <h2>{title}</h2>
            {description && <p>{description}</p>}
        </div>
    );
}
