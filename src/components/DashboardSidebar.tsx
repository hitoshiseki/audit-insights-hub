import { ScrollArea } from "@/components/ui/scroll-area";
import clsx from "clsx";

interface DashboardSidebarProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryClick: (category: string) => void;
}

export function DashboardSidebar({
  categories,
  activeCategory,
  onCategoryClick,
}: DashboardSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
      <div className="p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categorias
        </h2>
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <nav className="flex flex-col gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryClick(cat)}
                className={clsx(
                  "rounded-md px-3 py-2 text-left text-sm transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
}
