/**
 * Place the live notification panel in viewport coordinates, not relative to
 * the bell's narrow header cell. This avoids negative left positions on phones,
 * and remains safe if the shell/header uses transforms or overflow clipping.
 */
export interface NotificationRect { left: number; right: number; top: number; bottom: number }
export interface NotificationViewport {
  width: number
  height: number
  offsetLeft?: number
  offsetTop?: number
}

export interface NotificationPanelBounds {
  left: number
  top: number
  width: number
  maxHeight: number
}

export function notificationPanelBounds(
  trigger: NotificationRect,
  viewport: NotificationViewport,
): NotificationPanelBounds {
  const gutter = 12
  const ox = viewport.offsetLeft ?? 0
  const oy = viewport.offsetTop ?? 0
  const width = Math.max(0, Math.min(360, viewport.width - gutter * 2))
  const left = viewport.width <= 640
    ? ox + gutter
    : Math.max(ox + gutter, Math.min(trigger.right - width, ox + viewport.width - gutter - width))

  const spaceBelow = Math.max(0, oy + viewport.height - trigger.bottom - gutter - 8)
  const spaceAbove = Math.max(0, trigger.top - oy - gutter - 8)
  const above = spaceBelow < 220 && spaceAbove > spaceBelow
  const maxHeight = Math.min(520, above ? spaceAbove : spaceBelow)
  const top = above ? Math.max(oy + gutter, trigger.top - 8 - maxHeight) : trigger.bottom + 8

  return { left, top, width, maxHeight }
}
