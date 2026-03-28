export const isDuplicateRoom = (newRoom, existingRooms) => {
    const variants = generateVariants(newRoom);
    const variantStrings = new Set(variants.map(serializeMatrix));
    return existingRooms.some((r) =>
        variantStrings.has(serializeMatrix(r.matrix)),
    );
};

export const isTouchingState2 = (grid, r, c) => {
    return (
        grid[r + 1][c] === 2 ||
        grid[r - 1][c] === 2 ||
        grid[r][c + 1] === 2 ||
        grid[r][c - 1] === 2
    );
};

export const getCompositeOrientation = (r, c, cGrid, targetId) => {
    const isSameRoom = (nr, nc) => {
        if (nr < 0 || nr >= cGrid.length || nc < 0 || nc >= cGrid[0].length)
            return false;
        return cGrid[nr][nc].ids.includes(targetId);
    };

    const hasTop = isSameRoom(r - 1, c);
    const hasBottom = isSameRoom(r + 1, c);
    const hasLeft = isSameRoom(r, c - 1);
    const hasRight = isSameRoom(r, c + 1);

    if (hasBottom && hasRight) return "br";
    if (hasBottom && hasLeft) return "bl";
    if (hasTop && hasRight) return "tr";
    if (hasTop && hasLeft) return "tl";

    if (hasBottom) return "bl";
    if (hasTop) return "tr";
    if (hasLeft) return "tl";
    if (hasRight) return "br";

    return "tl";
};

export const getOverlapOrientation = (grid, r, c) => {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    const isVoid = (nr, nc) => {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return true;
        return grid[nr][nc] === 0;
    };

    const tl = isVoid(r - 1, c - 1) && isVoid(r - 1, c) && isVoid(r, c - 1);
    const tr = isVoid(r - 1, c + 1) && isVoid(r - 1, c) && isVoid(r, c + 1);
    const bl = isVoid(r + 1, c - 1) && isVoid(r + 1, c) && isVoid(r, c - 1);
    const br = isVoid(r + 1, c + 1) && isVoid(r + 1, c) && isVoid(r, c + 1);

    if (tl) return "tl";
    if (tr) return "tr";
    if (bl) return "bl";
    if (br) return "br";
    return null;
};
