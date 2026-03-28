import React, { useEffect, useRef } from 'react'
import styles from './MiniPreview.module.css'

const STATE_COLORS = {
  0: null,                    // transparent
  1: '#93C5FD',               // blue (walkable)
  2: '#FCA5A5',               // red (overlap)
}

export default function MiniPreview({ matrix, size = 72 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!matrix || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rows = matrix.length
    const cols = matrix[0]?.length ?? 0
    if (!rows || !cols) return

    const cellSize = Math.min(Math.floor(size / Math.max(rows, cols)), 12)
    const w = cols * cellSize
    const h = rows * cellSize
    canvas.width = w
    canvas.height = h

    ctx.clearRect(0, 0, w, h)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = matrix[r][c]
        const color = STATE_COLORS[val]
        if (!color) continue
        ctx.fillStyle = color
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
        // subtle inner border
        ctx.strokeStyle = 'rgba(0,0,0,0.06)'
        ctx.lineWidth = 0.5
        ctx.strokeRect(c * cellSize + 0.25, r * cellSize + 0.25, cellSize - 0.5, cellSize - 0.5)
      }
    }
  }, [matrix, size])

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
