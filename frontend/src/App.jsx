import React, { useState } from "react";
import "./styles/main.scss";
import BlueprintUI from "./componts/BlueprintUI";
import DrawLayout from "./componts/scene/DrawLayout";

function App() {
    const [drawingMode, setDrawingMode] = useState("rectangle");
    const [isEditMode, setIsEditMode] = useState(false);

    return (
        <div className="content-container">
            <div
                className="tools-wrapper"
                onClick={(e) => {
                    e.stopPropagation();

                    e.preventDefault()
                }}
            >
                <button
                    onClick={() => {
                        setDrawingMode("rectangle");
                        setIsEditMode(false);
                    }}
                >
                    Rectangle
                </button>
                <button
                    onClick={() => {
                        setDrawingMode("polygon");
                        setIsEditMode(false);
                    }}
                >
                    Polygon
                </button>
                <button
                    onClick={() => {
                        setDrawingMode("partisian wall");
                        setIsEditMode(false);
                    }}
                >
                    Line
                </button>

                {/* to seperate a already drawn room into two room  */}
                <button onClick={() => setIsEditMode(!isEditMode)}>
                    {isEditMode ? "Exit Edit" : "Edit"}
                </button>
            </div>

            <DrawLayout
                drawingMode={drawingMode}
                isEditMode={isEditMode}
                onExitEditMode={() => setIsEditMode(false)}
            />
        </div>
    );
}

export default App;
