import React, { useState, useCallback } from "react";
import styles from "./BuildingEditor.module.css";
import BuildingGrid from "./BuildingGrid";
import BuildingLibrary from "./BuildingLibrary";
import Button from "../shared/Button";
import {
    loadRooms,
    loadBuildings,
    addBuilding,
    deleteBuilding,
    generateId,
    cleanBuildingData,
} from "../../utils/storage";
import { rotate90, flipH, flipV } from "../../utils/matrixOps";
import {
    findCollisions,
    findIsolatedRooms,
    buildMasterGrid,
} from "../../utils/mstAlgorithm";
import { generateBuilding } from "../../utils/buildingOps";
import {
    calculateNewDoors,
    findClosestDoorToDelete,
    generateDoorsMST,
} from "../../utils/doorOps";

const MASTER_W = 30;
const MASTER_H = 30;

function makeRoom(room, cx = 10, cy = 10) {
    const matrix = room.matrix.map((r) => [...r]);
    return {
        instanceId: generateId("instance"),
        id: room.id,
        roomName: room.name,
        gridX: cx,
        gridY: cy,
        rotation: 0,
        flipX: false,
        flipY: false,
        transformedMatrix: matrix,
        baseMatrix: matrix,
    };
}

export default function BuildingEditor() {
    const [rooms] = useState(() => loadRooms());
    const [buildings, setBuildings] = useState(() => loadBuildings());
    const [placedRooms, setPlacedRooms] = useState([]);
    const [doors, setDoors] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [doorMode, setDoorMode] = useState(false);
    const [levelName, setLevelName] = useState("New Building");
    const [notification, setNotification] = useState(null);
    const [disabledRoomIds, setDisabledRoomIds] = useState(() => new Set());

    const handleToggleRoom = useCallback((roomId) => {
        setDisabledRoomIds((prev) => {
            const next = new Set(prev);
            if (next.has(roomId)) next.delete(roomId);
            else next.add(roomId);
            return next;
        });
    }, []);

    const notify = useCallback((type, msg, d = 3500) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), d);
    }, []);

    const collidingIds = findCollisions(placedRooms);
    const isolatedIds =
        placedRooms.length > 1 ? findIsolatedRooms(placedRooms) : new Set();
    const isValid = collidingIds.size === 0;

    const handlePlaceRoom = useCallback((room) => {
        const r = makeRoom(
            room,
            5 + Math.floor(Math.random() * 5),
            5 + Math.floor(Math.random() * 5),
        );
        setPlacedRooms((prev) => [...prev, r]);
        setSelectedId(r.instanceId);
    }, []);

    const handleMoveRoom = useCallback((instanceId, newX, newY) => {
        setPlacedRooms((prev) =>
            prev.map((r) =>
                r.instanceId === instanceId
                    ? { ...r, gridX: newX, gridY: newY }
                    : r,
            ),
        );
    }, []);

    const handleDeleteRoom = useCallback(
        (instanceId) => {
            setPlacedRooms((prev) =>
                prev.filter((r) => r.instanceId !== instanceId),
            );
            setDoors((prev) =>
                prev.filter(
                    (d) => d.room1Id !== instanceId && d.room2Id !== instanceId,
                ),
            );
            if (selectedId === instanceId) setSelectedId(null);
        },
        [selectedId],
    );

    const applyRoomTransform = useCallback(
        (fn) => {
            if (!selectedId) return;
            setPlacedRooms((prev) =>
                prev.map((r) => {
                    if (r.instanceId !== selectedId) return r;
                    const [newRot, newFlipX, newFlipY, newMatrix] = fn(r);
                    return {
                        ...r,
                        rotation: newRot,
                        flipX: newFlipX,
                        flipY: newFlipY,
                        transformedMatrix: newMatrix,
                    };
                }),
            );
        },
        [selectedId],
    );

    const handleRotateCW = () =>
        applyRoomTransform((r) => {
            const newMatrix = rotate90(r.transformedMatrix);
            return [(r.rotation + 90) % 360, r.flipX, r.flipY, newMatrix];
        });

    const handleRotateCCW = () =>
        applyRoomTransform((r) => {
            const newMatrix = rotate90(rotate90(rotate90(r.transformedMatrix)));
            return [(r.rotation + 270) % 360, r.flipX, r.flipY, newMatrix];
        });

    const handleFlipH = () =>
        applyRoomTransform((r) => {
            const newMatrix = flipH(r.transformedMatrix);
            return [r.rotation, !r.flipX, r.flipY, newMatrix];
        });

    const handleFlipV = () =>
        applyRoomTransform((r) => {
            const newMatrix = flipV(r.transformedMatrix);
            return [r.rotation, r.flipX, !r.flipY, newMatrix];
        });

    const handlePunchDoors = useCallback(() => {
        if (placedRooms.length < 2) {
            notify("error", "Place at least 2 rooms to punch doors.");
            return;
        }
        if (collidingIds.size > 0) {
            notify("error", "Fix room collisions before punching doors.");
            return;
        }

        const newDoors = generateDoorsMST(placedRooms, 0.15);
        setDoors(newDoors);
        setDoorMode(true);
        notify(
            "success",
            `Punched ${newDoors.length} doors (MST + 15% flanking loops).`,
        );
    }, [placedRooms, collidingIds, notify]);

    const handleAddDoor = useCallback(
        (gx, gy) => {
            const newDoors = calculateNewDoors(gx, gy, placedRooms, doors);
            if (newDoors.length > 0) {
                setDoors((prev) => [...prev, ...newDoors]);
            }
        },
        [placedRooms, doors],
    );

    const handleDeleteDoor = useCallback((doorId) => {
        setDoors((prev) => prev.filter((d) => d.doorId !== doorId));
    }, []);

    const handleAutoGenerate = useCallback(() => {
        const activeRooms = rooms.filter((r) => !disabledRoomIds.has(r.id));
        if (activeRooms.length === 0) {
            notify(
                "error",
                "No active rooms available. Enable some rooms or create new ones.",
            );
            return;
        }
        const generated = generateBuilding(activeRooms, MASTER_W, MASTER_H, 15);
        if (generated.rooms.length === 0) {
            notify("error", "Could not place any rooms.");
            return;
        }
        setPlacedRooms(generated.rooms);
        setDoors([]);
        setSelectedId(null);
        notify(
            "success",
            `Auto-generated layout with ${generated.rooms.length} organically packed rooms.`,
        );
    }, [rooms, disabledRoomIds, notify]);

    const handleSave = useCallback(() => {
        const masterGrid = buildMasterGrid(placedRooms, MASTER_W, MASTER_H);
        const building = {
            id: generateId("level"),
            levelName: levelName.trim() || "Unnamed Building",
            masterGridWidth: MASTER_W,
            masterGridHeight: MASTER_H,
            masterGrid,
            rooms: Object.fromEntries(
                placedRooms.map((r) => [r.instanceId, r]),
            ),
            doors,
        };
        const updated = addBuilding(building);
        setBuildings(updated);
        notify("success", `"${building.levelName}" saved to buildings!`);
    }, [placedRooms, doors, levelName, notify]);

    const handleCopyJson = useCallback(() => {
        const masterGrid = buildMasterGrid(placedRooms, MASTER_W, MASTER_H);
        const building = {
            id: generateId("level"),
            levelName,
            masterGridWidth: MASTER_W,
            masterGridHeight: MASTER_H,
            masterGrid,
            rooms: Object.fromEntries(
                placedRooms.map((r) => [r.instanceId, r]),
            ),
            doors,
        };
        navigator.clipboard.writeText(
            JSON.stringify(cleanBuildingData(building), null, 2),
        );
        notify("success", "Building JSON copied to clipboard!");
    }, [placedRooms, doors, levelName, notify]);

    const handleLoadBuilding = useCallback(
        (building) => {
            const rooms = Object.values(building.rooms || {});
            setPlacedRooms(rooms);
            setDoors(building.doors || []);
            setLevelName(building.levelName);
            setSelectedId(null);
            notify("info", `Loaded "${building.levelName}"`);
        },
        [notify],
    );

    const handleDeleteBuilding = useCallback(
        (id) => {
            const updated = deleteBuilding(id);
            setBuildings(updated);
            notify("info", "Building deleted.");
        },
        [notify],
    );

    const handleCopyBuildingJson = useCallback(
        (building) => {
            navigator.clipboard.writeText(JSON.stringify(building, null, 2));
            notify("success", "Building JSON copied!");
        },
        [notify],
    );

    const selectedRoom = placedRooms.find((r) => r.instanceId === selectedId);

    return (
        <div className={styles.building}>
            <aside className={styles.leftPanel}>
                {/* ... (Existing left panel content remains perfectly untouched) ... */}
                <div className={styles.panelSection}>
                    <label className={styles.label}>Building Name</label>
                    <input
                        className={styles.nameInput}
                        value={levelName}
                        onChange={(e) => setLevelName(e.target.value)}
                        placeholder="e.g. Prison Alpha"
                    />
                </div>

                <div className={styles.statusSection}>
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>Rooms</span>
                        <span className={styles.statusVal}>
                            {placedRooms.length}
                        </span>
                    </div>
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>Doors</span>
                        <span className={styles.statusVal}>{doors.length}</span>
                    </div>
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>Collisions</span>
                        <span
                            className={`${styles.statusVal} ${collidingIds.size > 0 ? styles.statusError : styles.statusGood}`}
                        >
                            {collidingIds.size > 0
                                ? `${collidingIds.size} rooms`
                                : "None"}
                        </span>
                    </div>
                    <div className={styles.statusRow}>
                        <span className={styles.statusLabel}>Isolated</span>
                        <span
                            className={`${styles.statusVal} ${isolatedIds.size > 0 ? styles.statusError : styles.statusGood}`}
                        >
                            {isolatedIds.size > 0
                                ? `${isolatedIds.size} rooms`
                                : "None"}
                        </span>
                    </div>
                </div>

                {selectedRoom && (
                    <div className={styles.transformSection}>
                        <div className={styles.label}>
                            Transform: {selectedRoom.roomName}
                        </div>
                        <div className={styles.transformGrid}>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleRotateCW}
                                title="Rotate 90° clockwise"
                            >
                                ↻ 90°
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleRotateCCW}
                                title="Rotate 90° counter-clockwise"
                            >
                                ↺ 90°
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleFlipH}
                                title="Flip horizontal"
                            >
                                ⇆ Flip H
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleFlipV}
                                title="Flip vertical"
                            >
                                ⇅ Flip V
                            </Button>
                        </div>
                        <Button
                            variant="danger"
                            size="sm"
                            fullWidth
                            onClick={() => handleDeleteRoom(selectedId)}
                        >
                            🗑 Delete Room
                        </Button>
                    </div>
                )}

                <div className={styles.actions}>
                    <Button
                        variant="ghost"
                        size="md"
                        fullWidth
                        onClick={handleAutoGenerate}
                    >
                        ⚡ Auto-Generate
                    </Button>
                    <Button
                        variant={doorMode ? "primary" : "secondary"}
                        size="md"
                        fullWidth
                        onClick={() => setDoorMode((v) => !v)}
                        disabled={placedRooms.length === 0 || !isValid}
                    >
                        {doorMode ? "🚪 Exit Door Mode" : "🚪 Edit Doors"}
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={handlePunchDoors}
                        disabled={placedRooms.length < 2 || !isValid}
                    >
                        🔑 Punch Doors (MST)
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        onClick={handleSave}
                        disabled={placedRooms.length === 0 || !isValid}
                    >
                        💾 Save Building
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={handleCopyJson}
                        disabled={placedRooms.length === 0 || !isValid}
                    >
                        {} Copy Final JSON
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        fullWidth
                        onClick={() => {
                            setPlacedRooms([]);
                            setDoors([]);
                            setSelectedId(null);
                        }}
                    >
                        🗑 Clear All
                    </Button>
                </div>

                <div className={styles.controls}>
                    <div className={styles.controlsTitle}>Controls</div>
                    <div className={styles.controlRow}>
                        <kbd>Scroll</kbd>
                        <span>Zoom</span>
                    </div>
                    <div className={styles.controlRow}>
                        <kbd>Alt+Drag</kbd>
                        <span>Pan</span>
                    </div>
                    <div className={styles.controlRow}>
                        <kbd>Click Room</kbd>
                        <span>Select</span>
                    </div>
                    <div className={styles.controlRow}>
                        <kbd>Drag Room</kbd>
                        <span>Move</span>
                    </div>
                    <div className={styles.controlRow}>
                        <kbd>Right-Click</kbd>
                        <span>Delete</span>
                    </div>
                </div>

                {doorMode && (
                    <div className={styles.doorModeHint}>
                        <div className={styles.doorHintTitle}>
                            🚪 Door Edit Mode
                        </div>
                        <p>Click a shared wall to place a door.</p>
                        <p>Right-click a door to delete it.</p>
                    </div>
                )}
            </aside>

            <main className={styles.gridArea}>
                <BuildingGrid
                    placedRooms={placedRooms}
                    doors={doors}
                    selectedId={selectedId}
                    collidingIds={collidingIds}
                    isolatedIds={isolatedIds}
                    doorMode={doorMode}
                    onSelectRoom={setSelectedId}
                    onMoveRoom={handleMoveRoom}
                    onDeleteRoom={handleDeleteRoom}
                    onAddDoor={handleAddDoor}
                    onDeleteDoor={handleDeleteDoor}
                />
            </main>

            <BuildingLibrary
                rooms={rooms}
                buildings={buildings}
                disabledRoomIds={disabledRoomIds}
                onToggleRoom={handleToggleRoom}
                onPlaceRoom={handlePlaceRoom}
                onLoadBuilding={handleLoadBuilding}
                onDeleteBuilding={handleDeleteBuilding}
                onCopyBuildingJson={handleCopyBuildingJson}
            />

            {notification && (
                <div
                    className={`${styles.toast} ${styles[`toast_${notification.type}`]}`}
                >
                    {notification.msg}
                </div>
            )}
        </div>
    );
}
