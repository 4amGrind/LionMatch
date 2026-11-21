// Render settings for the LionMatch film. See README.md for the commands.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(96);
Config.setCodec("h264");
Config.setCrf(14);
Config.setPixelFormat("yuv420p");
Config.setX264Preset("slow");
Config.setChromiumOpenGlRenderer("angle");
Config.setConcurrency(8);
Config.setEntryPoint("src/index.ts");
