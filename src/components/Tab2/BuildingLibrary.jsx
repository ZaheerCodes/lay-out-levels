import React, { useState } from "react";
import styles from "./BuildingLibrary.module.css";
import MiniPreview from "../shared/MiniPreview";
import Button from "../shared/Button";

export default function BuildingLibrary({
    rooms,
    buildings,
    disabledRoomIds = new Set(),
    onToggleRoom,
    onPlaceRoom,
    onLoadBuilding,
    onDeleteBuilding,
    onCopyBuildingJson,
}) {
    const [tab, setTab] = useState("rooms"); // rooms | buildings

    return (
        <div className={styles.panel}>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${tab === "rooms" ? styles.activeTab : ""}`}
                    onClick={() => setTab("rooms")}
                >
                    Rooms
                    <span className={styles.badge}>{rooms.length}</span>
                </button>
                <button
                    className={`${styles.tab} ${tab === "buildings" ? styles.activeTab : ""}`}
                    onClick={() => setTab("buildings")}
                >
                    Buildings
                    <span className={styles.badge}>{buildings.length}</span>
                </button>
            </div>

            <div className={styles.body}>
                {tab === "rooms" ? (
                    <>
                        {rooms.length === 0 ? (
                            <div className={styles.empty}>
                                <div className={styles.emptyIcon}>🧱</div>
                                <p>No rooms in library.</p>
                                <p>
                                    Go to <strong>Tab 1</strong> and design
                                    rooms first.
                                </p>
                            </div>
                        ) : (
                            rooms.map((tmpl) => {
                                const isDisabled = disabledRoomIds.has(tmpl.id);
                                return (
                                    <div
                                        key={tmpl.id}
                                        className={`${styles.roomCard} ${isDisabled ? styles.roomCardDisabled : ""}`}
                                    >
                                        <MiniPreview
                                            matrix={tmpl.matrix}
                                            size={56}
                                        />
                                        <div className={styles.roomInfo}>
                                            <div className={styles.roomHeader}>
                                                <div
                                                    className={styles.roomName}
                                                    title={tmpl.name}
                                                >
                                                    {tmpl.name}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className={
                                                        styles.enableCheckbox
                                                    }
                                                    checked={!isDisabled}
                                                    onChange={() =>
                                                        onToggleRoom(tmpl.id)
                                                    }
                                                    title="Include in Auto-Generate"
                                                />
                                            </div>
                                            <div className={styles.roomMeta}>
                                                {tmpl.width}×{tmpl.height}
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() =>
                                                    onPlaceRoom(tmpl)
                                                }
                                            >
                                                + Place
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                ) : (
                    <>
                        {buildings.length === 0 ? (
                            <div className={styles.empty}>
                                <div className={styles.emptyIcon}>🏛️</div>
                                <p>No buildings saved yet.</p>
                                <p>
                                    Design a building and click{" "}
                                    <strong>Save Building</strong>.
                                </p>
                            </div>
                        ) : (
                            buildings.map((building) => (
                                <div
                                    key={building.id}
                                    className={styles.buildingCard}
                                >
                                    <div className={styles.buildingInfo}>
                                        <div className={styles.buildingName}>
                                            {building.levelName}
                                        </div>
                                        <div className={styles.buildingMeta}>
                                            {building.masterGridWidth}×
                                            {building.masterGridHeight} ·{" "}
                                            {
                                                Object.keys(
                                                    building.rooms || {},
                                                ).length
                                            }{" "}
                                            rooms ·{" "}
                                            {(building.doors || []).length}{" "}
                                            doors
                                        </div>
                                    </div>
                                    <div className={styles.buildingActions}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                onLoadBuilding(building)
                                            }
                                        >
                                            Load
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                onCopyBuildingJson(building)
                                            }
                                        >
                                            JSON
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() =>
                                                onDeleteBuilding(building.id)
                                            }
                                        >
                                            🗑
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
