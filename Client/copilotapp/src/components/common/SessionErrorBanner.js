const SessionErrorBanner = ({ error, onDismiss }) => {
    if (!error) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-red-100 border-b border-red-200 px-4 py-3">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
                <p className="text-red-700">{error}</p>
                <button 
                    onClick={onDismiss}
                    className="text-red-700 hover:text-red-900"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

export default SessionErrorBanner;
