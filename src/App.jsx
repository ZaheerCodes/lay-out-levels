import "./styles/global.css";
import styles from "./App.module.css";
import Header from "./features/Header/Header.jsx";
import { useAppContext } from "./context/AppContext.jsx";

const App = () => {
    const { mode } = useAppContext();

    return (
        <div className={styles.appGrid}>
            <div className={`${styles.bentoBox} ${styles.headerArea}`}>
                <Header />
            </div>

            <div className={`${styles.bentoBox} ${styles.editorArea}`}>
                {/* Temporary placeholder to test the context state */}
                <div style={{ padding: "var(--space-md)" }}>
                    Active Mode: <strong>{mode}</strong>
                </div>
            </div>

            <div className={`${styles.bentoBox} ${styles.sidebarArea}`}></div>

            <div className={`${styles.bentoBox} ${styles.footerArea}`}></div>
        </div>
    );
};

export default App;
