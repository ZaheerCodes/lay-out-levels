import styles from "./Header.module.css";
import Button from "../../components/shared/Button";

const Header = ({ activeTab, setActiveTab, theme, toggleTheme }) => {
    const tabs = [
        {
            id: "room-editor",
            label: "Room Editor",
            icon: "🧱",
        },
        {
            id: "building-editor",
            label: "Building Editor",
            icon: "🏛️",
        },
    ];

    return (
        <header className={styles.nav}>
            <div className={styles.brand}>
                <div className={styles.brandMark}>LOL</div>
                <div className={styles.brandText}>
                    <span className={styles.brandTitle}>Lay Out Levels</span>
                    <span className={styles.brandSub}>
                        Procedural Level Editor
                    </span>
                </div>
            </div>

            <nav className={styles.tabs}>
                {tabs.map((tab, i) => (
                    <button
                        key={tab.id}
                        className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
                        <span className={styles.tabLabel}>{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className={styles.navRight}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    title="Toggle Theme"
                >
                    {theme === "light" ? "🌙 Dark" : "☀️ Light"}
                </Button>
            </div>
        </header>
    );
};

export default Header;
