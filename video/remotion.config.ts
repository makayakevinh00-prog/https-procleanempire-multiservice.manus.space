/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig(enableTailwind);

// Reuse the website's assets (logo, photos, videos) instead of duplicating them
// here, so `staticFile("media/...")` resolves to `public/media/...` of the
// Next.js app. Node.JS render APIs must pass `publicDir` explicitly.
Config.setPublicDir("../public");
