import { rotate90 } from "./matrixOps";

const ROOMS_KEY = "lol_rooms";
const BUILDINGS_KEY = "lol_buildings";

export const addRoom = (room) => {
    const rooms = loadRooms();
    if (room.width > room.height) {
        [room.width, room.height] = [room.height, room.width];
        room.matrix = rotate90(room.matrix);
    }
    rooms.push(room);
    saveRooms(rooms);
    return rooms;
};

export const updateRoom = (updated) => {
    const rooms = loadRooms().map((r) => (r.id === updated.id ? updated : r));
    saveRooms(rooms);
    return rooms;
};

export const deleteRoom = (id) => {
    const rooms = loadRooms().filter((r) => r.id !== id);
    saveRooms(rooms);
    return rooms;
};

export const sortRooms = (arr) => {
    const countOnCells = (matrix) =>
        matrix.flat().filter((cell) => cell === 1).length;

    return arr.sort((objA, objB) => {
        const matA = objA.matrix;
        const matB = objB.matrix;
        const colsA = matA[0]?.length || 0;
        const colsB = matB[0]?.length || 0;
        if (colsA !== colsB) {
            return colsA - colsB;
        }
        const rowsA = matA.length;
        const rowsB = matB.length;
        if (rowsA !== rowsB) {
            return rowsA - rowsB;
        }
        return countOnCells(matB) - countOnCells(matA);
    });
};

export const loadRooms = () => {
    try {
        const raw = localStorage.getItem(ROOMS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveRooms = (rooms) => {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
};

export const addBuilding = (building) => {
    const buildings = loadBuildings();
    buildings.push(building);
    saveBuildings(buildings);
    return buildings;
};

export const deleteBuilding = (id) => {
    const buildings = loadBuildings().filter((b) => b.id !== id);
    saveBuildings(buildings);
    return buildings;
};

export const loadBuildings = () => {
    try {
        const raw = localStorage.getItem(BUILDINGS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveBuildings = (buildings) => {
    localStorage.setItem(BUILDINGS_KEY, JSON.stringify(buildings));
};

export function cleanBuildingData(rawLevelData) {
    const cleanData = {
        name: rawLevelData.levelName,
        rooms: {},
        doors: [],
    };

    for (const [key, room] of Object.entries(rawLevelData.rooms)) {
        cleanData.rooms[key] = {
            id: room.instanceId,
            gridX: room.gridX,
            gridY: room.gridY,
            matrix: room.transformedMatrix,
        };
    }

    cleanData.doors = rawLevelData.doors.map((door) => ({
        gridX: door.gridX,
        gridY: door.gridY,
        alignment: door.alignment,
    }));

    return cleanData;
}

export const generateId = (prefix) => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
};
