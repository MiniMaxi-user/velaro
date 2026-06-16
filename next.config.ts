import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Foto-uploads lopen via een Server Action; de standaardlimiet van 1 MB gaf
    // een foutmelding bij grotere foto's (#124). De foto wordt vóór upload tot
    // 250px bijgesneden, maar we geven ruimte tot 5 MB zodat het uploaden van een
    // grote bronfoto nooit op de body-limiet stuk loopt.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
