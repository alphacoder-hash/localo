import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, MapPin, Mail, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-background/80 backdrop-blur-sm mt-auto">
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-24 md:py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="font-display text-lg tracking-tight">NearNow</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t("footer.description")}
            </p>
            <div className="flex gap-4 text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
              <a href="#" className="hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold tracking-tight">{t("footer.discover")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">{t("footer.browse_vendors")}</Link></li>
              <li><Link to="/orders" className="hover:text-foreground transition-colors">{t("footer.my_orders")}</Link></li>
              <li><Link to="/vendor/apply" className="hover:text-foreground transition-colors">{t("footer.become_vendor")}</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">{t("footer.about_us")}</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold tracking-tight">{t("footer.support")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-foreground transition-colors">{t("footer.help_center")}</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy_policy")}</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms_of_service")}</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">{t("footer.contact_support")}</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold tracking-tight">{t("footer.contact_us")}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <span>123 Market Street,<br/>Bengaluru, Karnataka 560038</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <a href="mailto:support@nearnow.com" className="hover:text-foreground">support@nearnow.com</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-primary" />
                <a href="tel:+919876543210" className="hover:text-foreground">+91 98765 43210</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} {t("footer.rights_reserved")}
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground font-medium">
            <Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">{t("footer.about")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
