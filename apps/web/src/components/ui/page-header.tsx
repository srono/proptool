export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
}

export function PageHeader({ breadcrumbs, title }: PageHeaderProps) {
  return (
    <div className="space-y-1">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-gray-2">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-gray-1">/</span>}
              {isLast || !crumb.href ? (
                <span className="text-gray-2">{crumb.label}</span>
              ) : (
                <a
                  href={crumb.href}
                  className="text-gray-2 hover:text-white transition-colors"
                >
                  {crumb.label}
                </a>
              )}
            </span>
          );
        })}
      </nav>
      <h1 className="text-lg font-display font-bold text-white">{title}</h1>
    </div>
  );
}
