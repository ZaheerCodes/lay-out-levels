import { generateId } from "./storage";

// ── Helpers ─────────────────────────────────────────────────────────────

const getIdsAtCell = (x, y, placedRooms) => {
    const ids = [];
    for (const r of placedRooms) {
        const lr = y - r.gridY;
        const lc = x - r.gridX;
        if (
            lr >= 0 &&
            lr < r.transformedMatrix.length &&
            lc >= 0 &&
            lc < (r.transformedMatrix[0]?.length || 0)
        ) {
            if (r.transformedMatrix[lr][lc] !== 0) {
                ids.push(r.instanceId);
            }
        }
    }
    return ids;
};

const getDiagonalAlignment = (gx, gy, room) => {
    const mat = room.transformedMatrix;
    const lr = gy - room.gridY;
    const lc = gx - room.gridX;

    const isSameRoom = (nr, nc) => {
        if (nr < 0 || nr >= mat.length || nc < 0 || nc >= (mat[0]?.length || 0))
            return false;
        return mat[nr][nc] !== 0;
    };

    const hasTop = isSameRoom(lr - 1, lc);
    const hasBottom = isSameRoom(lr + 1, lc);
    const hasLeft = isSameRoom(lr, lc - 1);
    const hasRight = isSameRoom(lr, lc + 1);

    if (hasBottom && hasRight) return "diagonal-forward";
    if (hasBottom && hasLeft) return "diagonal-backward";
    if (hasTop && hasRight) return "diagonal-backward";
    if (hasTop && hasLeft) return "diagonal-forward";

    if (hasBottom) return "diagonal-backward";
    if (hasTop) return "diagonal-backward";
    if (hasLeft) return "diagonal-forward";
    if (hasRight) return "diagonal-forward";

    return "diagonal-forward";
};

const isBetweenTheseRooms = (d, r1, r2) =>
    (d.room1Id === r1 && d.room2Id === r2) ||
    (d.room1Id === r2 && d.room2Id === r1);

// ── Manual Door Interactions ────────────────────────────────────────────

export const calculateNewDoors = (gx, gy, placedRooms, currentDoors) => {
    const centerIds = getIdsAtCell(gx, gy, placedRooms);
    if (centerIds.length === 0) return [];

    const newDoors = [];

    // 1. Diagonal overlap hit
    if (centerIds.length >= 2) {
        const room1Id = centerIds[0];
        const room2Id = centerIds[1];
        const room1 = placedRooms.find((r) => r.instanceId === room1Id);
        const align = getDiagonalAlignment(gx, gy, room1);
        const dX = gx + 0.5;
        const dY = gy + 0.5;

        const alreadyExists = currentDoors.some((d) =>
            isBetweenTheseRooms(d, room1Id, room2Id),
        );

        if (!alreadyExists) {
            newDoors.push({
                doorId: generateId("door"),
                room1Id: room1Id,
                room2Id: room2Id,
                gridX: dX,
                gridY: dY,
                alignment: align,
                isMst: false,
            });
        }
        return newDoors;
    }

    // 2. Orthogonal wall hit
    const checkAndAdd = (nx, ny, align, dx, dy) => {
        const neighborIds = getIdsAtCell(nx, ny, placedRooms);
        if (neighborIds.length === 0) return;

        let room1 = null;
        let room2 = null;

        for (const id1 of centerIds) {
            for (const id2 of neighborIds) {
                if (
                    id1 !== id2 &&
                    !neighborIds.includes(id1) &&
                    !centerIds.includes(id2)
                ) {
                    room1 = id1;
                    room2 = id2;
                    break;
                }
            }
            if (room1) break;
        }

        if (room1 && room2) {
            const dX = gx + dx;
            const dY = gy + dy;

            const alreadyExists = currentDoors.some((d) =>
                isBetweenTheseRooms(d, room1, room2),
            );
            const alreadyAdded = newDoors.some((d) =>
                isBetweenTheseRooms(d, room1, room2),
            );

            if (!alreadyExists && !alreadyAdded) {
                newDoors.push({
                    doorId: generateId("door"),
                    room1Id: room1,
                    room2Id: room2,
                    gridX: dX,
                    gridY: dY,
                    alignment: align,
                    isMst: false,
                });
            }
        }
    };

    checkAndAdd(gx, gy - 1, "horizontal", 0.5, 0);
    checkAndAdd(gx, gy + 1, "horizontal", 0.5, 1);
    checkAndAdd(gx - 1, gy, "vertical", 0, 0.5);
    checkAndAdd(gx + 1, gy, "vertical", 1, 0.5);

    return newDoors;
};

export const findClosestDoorToDelete = (x, y, doors, hitRadius = 0.7) => {
    let closestDoor = null;
    let minDist = hitRadius;
    for (const d of doors) {
        const dist = Math.hypot(d.gridX - x, d.gridY - y);
        if (dist < minDist) {
            minDist = dist;
            closestDoor = d;
        }
    }
    return closestDoor;
};

// ── MST Automated Door Generation ───────────────────────────────────────

class UnionFind {
    constructor(elements) {
        this.parent = {};
        elements.forEach((e) => (this.parent[e] = e));
    }
    find(i) {
        if (this.parent[i] === i) return i;
        this.parent[i] = this.find(this.parent[i]);
        return this.parent[i];
    }
    union(i, j) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI !== rootJ) {
            this.parent[rootI] = rootJ;
            return true;
        }
        return false;
    }
}

export const generateDoorsMST = (
    placedRooms,
    loopProbability = 0.15,
    maxDoors = 3,
) => {
    const potentialDoors = [];

    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    placedRooms.forEach((r) => {
        const rows = r.transformedMatrix.length;
        const cols = r.transformedMatrix[0]?.length || 0;
        minX = Math.min(minX, r.gridX);
        minY = Math.min(minY, r.gridY);
        maxX = Math.max(maxX, r.gridX + cols);
        maxY = Math.max(maxY, r.gridY + rows);
    });

    // 1. Scan grid for all adjacent rooms
    for (let y = minY - 1; y <= maxY + 1; y++) {
        for (let x = minX - 1; x <= maxX + 1; x++) {
            const centerIds = getIdsAtCell(x, y, placedRooms);

            // A. Diagonal Overlaps (State 2)
            if (centerIds.length >= 2) {
                for (let i = 0; i < centerIds.length; i++) {
                    for (let j = i + 1; j < centerIds.length; j++) {
                        const r1 = centerIds[i];
                        const r2 = centerIds[j];
                        const room1 = placedRooms.find(
                            (r) => r.instanceId === r1,
                        );
                        const align = getDiagonalAlignment(x, y, room1);
                        potentialDoors.push({
                            room1Id: r1,
                            room2Id: r2,
                            gridX: x + 0.5,
                            gridY: y + 0.5,
                            alignment: align,
                            weight: Math.random(),
                        });
                    }
                }
            }

            // B. Orthogonal Adjacency (Right)
            const rightIds = getIdsAtCell(x + 1, y, placedRooms);
            for (const id1 of centerIds) {
                for (const id2 of rightIds) {
                    if (
                        id1 !== id2 &&
                        !rightIds.includes(id1) &&
                        !centerIds.includes(id2)
                    ) {
                        potentialDoors.push({
                            room1Id: id1,
                            room2Id: id2,
                            gridX: x + 1,
                            gridY: y + 0.5,
                            alignment: "vertical",
                            weight: Math.random(),
                        });
                    }
                }
            }

            // C. Orthogonal Adjacency (Down)
            const downIds = getIdsAtCell(x, y + 1, placedRooms);
            for (const id1 of centerIds) {
                for (const id2 of downIds) {
                    if (
                        id1 !== id2 &&
                        !downIds.includes(id1) &&
                        !centerIds.includes(id2)
                    ) {
                        potentialDoors.push({
                            room1Id: id1,
                            room2Id: id2,
                            gridX: x + 0.5,
                            gridY: y + 1,
                            alignment: "horizontal",
                            weight: Math.random(),
                        });
                    }
                }
            }
        }
    }

    // 2. Normalize and deduplicate exact duplicate spots
    const uniqueDoors = [];
    const seenLocations = new Set();
    for (const pd of potentialDoors) {
        const r1 = pd.room1Id < pd.room2Id ? pd.room1Id : pd.room2Id;
        const r2 = pd.room1Id < pd.room2Id ? pd.room2Id : pd.room1Id;

        const key = `${r1}_${r2}_${pd.gridX}_${pd.gridY}_${pd.alignment}`;
        if (!seenLocations.has(key)) {
            seenLocations.add(key);
            uniqueDoors.push({ ...pd, room1Id: r1, room2Id: r2 });
        }
    }

    // 3. Constrained Kruskal's MST Algorithm
    uniqueDoors.sort((a, b) => a.weight - b.weight);

    const uf = new UnionFind(placedRooms.map((r) => r.instanceId));
    const finalDoors = [];
    let rejectedDoors = [];
    const doorPairs = new Set();
    const doorCounts = {};

    placedRooms.forEach((r) => (doorCounts[r.instanceId] = 0));
    let components = placedRooms.length;

    // PASS 1: Strict Limit MST
    for (const edge of uniqueDoors) {
        if (components === 1) {
            rejectedDoors.push(edge);
            continue;
        }

        const pairKey = `${edge.room1Id}_${edge.room2Id}`;

        if (uf.find(edge.room1Id) !== uf.find(edge.room2Id)) {
            // Respect the door limit
            if (
                doorCounts[edge.room1Id] < maxDoors &&
                doorCounts[edge.room2Id] < maxDoors
            ) {
                uf.union(edge.room1Id, edge.room2Id);
                finalDoors.push({
                    doorId: generateId("door"),
                    room1Id: edge.room1Id,
                    room2Id: edge.room2Id,
                    gridX: edge.gridX,
                    gridY: edge.gridY,
                    alignment: edge.alignment,
                    isMst: true,
                });
                doorPairs.add(pairKey);
                doorCounts[edge.room1Id]++;
                doorCounts[edge.room2Id]++;
                components--;
            } else {
                rejectedDoors.push(edge);
            }
        } else {
            rejectedDoors.push(edge);
        }
    }

    // PASS 2: Forced Connectivity (If Pass 1 failed to connect the whole graph)
    if (components > 1) {
        const forcedRejects = [];
        for (const edge of rejectedDoors) {
            if (components === 1) {
                forcedRejects.push(edge);
                continue;
            }

            const pairKey = `${edge.room1Id}_${edge.room2Id}`;
            if (uf.find(edge.room1Id) !== uf.find(edge.room2Id)) {
                // Ignore the limit here to prevent broken/unbeatable levels
                uf.union(edge.room1Id, edge.room2Id);
                finalDoors.push({
                    doorId: generateId("door"),
                    room1Id: edge.room1Id,
                    room2Id: edge.room2Id,
                    gridX: edge.gridX,
                    gridY: edge.gridY,
                    alignment: edge.alignment,
                    isMst: true,
                });
                doorPairs.add(pairKey);
                doorCounts[edge.room1Id]++;
                doorCounts[edge.room2Id]++;
                components--;
            } else {
                forcedRejects.push(edge);
            }
        }
        rejectedDoors = forcedRejects;
    }

    // PASS 3: Flanking Loops (Strictly enforce limit)
    for (const edge of rejectedDoors) {
        const pairKey = `${edge.room1Id}_${edge.room2Id}`;
        // Add loop only if these two rooms don't ALREADY have a door between them
        if (!doorPairs.has(pairKey) && Math.random() < loopProbability) {
            if (
                doorCounts[edge.room1Id] < maxDoors &&
                doorCounts[edge.room2Id] < maxDoors
            ) {
                finalDoors.push({
                    doorId: generateId("door"),
                    room1Id: edge.room1Id,
                    room2Id: edge.room2Id,
                    gridX: edge.gridX,
                    gridY: edge.gridY,
                    alignment: edge.alignment,
                    isMst: false,
                });
                doorPairs.add(pairKey);
                doorCounts[edge.room1Id]++;
                doorCounts[edge.room2Id]++;
            }
        }
    }

    return finalDoors;
};
