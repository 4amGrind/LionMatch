// iPhone home-screen icon. See crown-icon.tsx.
import { crownIcon } from "./crown-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return crownIcon(size.width, { rounded: false });
}
