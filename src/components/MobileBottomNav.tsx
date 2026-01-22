import type { LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MobileBottomNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

type MobileBottomNavProps = {
  items: MobileBottomNavItem[];
  onOpenMenu: () => void;
  menuIcon: LucideIcon;
  menuLabel?: string;
};

const itemBase =
  "group flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const itemActive = "bg-primary/10 text-primary";

export function MobileBottomNav({ items, onOpenMenu, menuIcon: MenuIcon, menuLabel = "Menu" }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:hidden"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-5 gap-2 px-3 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.slice(0, 4).map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={itemBase}
              activeClassName={itemActive}
              aria-label={it.label}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{it.label}</span>
            </NavLink>
          );
        })}

        <Button
          type="button"
          variant="ghost"
          onClick={onOpenMenu}
          className={cn(itemBase, "h-auto hover:bg-accent hover:text-accent-foreground")}
          aria-label={menuLabel}
        >
          <MenuIcon className="h-5 w-5" />
          <span className="truncate">{menuLabel}</span>
        </Button>
      </div>
    </nav>
  );
}

