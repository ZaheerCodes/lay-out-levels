import { useRef, useState, useCallback, useEffect } from "react";
import styles from "./EditorGrid.module.css";
import { GridCell } from "../GridCell/GridCell";

const EditorGrid = ({
    gridCols = 30,
    gridRows = 30,
    cellSize = 64,
    customCursor,
    onActionDown,
    onActionMove,
    onActionUp,
    onContextMenu,
    matrices = [],
    doors = [],
}) => {
    const svgRef = useRef(null);
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const hasInit = useRef(false);

    const [view, setView] = useState({
        zoom: 0,
        pan: { x: 0, y: 0 },
    });
    const [svgDims, setSvgDims] = useState({ w: 0, h: 0 });

    const constrainView = useCallback(
        (targetZoom, targetPanX, targetPanY, w, h) => {
            if (w === 0 || h === 0)
                return {
                    zoom: targetZoom,
                    pan: { x: targetPanX, y: targetPanY },
                };
            const gridPixelW = gridCols * cellSize;
            const gridPixelH = gridRows * cellSize;
            const minZ = Math.max(w / gridPixelW, h / gridPixelH);
            const maxZ = w / (6 * cellSize);

            const finalZoom = Math.min(
                Math.max(targetZoom, minZ),
                Math.max(minZ, maxZ),
            );
            const scaledW = gridPixelW * finalZoom;
            const scaledH = gridPixelH * finalZoom;
            const finalPanX = Math.max(w - scaledW, Math.min(0, targetPanX));
            const finalPanY = Math.max(h - scaledH, Math.min(0, targetPanY));

            return { zoom: finalZoom, pan: { x: finalPanX, y: finalPanY } };
        },
        [gridCols, gridRows, cellSize],
    );

    useEffect(() => {
        const el = svgRef.current;
        if (!el) return;
        const obs = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setSvgDims({ w: width, h: height });

            if (!hasInit.current && width > 0 && height > 0) {
                hasInit.current = true;
                const gridPixelW = gridCols * cellSize;
                const gridPixelH = gridRows * cellSize;
                const minZ = Math.max(width / gridPixelW, height / gridPixelH);
                const initialPanX = (width - gridPixelW * minZ) / 2;
                const initialPanY = (height - gridPixelH * minZ) / 2;

                setView(
                    constrainView(
                        minZ,
                        initialPanX,
                        initialPanY,
                        width,
                        height,
                    ),
                );
            } else {
                setView((prev) =>
                    constrainView(
                        prev.zoom,
                        prev.pan.x,
                        prev.pan.y,
                        width,
                        height,
                    ),
                );
            }
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, [constrainView, gridCols, gridRows, cellSize]);

    const handleWheel = useCallback(
        (e) => {
            e.preventDefault();
            if (svgDims.w === 0) return;
            const rect = svgRef.current.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setView((prev) => {
                const targetZoom = prev.zoom * delta;
                const targetPanX =
                    mx - (mx - prev.pan.x) * (targetZoom / prev.zoom);
                const targetPanY =
                    my - (my - prev.pan.y) * (targetZoom / prev.zoom);
                return constrainView(
                    targetZoom,
                    targetPanX,
                    targetPanY,
                    svgDims.w,
                    svgDims.h,
                );
            });
        },
        [constrainView, svgDims],
    );

    useEffect(() => {
        const el = svgRef.current;
        if (!el) return;
        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    const getGridCoords = useCallback(
        (e) => {
            const rect = svgRef.current.getBoundingClientRect();
            const mx = (e.clientX - rect.left - view.pan.x) / view.zoom;
            const my = (e.clientY - rect.top - view.pan.y) / view.zoom;
            return {
                x: Math.floor(mx / cellSize),
                y: Math.floor(my / cellSize),
                rawX: mx,
                rawY: my,
                zoom: view.zoom,
            };
        },
        [view, cellSize],
    );

    const handleMouseDown = useCallback(
        (e) => {
            if (e.button === 1 || e.altKey) {
                isPanning.current = true;
                panStart.current = {
                    x: e.clientX,
                    y: e.clientY,
                    panX: view.pan.x,
                    panY: view.pan.y,
                };
                return;
            }
            if (onActionDown) onActionDown(e, getGridCoords(e));
        },
        [view, getGridCoords, onActionDown],
    );

    const handleMouseMove = useCallback(
        (e) => {
            if (isPanning.current) {
                setView((prev) =>
                    constrainView(
                        prev.zoom,
                        panStart.current.panX + e.clientX - panStart.current.x,
                        panStart.current.panY + e.clientY - panStart.current.y,
                        svgDims.w,
                        svgDims.h,
                    ),
                );
                return;
            }
            if (onActionMove) onActionMove(e, getGridCoords(e));
        },
        [constrainView, svgDims, getGridCoords, onActionMove],
    );

    const handleMouseUp = useCallback(
        (e) => {
            isPanning.current = false;
            if (onActionUp) onActionUp(e, getGridCoords(e));
        },
        [getGridCoords, onActionUp],
    );

    const handleContextMenu = useCallback(
        (e) => {
            if (onContextMenu) onContextMenu(e, getGridCoords(e));
        },
        [getGridCoords, onContextMenu],
    );

    const visColStart = Math.max(
        0,
        Math.floor(-view.pan.x / view.zoom / cellSize),
    );
    const visColEnd = Math.min(
        gridCols,
        Math.ceil((svgDims.w - view.pan.x) / view.zoom / cellSize),
    );
    const visRowStart = Math.max(
        0,
        Math.floor(-view.pan.y / view.zoom / cellSize),
    );
    const visRowEnd = Math.min(
        gridRows,
        Math.ceil((svgDims.h - view.pan.y) / view.zoom / cellSize),
    );

    const gridLines = [];
    for (let c = visColStart; c <= visColEnd; c++) {
        const isMajor = c % 10 === 0;
        gridLines.push(
            <line
                key={`v${c}`}
                x1={c * cellSize}
                y1={visRowStart * cellSize}
                x2={c * cellSize}
                y2={visRowEnd * cellSize}
                stroke={
                    isMajor
                        ? "var(--color-grid-line-major)"
                        : "var(--color-grid-line)"
                }
                strokeWidth={isMajor ? 1 : 0.5}
            />,
        );
    }
    for (let r = visRowStart; r <= visRowEnd; r++) {
        const isMajor = r % 10 === 0;
        gridLines.push(
            <line
                key={`h${r}`}
                x1={visColStart * cellSize}
                y1={r * cellSize}
                x2={visColEnd * cellSize}
                y2={r * cellSize}
                stroke={
                    isMajor
                        ? "var(--color-grid-line-major)"
                        : "var(--color-grid-line)"
                }
                strokeWidth={isMajor ? 1 : 0.5}
            />,
        );
    }

    const cGrid = Array.from({ length: gridRows }, () =>
        Array.from({ length: gridCols }, () => ({
            state: 0,
            ids: [],
            isColliding: false,
            isIsolated: false,
            isSelected: false,
            isError: false,
        })),
    );

    matrices.forEach((matData) => {
        const {
            id,
            matrix,
            x = 0,
            y = 0,
            errorCells,
            isColliding,
            isIsolated,
            isSelected,
        } = matData;
        const rows = matrix.length;
        const cols = matrix[0]?.length || 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (matrix[r][c] === 0) continue;
                const gr = y + r;
                const gc = x + c;

                if (gr >= 0 && gr < gridRows && gc >= 0 && gc < gridCols) {
                    const cell = cGrid[gr][gc];
                    cell.ids.push(id);

                    if (matrix[r][c] === 1) cell.state = 1;
                    else if (cell.state === 0) cell.state = 2;

                    if (errorCells?.has(`${r},${c}`)) cell.isError = true;
                    if (isColliding) cell.isColliding = true;
                    if (isIsolated) cell.isIsolated = true;
                    if (isSelected) cell.isSelected = true;
                }
            }
        }
    });

    const isEdge = (nr, nc, sourceIds) => {
        if (nr < 0 || nr >= gridRows || nc < 0 || nc >= gridCols) return true;
        const targetIds = cGrid[nr][nc].ids;
        if (targetIds.length === 0) return true;
        return !sourceIds.some((id) => targetIds.includes(id));
    };

    const renderedCells = [];
    for (let r = visRowStart; r <= visRowEnd; r++) {
        for (let c = visColStart; c <= visColEnd; c++) {
            if (r >= gridRows || c >= gridCols) continue;
            const cell = cGrid[r][c];
            if (cell.state === 0) continue;

            renderedCells.push(
                <GridCell
                    key={`${r},${c}`}
                    r={r}
                    c={c}
                    px={c * cellSize}
                    py={r * cellSize}
                    size={cellSize}
                    zoom={view.zoom}
                    cellData={cell}
                    cGrid={cGrid}
                    isEdge={isEdge}
                />,
            );
        }
    }

    // ── 4. Render Bounding Boxes for Selections ─────────────
    const renderedSelections = matrices
        .filter((m) => m.isSelected)
        .map((mat) => (
            <rect
                key={`sel-${mat.id}`}
                x={mat.x * cellSize}
                y={mat.y * cellSize}
                width={(mat.matrix[0]?.length || 0) * cellSize}
                height={mat.matrix.length * cellSize}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2 / view.zoom}
                rx={2}
                strokeDasharray={`${6 / view.zoom} ${3 / view.zoom}`}
            />
        ));

    const renderedDoors = doors.map((door) => {
        let lineEl = null;

        if (door.alignment === "horizontal") {
            lineEl = (
                <line
                    x1={(door.gridX - 0.5) * cellSize}
                    y1={door.gridY * cellSize}
                    x2={(door.gridX + 0.5) * cellSize}
                    y2={door.gridY * cellSize}
                    stroke="var(--color-success)"
                    strokeWidth={4 / view.zoom}
                    strokeLinecap="round"
                />
            );
        } else if (door.alignment === "vertical") {
            lineEl = (
                <line
                    x1={door.gridX * cellSize}
                    y1={(door.gridY - 0.5) * cellSize}
                    x2={door.gridX * cellSize}
                    y2={(door.gridY + 0.5) * cellSize}
                    stroke="var(--color-success)"
                    strokeWidth={4 / view.zoom}
                    strokeLinecap="round"
                />
            );
        } else if (door.alignment === "diagonal-forward") {
            lineEl = (
                <line
                    x1={(door.gridX - 0.35) * cellSize}
                    y1={(door.gridY + 0.35) * cellSize}
                    x2={(door.gridX + 0.35) * cellSize}
                    y2={(door.gridY - 0.35) * cellSize}
                    stroke="var(--color-success)"
                    strokeWidth={4 / view.zoom}
                    strokeLinecap="round"
                />
            );
        } else if (door.alignment === "diagonal-backward") {
            lineEl = (
                <line
                    x1={(door.gridX - 0.35) * cellSize}
                    y1={(door.gridY - 0.35) * cellSize}
                    x2={(door.gridX + 0.35) * cellSize}
                    y2={(door.gridY + 0.35) * cellSize}
                    stroke="var(--color-success)"
                    strokeWidth={4 / view.zoom}
                    strokeLinecap="round"
                />
            );
        }

        return (
            <g key={door.doorId}>
                {lineEl}
                <circle
                    cx={door.gridX * cellSize}
                    cy={door.gridY * cellSize}
                    r={4 / view.zoom}
                    fill="var(--color-success)"
                />
            </g>
        );
    });

    let activeCursor = customCursor || "inherit";
    if (isPanning.current) activeCursor = "grabbing";

    return (
        <svg
            ref={svgRef}
            className={styles.svg}
            style={{ cursor: activeCursor }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
        >
            <g
                transform={`translate(${view.pan.x},${view.pan.y}) scale(${view.zoom})`}
            >
                <rect
                    x={0}
                    y={0}
                    width={gridCols * cellSize}
                    height={gridRows * cellSize}
                    fill="transparent"
                />
                {gridLines}
                {renderedCells}
                {renderedSelections}
                {renderedDoors}
            </g>
        </svg>
    );
};

export default EditorGrid;
