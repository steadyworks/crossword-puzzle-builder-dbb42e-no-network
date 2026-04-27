'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { gsap } from 'gsap'

// ── Types ────────────────────────────────────────────────────────────────────

interface CellState {
  isBlack: boolean
  acrossLetter: string   // set when typing in Across direction
  downLetter: string     // set when typing in Down direction
  solverLetter: string   // solver's input in Solve mode
}

interface PuzzleState {
  rows: number
  cols: number
  cells: Record<string, CellState>
  cluesAcross: Record<number, string>
  cluesDown: Record<number, string>
  mode: 'build' | 'solve'
  symmetry: boolean
}

interface WordInfo {
  number: number
  direction: 'across' | 'down'
  startRow: number
  startCol: number
  cells: Array<{ row: number; col: number }>
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ck(row: number, col: number) { return `${row}-${col}` }

function defaultCell(): CellState {
  return { isBlack: false, acrossLetter: '', downLetter: '', solverLetter: '' }
}

function makeCells(rows: number, cols: number, prev?: Record<string, CellState>): Record<string, CellState> {
  const cells: Record<string, CellState> = {}
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells[ck(r, c)] = prev?.[ck(r, c)] ?? defaultCell()
  return cells
}

function cellLetter(cell: CellState): string {
  return cell.acrossLetter || cell.downLetter
}

function isEmpty(cell: CellState): boolean {
  return !cell.acrossLetter && !cell.downLetter
}

function computeNumbers(rows: number, cols: number, cells: Record<string, CellState>): Map<string, number> {
  const nums = new Map<string, number>()
  let n = 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[ck(r, c)]
      if (!cell || cell.isBlack) continue
      const leftBlack  = c === 0 || (cells[ck(r, c - 1)]?.isBlack ?? true)
      const rightWhite = c + 1 < cols && !cells[ck(r, c + 1)]?.isBlack
      const topBlack   = r === 0 || (cells[ck(r - 1, c)]?.isBlack ?? true)
      const botWhite   = r + 1 < rows && !cells[ck(r + 1, c)]?.isBlack
      if ((leftBlack && rightWhite) || (topBlack && botWhite)) nums.set(ck(r, c), n++)
    }
  }
  return nums
}

function computeWords(
  rows: number, cols: number,
  cells: Record<string, CellState>,
  numbers: Map<string, number>
): WordInfo[] {
  const words: WordInfo[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = ck(r, c)
      const num = numbers.get(key)
      if (num == null) continue
      const cell = cells[key]
      if (!cell || cell.isBlack) continue

      // Across
      if ((c === 0 || cells[ck(r, c - 1)]?.isBlack) &&
          c + 1 < cols && !cells[ck(r, c + 1)]?.isBlack) {
        const wc: { row: number; col: number }[] = []
        for (let cc = c; cc < cols && !cells[ck(r, cc)]?.isBlack; cc++) wc.push({ row: r, col: cc })
        words.push({ number: num, direction: 'across', startRow: r, startCol: c, cells: wc })
      }

      // Down
      if ((r === 0 || cells[ck(r - 1, c)]?.isBlack) &&
          r + 1 < rows && !cells[ck(r + 1, c)]?.isBlack) {
        const wc: { row: number; col: number }[] = []
        for (let rr = r; rr < rows && !cells[ck(rr, c)]?.isBlack; rr++) wc.push({ row: rr, col: c })
        words.push({ number: num, direction: 'down', startRow: r, startCol: c, cells: wc })
      }
    }
  }
  return words
}

function computeConflicts(cells: Record<string, CellState>): Set<string> {
  const s = new Set<string>()
  for (const [key, cell] of Object.entries(cells))
    if (cell.acrossLetter && cell.downLetter && cell.acrossLetter !== cell.downLetter)
      s.add(key)
  return s
}

const STORAGE_KEY = 'crossword-puzzle-state'

function loadState(): PuzzleState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PuzzleState) : null
  } catch { return null }
}

function freshState(): PuzzleState {
  return { rows: 10, cols: 10, cells: makeCells(10, 10), cluesAcross: {}, cluesDown: {}, mode: 'build', symmetry: true }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CrosswordApp() {
  const [state, setState] = useState<PuzzleState>(() => loadState() ?? freshState())
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null)
  const [direction, setDirection] = useState<'across' | 'down'>('across')
  const [selectedWord, setSelectedWord] = useState<WordInfo | null>(null)
  const [checked, setChecked] = useState<{ correct: Set<string>; incorrect: Set<string> } | null>(null)
  const [complete, setComplete] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)

  const numbers  = computeNumbers(state.rows, state.cols, state.cells)
  const words    = computeWords(state.rows, state.cols, state.cells, numbers)
  const conflicts = computeConflicts(state.cells)

  // Persist on every state change
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }, [state])

  // Animate completion banner
  useEffect(() => {
    if (complete && bannerRef.current)
      gsap.fromTo(bannerRef.current, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' })
  }, [complete])

  // ── Cell click ──────────────────────────────────────────────────────────────
  const handleCellClick = useCallback((row: number, col: number) => {
    const cell = state.cells[ck(row, col)]
    if (!cell) return

    if (state.mode === 'build') {
      if (cell.isBlack) {
        // Black → white
        setState(prev => {
          const nc = { ...prev.cells }
          nc[ck(row, col)] = { ...nc[ck(row, col)], isBlack: false }
          return { ...prev, cells: nc }
        })
        setActiveCell(null)
      } else if (isEmpty(cell)) {
        // Empty white → black (with symmetry)
        setState(prev => {
          const nc = { ...prev.cells }
          nc[ck(row, col)] = { ...nc[ck(row, col)], isBlack: true }
          if (prev.symmetry) {
            const sr = prev.rows - 1 - row, sc = prev.cols - 1 - col
            const sk = ck(sr, sc)
            if (sk !== ck(row, col) && nc[sk]) nc[sk] = { ...nc[sk], isBlack: true }
          }
          return { ...prev, cells: nc }
        })
        setActiveCell({ row, col })
      } else {
        // Non-empty white → focus for editing
        if (activeCell?.row === row && activeCell?.col === col) {
          setDirection(d => d === 'across' ? 'down' : 'across')
        } else {
          setActiveCell({ row, col })
        }
      }
    } else {
      // Solve mode: focus only
      if (!cell.isBlack) {
        if (activeCell?.row === row && activeCell?.col === col) {
          setDirection(d => d === 'across' ? 'down' : 'across')
        } else {
          setActiveCell({ row, col })
          const word = words.find(w => w.direction === direction && w.cells.some(c => c.row === row && c.col === col))
            || words.find(w => w.cells.some(c => c.row === row && c.col === col))
          setSelectedWord(word ?? null)
        }
      }
    }
  }, [state, activeCell, direction, words])

  // ── Clue click in Solve mode ─────────────────────────────────────────────
  const handleClueClick = useCallback((word: WordInfo) => {
    if (state.mode !== 'solve') return
    setSelectedWord(word)
    setDirection(word.direction)
    setActiveCell({ row: word.startRow, col: word.startCol })
  }, [state.mode])

  // ── Check ───────────────────────────────────────────────────────────────────
  const handleCheck = useCallback(() => {
    const correct = new Set<string>()
    const incorrect = new Set<string>()
    let allDone = true

    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const key = ck(r, c)
        const cell = state.cells[key]
        if (!cell || cell.isBlack) continue
        const answer = cell.acrossLetter || cell.downLetter
        if (!answer) continue  // builder never set a letter here
        if (!cell.solverLetter) { allDone = false; continue }
        if (cell.solverLetter === answer) correct.add(key)
        else { incorrect.add(key); allDone = false }
      }
    }

    // Also check cells that need a builder answer but aren't filled
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const key = ck(r, c)
        const cell = state.cells[key]
        if (!cell || cell.isBlack) continue
        const answer = cell.acrossLetter || cell.downLetter
        if (!answer) { allDone = false; break }
      }
      if (!allDone) break
    }

    setChecked({ correct, incorrect })
    setComplete(allDone && correct.size > 0)
  }, [state])

  // ── Reveal ──────────────────────────────────────────────────────────────────
  const handleReveal = useCallback(() => {
    if (!selectedWord) return
    setState(prev => {
      const nc = { ...prev.cells }
      for (const { row, col } of selectedWord.cells) {
        const key = ck(row, col)
        const cell = nc[key]
        const answer = selectedWord.direction === 'across' ? cell.acrossLetter : cell.downLetter
        nc[key] = { ...nc[key], solverLetter: answer || cell.acrossLetter || cell.downLetter }
      }
      return { ...prev, cells: nc }
    })
    setChecked(null)
    setComplete(false)
  }, [selectedWord])

  // ── Clear ───────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState(freshState())
    setActiveCell(null)
    setDirection('across')
    setSelectedWord(null)
    setChecked(null)
    setComplete(false)
  }, [])

  // ── Mode switch ─────────────────────────────────────────────────────────────
  const handleMode = useCallback((m: 'build' | 'solve') => {
    setState(prev => ({ ...prev, mode: m }))
    setActiveCell(null)
    setSelectedWord(null)
    setChecked(null)
    setComplete(false)
  }, [])

  // ── Grid resize ─────────────────────────────────────────────────────────────
  const handleRows = useCallback((v: number) => {
    if (v < 5 || v > 20) return
    setState(prev => ({ ...prev, rows: v, cells: makeCells(v, prev.cols, prev.cells) }))
    setActiveCell(null)
  }, [])

  const handleCols = useCallback((v: number) => {
    if (v < 5 || v > 20) return
    setState(prev => ({ ...prev, cols: v, cells: makeCells(prev.rows, v, prev.cells) }))
    setActiveCell(null)
  }, [])

  // ── Active-word highlight set ────────────────────────────────────────────────
  const activeWordKeys = new Set<string>()
  if (activeCell) {
    const w = words.find(w => w.direction === direction && w.cells.some(c => c.row === activeCell.row && c.col === activeCell.col))
    if (w) w.cells.forEach(c => activeWordKeys.add(ck(c.row, c.col)))
  }
  const selectedWordKeys = new Set<string>()
  if (selectedWord) selectedWord.cells.forEach(c => selectedWordKeys.add(ck(c.row, c.col)))

  const acrossWords = words.filter(w => w.direction === 'across')
  const downWords   = words.filter(w => w.direction === 'down')

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Toolbar */}
      <div className="toolbar">
        <button data-testid="mode-build" className={`mode-btn${state.mode === 'build' ? ' active' : ''}`} onClick={() => handleMode('build')}>Build</button>
        <button data-testid="mode-solve" className={`mode-btn${state.mode === 'solve' ? ' active' : ''}`} onClick={() => handleMode('solve')}>Solve</button>
        <button data-testid="clear-all-btn" className="clear-btn" onClick={handleClear}>Clear Puzzle</button>
        {state.mode === 'build' && (
          <>
            <label className="symmetry-toggle">
              <input data-testid="symmetry-toggle" type="checkbox" checked={state.symmetry} onChange={() => setState(p => ({ ...p, symmetry: !p.symmetry }))} />
              Symmetry
            </label>
            <div className="grid-size-inputs">
              Rows: <input type="number" min={5} max={20} value={state.rows}
                onChange={e => handleRows(parseInt(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleRows(parseInt((e.target as HTMLInputElement).value))} />
              Cols: <input type="number" min={5} max={20} value={state.cols}
                onChange={e => handleCols(parseInt(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleCols(parseInt((e.target as HTMLInputElement).value))} />
            </div>
          </>
        )}
        {state.mode === 'solve' && (
          <div className="solve-controls">
            <button data-testid="check-btn" className="solve-btn check-btn" onClick={handleCheck}>Check</button>
            <button data-testid="reveal-btn" className="solve-btn reveal-btn" onClick={handleReveal}>Reveal Word</button>
          </div>
        )}
      </div>

      {/* Completion banner */}
      {complete && state.mode === 'solve' && (
        <div data-testid="complete" ref={bannerRef} className="complete-banner">
          🎉 Puzzle Complete!
        </div>
      )}

      {/* Layout */}
      <div className="main-layout">
        {/* Grid */}
        <div className="grid-area">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${state.cols}, 48px)`, gridTemplateRows: `repeat(${state.rows}, 48px)` }}>
            {Array.from({ length: state.rows }, (_, r) =>
              Array.from({ length: state.cols }, (_, c) => {
                const key = ck(r, c)
                const cell = state.cells[key]
                if (!cell) return null
                const num       = numbers.get(key)
                const isActive  = activeCell?.row === r && activeCell?.col === c
                const inWord    = activeWordKeys.has(key) || selectedWordKeys.has(key)
                const isConflict = conflicts.has(key)
                const isCorrect  = checked?.correct.has(key)
                const isIncorrect = checked?.incorrect.has(key)

                let cls = 'cell'
                if (cell.isBlack) cls += ' black'
                else if (isCorrect)   cls += ' correct'
                else if (isIncorrect) cls += ' incorrect'
                else if (isConflict && state.mode === 'build') cls += ' conflict'
                else if (isActive)    cls += ' focused'
                else if (inWord)      cls += ' word-highlight'

                const displayLetter = state.mode === 'solve' ? cell.solverLetter : cellLetter(cell)

                return (
                  <div key={key} data-testid={`cell-${r}-${c}`} className={cls} onClick={() => handleCellClick(r, c)}>
                    {/* Overlay testids */}
                    {isConflict && state.mode === 'build' && (
                      <span data-testid={`conflict-${r}-${c}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                    )}
                    {isCorrect && state.mode === 'solve' && (
                      <span data-testid={`correct-${r}-${c}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                    )}
                    {isIncorrect && state.mode === 'solve' && (
                      <span data-testid={`incorrect-${r}-${c}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                    )}
                    {/* Number */}
                    {!cell.isBlack && num != null && (
                      <span data-testid={`number-${r}-${c}`} className="cell-number">{num}</span>
                    )}
                    {/* Letter — one element, visibility controlled by mode */}
                    {!cell.isBlack && (() => {
                      if (state.mode === 'solve') {
                        // In solve mode: show solver letter if set; otherwise show hidden builder letter placeholder
                        const builderL = cellLetter(cell)
                        if (!builderL) return null  // no builder letter, no element
                        return (
                          <span
                            data-testid={`letter-${r}-${c}`}
                            className="cell-letter"
                            style={{ visibility: cell.solverLetter ? 'visible' : 'hidden' }}
                          >
                            {cell.solverLetter || builderL}
                          </span>
                        )
                      } else {
                        // Build mode: show builder letter
                        const letter = cellLetter(cell)
                        if (!letter) return null
                        return (
                          <span data-testid={`letter-${r}-${c}`} className="cell-letter">
                            {letter}
                          </span>
                        )
                      }
                    })()}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Validation panel */}
          {state.mode === 'build' && conflicts.size > 0 && (
            <div data-testid="validation-panel" className="validation-panel">
              Letter conflicts at: {Array.from(conflicts).map(k => `(${k})`).join(', ')}
            </div>
          )}

          {/* Word list (build only) */}
          {state.mode === 'build' && (
            <div data-testid="word-list" className="word-list-panel">
              <h3>Words</h3>
              {words.map(w => {
                const letters = w.cells.map(({ row, col }) => {
                  const cell = state.cells[ck(row, col)]
                  return (w.direction === 'across' ? cell?.acrossLetter : cell?.downLetter) || '_'
                }).join('')
                return (
                  <div key={`${w.number}-${w.direction}`} data-testid={`word-${w.number}-${w.direction}`} className="word-entry">
                    {w.number} {w.direction.charAt(0).toUpperCase() + w.direction.slice(1)}: {letters}
                  </div>
                )
              })}
            </div>
          )}

          {/* Clue editor */}
          <div data-testid="clue-editor" className="clue-editor-panel">
            <div className="clue-section">
              <h4>Across</h4>
              {acrossWords.map(w => (
                <div key={`across-${w.number}`} className="clue-row">
                  <span className="clue-label">{w.number}.</span>
                  {state.mode === 'build' ? (
                    <input
                      data-testid={`clue-across-${w.number}`}
                      className="clue-input"
                      type="text"
                      value={state.cluesAcross[w.number] ?? ''}
                      onChange={e => setState(p => ({ ...p, cluesAcross: { ...p.cluesAcross, [w.number]: e.target.value } }))}
                    />
                  ) : (
                    <span
                      data-testid={`clue-across-${w.number}`}
                      className={`clue-text${selectedWord?.number === w.number && selectedWord.direction === 'across' ? ' selected' : ''}`}
                      onClick={() => handleClueClick(w)}
                    >
                      {state.cluesAcross[w.number] || '(no clue)'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="clue-section">
              <h4>Down</h4>
              {downWords.map(w => (
                <div key={`down-${w.number}`} className="clue-row">
                  <span className="clue-label">{w.number}.</span>
                  {state.mode === 'build' ? (
                    <input
                      data-testid={`clue-down-${w.number}`}
                      className="clue-input"
                      type="text"
                      value={state.cluesDown[w.number] ?? ''}
                      onChange={e => setState(p => ({ ...p, cluesDown: { ...p.cluesDown, [w.number]: e.target.value } }))}
                    />
                  ) : (
                    <span
                      data-testid={`clue-down-${w.number}`}
                      className={`clue-text${selectedWord?.number === w.number && selectedWord.direction === 'down' ? ' selected' : ''}`}
                      onClick={() => handleClueClick(w)}
                    >
                      {state.cluesDown[w.number] || '(no clue)'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
