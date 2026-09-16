export const getApiBaseUrl = () => {
  // If running in browser and a host is configured, use it
  const host = localStorage.getItem("aegis_api_host");
  if (host) {
    // ensure no trailing slash
    const cleanHost = host.replace(/\/$/, "");
    return `${cleanHost}/api`;
  }
  // Fallback for development (Vite dev server)
  return "/api";
};

export const getUploadsBaseUrl = () => {
  const host = localStorage.getItem("aegis_api_host");
  if (host) {
    const cleanHost = host.replace(/\/$/, "");
    return `${cleanHost}/uploads`;
  }
  return "/uploads";
};
