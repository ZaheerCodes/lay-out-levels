export const createMatrix = (rows, cols) => {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
};

export const cloneMatrix = (mat) => {
    return mat.map((row) => [...row]);
};

export const rotate90 = (mat, ccw = false) => {
    if (!mat.length || !mat[0].length) return [];
    const rows = mat.length;
    const cols = mat[0].length;
    const result = createMatrix(cols, rows);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (ccw) result[cols - 1 - c][r] = mat[r][c];
            else result[c][rows - 1 - r] = mat[r][c];
        }
    }
    return result;
};

export const flipH = (mat) => {
    return mat.map((row) => [...row].reverse());
};

export const flipV = (mat) => {
    return [...mat].reverse().map((row) => [...row]);
};

export const generateVariants = (mat) => {
    const r0 = mat;
    const r90 = rotate90(r0);
    const r180 = rotate90(r90);
    const r270 = rotate90(r180);
    const variants = [
        r0,
        r90,
        r180,
        r270,
        flipH(r0),
        flipH(r90),
        flipH(r180),
        flipH(r270),
    ];
    const uniqueVariants = [];
    const seen = new Set();
    for (const v of variants) {
        const str = JSON.stringify(v);
        if (!seen.has(str)) {
            seen.add(str);
            uniqueVariants.push(v);
        }
    }

    return uniqueVariants;
};

export const serializeMatrix = (mat) => {
    return mat.map((row) => row.join(",")).join("|");
};

export const matricesEqual = (a, b) => {
    if (a.length !== b.length) return false;
    if (a[0].length !== b[0].length) return false;
    return serializeMatrix(a) === serializeMatrix(b);
};

export const extractBoundingBox = (grid) => {
    const rows = grid.length;
    const cols = grid[0].length;
    let minY = Infinity,
        maxY = -Infinity;
    let minX = Infinity,
        maxX = -Infinity;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] !== 0) {
                if (r < minY) minY = r;
                if (r > maxY) maxY = r;
                if (c < minX) minX = c;
                if (c > maxX) maxX = c;
            }
        }
    }

    if (minY === Infinity) return null;

    const trimmedMatrix = grid
        .slice(minY, maxY + 1)
        .map((row) => row.slice(minX, maxX + 1));

    return { trimmedMatrix, minX, minY, maxX, maxY };
};

export const applyTransform = (baseMat, rotation, flipX, flipY) => {
    let mat = cloneMatrix(baseMat);
    const steps = (((rotation / 90) % 4) + 4) % 4;
    for (let i = 0; i < steps; i++) mat = rotate90(mat);
    if (flipX) mat = flipH(mat);
    if (flipY) mat = flipV(mat);
    return mat;
};
