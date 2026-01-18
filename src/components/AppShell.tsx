import { Link, NavLink, Outlet } from "react-router-dom";
import { MapPin, ShieldCheck, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navLinkBase =
  "rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function AppShell() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <MapPin className="h-4 w-4" />
            </span>
            <span className="font-display text-lg tracking-tight">NearNow</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(navLinkBase, isActive && "bg-accent text-accent-foreground")
              }
            >
              Discover
            </NavLink>
            <NavLink
              to="/vendor/apply"
              className={({ isActive }) =>
                cn(navLinkBase, isActive && "bg-accent text-accent-foreground")
              }
            >
              Become a vendor
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(navLinkBase, isActive && "bg-accent text-accent-foreground")
              }
            >
              Admin
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="soft" size="sm" className="hidden sm:inline-flex">
              <Link to="/vendor/dashboard">
                <Store className="h-4 w-4" /> Vendor
              </Link>
            </Button>
            <Button asChild variant="hero" size="sm">
              <Link to="/auth">
                <ShieldCheck className="h-4 w-4" /> Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <Outlet />
      </main>

      <footer className="border-t bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NearNow Vendors. Built for local discovery.
          </p>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            <a className={navLinkBase} href="#">
              Terms
            </a>
            <a className={navLinkBase} href="#">
              Privacy
            </a>
            <a className={navLinkBase} href="#">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
