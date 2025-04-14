import React from "react";
import { useNavigate } from "react-router-dom";

const WelcomeScreen = ({ onExplore }) => {
  const navigate = useNavigate();

  return (
    <div className="welcome-screen">
      <div className="welcome-box">
        <div className="welcome-header">
          <h1>SmartHome Twin</h1>
          <div className="divider"></div>
          <p className="subtitle">Your Digital Residence</p>
        </div>

        <p className="intro-text">
          Experience the future of home automation with our virtual twin
          technology, seamlessly integrating with your Tuya ecosystem.
        </p>

        <ul className="features-list">
          <li>
            <span className="feature-icon">🖥️</span> Immersive 3D home
            visualization
          </li>
          <li>
            <span className="feature-icon">📱</span> Real-time device control
            interface
          </li>
          <li>
            <span className="feature-icon">🏠</span> Architectural precision
            modeling
          </li>
          <li>
            <span className="feature-icon">🌙</span> Smart scene automation
          </li>
          <li>
            <span className="feature-icon">📊</span> Energy consumption
            analytics
          </li>
        </ul>

        <button className="explore-btn" onClick={() => navigate("/setup-room")}>
          Enter Your Digital Home
          <span className="arrow">→</span>
        </button>

        <div className="footer-note">Premium home automation experience</div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
