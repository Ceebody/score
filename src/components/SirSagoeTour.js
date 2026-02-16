import React, { useState, useEffect } from "react";
import Joyride, { STATUS } from "react-joyride";
import { useLocation } from "react-router-dom";

const SirSagoeTour = () => {
    const location = useLocation();
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState([]);

    useEffect(() => {
        setRun(false); // Reset tour state on path change
        // Dean: removed log
        // Define steps based on paths
        if (location.pathname === "/admin-dashboard") {
            const intervalId = setInterval(() => {
                const element = document.querySelector("#dashboard-stats");
                if (element) {
                    clearInterval(intervalId);
                    setSteps([
                        {
                            target: "body",
                            placement: "center",
                            content: (
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Hello! I am Ceebody.</h3>
                                    <p>Welcome to your Admin Dashboard. I'm here to guide you.</p>
                                </div>
                            ),
                        },
                        {
                            target: "#dashboard-stats",
                            content: "Here you can see the latest statistics for the school.",
                        },
                        {
                            target: "#sidebar-nav",
                            content: "Use the sidebar to navigate to Teachers, Students, and Reports.",
                        },
                    ]);
                    setRun(true);
                }
            }, 1000); // Check every second
            return () => clearInterval(intervalId);
        } else if (location.pathname.includes("/teacher/enter-scores")) {
            setSteps([
                {
                    target: "body",
                    placement: "center",
                    content: "This is where you enter student scores.",
                },
                {
                    target: "input[type='number']",
                    content: "Enter the score here. Autosave is enabled.",
                },
            ]);
            setRun(true);
        } else {
            setRun(false);
        }
    }, [location.pathname]);

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRun(false);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showSkipButton
            showProgress
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: "#4F46E5", // Indigo-600
                },
                tooltip: {
                    borderRadius: "8px",
                },
                tooltipContainer: {
                    textAlign: "left",
                },
                tooltipTitle: {
                    margin: "0 0 10px 0",
                },
            }}
            locale={{
                last: "Got it!",
                skip: "Dismiss",
            }}
        />
    );
};

export default SirSagoeTour;
