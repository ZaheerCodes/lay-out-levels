// ============================================================
// mstAlgorithm.js — Punch Doors (4-Phase Kruskal's MST)
// ============================================================

const DIRS = [
    [0, 1, "h"],
    [0, -1, "h"],
    [1, 0, "v"],
    [-1, 0, "v"],
];

/**
 * Build a cell-to-instanceId lookup from all placed rooms.
 * Returns Map<"r,c", instanceId>
 */
export function buildCellMap(placedRooms) {
    const map = new Map();
    for (const room of placedRooms) {
        const { instanceId, gridX, gridY, transformedMatrix } = room;
        const rows = transformedMatrix.length;
        const cols = transformedMatrix[0]?.length ?? 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (transformedMatrix[r][c] !== 0) {
                    map.set(`${gridY + r},${gridX + c}`, instanceId);
                }
            }
        }
    }
    return map;
}

/**
 * Phase 1: Find all shared boundaries between rooms.
 * Returns array of SharedEdge: { room1Id, room2Id, cells: [{r,c,side}], center }
 */
export function findSharedEdges(placedRooms) {
    // 1. Determine grid bounds dynamically
    let maxR = 0,
        maxC = 0;
    for (const room of placedRooms) {
        maxR = Math.max(maxR, room.gridY + room.transformedMatrix.length);
        maxC = Math.max(
            maxC,
            room.gridX + (room.transformedMatrix[0]?.length || 0),
        );
    }

    // 2. Build 2D map to handle overlaps safely
    const grid = Array.from({ length: maxR }, () => Array(maxC).fill(null));
    for (const room of placedRooms) {
        for (let r = 0; r < room.transformedMatrix.length; r++) {
            for (let c = 0; c < (room.transformedMatrix[0]?.length || 0); c++) {
                if (room.transformedMatrix[r][c] !== 0) {
                    const gr = room.gridY + r;
                    const gc = room.gridX + c;
                    if (!grid[gr][gc]) grid[gr][gc] = [];
                    grid[gr][gc].push(room.instanceId);
                }
            }
        }
    }

    const wallSegments = new Map(); // Group walls by: "id1|id2" -> [ {align, x, y} ]

    const addWall = (id1, id2, align, x, y) => {
        const pair = [id1, id2].sort().join("|");
        if (!wallSegments.has(pair)) wallSegments.set(pair, []);
        // NOTE: x is Column (c), y is Row (r)
        wallSegments.get(pair).push({ align, x, y });
    };

    // 3. Scan for solid flat walls (ignoring overlapping stealth corners)
    for (let r = 0; r < maxR; r++) {
        for (let c = 0; c < maxC; c++) {
            const cellA = grid[r][c];
            if (!cellA || cellA.length > 1) continue;
            const idA = cellA[0];

            // Check Right (Identifies a Vertical Wall boundary)
            if (c + 1 < maxC) {
                const cellRight = grid[r][c + 1];
                if (
                    cellRight &&
                    cellRight.length === 1 &&
                    cellRight[0] !== idA
                ) {
                    // CRITICAL FIX: A vertical wall needs a "horizontal" door alignment
                    addWall(idA, cellRight[0], "horizontal", c + 0.5, r);
                }
            }

            // Check Down (Identifies a Horizontal Wall boundary)
            if (r + 1 < maxR) {
                const cellDown = grid[r + 1][c];
                if (cellDown && cellDown.length === 1 && cellDown[0] !== idA) {
                    // CRITICAL FIX: A horizontal wall needs a "vertical" door alignment
                    addWall(idA, cellDown[0], "vertical", c, r + 0.5);
                }
            }
        }
    }

    // 4. Find the best contiguous straight segment for each room pair
    const edges = [];
    for (const [pairKey, walls] of wallSegments) {
        const [room1Id, room2Id] = pairKey.split("|");

        // CRITICAL FIX: Alignment definitions are swapped now.
        // "horizontal" alignment means the wall varies along the X (col) axis, Y (row) is fixed.
        const hWalls = walls.filter((w) => w.align === "horizontal");
        // "vertical" alignment means the wall varies along the Y (row) axis, X (col) is fixed.
        const vWalls = walls.filter((w) => w.align === "vertical");

        // Helper to find the longest unbroken chunk of wall
        const findBestDoor = (wallList, isDoorVertical) => {
            if (wallList.length === 0) return null;

            const groups = new Map();
            for (const w of wallList) {
                // If door is vertical, X (col) is fixed. If horizontal, Y (row) is fixed.
                const fixed = isDoorVertical ? w.x : w.y;
                const varying = isDoorVertical ? w.y : w.x;
                if (!groups.has(fixed)) groups.set(fixed, []);
                groups.get(fixed).push(varying);
            }

            let bestCenter = null,
                maxLen = 0;

            for (const [fixed, varArr] of groups) {
                varArr.sort((a, b) => a - b);
                let currentChunk = [varArr[0]];

                const checkChunk = () => {
                    if (currentChunk.length > maxLen) {
                        maxLen = currentChunk.length;
                        const mid =
                            currentChunk[Math.floor(currentChunk.length / 2)];
                        // Map back to r,c coordinates based on alignment
                        bestCenter = isDoorVertical
                            ? { c: fixed, r: mid }
                            : { c: mid, r: fixed };
                    }
                };

                for (let i = 1; i < varArr.length; i++) {
                    // Check if the wall segments are adjacent (e.g., row 5 and row 6)
                    if (Math.abs(varArr[i] - varArr[i - 1]) < 1.1) {
                        currentChunk.push(varArr[i]); // Contiguous
                    } else {
                        checkChunk();
                        currentChunk = [varArr[i]]; // Break, start new chunk
                    }
                }
                checkChunk();
            }
            // Return the alignment string that the renderer expects
            return {
                center: bestCenter,
                len: maxLen,
                align: isDoorVertical ? "vertical" : "horizontal",
            };
        };

        // Find best segment for both orientations
        const bestV = findBestDoor(vWalls, true);
        const bestH = findBestDoor(hWalls, false);

        // If they share walls on multiple sides, pick the longest one
        const bestDoor =
            bestV && bestH
                ? bestV.len >= bestH.len
                    ? bestV
                    : bestH
                : bestV || bestH;

        if (bestDoor && bestDoor.center) {
            edges.push({
                room1Id,
                room2Id,
                center: bestDoor.center,
                alignment: bestDoor.align,
                length: bestDoor.len,
            });
        }
    }

    return edges;
}

// ── Union-Find (Disjoint Set Union) ──────────────────────────
function makeUF(ids) {
    const parent = {};
    const rank = {};
    for (const id of ids) {
        parent[id] = id;
        rank[id] = 0;
    }
    function find(x) {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    }
    function union(a, b) {
        const ra = find(a),
            rb = find(b);
        if (ra === rb) return false;
        if (rank[ra] < rank[rb]) parent[ra] = rb;
        else if (rank[ra] > rank[rb]) parent[rb] = ra;
        else {
            parent[rb] = ra;
            rank[ra]++;
        }
        return true;
    }
    return { find, union };
}

/**
 * Execute all 4 phases of the Punch Doors algorithm.
 * Returns door array conforming to Schema C.
 */
export function punchDoors(placedRooms) {
    if (placedRooms.length < 2) return [];

    const ids = placedRooms.map((r) => r.instanceId);
    const sharedEdges = findSharedEdges(placedRooms);
    if (sharedEdges.length === 0) return [];

    // Phase 2: Kruskal's MST
    // Randomize weights for variety
    const sorted = [...sharedEdges].sort(() => Math.random() - 0.5);
    const uf = makeUF(ids);
    const mstEdges = [];
    const discardedEdges = [];

    for (const edge of sorted) {
        if (uf.union(edge.room1Id, edge.room2Id)) {
            mstEdges.push(edge);
        } else {
            discardedEdges.push(edge);
        }
    }

    const doors = [];

    // MST doors
    mstEdges.forEach((edge, i) => {
        doors.push({
            doorId: `door_mst_${i}`,
            room1Id: edge.room1Id,
            room2Id: edge.room2Id,
            gridX: edge.center.c,
            gridY: edge.center.r,
            alignment: edge.alignment,
            isMst: true,
        });
    });

    // Phase 3: Flanking loops — 15% of discarded edges
    const flankCount = Math.max(1, Math.floor(discardedEdges.length * 0.15));
    const shuffled = discardedEdges.sort(() => Math.random() - 0.5);
    shuffled.slice(0, flankCount).forEach((edge, i) => {
        doors.push({
            doorId: `door_flank_${i}`,
            room1Id: edge.room1Id,
            room2Id: edge.room2Id,
            gridX: edge.center.c,
            gridY: edge.center.r,
            alignment: edge.alignment,
            isMst: false,
        });
    });

    return doors;
}

/**
 * Check collisions between placed rooms.
 * Returns Set of instanceIds that are in collision.
 */
export function findCollisions(placedRooms) {
    // Build map: "r,c" -> [{instanceId, state}]
    const cellMap = new Map();
    for (const room of placedRooms) {
        const { instanceId, gridX, gridY, transformedMatrix } = room;
        const rows = transformedMatrix.length;
        const cols = transformedMatrix[0]?.length ?? 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const state = transformedMatrix[r][c];
                if (state === 0) continue;
                const key = `${gridY + r},${gridX + c}`;
                if (!cellMap.has(key)) cellMap.set(key, []);
                cellMap.get(key).push({ instanceId, state });
            }
        }
    }

    const colliding = new Set();
    for (const [, occupants] of cellMap) {
        if (occupants.length < 2) continue;
        // Rule: state1+state1 = INVALID, state1+state2 = INVALID, state2+state2 = VALID
        const allOverlapable = occupants.every((o) => o.state === 2);
        if (!allOverlapable) {
            occupants.forEach((o) => colliding.add(o.instanceId));
        }
    }
    return colliding;
}

/**
 * BFS connectivity check for all placed rooms.
 * Returns Set of instanceIds that are isolated (disconnected).
 */
export function findIsolatedRooms(placedRooms) {
    if (placedRooms.length <= 1) return new Set();

    const cellMap = buildCellMap(placedRooms);
    // Build adjacency graph
    const adj = new Map();
    for (const room of placedRooms) adj.set(room.instanceId, new Set());

    for (const [cellKey, id1] of cellMap) {
        const [r, c] = cellKey.split(",").map(Number);
        for (const [dr, dc] of [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
        ]) {
            const id2 = cellMap.get(`${r + dr},${c + dc}`);
            if (id2 && id2 !== id1) {
                adj.get(id1)?.add(id2);
                adj.get(id2)?.add(id1);
            }
        }
    }

    // BFS from first room
    const start = placedRooms[0].instanceId;
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
        const cur = queue.shift();
        for (const nb of adj.get(cur) ?? []) {
            if (!visited.has(nb)) {
                visited.add(nb);
                queue.push(nb);
            }
        }
    }

    const allIds = new Set(placedRooms.map((r) => r.instanceId));
    const isolated = new Set();
    for (const id of allIds) {
        if (!visited.has(id)) isolated.add(id);
    }
    return isolated;
}

/**
 * Build the master grid 2D array for export (Schema C).
 */
export function buildMasterGrid(placedRooms, width, height) {
    const grid = Array.from({ length: height }, () => Array(width).fill(0));
    for (const room of placedRooms) {
        const { instanceId, gridX, gridY, transformedMatrix } = room;
        const rows = transformedMatrix.length;
        const cols = transformedMatrix[0]?.length ?? 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (transformedMatrix[r][c] !== 0) {
                    const gr = gridY + r,
                        gc = gridX + c;
                    if (gr >= 0 && gr < height && gc >= 0 && gc < width) {
                        grid[gr][gc] = instanceId;
                    }
                }
            }
        }
    }
    return grid;
}
