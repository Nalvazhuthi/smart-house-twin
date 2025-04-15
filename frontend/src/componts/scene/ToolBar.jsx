import React from 'react'

const ToolBar = ({ setDrawingMode, isEditMode, setIsEditMode }) => {


    return (
        <div
            style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '10px',
                borderRadius: '5px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            }}
        >
            <button onClick={() => setDrawingMode('rectangle')}>
                Rectangle
            </button>
            <button onClick={() => setDrawingMode('line')}>Line</button>
            <button onClick={() => setDrawingMode('polygon')}>
                Polygon
            </button>
            <button onClick={() => setIsEditMode(!isEditMode)}>
                {isEditMode ? 'Exit Edit Mode' : 'Edit Mode'}
            </button>


        </div>
    )
}

export default ToolBar
