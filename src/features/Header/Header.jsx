import { useAppContext } from "../../context/AppContext";
import styles from "./Header.module.css";

const Header = () => {
    const { mode, setMode, theme, toggleTheme } = useAppContext();

    return (
        <header className={styles.header}>
            <div className={styles.brand}>LayOutLevels</div>

            <div className={styles.controls}>
                <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className={styles.dropdown}
                >
                    <option value="room">Room Editor</option>
                    <option value="building">
                        Building Editor
                    </option>
                </select>

                <button onClick={toggleTheme} className={styles.themeToggle}>
                    {theme === "light" ? "🌙 Dark" : "☀️ Light"}
                </button>
            </div>
        </header>
    );
};

export default Header;
