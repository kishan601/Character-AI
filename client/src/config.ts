export const getApiBaseUrl = () => {
  // If running in browser and a host is configured, use it
  const host = localStorage.getItem("aegis_api_host");
  if (host) {
    // ensure no trailing slash
    const cleanHost = host.replace(/\/$/, "");
    return `${cleanHost}/api`;
  }
  // Fallback to your PC's local network IP for the Capacitor Android app
  return "http://192.168.29.240:3001/api";
};

export const getUploadsBaseUrl = () => {
  const host = localStorage.getItem("aegis_api_host");
  if (host) {
    const cleanHost = host.replace(/\/$/, "");
    return `${cleanHost}/uploads`;
  }
  return "http://192.168.29.240:3001/uploads";
};
