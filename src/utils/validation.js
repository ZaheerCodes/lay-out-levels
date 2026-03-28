import { isTouchingState2, getOverlapOrientation } from "./roomOps";

export const validateGrid = (grid) => {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const errors = [];
    const errorCells = new Set();

    // Rule 1: Existence of Space
    const hasSpace = grid.some((row) => row.some((v) => v === 1));
    if (!hasSpace) {
        errors.push(
            "Rule 1: Grid is empty. Paint at least one walkable cell (state 1).",
        );
        return { valid: false, errors, errorCells };
    }

    // Rule 2: Connectivity of Cells
    let startR = -1,
        startC = -1;
    outer: for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== 0) {
                startR = r;
                startC = c;
                break outer;
            }
        }
    }

    const visited = new Set();
    const queue = [[startR, startC]];
    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
        const [r, c] = queue.shift();
        const DIRS = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
        ];
        for (const [dr, dc] of DIRS) {
            const nr = r + dr,
                nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (grid[nr][nc] === 0) continue;
            const key = `${nr},${nc}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push([nr, nc]);
            }
        }
    }

    let totalNonZero = 0;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) if (grid[r][c] !== 0) totalNonZero++;

    if (visited.size !== totalNonZero) {
        errors.push(
            "Rule 2: Room is not fully connected. All cells must form one contiguous shape.",
        );
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] !== 0) errorCells.add(`${r},${c}`);
            }
        }
        return { valid: false, errors, errorCells };
    }

    // Rule 3: Validity of Overlapping Cells
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== 2) continue;

            if (isTouchingState2(grid, r, c)) {
                errors.push(
                    `Rule 3: Corner cell at (${r},${c}) is touching another overlap corner.`,
                );
                errorCells.add(`${r},${c}`);
                continue;
            }

            if (!getOverlapOrientation(grid, r, c)) {
                errors.push(
                    `Rule 3: Corner cell at (${r},${c}) does not have a fully open exterior corner (diagonal and adjacent sides must be empty).`,
                );
                errorCells.add(`${r},${c}`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        errorCells,
    };
};
