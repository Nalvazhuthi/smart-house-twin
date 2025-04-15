import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import DrawLayout from './DrawLayout';
import ToolBar from './ToolBar';

const Scene = () => {
    const [drawingMode, setDrawingMode] = useState('rectangle'); // Default mode
    const [isEditMode, setIsEditMode] = useState(false);

    return (
        // <Canvas
        //     orthographic
        //     camera={{
        //         position: [0, 0, 10],
        //         zoom: 20,
        //         near: 0.1,
        //         far: 1000
        //     }}
        // >

        //     {mode === "draw" ? (
        //         <DrawLayout />
        //     ) : <></>}
        //     <gridHelper
        //         args={[500, 10, "#eaeaea", "#1e1e1e"]}
        //         rotation={[-Math.PI * 0.5, 0, 0]}
        //     />
        //     <OrbitControls
        //         enableRotate={false}
        //         enablePan={true}
        //         enableZoom={true}
        //         minZoom={10}
        //         maxZoom={50}
        //         touches={{
        //             ONE: 1, // One-finger touch for panning
        //             TWO: 2, // Two-finger touch for zooming
        //         }}
        //     />
        // </Canvas>
        <>
            <DrawLayout drawingMode={drawingMode} isEditMode={isEditMode} />
            <ToolBar setDrawingMode={setDrawingMode} isEditMode={isEditMode} setIsEditMode={setIsEditMode} />
        </>
    )
}

export default Scene
