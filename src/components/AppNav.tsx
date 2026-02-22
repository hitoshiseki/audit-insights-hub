import { createContext, useContext, useState, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, Stethoscope, X, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import clsx from "clsx";

// ─── Context ────────────────────────────────────────────────────────────────

interface AppNavContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

const AppNavContext = createContext<AppNavContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
  isCollapsed: false,
  toggleCollapsed: () => {},
});

export function useAppNav() {
  return useContext(AppNavContext);
}

// ─── Nav items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Auditoria ROPS", href: "/", icon: BarChart3 },
  { label: "Auditoria Clínica", href: "/clinical", icon: Stethoscope },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

function Sidebar({ onClose, isCollapsed = false, onToggleCollapsed }: SidebarProps) {
  const location = useLocation();

  function isActive(href: string) {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  }

  return (
    <div className="flex h-full w-full flex-col bg-card border-r border-border overflow-hidden">
      {/* Logo row */}
      <div className="flex h-[57px] shrink-0 items-center border-b border-border px-3">
        <div
          className={clsx(
            "flex min-w-0 items-center gap-2",
            isCollapsed && "w-full justify-center"
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          {!isCollapsed && (
            <span className="truncate text-sm font-bold text-foreground">
              Auditoria
            </span>
          )}
        </div>
        {/* Close button – mobile drawer only */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 shrink-0 lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation items */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {!isCollapsed && (
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Módulos
          </p>
        )}

        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          const linkEl = (
            <NavLink
              to={href}
              end={href === "/"}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors",
                isCollapsed && "justify-center",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={href} delayDuration={0}>
                <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={href}>{linkEl}</div>;
        })}
      </nav>

      {/* Collapse toggle – desktop only */}
      {onToggleCollapsed && (
        <div className="border-t border-border p-2">
          <button
            onClick={onToggleCollapsed}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("nav-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close = useCallback(() => setIsOpen(false), []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("nav-collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Swipe right from left edge → open mobile drawer
  // Swipe left anywhere → close mobile drawer
  const handleSwipeRight = useCallback(() => setIsOpen(true), []);
  const handleSwipeLeft = useCallback(() => setIsOpen(false), []);
  const { onTouchStart, onTouchEnd } = useSwipeGesture(
    handleSwipeRight,
    handleSwipeLeft
  );

  return (
    <AppNavContext.Provider value={{ isOpen, toggle, close, isCollapsed, toggleCollapsed }}>
      <div className="flex min-h-screen">
        {/* Desktop sidebar – width animates on collapse */}
        <aside
          className={clsx(
            "hidden lg:flex h-screen shrink-0 sticky top-0 flex-col",
            "transition-[width] duration-200 ease-in-out",
            isCollapsed ? "w-14" : "w-56"
          )}
        >
          <Sidebar isCollapsed={isCollapsed} onToggleCollapsed={toggleCollapsed} />
        </aside>

        {/* Mobile overlay drawer */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={close}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-56 lg:hidden">
              <Sidebar onClose={close} />
            </div>
          </>
        )}

        {/* Page content – receives swipe events for gesture support */}
        <div
          className="flex-1 min-w-0"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {children}
        </div>
      </div>
    </AppNavContext.Provider>
  );
}

// ─── Hamburger button (used inside page headers on mobile) ────────────────────

export function NavMenuButton() {
  const { toggle } = useAppNav();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 lg:hidden"
      onClick={toggle}
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
