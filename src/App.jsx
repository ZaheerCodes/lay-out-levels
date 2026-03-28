import { useState, useEffect } from "react";
import styles from "./App.module.css";
import RoomEditor from "./components/Tab1/RoomEditor";
import BuildingEditor from "./components/Tab2/BuildingEditor";
import Header from "./features/Header/Header";

export default function App() {
    const [activeTab, setActiveTab] = useState("room-editor");
    const [theme, setTheme] = useState(getThemePreference);
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("lol_theme", theme);
    }, [theme]);

    const toggleTheme = () =>
        setTheme((prev) => (prev === "light" ? "dark" : "light"));

    return (
        <div className={styles.app}>
            <Header
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
                toggleTheme={toggleTheme}
            />

            <div className={styles.content}>
                {activeTab === "room-editor" && <RoomEditor />}
                {activeTab === "building-editor" && <BuildingEditor />}
            </div>
        </div>
    );
}

const getThemePreference = () => {
    const stored = localStorage.getItem("lol_theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
};
