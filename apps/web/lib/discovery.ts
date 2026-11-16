/**
 * Cloud Discovery Engine for GOD REMORT
 * Resolves a 6-digit Laptop ID/PIN into its live secure tunnel URL
 * Allows any phone anywhere in the world to connect by typing just one number.
 */

export async function resolveLaptopUrl(laptopId: string): Promise<string | null> {
  const cleanId = laptopId.trim().replace(/\D/g, "");
  if (!cleanId || cleanId.length < 4) return null;

  try {
    const res = await fetch(`https://ntfy.sh/godremort_${cleanId}/json?poll=1`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.trim().split("\n");
    // Find the latest valid URL message
    for (const line of lines.reverse()) {
      try {
        const data = JSON.parse(line);
        if (data.event === "message" && typeof data.message === "string") {
          const msg = data.message.trim();
          if (msg.startsWith("https://") || msg.startsWith("http://")) {
            return msg.replace(/\/$/, "");
          }
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn("Discovery lookup failed:", err);
  }

  return null;
}

export async function publishLaptopUrl(laptopId: string, url: string): Promise<boolean> {
  const cleanId = laptopId.trim().replace(/\D/g, "");
  if (!cleanId || !url) return false;

  try {
    const cleanUrl = url.trim().replace(/\/$/, "");
    await fetch(`https://ntfy.sh/godremort_${cleanId}`, {
      method: "POST",
      body: cleanUrl,
      headers: {
        Title: "GOD REMORT Tunnel Endpoint",
        Priority: "high"
      }
    });
    return true;
  } catch (_) {
    return false;
  }
}
