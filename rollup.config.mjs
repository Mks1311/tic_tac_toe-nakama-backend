import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    file: "build/index.js",
    format: "cjs",       // Nakama's goja runtime uses CommonJS-style globals
    sourcemap: false,
  },
  external: [],          // Bundle everything into one file
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
  ],
};
