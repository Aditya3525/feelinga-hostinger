export default function Loading() {
    return (
        <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
            <div className="loading-screen__inner">
                <div className="loading-screen__spinner" />
                <p className="loading-screen__text">Loading content...</p>
            </div>
        </div>
    );
}
