// Shared settings for Lucide icons, so every icon has the same chunky stroke as the borders.
// Usage: <ArrowRight {...icon} />  or  <Check {...iconSized(18)} />
// `aria-hidden` because icons sit next to words that already say what they mean.
export const iconSized = (size, strokeWidth = 2.5) => ({ size, strokeWidth, 'aria-hidden': true });
export const icon = iconSized(22);
