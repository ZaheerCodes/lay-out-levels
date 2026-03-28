import { useRef, useCallback } from "react";
import EditorGrid from "../EditorGrid/EditorGrid";
import { findClosestDoorToDelete } from "../../utils/doorOps";

export default function BuildingGrid({
    placedRooms,
    doors,
    selectedId,
    collidingIds,
    isolatedIds,
    doorMode,
    onSelectRoom,
    onMoveRoom,
    onDeleteRoom,
    onAddDoor,
    onDeleteDoor,
}) {
    const isDragging = useRef(false);
    const dragRoom = useRef(null);
    const dragStart = useRef({ clientX: 0, clientY: 0, roomX: 0, roomY: 0 });

    const hitTestRoom = useCallback(
        (gx, gy) => {
            for (let i = placedRooms.length - 1; i >= 0; i--) {
                const room = placedRooms[i];
                const { gridX, gridY, transformedMatrix } = room;
                const rows = transformedMatrix.length;
                const cols = transformedMatrix[0]?.length ?? 0;
                const lr = gy - gridY;
                const lc = gx - gridX;
                if (
                    lr >= 0 &&
                    lr < rows &&
                    lc >= 0 &&
                    lc < cols &&
                    transformedMatrix[lr][lc] !== 0
                ) {
                    return room;
                }
            }
            return null;
        },
        [placedRooms],
    );

    const handleActionDown = useCallback(
        (e, { x: gx, y: gy, rawX, rawY }) => {
            if (e.button === 2) {
                e.preventDefault();
                if (doorMode) {
                    // Convert raw pixel coordinates to exact floating-point grid coordinates
                    const exactX = rawX / 64;
                    const exactY = rawY / 64;

                    // Delegate heavy math to the ops layer
                    const closestDoor = findClosestDoorToDelete(
                        exactX,
                        exactY,
                        doors,
                    );
                    if (closestDoor) onDeleteDoor(closestDoor.doorId);
                } else {
                    const room = hitTestRoom(gx, gy);
                    if (room) onDeleteRoom(room.instanceId);
                }
                return;
            }

            if (e.button !== 0) return;

            if (doorMode) {
                onAddDoor(gx, gy);
                return;
            }

            const room = hitTestRoom(gx, gy);
            if (room) {
                onSelectRoom(room.instanceId);
                isDragging.current = true;
                dragRoom.current = room;
                dragStart.current = {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    roomX: room.gridX,
                    roomY: room.gridY,
                };
            } else {
                onSelectRoom(null);
            }
        },
        [
            doorMode,
            doors,
            hitTestRoom,
            onSelectRoom,
            onDeleteRoom,
            onAddDoor,
            onDeleteDoor,
        ],
    );

    const handleActionMove = useCallback(
        (e, { zoom }) => {
            if (!isDragging.current || !dragRoom.current) return;
            const dx = Math.round(
                (e.clientX - dragStart.current.clientX) / zoom / 64,
            );
            const dy = Math.round(
                (e.clientY - dragStart.current.clientY) / zoom / 64,
            );
            const newX = dragStart.current.roomX + dx;
            const newY = dragStart.current.roomY + dy;

            if (
                newX !== dragRoom.current.gridX ||
                newY !== dragRoom.current.gridY
            ) {
                onMoveRoom(dragRoom.current.instanceId, newX, newY);
                dragRoom.current = {
                    ...dragRoom.current,
                    gridX: newX,
                    gridY: newY,
                };
            }
        },
        [onMoveRoom],
    );

    const handleActionUp = useCallback(() => {
        isDragging.current = false;
        dragRoom.current = null;
    }, []);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
    }, []);

    return (
        <EditorGrid
            customCursor={doorMode ? "crosshair" : "default"}
            onActionDown={handleActionDown}
            onActionMove={handleActionMove}
            onActionUp={handleActionUp}
            onContextMenu={handleContextMenu}
            doors={doors}
            matrices={placedRooms.map((room) => ({
                id: room.instanceId,
                matrix: room.transformedMatrix,
                x: room.gridX,
                y: room.gridY,
                isColliding: collidingIds?.has(room.instanceId),
                isIsolated: isolatedIds?.has(room.instanceId),
                isSelected: selectedId === room.instanceId,
                cursor: doorMode ? "default" : "grab",
            }))}
        />
    );
}
