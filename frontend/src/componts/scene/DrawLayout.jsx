import React, { useState, useEffect, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html, OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { DrawingTool } from "./DrawingTool";

const DrawLayout = ({ setDrawingMode, drawingMode, isEditMode = false }) => {
    const [is3DView, setIs3DView] = useState(false);

    const gridParams = {
        gridSize: [2000, 2000],
        cellSize: 1,
        cellThickness: 1,
        cellColor: "#cccccc",
        sectionSize: 10, // 1 * 10
        sectionThickness: 1,
        sectionColor: "#cccccc",
        fadeDistance: 1000,
        fadeStrength: 0.7,
        followCamera: false,
        infiniteGrid: false,
    };

    // Toggle between 3D view and 2D view
    const toggle3DView = () => {
        setIs3DView(!is3DView);
    };

    return (
        <>
            <Canvas onContextMenu={(e) => e.preventDefault()}>
                {/* <Suspense fallback={null}> */}
                    {/* GridHelper with custom parameters */}
                    {is3DView ? (
                        <PerspectiveCamera
                            makeDefault
                            fov={75}
                            position={[10, 10, 10]}
                            onUpdate={(self) => self.lookAt(0, 0, 0)}
                        />
                    ) : (
                        <OrthographicCamera
                            makeDefault
                            zoom={75}
                            position={[0, 10, 0]}
                            onUpdate={(self) => {
                                self.lookAt(0, 0, 0);
                                self.up.set(0, 0, 1);
                            }}
                        />
                    )}
                    <CustomGridHelper {...gridParams} is3DView={is3DView} />

                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />

                    <DrawingTool
                        DrawingTool={DrawingTool}
                        drawingMode={is3DView ? null : drawingMode}
                        isEditMode={isEditMode}
                        is3DView={is3DView}
                    />

                    {/* <OrbitControls
                        enableRotate={is3DView}
                        enableZoom={true}
                        enablePan={true}
                        maxPolarAngle={is3DView ? Math.PI / 2.1 : undefined}
                        minPolarAngle={is3DView ? 0 : undefined}
                        maxDistance={is3DView ? 10 : undefined}
                        minDistance={is3DView ? 5 : undefined}
                    /> */}
                {/* </Suspense> */}
            </Canvas>

            <button
                onClick={toggle3DView}
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    right: '20px',
                    padding: '10px 20px',
                    backgroundColor: is3DView ? '#ff4444' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    zIndex: 100
                }}
            >
                {is3DView ? 'Exit 3D View' : 'Explore 3D'}
            </button>
        </>
    );
};

// Custom Grid Helper Component
const CustomGridHelper = ({ gridSize, cellSize, cellThickness, cellColor, sectionSize, sectionThickness, sectionColor, fadeDistance, fadeStrength, followCamera, infiniteGrid, is3DView }) => {
    const gridRef = React.useRef();
    const { camera } = useThree();
    const [opacity, setOpacity] = useState(1);

    // Calculate grid fading based on distance from camera
    useEffect(() => {
        const handleFade = () => {
            const distance = camera.position.length();
            const fadeFactor = Math.max(0, 1 - (distance / fadeDistance) * fadeStrength);
            setOpacity(fadeFactor);
        };

        camera.addEventListener('position-changed', handleFade);
        return () => {
            camera.removeEventListener('position-changed', handleFade);
        };
    }, [camera, fadeDistance, fadeStrength]);

    // If following camera, update grid position accordingly
    useEffect(() => {
        if (followCamera && gridRef.current) {
            gridRef.current.position.copy(camera.position);
        }
    }, [followCamera, camera]);

    return (
        <gridHelper
            ref={gridRef}
            args={[
                gridSize[0],
                gridSize[1],
                new THREE.Color(cellColor),
                new THREE.Color(sectionColor),
            ]}
            position={[0, -0.001, 0]}
            opacity={opacity}
            material-transparent={true}
        />
    );
};

export default DrawLayout;
