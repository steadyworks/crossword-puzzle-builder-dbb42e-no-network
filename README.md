# Crossword Puzzle Builder

Build an interactive crossword puzzle tool that lets a user design a puzzle from scratch and then hand it off to a solver — all in the browser. No server, no accounts. Everything lives in `localStorage`.

## Stack

- **Frontend**: Pure React on port **3000**
- **Animations**: GSAP for all transitions and motion
- **Persistence**: `localStorage` only — no backend

## Modes

The app has exactly two modes: **Build** and **Solve**. A mode switcher is always visible. Switching modes never erases puzzle data.

---

## Build Mode

This is the default mode when the page first loads. The builder designs the grid structure, fills in letters, and writes clues.

### Grid

The puzzle grid is a rectangular array of cells. The builder sets the number of rows and columns via numeric inputs; valid values are **5–20** (inclusive) for both dimensions. The default is **10×10**. Changing dimensions resizes the grid immediately — cells that fall outside the new bounds are dropped, existing cells within bounds retain their state.

Each cell is identified by its zero-based row and column position and carries `data-testid="cell-{row}-{col}"`.

#### Black Squares

Clicking any white cell in Build mode toggles it into a **black square** — a visually solid black cell that blocks letter placement. Clicking a black square toggles it back to white. Black squares divide the grid into letter regions.

A **symmetry toggle** (`data-testid="symmetry-toggle"`) controls whether black-square edits are mirrored. When symmetry is on (the default), toggling any cell also toggles its **180° rotationally symmetric counterpart** — the cell at position `(maxRow - row, maxCol - col)`. This is standard American crossword convention.

#### Letter Entry

White cells accept typed letters. The builder clicks a white cell to focus it, then types to fill letters one at a time. After each keystroke the cursor advances to the next cell in the **current direction** (across or down). Pressing **Tab** toggles the active direction. Each cell containing a letter shows that letter centered in the cell and has `data-testid="letter-{row}-{col}"`.

### Auto-Numbering

The app automatically assigns clue numbers to cells that begin a word. A cell earns a number if:

- It is white.
- For **Across**: the cell to its left is black or off the edge, **and** there are at least 2 consecutive white cells to its right (including itself).
- For **Down**: the cell above it is black or off the edge, **and** there are at least 2 consecutive white cells below it (including itself).

A cell may start both an Across word and a Down word and shares one number for both. Numbers are assigned sequentially, left-to-right then top-to-bottom. The number is rendered in the top-left corner of the cell at `data-testid="number-{row}-{col}"`.

### Clue Editor

Below (or beside) the grid is a clue editor (`data-testid="clue-editor"`) split into **Across** and **Down** sections. Each section lists every numbered word in that direction. Each entry is an editable text input pre-labeled with the word number. Clues auto-update as the grid changes — entries for words that no longer exist disappear, and new entries appear as words are created.

- Individual clue inputs: `data-testid="clue-across-{number}"` and `data-testid="clue-down-{number}"`

### Intersection Validation

When two words cross at a cell, both must agree on the letter at that position. If an Across word places one letter and a Down word places a different letter at the same cell, that cell is marked as a **conflict**: it is highlighted red and a validation panel (`data-testid="validation-panel"`) summarizes the error. Conflicting cells carry `data-testid="conflict-{row}-{col}"`.

When there is no conflict the cell displays normally (or as the letter that both words agree on).

### Word List

A sidebar (`data-testid="word-list"`) lists all currently placed words. Each entry shows the word's number, direction, and the sequence of letters the builder has typed (e.g. `1 Across: HELLO`). Entries update in real time as letters are typed or erased. Each entry: `data-testid="word-{number}-{direction}"` where direction is lowercase (`across` or `down`).

---

## Solve Mode

Solve mode presents the finished puzzle to the solver. All builder-typed letters are hidden — the grid shows only the black/white structure and cell numbers. The solver fills in letters and checks their work.

### Clue Display

The Across and Down clue lists from the clue editor are shown read-only. Clicking a clue highlights the corresponding word's cells on the grid so the solver knows which cells to fill.

### Checking and Revealing

- **Check button** (`data-testid="check-btn"`): Compares every filled cell against the builder's answer. Correct cells get `data-testid="correct-{row}-{col}"` and are tinted green. Incorrect cells get `data-testid="incorrect-{row}-{col}"` and are tinted red. Unfilled cells are unchanged.
- **Reveal button** (`data-testid="reveal-btn"`): Fills in the correct letters for the currently selected word, overwriting whatever the solver typed.

### Completion

When every white cell contains the correct letter, a **completion indicator** (`data-testid="complete"`) appears — a distinct visual element (banner, overlay, or badge). It does not appear until the puzzle is fully and correctly solved.

---

## Persistence

The complete puzzle state — grid dimensions, black-square positions, all typed letters, clue text, and the solver's in-progress entries — is written to `localStorage` after every change. Reloading the page restores everything exactly as it was, including which mode was active.

---

## Additional Controls

- **Clear Puzzle button** (`data-testid="clear-all-btn"`): Resets the entire puzzle to its initial state — all white cells, no letters, no clues, default 10×10 grid. Also clears `localStorage`. Always visible regardless of mode.

---

## `data-testid` Reference

### Mode & Global Controls

| Element | `data-testid` |
|---|---|
| Build mode button/tab | `mode-build` |
| Solve mode button/tab | `mode-solve` |
| Clear Puzzle button | `clear-all-btn` |
| Symmetry toggle | `symmetry-toggle` |

### Grid

| Element | `data-testid` |
|---|---|
| Individual cell | `cell-{row}-{col}` |
| Cell containing a letter | `letter-{row}-{col}` |
| Numbered cell (clue start) | `number-{row}-{col}` |
| Conflicting cell | `conflict-{row}-{col}` |
| Correct cell (Solve mode) | `correct-{row}-{col}` |
| Incorrect cell (Solve mode) | `incorrect-{row}-{col}` |

### Build Mode Panels

| Element | `data-testid` |
|---|---|
| Clue editor container | `clue-editor` |
| Across clue input for number N | `clue-across-{number}` |
| Down clue input for number N | `clue-down-{number}` |
| Validation panel | `validation-panel` |
| Word list sidebar | `word-list` |
| Word entry for number N, direction D | `word-{number}-{direction}` |

### Solve Mode Controls

| Element | `data-testid` |
|---|---|
| Check button | `check-btn` |
| Reveal button | `reveal-btn` |
| Completion indicator | `complete` |
