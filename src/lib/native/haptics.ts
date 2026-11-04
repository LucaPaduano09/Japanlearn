import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Haptics are a nicety: browsers without vibration (e.g. iOS Safari) just stay silent.

/** Light tap for an accepted stroke. */
export function tapOk() {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/** Warning buzz for a rejected stroke. */
export function buzzMiss() {
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}

/** Success pattern when a character is finished. */
export function buzzDone() {
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}
