
import { ErrorTypes } from "./errorTypes";

export class ApiError extends Error {
    constructor(type, message, originalError = null) {
        super(message);
        this.type = type;
        this.originalError = originalError;
    }
}

export const getErrorMessage = (error) => {
    switch (error.type) {
        case ErrorTypes.SERVER_DOWN:
            return "Server is currently unavailable. Please try again later.";
        case ErrorTypes.NETWORK_ERROR:
            return "Network connection issue. Please check your internet connection.";
        case ErrorTypes.AUTH_ERROR:
            return "Authentication error. Please log in again.";
        case ErrorTypes.API_ERROR:
            return error.message || "An error occurred while processing your request.";
        default:
            return "An unexpected error occurred. Please try again.";
    }
};


// src/utils/auth.js
