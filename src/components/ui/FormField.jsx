/**
 * Shared form-group + label + control, replacing the copy-pasted
 * `<div className="form-group"><label className="form-label">...</label>
 * <input className="form-input" /></div>` blocks.
 *
 * Renders an <input>, <select>, or <textarea> depending on `type`.
 * For selects, pass `options` (array of {value, label}) or plain <option>
 * children via `children`.
 *
 * Usage:
 *   <FormField label="Goal Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
 *
 *   <FormField label="Period" type="select" value={form.period} onChange={...}
 *     options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />
 *
 *   <FormField label="Notes" type="textarea" value={form.notes} onChange={...} />
 */
export default function FormField({
  label,
  type = 'text',
  error,
  options,
  children,
  className = '',
  wrapperClassName = '',
  wrapperStyle,
  ...rest
}) {
  const controlClassName = `${type === 'select' ? 'form-select' : 'form-input'} ${className}`.trim()

  let control
  if (type === 'select') {
    control = (
      <select className={controlClassName} {...rest}>
        {options
          ? options.map((opt) =>
              typeof opt === 'string' ? (
                <option key={opt} value={opt}>{opt}</option>
              ) : (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              )
            )
          : children}
      </select>
    )
  } else if (type === 'textarea') {
    control = <textarea className={controlClassName} {...rest} />
  } else {
    control = <input type={type} className={controlClassName} {...rest} />
  }

  return (
    <div className={`form-group ${wrapperClassName}`} style={wrapperStyle}>
      {label && <label className="form-label">{label}</label>}
      {control}
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
