import type { Config } from "tailwindcss";
import sharedConfig from "@b2b/config/tailwind";

const config: Config = {
  presets: [sharedConfig],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
};

export default config;
