// Browser tab and Android home-screen icon. See crown-icon.tsx.
import { crownIcon } from "./crown-icon";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return crownIcon(size.width, { rounded: true });
}
