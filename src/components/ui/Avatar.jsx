/**
 * Shared user avatar: image if `url` is given, otherwise initials on a
 * green gradient. Replaces the copy-pasted `.avatar` / `.avatar-lg` divs —
 * including Wallet's hardcoded "D" placeholder, which should pass real
 * user data (name/url) once migrated.
 *
 * By default initials are the first letter of `name`. Pass `initials`
 * explicitly to override (e.g. Settings computes first+last initials).
 *
 * Usage:
 *   <Avatar name={name} />                       // topbar avatar, 44px
 *   <Avatar name={name} url={avatarUrl} size="lg" /> // settings, 52px
 *   <Avatar initials="JD" url={avatarUrl} size="lg" /> // explicit initials
 */
export default function Avatar({ name, url, initials, size = 'md', className = '' }) {
  const resolvedInitials = initials || name?.trim()?.[0]?.toUpperCase() || '?'
  const sizeClass = size === 'lg' ? 'avatar-lg' : 'avatar'

  return (
    <div
      className={`${sizeClass} ${className}`.trim()}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    >
      {!url && resolvedInitials}
    </div>
  )
}
