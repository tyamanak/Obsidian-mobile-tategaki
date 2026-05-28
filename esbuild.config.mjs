import esbuild from "esbuild";
import process from "node:process";

const isProduction = process.argv.includes("production");

const context = await esbuild.context({
  banner: {
    js: "/* Mobile Vertical Reader for Obsidian */",
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  platform: "browser",
  target: "es2022",
  logLevel: "info",
  sourcemap: isProduction ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: isProduction,
});

if (isProduction) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
