import { getCompositeOrientation } from "../../utils/roomOps";

export const GridCell = ({
    r,
    c,
    px,
    py,
    size,
    zoom,
    cellData,
    cGrid,
    isEdge,
}) => {
    const { state, ids, isColliding, isIsolated, isSelected, isError } =
        cellData;

    let fill = "var(--color-cell-space)";
    let opacity = 1;

    if (isError) {
        fill = "var(--color-error)";
        opacity = 0.85;
    } else if (isColliding || isIsolated) {
        fill = "var(--color-error-muted)";
    } else if (isSelected) {
        fill = "var(--color-cell-space-border)";
    }

    const elements = [];
    const strokeColor = "var(--color-room-border)";
    const strokeWidth = 2 / zoom;

    if (state === 1) {
        elements.push(
            <rect
                key="base"
                x={px}
                y={py}
                width={size}
                height={size}
                fill={fill}
                opacity={opacity}
            />,
        );

        if (isEdge(r - 1, c, ids))
            elements.push(
                <line
                    key="t"
                    x1={px}
                    y1={py}
                    x2={px + size}
                    y2={py}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                />,
            );
        if (isEdge(r + 1, c, ids))
            elements.push(
                <line
                    key="b"
                    x1={px}
                    y1={py + size}
                    x2={px + size}
                    y2={py + size}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                />,
            );
        if (isEdge(r, c - 1, ids))
            elements.push(
                <line
                    key="l"
                    x1={px}
                    y1={py}
                    x2={px}
                    y2={py + size}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                />,
            );
        if (isEdge(r, c + 1, ids))
            elements.push(
                <line
                    key="r"
                    x1={px + size}
                    y1={py}
                    x2={px + size}
                    y2={py + size}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                />,
            );
    } else if (state === 2) {
        ids.forEach((id) => {
            const orient = getCompositeOrientation(r, c, cGrid, id);
            let pts = "";
            let lx1, ly1, lx2, ly2;

            if (orient === "br") {
                pts = `${px + size},${py} ${px + size},${py + size} ${px},${py + size}`;
                lx1 = px + size;
                ly1 = py;
                lx2 = px;
                ly2 = py + size;
            } else if (orient === "bl") {
                pts = `${px},${py} ${px},${py + size} ${px + size},${py + size}`;
                lx1 = px;
                ly1 = py;
                lx2 = px + size;
                ly2 = py + size;
            } else if (orient === "tr") {
                pts = `${px},${py} ${px + size},${py} ${px + size},${py + size}`;
                lx1 = px;
                ly1 = py;
                lx2 = px + size;
                ly2 = py + size;
            } else {
                pts = `${px},${py} ${px + size},${py} ${px},${py + size}`;
                lx1 = px + size;
                ly1 = py;
                lx2 = px;
                ly2 = py + size;
            }

            elements.push(
                <g key={`tri-${id}`}>
                    <polygon points={pts} fill={fill} opacity={opacity} />
                    <line
                        x1={lx1}
                        y1={ly1}
                        x2={lx2}
                        y2={ly2}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                </g>,
            );
        });
    }

    return <g>{elements}</g>;
};
