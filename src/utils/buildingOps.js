import { createMatrix, generateVariants } from "./matrixOps";
import { generateId } from "./storage";

export const generateBuilding = (
    rooms,
    width,
    height,
    targetRoomCount = 10,
) => {
    const stateGrid = createMatrix(height, width);
    const placedRooms = [];
    let instanceCounter = 1;

    // ─── HELPER: COLLISION & ADJACENCY ────────────────────────────────────
    const canPlace = (variant, startX, startY) => {
        let isAdjacent = false;

        for (let r = 0; r < variant.length; r++) {
            for (let c = 0; c < variant[0].length; c++) {
                const cellState = variant[r][c];
                if (cellState === 0) continue;

                const gx = startX + c;
                const gy = startY + r;

                if (gx < 0 || gx >= width || gy < 0 || gy >= height)
                    return false;

                const existingState = stateGrid[gy][gx];

                if (existingState !== 0) {
                    if (cellState === 1 || existingState === 1) return false;
                    if (cellState === 2 && existingState === 2)
                        isAdjacent = true;
                }

                if (!isAdjacent && existingState === 0) {
                    if (gy > 0 && stateGrid[gy - 1][gx] !== 0)
                        isAdjacent = true;
                    else if (gy < height - 1 && stateGrid[gy + 1][gx] !== 0)
                        isAdjacent = true;
                    else if (gx > 0 && stateGrid[gy][gx - 1] !== 0)
                        isAdjacent = true;
                    else if (gx < width - 1 && stateGrid[gy][gx + 1] !== 0)
                        isAdjacent = true;
                }
            }
        }
        return isAdjacent;
    };

    // ─── HELPER: FLOOD-FILL VOID DETECTION ────────────────────────────────
    const calculateTrappedVoids = (
        adjacentEmpties,
        variant,
        startX,
        startY,
    ) => {
        let voidsCreated = 0;
        const checkedEmpties = new Set();
        const vRows = variant.length;
        const vCols = variant[0].length;

        for (const emp of adjacentEmpties) {
            if (checkedEmpties.has(emp)) continue;
            const [sy, sx] = emp.split(",").map(Number);
            let isTrapped = true;
            let queue = [[sy, sx]];
            let visited = new Set([emp]);
            let voidSize = 0;

            while (queue.length > 0) {
                const [cy, cx] = queue.shift();
                voidSize++;
                if (voidSize > 25) {
                    isTrapped = false;
                    break;
                }

                const dirs = [
                    [-1, 0],
                    [1, 0],
                    [0, -1],
                    [0, 1],
                ];
                for (const [dr, dc] of dirs) {
                    const ny = cy + dr,
                        nx = cx + dc;
                    if (ny < 0 || ny >= height || nx < 0 || nx >= width) {
                        isTrapped = false;
                        break;
                    }
                    const key = `${ny},${nx}`;
                    if (visited.has(key)) continue;

                    const isVariantSolid =
                        ny >= startY &&
                        ny < startY + vRows &&
                        nx >= startX &&
                        nx < startX + vCols &&
                        variant[ny - startY][nx - startX] !== 0;
                    if (stateGrid[ny][nx] === 0 && !isVariantSolid) {
                        visited.add(key);
                        queue.push([ny, nx]);
                        checkedEmpties.add(key);
                    }
                }
                if (!isTrapped) break;
            }
            if (isTrapped) voidsCreated += voidSize;
        }
        return voidsCreated;
    };

    // ─── HELPER: SCORING HEURISTIC ────────────────────────────────────────
    const getFitnessScore = (variant, startX, startY, curCOMX, curCOMY) => {
        let overlaps = 0,
            unmatchedCorners = 0,
            sharedEdges = 0;
        let variantCOMX = 0,
            variantCOMY = 0,
            variantCells = 0;
        let touches = { top: false, bottom: false, left: false, right: false };
        const adjacentEmpties = new Set();

        for (let r = 0; r < variant.length; r++) {
            for (let c = 0; c < variant[0].length; c++) {
                const cellState = variant[r][c];
                if (cellState === 0) continue;

                const gx = startX + c,
                    gy = startY + r;
                variantCOMX += gx;
                variantCOMY += gy;
                variantCells++;

                if (cellState === 2) {
                    if (stateGrid[gy][gx] === 2) overlaps++;
                    else unmatchedCorners++;
                }

                const dirs = [
                    { dr: -1, dc: 0, side: "top" },
                    { dr: 1, dc: 0, side: "bottom" },
                    { dr: 0, dc: -1, side: "left" },
                    { dr: 0, dc: 1, side: "right" },
                ];
                for (const { dr, dc, side } of dirs) {
                    const ny = gy + dr,
                        nx = gx + dc;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        if (stateGrid[ny][nx] !== 0) {
                            sharedEdges++;
                            touches[side] = true;
                        } else {
                            const isVariantSolid =
                                ny >= startY &&
                                ny < startY + variant.length &&
                                nx >= startX &&
                                nx < startX + variant[0].length &&
                                variant[ny - startY][nx - startX] !== 0;
                            if (!isVariantSolid)
                                adjacentEmpties.add(`${ny},${nx}`);
                        }
                    }
                }
            }
        }

        const voidsCreated = calculateTrappedVoids(
            adjacentEmpties,
            variant,
            startX,
            startY,
        );
        const distToCOM = Math.sqrt(
            (variantCOMX / variantCells - curCOMX) ** 2 +
                (variantCOMY / variantCells - curCOMY) ** 2,
        );
        const axesTouching = Object.values(touches).filter(Boolean).length;

        let score = overlaps * 200 + sharedEdges * 20 + variantCells * 10;
        if (axesTouching > 1) score += Math.pow(axesTouching, 3) * 15;
        score -= unmatchedCorners * 100 + distToCOM * 2 + voidsCreated * 500;

        return score;
    };

    // ─── HELPER: APPLY TO GRID ────────────────────────────────────────────
    const placeRoom = (variant, startX, startY, room) => {
        const instanceId = `instance_${instanceCounter++}`;
        for (let r = 0; r < variant.length; r++) {
            for (let c = 0; c < variant[0].length; c++) {
                if (variant[r][c] !== 0) {
                    stateGrid[startY + r][startX + c] =
                        variant[r][c] === 2 &&
                        stateGrid[startY + r][startX + c] === 2
                            ? 2
                            : variant[r][c];
                }
            }
        }
        placedRooms.push({
            instanceId,
            id: room.id,
            roomName: room.name,
            gridX: startX,
            gridY: startY,
            rotation: 0,
            flipX: false,
            flipY: false,
            transformedMatrix: variant,
            baseMatrix: variant,
        });
    };

    // ─── HELPER: EVALUATE A LIST OF ROOMS ─────────────────────────────────
    const evaluateRooms = (
        roomList,
        curMinX,
        curMaxX,
        curMinY,
        curMaxY,
        curCOMX,
        curCOMY,
    ) => {
        const placements = [];
        for (const room of roomList) {
            for (const variant of generateVariants(room.matrix)) {
                const scanMinX = Math.max(0, curMinX - variant[0].length);
                const scanMaxX = Math.min(
                    width - variant[0].length,
                    curMaxX + 1,
                );
                const scanMinY = Math.max(0, curMinY - variant.length);
                const scanMaxY = Math.min(height - variant.length, curMaxY + 1);

                for (let y = scanMinY; y <= scanMaxY; y++) {
                    for (let x = scanMinX; x <= scanMaxX; x++) {
                        if (canPlace(variant, x, y)) {
                            placements.push({
                                score: getFitnessScore(
                                    variant,
                                    x,
                                    y,
                                    curCOMX,
                                    curCOMY,
                                ),
                                variant,
                                x,
                                y,
                                room,
                            });
                        }
                    }
                }
            }
        }
        return placements;
    };

    // ======================================================================
    // ─── MAIN ALGORITHM PIPELINE ──────────────────────────────────────────
    // ======================================================================

    // ─── PHASE 1: THE RANDOM ANCHOR
    const anchorRoom = rooms[Math.floor(Math.random() * rooms.length)];
    const anchorVariants = generateVariants(anchorRoom.matrix);
    const anchorVariant =
        anchorVariants[Math.floor(Math.random() * anchorVariants.length)];
    placeRoom(
        anchorVariant,
        Math.floor(width / 2 - anchorVariant[0].length / 2),
        Math.floor(height / 2 - anchorVariant.length / 2),
        anchorRoom,
    );

    // ─── PHASE 2: THE CARD DRAFT TOURNAMENT
    for (let i = 1; i < targetRoomCount; i++) {
        let curCOMX = 0,
            curCOMY = 0,
            totalBlocks = 0;
        let curMinX = width,
            curMaxX = -1,
            curMinY = height,
            curMaxY = -1;
        let needsCorner = false;

        // Calculate current board metrics
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                if (stateGrid[r][c] !== 0) {
                    curCOMX += c;
                    curCOMY += r;
                    totalBlocks++;
                    if (c < curMinX) curMinX = c;
                    if (c > curMaxX) curMaxX = c;
                    if (r < curMinY) curMinY = r;
                    if (r > curMaxY) curMaxY = r;
                }
                if (stateGrid[r][c] === 2 && !needsCorner) {
                    if (
                        (r > 0 && stateGrid[r - 1][c] === 0) ||
                        (r < height - 1 && stateGrid[r + 1][c] === 0) ||
                        (c > 0 && stateGrid[r][c - 1] === 0) ||
                        (c < width - 1 && stateGrid[r][c + 1] === 0)
                    ) {
                        needsCorner = true;
                    }
                }
            }
        }

        // Deal Rigged Hand
        const draftedRooms = [];
        const availableRooms = [...rooms];
        if (needsCorner) {
            const cornerRooms = availableRooms.filter((rm) =>
                rm.matrix.some((row) => row.includes(2)),
            );
            if (cornerRooms.length > 0) {
                const riggedRoom =
                    cornerRooms[Math.floor(Math.random() * cornerRooms.length)];
                draftedRooms.push(riggedRoom);
                availableRooms.splice(
                    availableRooms.findIndex((r) => r.id === riggedRoom.id),
                    1,
                );
            }
        }
        while (
            draftedRooms.length < Math.min(3, rooms.length) &&
            availableRooms.length > 0
        ) {
            draftedRooms.push(
                availableRooms.splice(
                    Math.floor(Math.random() * availableRooms.length),
                    1,
                )[0],
            );
        }

        // Score Drafted Hand (Fallback to entire library if draft is stuck)
        let validPlacements = evaluateRooms(
            draftedRooms,
            curMinX,
            curMaxX,
            curMinY,
            curMaxY,
            curCOMX / totalBlocks,
            curCOMY / totalBlocks,
        );
        if (validPlacements.length === 0) {
            validPlacements = evaluateRooms(
                rooms,
                curMinX,
                curMaxX,
                curMinY,
                curMaxY,
                curCOMX / totalBlocks,
                curCOMY / totalBlocks,
            );
        }

        if (validPlacements.length === 0) break;

        // Tournament Selection
        validPlacements.sort((a, b) => b.score - a.score);
        const topTier = validPlacements.filter(
            (p) => p.score === validPlacements[0].score,
        );
        const chosen = topTier[Math.floor(Math.random() * topTier.length)];
        placeRoom(chosen.variant, chosen.x, chosen.y, chosen.room);
    }

    // ─── PHASE 3: CENTERING & FINALIZATION
    let finalRoomsGrid = createMatrix(height, width);
    if (placedRooms.length > 0) {
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        placedRooms.forEach((r) => {
            const rRows = r.transformedMatrix.length,
                rCols = r.transformedMatrix[0]?.length || 0;
            for (let rR = 0; rR < rRows; rR++) {
                for (let rC = 0; rC < rCols; rC++) {
                    if (r.transformedMatrix[rR][rC] !== 0) {
                        minX = Math.min(minX, r.gridX + rC);
                        maxX = Math.max(maxX, r.gridX + rC);
                        minY = Math.min(minY, r.gridY + rR);
                        maxY = Math.max(maxY, r.gridY + rR);
                    }
                }
            }
        });

        const offsetX = Math.floor((width - (maxX - minX + 1)) / 2) - minX;
        const offsetY = Math.floor((height - (maxY - minY + 1)) / 2) - minY;

        placedRooms.forEach((room) => {
            room.gridX += offsetX;
            room.gridY += offsetY;
            for (let r = 0; r < room.transformedMatrix.length; r++) {
                for (
                    let c = 0;
                    c < (room.transformedMatrix[0]?.length || 0);
                    c++
                ) {
                    if (room.transformedMatrix[r][c] !== 0) {
                        const existingId =
                            finalRoomsGrid[room.gridY + r][room.gridX + c];
                        finalRoomsGrid[room.gridY + r][room.gridX + c] =
                            existingId !== 0
                                ? Array.isArray(existingId)
                                    ? [...existingId, room.instanceId]
                                    : [existingId, room.instanceId]
                                : room.instanceId;
                    }
                }
            }
        });
    }

    return {
        id: generateId("building"),
        cols: width,
        rows: height,
        matrix: finalRoomsGrid,
        rooms: placedRooms,
        doors: [],
    };
};

export const isDuplicateBuilding = () => {};
