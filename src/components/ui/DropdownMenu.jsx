/**
 * Shared kebab/three-dot dropdown menu, replacing the copy-pasted
 * goal-menu-wrap / goal-menu-btn / goal-menu-backdrop / goal-menu markup
 * (currently duplicated between GoalsPage and BudgetPage).
 *
 * It's a controlled component — the caller owns the "which row's menu is
 * open" state, since these menus live inside a list of cards/rows.
 *
 * Usage:
 *   <DropdownMenu
 *     open={openMenu === goal.id}
 *     onClose={() => setOpenMenu(null)}
 *     align={menuAlign}
 *     trigger={
 *       <button type="button" className="goal-menu-btn" aria-label="Goal actions"
 *         onClick={(e) => toggleMenu(e, goal.id)}>⋮</button>
 *     }
 *   >
 *     <DropdownMenuItem onClick={() => openEdit(goal)}>Update goal</DropdownMenuItem>
 *     <DropdownMenuItem danger onClick={() => setConfirmDeleteGoal(goal)}>Delete goal</DropdownMenuItem>
 *   </DropdownMenu>
 */
export default function DropdownMenu({
  trigger,
  open,
  onClose,
  align = 'down', // 'down' | 'up'
  children,
  className = '',
}) {
  return (
    <div className="goal-menu-wrap">
      {trigger}
      {open && (
        <>
          <div className="goal-menu-backdrop" onClick={onClose} />
          <div className={`goal-menu ${align === 'up' ? 'align-up' : ''} ${className}`.trim()}>
            {children}
          </div>
        </>
      )}
    </div>
  )
}

export function DropdownMenuItem({ danger = false, className = '', children, ...rest }) {
  return (
    <button type="button" className={`${danger ? 'danger' : ''} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
