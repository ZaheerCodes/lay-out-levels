import React, { useState } from "react";
import styles from "./RoomLibrary.module.css";
import MiniPreview from "../shared/MiniPreview";
import Button from "../shared/Button";

function RoomCard({ room, onLoad, onDelete, onCopyJson }) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div className={styles.card}>
            <div className={styles.cardPreview}>
                <MiniPreview matrix={room.matrix} size={64} />
            </div>
            <div className={styles.cardInfo}>
                <div className={styles.cardName}>{room.name}</div>
                <div className={styles.cardMeta}>
                    {room.width}×{room.height}
                </div>
                <div className={styles.cardActions}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLoad(room)}
                        title="Load into editor"
                    >
                        Load
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCopyJson(room)}
                        title="Copy JSON"
                    >
                        JSON
                    </Button>
                    {confirmDelete ? (
                        <span className={styles.deleteConfirm}>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                    onDelete(room.id);
                                    setConfirmDelete(false);
                                }}
                            >
                                Confirm
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDelete(false)}
                            >
                                ✕
                            </Button>
                        </span>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(true)}
                            title="Delete room"
                        >
                            🗑
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RoomLibrary({ rooms, onLoad, onDelete, onCopyJson }) {
    const [copied, setCopied] = useState(null);

    const handleCopy = (room) => {
        onCopyJson(room);
        setCopied(room.id);
        setTimeout(() => setCopied(null), 1500);
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h2 className={styles.title}>Room Library</h2>
                <span className={styles.count}>{rooms.length}</span>
            </div>
            <div className={styles.list}>
                {rooms.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>🏗️</div>
                        <p>No rooms saved yet.</p>
                        <p>
                            Design a room and click{" "}
                            <strong>Save to Library</strong>.
                        </p>
                    </div>
                ) : (
                    rooms.map((tmpl) => (
                        <RoomCard
                            key={tmpl.id}
                            room={tmpl}
                            onLoad={onLoad}
                            onDelete={onDelete}
                            onCopyJson={handleCopy}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
