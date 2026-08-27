import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "out/**", "node_modules/**", "src/data/**", "public/sw.js"] },
  ...coreWebVitals,
  ...typescript,
];

export default config;
