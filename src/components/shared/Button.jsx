import React from 'react'
import styles from './Button.module.css'

export default function Button({
  children,
  variant = 'primary',  // primary | secondary | ghost | danger
  size = 'md',          // sm | md | lg
  disabled = false,
  icon = null,
  fullWidth = false,
  onClick,
  title,
  type = 'button',
}) {
  return (
    <button
      type={type}
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        disabled ? styles.disabled : '',
      ].join(' ')}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  )
}
