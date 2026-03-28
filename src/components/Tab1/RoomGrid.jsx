import { useRef, useCallback } from "react";
import EditorGrid from "../EditorGrid/EditorGrid";

const GRID_COLS = 30;
const GRID_ROWS = 30;

export default function RoomGrid({ grid, onCellChange, errorCells }) {
    const isPainting = useRef(false);
    const paintState = useRef(null);
    const lastPainted = useRef(null);

    const handleActionDown = useCallback(
        (e, { x, y }) => {
            if (e.button !== 0) return;
            if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;

            const cur = grid[y]?.[x] ?? 0;
            const next = (cur + 1) % 3;
            paintState.current = next;
            isPainting.current = true;
            lastPainted.current = `${y},${x}`;
            onCellChange(y, x, next);
        },
        [grid, onCellChange],
    );

    const handleActionMove = useCallback(
        (e, { x, y }) => {
            if (!isPainting.current) return;
            if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;

            const key = `${y},${x}`;
            if (key === lastPainted.current) return;
            lastPainted.current = key;
            onCellChange(y, x, paintState.current);
        },
        [onCellChange],
    );

    const handleActionUp = useCallback(() => {
        isPainting.current = false;
        paintState.current = null;
        lastPainted.current = null;
    }, []);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
    }, []);

    const errorSet = errorCells || new Set();

    return (
        <EditorGrid
            customCursor="crosshair"
            onActionDown={handleActionDown}
            onActionMove={handleActionMove}
            onActionUp={handleActionUp}
            onContextMenu={handleContextMenu}
            matrices={[
                {
                    id: "room-grid",
                    matrix: grid,
                    errorCells: errorSet,
                },
            ]}
        />
    );
}

/*

*/