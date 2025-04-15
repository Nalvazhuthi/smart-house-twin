import React, { useState } from "react";
import Scene from './scene/Scene.jsx'
const shapes = {
  Wall: ["➖", "⬛", "⎾", "⎿", "✖"],
  Door: ["┌⟶", "└⟶", "▭⟷", "║▭"],
  Window: ["▭", "▭▭", "⎾▭⏌"]
};

const tabs = ["Wall", "Door", "Window"];

export default function BlueprintUI() {
  const [activeTab, setActiveTab] = useState("Wall");
  const [selectedShape, setSelectedShape] = useState(null);

  return (
    <div className="blueprint-ui">
      {/* Top Bar */}
      <div className="top-bar">
        <button>←</button>
        <div className="spacer" />
        <button>✔</button>
      </div>

      {/* Blueprint Canvas */}
      <div className="blueprint-canvas">
        <Scene />
      </div>




    </div>
  );
}

