import React from 'react';
import { getErrorMessage } from '../../utils/errorHandling';

class ErrorBoundary extends React.Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">
                            Something went wrong
                        </h2>
                        <p className="text-gray-700 mb-4">
                            {getErrorMessage(this.state.error)}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}