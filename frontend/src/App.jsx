import React, { useEffect, useState } from "react";
import "./styles/main.scss";
import BlueprintUI from "./componts/BlueprintUI";
import DrawLayout from "./componts/scene/DrawLayout";

import { RectangularWall, PolygonWall, Veranda, Door, Window } from "./assets/icon";
function App() {
  const [drawingMode, setDrawingMode] = useState("rectangle");
  const [isEditMode, setIsEditMode] = useState(false);
  // 🧠 Listen for ESC key to reset drawingMode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setDrawingMode("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  return (
    <div className="content-container">
      <div
        className="tools-wrapper"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <button
          title="Rectangle"
          onClick={() => {
            setDrawingMode("rectangle");
            setIsEditMode(false);
          }}
        >
          <RectangularWall />
        </button>

        <button
          title="Polygon"
          onClick={() => {
            setDrawingMode("polygon");
            setIsEditMode(false);
          }}
        >
          <PolygonWall />
        </button>

        <button
          title="Door"
          onClick={() => {
            setDrawingMode("Door");
            setIsEditMode(false);
          }}
        >
          <Door />
        </button>

        <button
          title="Window"
          onClick={() => {
            setDrawingMode("Window");
            setIsEditMode(false);
          }}
        >
          <Window />
        </button>

        <button
          title="Veranda"
          onClick={() => {
            setDrawingMode("veranda-rectangle");
            setIsEditMode(false);
          }}
        >
          <Veranda />
        </button>

        <button title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          onClick={() => setIsEditMode(!isEditMode)}>
          {isEditMode ? "Exit Edit" : "Edit"}
        </button>


        <button
          title="addPoint"
          onClick={() => {
            setDrawingMode("addPoint");
            setIsEditMode(false);
          }}
        >
          addPoint
        </button>

        <button title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          onClick={() => setIsEditMode(!isEditMode)}>
          {isEditMode ? "Exit Edit" : "Edit"}
        </button>
      </div>


      <DrawLayout
        setDrawingMode={setDrawingMode}
        drawingMode={drawingMode}
        isEditMode={isEditMode}
        onExitEditMode={() => setIsEditMode(false)}
      />
    </div>
  );
}

export default App;
