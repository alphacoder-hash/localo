import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-2xl border bg-card p-8 text-left shadow-elevated">
          <p className="text-sm font-medium text-muted-foreground">Not found</p>
          <h1 className="mt-2 font-display text-4xl leading-tight">
            This page doesn’t exist.
          </h1>
          <p className="mt-3 text-muted-foreground">
            You tried to open <span className="font-medium text-foreground">{location.pathname}</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm ring-offset-background transition-[transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px"
            >
              Go to Home
            </Link>
            <Link
              to="/vendor/apply"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-semibold ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Become a vendor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
