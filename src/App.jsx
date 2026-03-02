import "./styles/global.css";
import styles from "./App.module.css";

const App = () => {
    return (
        <div className={styles.appGrid}>
            <div className={`${styles.bentoBox} ${styles.headerArea}`}></div>

            <div className={`${styles.bentoBox} ${styles.editorArea}`}></div>

            <div className={`${styles.bentoBox} ${styles.sidebarArea}`}></div>

            <div className={`${styles.bentoBox} ${styles.footerArea}`}></div>
        </div>
    );
};

export default App;
