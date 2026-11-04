import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

// Native-only chrome; in the browser these are no-ops.

/** The splash stays up (launchAutoHide: false) until the first render. */
export function hideSplash() {
  if (!Capacitor.isNativePlatform()) return;
  SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
}

/** Light status-bar text on the dark theme, dark text on the light one. */
export function setStatusBarDark(dark: boolean) {
  if (!Capacitor.isNativePlatform()) return;
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
}
