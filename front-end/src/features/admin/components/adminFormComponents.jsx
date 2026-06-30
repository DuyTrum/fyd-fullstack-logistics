import React from 'react';

/**
 * FormField Wrapper Component
 * Handles labels, required indicators, helper text, and error states.
 */
export function FormField({ 
  label, 
  required, 
  helperText, 
  errorText, 
  status = 'default', 
  children 
}) {
  return (
    <div className={`admin-field ${status === 'error' ? 'has-error' : ''} ${status === 'success' ? 'has-success' : ''}`}>
      {label && (
        <label className="admin-field span">
          <span>
            {label} {required && <span style={{ color: 'var(--form-error)', marginLeft: 2 }}>*</span>}
          </span>
        </label>
      )}
      {children}
      {status === 'error' && errorText && (
        <span className="admin-field-error-msg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {errorText}
        </span>
      )}
      {status !== 'error' && helperText && (
        <span className="admin-field-helper">{helperText}</span>
      )}
    </div>
  );
}

/**
 * FormInput Component
 */
export function FormInput({ label, required, errorText, status, helperText, ...props }) {
  return (
    <FormField label={label} required={required} errorText={errorText} status={status} helperText={helperText}>
      <input {...props} />
    </FormField>
  );
}

/**
 * FormSelect Component
 */
export function FormSelect({ label, required, errorText, status, helperText, children, ...props }) {
  return (
    <FormField label={label} required={required} errorText={errorText} status={status} helperText={helperText}>
      <select {...props}>
        {children}
      </select>
    </FormField>
  );
}

/**
 * FormTextarea Component
 */
export function FormTextarea({ label, required, errorText, status, helperText, ...props }) {
  return (
    <FormField label={label} required={required} errorText={errorText} status={status} helperText={helperText}>
      <textarea {...props} />
    </FormField>
  );
}

/**
 * FormSwitch Component (Clean toggle switch replacing glowing sliders)
 */
export function FormSwitch({ label, checked, onChange, description, className = '' }) {
  return (
    <label className={`admin-toggle ${className}`}>
      <div className="toggle-label">
        <span className="toggle-title">{label}</span>
        {description && <span className="toggle-desc">{description}</span>}
      </div>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        className="form-switch-checkbox"
        style={{ display: 'none' }}
      />
      <div className="toggle-slider">
        <div 
          className="toggle-slider-handle" 
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 18,
            height: 18,
            background: '#fff',
            borderRadius: '50%',
            transition: 'transform 0.2s',
            transform: checked ? 'translateX(18px)' : 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        />
      </div>
    </label>
  );
}
