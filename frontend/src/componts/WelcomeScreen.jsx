import React from 'react'

const WelcomeScreen = () => {
    return (
        <div className="welcome-screen">
            <div className="welcome-box">
                <h1>Welcome to SmartHome Twin</h1>
                <p>
                    Step into the future of home automation with <strong>SmartHome Twin</strong> —
                    a virtual 3D replica of your smart home powered by Tuya devices.
                </p>
                <ul>
                    <li>🧭 Explore your home in a fully interactive 3D space</li>
                    <li>📐 Create and customize rooms with precise dimensions</li>
                    <li>💡 Simulate and manage Tuya smart devices in real time</li>
                </ul>
                <p>
                    Ready to design your digital home?
                </p>
                <button onClick={() => setExplore(true)}>Explore</button>
            </div>
        </div>

    )
}

export default WelcomeScreen
