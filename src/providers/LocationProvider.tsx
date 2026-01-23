import { createContext, useContext, useRef, useState, ReactNode, useCallback } from "react";

type GeoPoint = { lat: number; lng: number };

type LocationContextType = {
  coords: GeoPoint | null;
  setCoords: (coords: GeoPoint | null) => void;
  isLocating: boolean;
  geoError: string | null;
  setGeoError: (error: string | null) => void;
  requestLocation: () => void;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const fetchApproxLocation = async (): Promise<GeoPoint | null> => {
  const fetchWithTimeout = async (url: string) => {
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      return (await res.json()) as any;
    } catch {
      return null;
    } finally {
      window.clearTimeout(t);
    }
  };

  const who = await fetchWithTimeout("https://ipwho.is/");
  if (who?.success !== false) {
    const lat = Number(who?.latitude);
    const lng = Number(who?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const ipapi = await fetchWithTimeout("https://ipapi.co/json/");
  if (ipapi) {
    const lat = Number(ipapi?.latitude);
    const lng = Number(ipapi?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const geoDb = await fetchWithTimeout("https://geolocation-db.com/json/");
  if (geoDb) {
    const lat = Number(geoDb?.latitude);
    const lng = Number(geoDb?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [coords, setCoords] = useState<GeoPoint | null>(() => {
    try {
      const raw = localStorage.getItem("last_coords");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      const lat = Number(parsed?.lat);
      const lng = Number(parsed?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    } catch {
      return null;
    }
  });
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const requestLocation = useCallback(() => {
    if (watchIdRef.current != null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
      }
      watchIdRef.current = null;
    }

    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    setGeoError(null);
    setIsLocating(true);

    if (!navigator.geolocation) {
      setGeoError("Location not supported on this device.");
      setIsLocating(false);
      return;
    }

    if (!window.isSecureContext) {
      fetchApproxLocation()
        .then((approx) => {
          if (approx) {
            setCoords(approx);
            try {
              localStorage.setItem("last_coords", JSON.stringify(approx));
            } catch {}
            setGeoError(null);
          } else {
            setGeoError("Location requires HTTPS (or localhost). Open the site on https:// or http://localhost.");
          }
          setIsLocating(false);
        })
        .catch(() => {
          setGeoError("Location detection failed.");
          setIsLocating(false);
        });
      return;
    }

    try {
      const onSuccess = (pos: GeolocationPosition) => {
        const lat = pos.coords?.latitude ?? 0;
        const lng = pos.coords?.longitude ?? 0;
        const next = { lat, lng };
        setCoords(next);
        try {
          localStorage.setItem("last_coords", JSON.stringify(next));
        } catch {}
        setGeoError(null);
        setIsLocating(false);
      };

      const stopWatching = () => {
        if (watchIdRef.current != null) {
          try {
            navigator.geolocation.clearWatch(watchIdRef.current);
          } catch {}
          watchIdRef.current = null;
        }
        if (stopTimerRef.current != null) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        setIsLocating(false);
      };

      const onError = async (err: GeolocationPositionError) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location permission denied. Enable it in your browser/site settings.");
          stopWatching();
          return;
        }

        if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError("Location unavailable. Turn on GPS/location services and try again.");
          stopWatching();
          return;
        }

        if (err.code === err.TIMEOUT) {
          try {
            const approx = await fetchApproxLocation();
            if (approx) {
              setCoords(approx);
              try {
                localStorage.setItem("last_coords", JSON.stringify(approx));
              } catch {}
              setGeoError(null);
            } else {
              setGeoError("Timed out getting your location. Try again or move to an open area.");
            }
          } catch {
             setGeoError("Timed out getting your location. Try again or move to an open area.");
          }
          stopWatching();
          return;
        }

        setGeoError("Couldn’t access your location. You can still browse with the default city.");
        stopWatching();
      };

      if (navigator.geolocation.watchPosition) {
        watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });

        stopTimerRef.current = window.setTimeout(() => {
          stopWatching();
        }, 15000);
      } else {
        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });
        setIsLocating(false);
      }
    } catch {
      setGeoError("Location is blocked by the browser. Use HTTPS or open on localhost.");
      setIsLocating(false);
    }
  }, []);

  return (
    <LocationContext.Provider value={{ coords, setCoords, isLocating, geoError, setGeoError, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useGeoLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useGeoLocation must be used within a LocationProvider");
  }
  return context;
};
