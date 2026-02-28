const SCRIPT_ID = "google-maps-script";

export function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      reject(new Error("Missing Google Maps API key"));
      return;
    }

    // If already loaded
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }

    // If script already exists
    let existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () =>
        resolve(window.google.maps)
      );
      existingScript.addEventListener("error", reject);
      return;
    }

    // Create script
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;

    document.head.appendChild(script);
  });
}