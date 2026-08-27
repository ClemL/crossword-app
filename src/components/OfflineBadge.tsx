"use client";

import { useEffect, useState } from "react";

/** Tells the player the app is still fully usable with no connection. */
export function OfflineBadge() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;
  return <div className="offline-badge">Offline — puzzles and stats still work</div>;
}
