import { useState, useCallback } from "react";
import styles from "./RoomEditor.module.css";
import RoomGrid from "./RoomGrid";
import RoomLibrary from "./RoomLibrary";
import Button from "../shared/Button";
import { validateGrid } from "../../utils/validation";
import { createMatrix, extractBoundingBox } from "../../utils/matrixOps";
import {
    loadRooms,
    addRoom,
    deleteRoom,
    generateId,
    sortRooms,
} from "../../utils/storage";
import { isDuplicateRoom } from "../../utils/roomOps";

const GRID_ROWS = 50;
const GRID_COLS = 60;

export default function RoomEditor() {
    const [grid, setGrid] = useState(() => createMatrix(GRID_ROWS, GRID_COLS));
    const [roomName, setRoomName] = useState("Unnamed Room");
    const [rooms, setRooms] = useState(() => loadRooms());
    const [notification, setNotification] = useState(null);
    const [confirmLoad, setConfirmLoad] = useState(null);

    // ── Validation ────────────────────────────────────────────
    const { valid, errors, errorCells } = validateGrid(grid);

    // ── Notification ──────────────────────────────────────────
    const notify = useCallback((type, msg, duration = 3500) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), duration);
    }, []);

    // ── Cell change ───────────────────────────────────────────
    const handleCellChange = useCallback((r, c, val) => {
        setGrid((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = val;
            return next;
        });
    }, []);

    // ── Clear grid ────────────────────────────────────────────
    const handleClear = useCallback(() => {
        setGrid(createMatrix(GRID_ROWS, GRID_COLS));
        setRoomName("Unnamed Room");
    }, []);

    // ── Save to Library ───────────────────────────────────────
    const handleSave = useCallback(() => {
        if (!valid) return;
        const bbox = extractBoundingBox(grid);
        if (!bbox) return;

        const { trimmedMatrix } = bbox;
        const current = loadRooms();

        if (isDuplicateRoom(trimmedMatrix, current)) {
            notify(
                "error",
                "A variant of this room shape already exists in the library.",
            );
            return;
        }

        const room = {
            id: generateId("room_room"),
            name: roomName.trim() || "Unnamed Room",
            width: trimmedMatrix[0].length,
            height: trimmedMatrix.length,
            matrix: trimmedMatrix,
        };

        const updated = addRoom(room);
        setRooms(updated);
        notify("success", `"${room.name}" saved to library!`);
    }, [grid, roomName, valid, notify]);

    // ── Copy JSON ─────────────────────────────────────────────
    const handleCopyJson = useCallback(() => {
        if (!valid) return;
        const bbox = extractBoundingBox(grid);
        if (!bbox) return;
        const { trimmedMatrix } = bbox;
        const room = {
            id: generateId("room_room"),
            name: roomName.trim() || "Unnamed Room",
            width: trimmedMatrix[0].length,
            height: trimmedMatrix.length,
            matrix: trimmedMatrix,
        };
        navigator.clipboard.writeText(JSON.stringify(room, null, 2));
        notify("success", "JSON copied to clipboard!");
    }, [grid, roomName, valid, notify]);

    const handleCopyRoomJson = useCallback(
        (room) => {
            navigator.clipboard.writeText(JSON.stringify(room, null, 2));
            notify("success", `"${room.name}" JSON copied!`);
        },
        [notify],
    );

    // ── Load from library ─────────────────────────────────────
    const handleLoadRequest = useCallback(
        (room) => {
            const hasContent = grid.some((row) => row.some((v) => v !== 0));
            if (hasContent) {
                setConfirmLoad(room);
            } else {
                doLoad(room);
            }
        },
        [grid],
    );

    const doLoad = useCallback((room) => {
        const newGrid = createMatrix(GRID_ROWS, GRID_COLS);
        const { matrix } = room;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[0].length; c++) {
                if (r < GRID_ROWS && c < GRID_COLS) {
                    newGrid[r + 2][c + 2] = matrix[r][c]; // offset by 2 for comfort
                }
            }
        }
        setGrid(newGrid);
        setRoomName(room.name);
        setConfirmLoad(null);
    }, []);

    // ── Delete from library ───────────────────────────────────
    const handleDelete = useCallback(
        (id) => {
            const updated = deleteRoom(id);
            setRooms(updated);
            notify("info", "Room deleted from library.");
        },
        [notify],
    );

    return (
        <div className={styles.building}>
            {/* ── Left Panel ─────────────────────────────── */}
            <aside className={styles.leftPanel}>
                <div className={styles.panelSection}>
                    <label className={styles.label}>Room Name</label>
                    <input
                        className={styles.nameInput}
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="e.g. L-Shaped Cell Block"
                    />
                </div>

                <div className={styles.legend}>
                    <div className={styles.legendTitle}>Cell States</div>
                    <div className={styles.legendRow}>
                        <div
                            className={`${styles.swatch} ${styles.swatchVoid}`}
                        />
                        <span>0 — Void</span>
                    </div>
                    <div className={styles.legendRow}>
                        <div
                            className={`${styles.swatch} ${styles.swatchSpace}`}
                        />
                        <span>1 — Walkable</span>
                    </div>
                    <div className={styles.legendRow}>
                        <div
                            className={`${styles.swatch} ${styles.swatchOverlap}`}
                        />
                        <span>2 — Overlap Corner</span>
                    </div>
                    <p className={styles.legendHint}>
                        Click to cycle · Drag to paint
                    </p>
                </div>

                {/* Validation status */}
                <div className={styles.validationBox}>
                    <div
                        className={`${styles.validBadge} ${valid ? styles.validPass : styles.validFail}`}
                    >
                        {valid ? "✓ Valid" : "✗ Invalid"}
                    </div>
                    {errors.length > 0 && (
                        <ul className={styles.errorList}>
                            {errors.map((e, i) => (
                                <li key={i}>{e}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={styles.actions}>
                    <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        disabled={!valid}
                        onClick={handleSave}
                    >
                        💾 Save to Library
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        disabled={!valid}
                        onClick={handleCopyJson}
                    >
                        {} Copy JSON
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        fullWidth
                        onClick={handleClear}
                    >
                        🗑 Clear Grid
                    </Button>
                </div>

                <div className={styles.controls}>
                    <div className={styles.controlsTitle}>Navigation</div>
                    <div className={styles.controlRow}>
                        <kbd>Scroll</kbd>
                        <span>Zoom</span>
                    </div>
                    <div className={styles.controlRow}>
                        <kbd>Alt+Drag</kbd>
                        <span>Pan</span>
                    </div>
                    <div className={styles.controlRow}>
                        <kbd>Click</kbd>
                        <span>Cycle state</span>
                    </div>
                    <div className={styles.controlRow}>
                        <kbd>Drag</kbd>
                        <span>Paint</span>
                    </div>
                </div>
            </aside>

            {/* ── Grid Canvas ────────────────────────────── */}
            <main className={styles.gridArea}>
                <RoomGrid
                    grid={grid}
                    onCellChange={handleCellChange}
                    errorCells={valid ? new Set() : errorCells}
                />
            </main>

            {/* ── Right Panel Library ────────────────────── */}
            <RoomLibrary
                rooms={sortRooms(rooms)}
                onLoad={handleLoadRequest}
                onDelete={handleDelete}
                onCopyJson={handleCopyRoomJson}
            />

            {/* ── Notification Toast ─────────────────────── */}
            {notification && (
                <div
                    className={`${styles.toast} ${styles[`toast_${notification.type}`]}`}
                >
                    {notification.msg}
                </div>
            )}

            {/* ── Confirm Load Dialog ─────────────────────── */}
            {confirmLoad && (
                <div className={styles.overlay}>
                    <div className={styles.dialog}>
                        <h3 className={styles.dialogTitle}>
                            Replace current canvas?
                        </h3>
                        <p className={styles.dialogMsg}>
                            Loading <strong>"{confirmLoad.name}"</strong> will
                            replace your unsaved work.
                        </p>
                        <div className={styles.dialogActions}>
                            <Button
                                variant="primary"
                                onClick={() => doLoad(confirmLoad)}
                            >
                                Load Room
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setConfirmLoad(null)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
