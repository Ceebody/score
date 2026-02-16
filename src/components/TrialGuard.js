import React, { useState, useEffect } from 'react';
import config from '../config';

const TrialGuard = ({ children }) => {
    const [isExpired, setIsExpired] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState(null);
    const [showWarning, setShowWarning] = useState(true);

    useEffect(() => {
        if (!config.trialExpiration) return;

        const checkExpiration = () => {
            const now = new Date();
            const expirationDate = new Date(config.trialExpiration);

            const diffTime = expirationDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                setIsExpired(true);
            } else {
                setDaysRemaining(diffDays);
            }
        };

        checkExpiration();
        const interval = setInterval(checkExpiration, 1000 * 60 * 60); // Check every hour
        return () => clearInterval(interval);
    }, []);

    if (isExpired) {
        return (
            <div className="fixed inset-0 bg-gray-900 z-[9999] flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
                    <div className="text-red-600 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Trial Expired</h1>
                    <p className="text-gray-600 mb-6">
                        Your 30-day trial period has ended. To continue using the application, please upgrade to the Pro version.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                        <p className="text-sm text-blue-800 font-semibold mb-1">Contact Developer</p>
                        <p className="text-lg text-blue-600 font-bold select-all">{config.trialContactEmail}</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {children}

            {/* Persistent Warning Modal/Banner on Startup */}
            {showWarning && daysRemaining !== null && (
                <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full animate-bounce-in">
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-yellow-600 mb-2">Demo Version</h3>
                            <p className="text-gray-700 mb-4">
                                This trial expires in <span className="font-bold text-red-600 text-lg">{daysRemaining} days</span>.
                            </p>
                            <div className="bg-gray-100 p-3 rounded text-sm mb-4">
                                <p className="font-semibold text-gray-500">For Pro Version Contact:</p>
                                <p className="text-blue-600 font-bold select-all">{config.trialContactEmail}</p>
                            </div>
                            <button
                                onClick={() => setShowWarning(false)}
                                className="w-full bg-yellow-600 text-white font-bold py-2 rounded hover:bg-yellow-700 transition"
                            >
                                Continue to App
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TrialGuard;
