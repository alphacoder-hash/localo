import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Globe,
  Home,
  Info,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NavLink } from "@/components/NavLink";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PrimaryNavItem = {
  to: string;
  label: string;
  end?: boolean;
};

const navShell =
  "rounded-full border bg-background/70 px-1.5 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/55";

const navItemBase =
  "rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-[background-color,color,transform] hover:bg-accent hover:text-accent-foreground active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const navItemActive = "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground";

function PrimaryNav({ items }: { items: PrimaryNavItem[] }) {
  return (
    <nav className={cn("hidden items-center gap-1 md:flex", navShell)} aria-label="Primary">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={navItemBase}
          activeClassName={navItemActive}
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { user, roles, signOut, loading } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const searchDebounceRef = useRef<number | null>(null);

  const runTour = (storageKey: string, steps: any[], force?: boolean) => {
    try {
      if (force) {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      }
      if (sessionStorage.getItem(storageKey)) return;
    } catch {
      if (!force) return;
    }

    let driverObj: ReturnType<typeof driver>;
    driverObj = driver({
      showProgress: true,
      steps,
      onDestroyStarted: () => {
        try {
          sessionStorage.setItem(storageKey, "true");
        } catch {}
        driverObj.destroy();
      },
      nextBtnText: t("tour.next"),
      prevBtnText: t("tour.prev"),
      doneBtnText: t("tour.done"),
    });

    driverObj.drive();
  };

  const startHomeTour = (force?: boolean) => {
    const storageKey = `nearnow_tour_session_home_${user?.id ?? "guest"}`;
    const searchTarget = window.matchMedia("(min-width: 768px)").matches ? "#search-container" : "#mobile-search-input";

    runTour(
      storageKey,
      [
        {
          element: "body",
          popover: {
            title: t("tour.step1_title"),
            description: t("tour.step1_desc"),
            side: "left",
            align: "start",
          },
        },
        {
          element: "#location-alert",
          popover: {
            title: t("tour.step2_title"),
            description: t("tour.step2_desc"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: searchTarget,
          popover: {
            title: t("tour.step3_title"),
            description: t("tour.step3_desc"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#filters-container",
          popover: {
            title: t("tour.step4_title"),
            description: t("tour.step4_desc"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#vendors",
          popover: {
            title: t("tour.step5_title"),
            description: t("tour.step5_desc"),
            side: "top",
            align: "start",
          },
        },
      ],
      force,
    );
  };

  const startVendorTour = (vendorId: string, force?: boolean) => {
    const storageKey = `nearnow_tour_session_vendor_${vendorId}`;

    runTour(
      storageKey,
      [
        {
          element: "body",
          popover: {
            title: t("tour.vendor_step1_title"),
            description: t("tour.vendor_step1_desc"),
            side: "left",
            align: "start",
          },
        },
        {
          element: "#vendor-toggle-open",
          popover: {
            title: t("tour.vendor_step2_title"),
            description: t("tour.vendor_step2_desc"),
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#vendor-quick-actions",
          popover: {
            title: t("tour.vendor_step3_title"),
            description: t("tour.vendor_step3_desc"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#vendor-update-location",
          popover: {
            title: t("tour.vendor_step4_title"),
            description: t("tour.vendor_step4_desc"),
            side: "top",
            align: "start",
          },
        },
        {
          element: "#vendor-add-item",
          popover: {
            title: t("tour.vendor_step5_title"),
            description: t("tour.vendor_step5_desc"),
            side: "right",
            align: "start",
          },
        },
      ],
      force,
    );
  };

  const vendorNavQuery = useQuery({
    queryKey: ["nav_vendor", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("owner_user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
    retry: false,
  });

  const hasVendor = !!vendorNavQuery.data;
  const isAdmin = roles.has("admin");
  const vendorId = vendorNavQuery.data?.id ?? null;

  const primaryItems: PrimaryNavItem[] = [
    { to: "/", label: t("nav.discover"), end: true },
    ...(user
      ? [
          { to: hasVendor ? "/vendor/orders" : "/orders", label: t("nav.orders") },
          ...(hasVendor ? [{ to: "/vendor/dashboard", label: t("nav.vendor_dashboard") }] : []),
        ]
      : []),
    { to: "/how-it-works", label: t("nav.how_it_works") },
    { to: "/about", label: t("nav.about") },
    { to: "/contact", label: t("nav.help") },
    ...(isAdmin ? [{ to: "/admin", label: t("nav.admin") }] : []),
  ];

  const mobileBottomItems = useMemo(() => {
    if (!user) {
      return [
        { to: "/", label: t("nav.home"), icon: Home, end: true },
        { to: "/how-it-works", label: t("nav.how"), icon: Info },
        { to: "/contact", label: t("nav.help"), icon: LifeBuoy },
        { to: "/auth", label: t("nav.login"), icon: ShieldCheck },
      ];
    }

    if (hasVendor) {
      return [
        { to: "/", label: t("nav.home"), icon: Home, end: true },
        { to: "/vendor/orders", label: t("nav.orders"), icon: Package },
        { to: "/vendor/dashboard", label: t("nav.dash"), icon: LayoutDashboard },
        { to: "/profile", label: t("nav.you"), icon: UserRound },
      ];
    }

    return [
      { to: "/", label: t("nav.home"), icon: Home, end: true },
      { to: "/orders", label: t("nav.orders"), icon: Package },
      { to: "/contact", label: t("nav.help"), icon: LifeBuoy },
      { to: "/profile", label: t("nav.you"), icon: UserRound },
    ];
  }, [hasVendor, user, t]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const params = new URLSearchParams(location.search);
    const q = params.get("q") ?? "";
    setMobileSearch((prev) => (prev === q ? prev : q));
  }, [location.search]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const params = new URLSearchParams(location.search);
    if (params.get("tour") !== "1") return;
    try {
      localStorage.removeItem("nearnow_tour_seen");
      sessionStorage.removeItem(`nearnow_tour_session_home_${user?.id ?? "guest"}`);
    } catch {}
    params.delete("tour");
    const next = params.toString();
    navigate(next ? `/?${next}` : "/", { replace: true });
  }, [location.pathname, location.search, navigate, user?.id]);

  useEffect(() => {
    if (loading) return;

    if (location.pathname === "/") {
      const searchTarget = window.matchMedia("(min-width: 768px)").matches ? "#search-container" : "#mobile-search-input";
      const required = ["#location-alert", "#filters-container", "#vendors", searchTarget];

      let seen = false;
      try {
        seen = !!sessionStorage.getItem(`nearnow_tour_session_home_${user?.id ?? "guest"}`);
      } catch {
        seen = true;
      }
      if (seen) return;

      let attempts = 0;
      const tick = () => {
        attempts += 1;
        const ready = required.every((sel) => !!document.querySelector(sel));
        if (ready) {
          startHomeTour();
          return;
        }
        if (attempts < 20) window.setTimeout(tick, 250);
      };

      window.setTimeout(tick, 300);
      return;
    }

    if (location.pathname === "/vendor/dashboard" && vendorId) {
      let seen = false;
      try {
        seen = !!sessionStorage.getItem(`nearnow_tour_session_vendor_${vendorId}`);
      } catch {
        seen = true;
      }
      if (seen) return;

      const required = ["#vendor-toggle-open", "#vendor-quick-actions", "#vendor-update-location", "#vendor-add-item"]; 

      let attempts = 0;
      const tick = () => {
        attempts += 1;
        const ready = required.every((sel) => !!document.querySelector(sel));
        if (ready) {
          startVendorTour(vendorId);
          return;
        }
        if (attempts < 20) window.setTimeout(tick, 250);
      };
      window.setTimeout(tick, 300);
    }
  }, [loading, location.pathname, user?.id, vendorId, t]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = window.setTimeout(() => {
      const q = mobileSearch.trim();
      const params = new URLSearchParams(location.search);
      const currentQ = params.get("q") ?? "";

      if (q === currentQ) return;

      if (q) navigate(`/?q=${encodeURIComponent(q)}`, { replace: true });
      else navigate("/", { replace: true });
    }, 250);

    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [location.pathname, mobileSearch, navigate]);

  return (
    <div className="min-h-screen bg-hero">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-2">
          <div className="flex h-12 items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="font-display text-lg tracking-tight">NearNow</span>
            </Link>

            <PrimaryNav items={primaryItems} />

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" id="lang-switch">
                    <Globe className="h-4 w-4" />
                    <span className="sr-only">Switch language</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => i18n.changeLanguage("en")}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => i18n.changeLanguage("hi")}>हिंदी (Hindi)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (location.pathname === "/vendor/dashboard" && vendorId) startVendorTour(vendorId, true);
                      else startHomeTour(true);
                    }}
                  >
                    {t("tour.start")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent side="right" className="w-[320px]">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-display text-lg leading-tight">NearNow</p>
                    <p className="text-sm text-muted-foreground">{t("nav.menu")}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-2">
                  {primaryItems.map((it) => (
                    <SheetClose asChild key={it.to}>
                      <NavLink
                        to={it.to}
                        end={it.end}
                        className="rounded-xl border bg-card px-4 py-3 text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
                        activeClassName="border-primary/30 bg-primary/10"
                      >
                        {it.label}
                      </NavLink>
                    </SheetClose>
                  ))}
                </div>

                <div className="mt-6 grid gap-2">
                  {user ? (
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="justify-start">
                        <Link to="/profile">
                          <UserRound className="h-4 w-4" /> {t("nav.profile")}
                        </Link>
                      </Button>
                    </SheetClose>
                  ) : null}

                  {user ? (
                    <SheetClose asChild>
                      <Button
                        variant="hero"
                        className="justify-start"
                        onClick={async () => {
                          await signOut();
                          navigate("/");
                        }}
                      >
                        <LogOut className="h-4 w-4" /> {t("nav.logout")}
                      </Button>
                    </SheetClose>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <Button asChild variant="hero" className="justify-start">
                          <Link to="/auth">
                            <ShieldCheck className="h-4 w-4" /> {t("nav.login")}
                          </Link>
                        </Button>
                      </SheetClose>
                    </>
                  )}
                </div>
              </SheetContent>
              </Sheet>

              {user ? (
                <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                  <Link to="/profile">
                    <UserRound className="h-4 w-4" /> {t("nav.profile")}
                  </Link>
                </Button>
              ) : null}

              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="hidden md:inline-flex"
                >
                  <LogOut className="h-4 w-4" /> {t("nav.logout")}
                </Button>
              ) : (
                <>
                  <Button asChild variant="hero" size="sm" className="hidden md:inline-flex">
                    <Link to="/auth">
                      <ShieldCheck className="h-4 w-4" /> {t("nav.login")}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          <form
            className="mt-2 md:hidden"
            onSubmit={(e) => {
              e.preventDefault();
              const q = mobileSearch.trim();
              navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                type="search"
                enterKeyHint="search"
                placeholder={t("nav.search_placeholder")}
                className="h-11 rounded-full bg-card pl-10"
                aria-label="Search vendors"
                id="mobile-search-input"
              />
            </div>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 pb-24 md:pb-10">
        <Outlet />
      </main>

      <Footer />

      <MobileBottomNav items={mobileBottomItems} onOpenMenu={() => setMobileMenuOpen(true)} menuIcon={Menu} menuLabel={t("nav.menu")} />
    </div>
  );
}
