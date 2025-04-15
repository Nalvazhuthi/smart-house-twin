import React, { useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

const DrawingTool = ({ drawingMode, isEditMode }) => {
    const [lines, setLines] = useState([]);
    const [rooms, setRooms] = useState([]); // Unified storage for all rooms (rectangles and polygons)
    const [isDragging, setIsDragging] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [endPoint, setEndPoint] = useState(null);
    const [gridSnappingEnabled, setGridSnappingEnabled] = useState(true);
    const [roomNamePopup, setRoomNamePopup] = useState(null);
    const [polygonPoints, setPolygonPoints] = useState([]);
    const { camera, size } = useThree();

    // Convert mouse coordinates to world coordinates
    const getWorldPosition = (event) => {
        const x = (event.clientX / size.width) * 2 - 1;
        const y = -(event.clientY / size.height) * 2 + 1;
        const mouse = new THREE.Vector3(x, y, 0.5);
        mouse.unproject(camera);
        return mouse;
    };

    // Snap to grid
    const snapToGrid = (position) => {
        const gridSize = 0.5;
        return new THREE.Vector3(
            Math.round(position.x / gridSize) * gridSize,
            Math.round(position.y / gridSize) * gridSize,
            position.z
        );
    };

    // Snap to nearby rooms
    const snapToNearbyRooms = (position) => {
        const snapThreshold = 1;
        let snappedPosition = position.clone();
        rooms.forEach((room) => {
            room.points.forEach((point) => {
                if (point.distanceTo(position) < snapThreshold) {
                    snappedPosition = point.clone();
                }
            });
        });
        return snappedPosition;
    };

    // Calculate room area using Shoelace formula
    const calculateArea = (points) => {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            area += current.x * next.y - next.x * current.y;
        }
        return Math.abs(area / 2);
    };

    // Calculate room center
    const calculateRoomCenter = (points) => {
        const center = new THREE.Vector3();
        points.forEach((point) => center.add(point));
        center.divideScalar(points.length);
        return center;
    };

    // Handle mouse down to start drawing
    const handleMouseDown = (event) => {
        if (event.button !== 0) return;
        const worldPosition = getWorldPosition(event);
        const snappedPosition = gridSnappingEnabled
            ? snapToNearbyRooms(snapToGrid(worldPosition))
            : worldPosition;

        if (drawingMode === 'rectangle') {
            setStartPoint(snappedPosition);
            setIsDragging(true);
        } else if (drawingMode === 'polygon') {
            if (
                polygonPoints.length > 0 &&
                snappedPosition.distanceTo(polygonPoints[0]) < 0.5
            ) {
                finalizePolygon(); // Close polygon if near start point
            } else {
                setPolygonPoints((prev) => [...prev, snappedPosition]);
            }
        }
    };

    // Handle mouse move to update rectangle preview
    const handleMouseMove = (event) => {
        if (!isDragging || !startPoint) return;
        const worldPosition = getWorldPosition(event);
        const snappedPosition = gridSnappingEnabled
            ? snapToNearbyRooms(snapToGrid(worldPosition))
            : worldPosition;
        setEndPoint(snappedPosition);
    };

    // Handle mouse up to finish dragging
    const handleMouseUp = () => {
        if (!isDragging || !startPoint || !endPoint) return;
        if (drawingMode === 'rectangle') {
            const rectPoints = [
                new THREE.Vector3(startPoint.x, startPoint.y, 0),
                new THREE.Vector3(endPoint.x, startPoint.y, 0),
                new THREE.Vector3(endPoint.x, endPoint.y, 0),
                new THREE.Vector3(startPoint.x, endPoint.y, 0),
            ];
            const newLines = [
                { start: rectPoints[0], end: rectPoints[1] },
                { start: rectPoints[1], end: rectPoints[2] },
                { start: rectPoints[2], end: rectPoints[3] },
                { start: rectPoints[3], end: rectPoints[0] },
            ];
            setLines((prevLines) => [...prevLines, ...newLines]);
            const area = calculateArea(rectPoints);
            const center = calculateRoomCenter(rectPoints);
            const newRoom = {
                points: rectPoints,
                area,
                center,
                name: `Room ${rooms.length + 1}`,
            };
            setRooms((prevRooms) => [...prevRooms, newRoom]);
            setRoomNamePopup(newRoom);
        }
        setIsDragging(false);
        setStartPoint(null);
        setEndPoint(null);
    };

    // Finalize polygon
    const finalizePolygon = () => {
        if (polygonPoints.length < 3) return;
        const area = calculateArea(polygonPoints);
        const center = calculateRoomCenter(polygonPoints);
        const newRoom = {
            points: polygonPoints,
            area,
            center,
            name: `Room ${rooms.length + 1}`,
        };
        setRooms((prevRooms) => [...prevRooms, newRoom]);
        setPolygonPoints([]);
    };

    // Function to check if two line segments intersect
    const doLinesIntersect = (line1, line2) => {
        const { start: p1, end: p2 } = line1;
        const { start: p3, end: p4 } = line2;

        const det = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
        if (det === 0) return false; // Lines are parallel

        const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
        const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;

        return lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1;
    };

    // Check if polygon intersects with any rectangle
    const doesPolygonIntersectRectangle = (polygonPoints, rectPoints) => {
        const polygonLines = polygonPoints.map((point, index) => ({
            start: point,
            end: polygonPoints[(index + 1) % polygonPoints.length],
        }));

        const rectLines = [
            { start: rectPoints[0], end: rectPoints[1] },
            { start: rectPoints[1], end: rectPoints[2] },
            { start: rectPoints[2], end: rectPoints[3] },
            { start: rectPoints[3], end: rectPoints[0] },
        ];

        for (const polyLine of polygonLines) {
            for (const rectLine of rectLines) {
                if (doLinesIntersect(polyLine, rectLine)) {
                    return true;
                }
            }
        }
        return false;
    };

    // Render dashed line preview for rectangle or polygon
    const renderDashedLinePreview = () => {
        if (!startPoint || !endPoint) return null;
        return (
            <line>
                <bufferGeometry
                    attach="geometry"
                    attributes={{
                        position: new THREE.BufferAttribute(
                            new Float32Array([
                                startPoint.x,
                                startPoint.y,
                                0,
                                endPoint.x,
                                endPoint.y,
                                0,
                            ]),
                            3
                        ),
                    }}
                />
                <lineDashedMaterial
                    attach="material"
                    color="blue"
                    dashSize={0.2}
                    gapSize={0.1}
                    transparent
                    opacity={0.7}
                />
            </line>
        );
    };

    return (
        <>
            {/* Toolbar */}
            <Html position={[0, 0, 0]} transform>
                {/* Add buttons or UI elements here */}
            </Html>
            {/* Walls */}
            {lines.map((line, index) => {
                const direction = new THREE.Vector3()
                    .subVectors(line.end, line.start)
                    .normalize();
                const length = line.start.distanceTo(line.end);
                const wallGeometry = new THREE.BoxGeometry(length, 0.1, 0.2);
                const wallMesh = new THREE.Mesh(
                    wallGeometry,
                    new THREE.MeshBasicMaterial({
                        color: 'black',
                    })
                );
                wallMesh.position
                    .copy(
                        new THREE.Vector3()
                            .addVectors(line.start, line.end)
                            .multiplyScalar(0.5)
                    )
                    .setZ(0.1);
                wallMesh.quaternion.setFromUnitVectors(
                    new THREE.Vector3(1, 0, 0),
                    direction
                );
                return (
                    <group key={`wall-${index}`}>
                        <primitive object={wallMesh} />
                    </group>
                );
            })}
            {/* Rooms */}
            {rooms.map((room, index) => {
                const geometry = new THREE.ShapeGeometry(new THREE.Shape(room.points));
                const material = new THREE.MeshBasicMaterial({
                    color: 'white',
                    transparent: true,
                });
                return (
                    <mesh key={`room-${index}`}>
                        <primitive attach="geometry" object={geometry} />
                        <primitive attach="material" object={material} />
                    </mesh>
                );
            })}
            {/* Rectangle Preview */}
            {isDragging && drawingMode === 'rectangle' && (
                <line>
                    <bufferGeometry
                        attach="geometry"
                        attributes={{
                            position: new THREE.BufferAttribute(
                                new Float32Array([
                                    startPoint.x,
                                    startPoint.y,
                                    0,
                                    endPoint?.x ?? startPoint.x,
                                    startPoint.y,
                                    0,
                                    endPoint?.x ?? startPoint.x,
                                    endPoint?.y ?? startPoint.y,
                                    0,
                                    startPoint.x,
                                    endPoint?.y ?? startPoint.y,
                                    0,
                                    startPoint.x,
                                    startPoint.y,
                                    0,
                                ]),
                                3
                            ),
                        }}
                    />
                    <lineBasicMaterial
                        attach="material"
                        color="gray"
                        transparent
                        opacity={0.5}
                    />
                </line>
            )}
            {/* Polygon Preview */}
            {polygonPoints.length > 0 && (
                <line>
                    <bufferGeometry
                        attach="geometry"
                        attributes={{
                            position: new THREE.BufferAttribute(
                                new Float32Array(polygonPoints.flatMap((p) => [p.x, p.y, 0])),
                                3
                            ),
                        }}
                    />
                    <lineBasicMaterial
                        attach="material"
                        color="blue"
                        transparent
                        opacity={0.5}
                    />
                </line>
            )}
            {/* Dashed Line Preview */}
            {renderDashedLinePreview()}
            {/* Event handlers */}
            <mesh
                onPointerDown={handleMouseDown}
                onPointerMove={handleMouseMove}
                onPointerUp={handleMouseUp}
                visible={false}
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    );
};

const DrawLayout = ({ drawingMode, isEditMode }) => {
    return (
        <Canvas
            orthographic
            camera={{
                position: [0, 0, 10],
                zoom: 50,
                near: 0.1,
                far: 1000,
                up: [0, 0, 1],
                left: -10,
                right: 10,
                top: 10,
                bottom: -10,
            }}
        >
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <DrawingTool drawingMode={drawingMode} isEditMode={isEditMode} />
        </Canvas>
    );
};

export default DrawLayout;