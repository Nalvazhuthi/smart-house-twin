import * as THREE from "three";
import { Html } from "@react-three/drei";
import React, { useState, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";

export const DrawingTool = ({ drawingMode, isEditMode, is3DView }) => {
    const [rooms, setRooms] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [endPoint, setEndPoint] = useState(null);
    const [gridSnappingEnabled, setGridSnappingEnabled] = useState(true);
    const [roomNamePopup, setRoomNamePopup] = useState(null);
    const [polygonPoints, setPolygonPoints] = useState([]);
    const [currentMousePos, setCurrentMousePos] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);

    const { camera, size, set } = useThree();

    // Switch between orthographic and perspective cameras
    useEffect(() => {
        if (is3DView) {
            // Set up perspective camera for 3D view
            const perspectiveCamera = new THREE.PerspectiveCamera(75, size.width / size.height, 0.1, 1000);
            perspectiveCamera.position.set(10, 10, 10);
            perspectiveCamera.lookAt(0, 0, 0);
            set({ camera: perspectiveCamera });
        } else {
            // Set up orthographic camera for top-down 2D view
            const aspect = size.width / size.height;
            const zoom = 10;
            const orthoCamera = new THREE.OrthographicCamera(
                -zoom * aspect,
                zoom * aspect,
                zoom,
                -zoom,
                0.1,
                1000
            );
            orthoCamera.position.set(0, 10, 0);
            orthoCamera.lookAt(0, 0, 0);
            orthoCamera.up = new THREE.Vector3(0, 0, 1);
            set({ camera: orthoCamera });
        }
    }, [is3DView, size]);

    // Generate walls from room points
    const generateWallsFromRooms = () => {
        const uniqueWalls = new Set(); // To store unique walls

        rooms.forEach(room => {
            for (let i = 0; i < room.points.length; i++) {
                const nextIndex = (i + 1) % room.points.length;
                const start = room.points[i];
                const end = room.points[nextIndex];

                // Normalize the wall representation to ensure uniqueness
                const sortedPoints = [start, end].sort((a, b) => {
                    if (a.x !== b.x) return a.x - b.x;
                    return a.z - b.z;
                });

                const wallKey = `${sortedPoints[0].x},${sortedPoints[0].z}-${sortedPoints[1].x},${sortedPoints[1].z}`;

                // Add the wall to the set if it's not already present
                uniqueWalls.add({
                    start: sortedPoints[0],
                    end: sortedPoints[1],
                    roomIndex: rooms.indexOf(room),
                });
            }
        });

        // Convert the set back to an array for rendering
        return Array.from(uniqueWalls);
    };

    const [walls, setWalls] = useState([]);

    useEffect(() => {
        setWalls(generateWallsFromRooms());
    }, [rooms]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                if (polygonPoints.length > 0) {
                    setPolygonPoints([]);
                } else if (selectedRoom) {
                    setSelectedRoom(null);
                }
            }
            if (event.key === "Enter" && drawingMode === "polygon" && polygonPoints.length >= 3) {
                completePolygon();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [polygonPoints, drawingMode, selectedRoom]);

    const getWorldPosition = (event) => {
        const x = (event.clientX / size.width) * 2 - 1;
        const y = -(event.clientY / size.height) * 2 + 1;
        const mouse = new THREE.Vector3(x, y, 0);
        mouse.unproject(camera);
        return new THREE.Vector3(mouse.x, 0, mouse.z);
    };

    const snapToGrid = (position) => {
        const gridSize = 0.5;
        return new THREE.Vector3(
            Math.round(position.x / gridSize) * gridSize,
            0,
            Math.round(position.z / gridSize) * gridSize
        );
    };

    const snapToNearbyRooms = (position) => {
        const snapThreshold = 0.5;
        let snappedPosition = position.clone();
        rooms.forEach((room) => {
            room.points.forEach((point) => {
                const tempPoint = new THREE.Vector3(point.x, 0, point.z);
                const tempPosition = new THREE.Vector3(position.x, 0, position.z);
                if (tempPoint.distanceTo(tempPosition) < snapThreshold) {
                    snappedPosition = tempPoint.clone();
                }
            });
        });
        return snappedPosition;
    };

    const calculateArea = (points) => {
        let area = 0;
        if (points.length < 3) return 0;
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            area += current.x * next.z - next.x * current.z;
        }
        return Math.abs(area / 2);
    };

    const calculateRoomCenter = (points) => {
        const center = new THREE.Vector3();
        points.forEach((point) => center.add(point));
        center.divideScalar(points.length);
        return new THREE.Vector3(center.x, 0, center.z);
    };

    const completePolygon = () => {
        if (polygonPoints.length < 3) {
            alert("A room needs at least 3 points");
            return;
        }
        const firstPoint = polygonPoints[0];
        const lastPoint = polygonPoints[polygonPoints.length - 1];
        const shouldClose = firstPoint.distanceTo(lastPoint) > 0.5;
        const finalizedPoints = shouldClose
            ? [...polygonPoints, firstPoint]
            : polygonPoints;
        const area = calculateArea(finalizedPoints);
        if (area > 0.1) {
            const center = calculateRoomCenter(finalizedPoints);
            const newRoom = {
                points: finalizedPoints,
                area,
                center,
                name: `Room ${rooms.length + 1}`,
            };
            setRooms((prevRooms) => [...prevRooms, newRoom]);
            setPolygonPoints([]);
            setRoomNamePopup(newRoom);
        } else {
            alert("Room area is too small");
        }
    };

    const handleMouseDown = (event) => {
        if (is3DView) return;

        const worldPosition = getWorldPosition(event);
        const snappedPosition = gridSnappingEnabled
            ? snapToNearbyRooms(snapToGrid(worldPosition))
            : worldPosition;

        if (event.button === 2 && drawingMode === "polygon") {
            completePolygon();
            return;
        }
        if (event.button !== 0) return;

        if (drawingMode === "polygon" && polygonPoints.length >= 2) {
            const firstPoint = polygonPoints[0];
            if (firstPoint.distanceTo(snappedPosition) < 1) {
                completePolygon();
                return;
            }
        }

        if (drawingMode === "rectangle") {
            setStartPoint(snappedPosition);
            setIsDragging(true);
        } else if (drawingMode === "polygon") {
            setPolygonPoints((prev) => [...prev, snappedPosition]);
        }
    };

    const handleMouseMove = (event) => {
        if (is3DView) return;

        const worldPosition = getWorldPosition(event);
        const snappedPosition = gridSnappingEnabled
            ? snapToNearbyRooms(snapToGrid(worldPosition))
            : worldPosition;

        setCurrentMousePos(snappedPosition);
        if (isDragging && startPoint) {
            setEndPoint(snappedPosition);
        }
    };

    const handleMouseUp = () => {
        if (is3DView) return;

        if (isDragging && startPoint && endPoint) {
            if (drawingMode === "rectangle") {
                finalizeRectangle();
            }
            setIsDragging(false);
            setStartPoint(null);
            setEndPoint(null);
        }
    };

    const finalizeRectangle = () => {
        const rectPoints = [
            new THREE.Vector3(startPoint.x, 0, startPoint.z),
            new THREE.Vector3(endPoint.x, 0, startPoint.z),
            new THREE.Vector3(endPoint.x, 0, endPoint.z),
            new THREE.Vector3(startPoint.x, 0, endPoint.z),
        ];
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
    };

    const createShapeFromPoints = (points) => {
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].z);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].z);
        }
        shape.lineTo(points[0].x, points[0].z);
        return shape;
    };

    const renderPolygonDrawingHelper = () => {
        if (drawingMode !== "polygon" || polygonPoints.length === 0) return null;
        const firstPoint = polygonPoints[0];
        return (
            <group>
                <Html position={[firstPoint.x, 0, firstPoint.z]} transform>
                    <div style={{
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        padding: '4px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'blue'
                    }}>
                        Click here to complete room
                    </div>
                </Html>
                <mesh position={[firstPoint.x, 0, firstPoint.z + 0.1]}>
                    <ringGeometry args={[0.4, 0.5, 32]} />
                    <meshBasicMaterial color="blue" transparent opacity={0.7} />
                </mesh>
            </group>
        );
    };

    const renderDashedLinePreview = () => {
        if (drawingMode === "polygon" && polygonPoints.length > 0 && currentMousePos) {
            const lastPoint = polygonPoints[polygonPoints.length - 1];
            return (
                <line>
                    <bufferGeometry
                        attach="geometry"
                        attributes={{
                            position: new THREE.BufferAttribute(
                                new Float32Array([
                                    lastPoint.x, 0, lastPoint.z,
                                    currentMousePos.x, 0, currentMousePos.z,
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
        }
        return null;
    };

    const renderPolygonPreview = () => {
        if (polygonPoints.length < 1) return null;
        const previewPoints = [...polygonPoints];
        if (currentMousePos) {
            previewPoints.push(currentMousePos);
        }
        if (previewPoints.length >= 3) {
            previewPoints.push(previewPoints[0]);
        }
        return (
            <line>
                <bufferGeometry
                    attach="geometry"
                    attributes={{
                        position: new THREE.BufferAttribute(
                            new Float32Array(previewPoints.flatMap((p) => [p.x, 0, p.z])),
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
        );
    };

    const renderRectanglePreview = () => {
        if (!isDragging || !startPoint || !endPoint) return null;
        return (
            <line>
                <bufferGeometry
                    attach="geometry"
                    attributes={{
                        position: new THREE.BufferAttribute(
                            new Float32Array([
                                startPoint.x, 0, startPoint.z,
                                endPoint.x, 0, startPoint.z,
                                endPoint.x, 0, endPoint.z,
                                startPoint.x, 0, endPoint.z,
                                startPoint.x, 0, startPoint.z,
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
        );
    };

    const renderWalls = () => {
        return walls.map((wall, index) => {
            const start = wall.start;
            const end = wall.end;
            const length = start.distanceTo(end);

            if (is3DView) {
                // Define the wall height and thickness
                const wallHeight = 2.5; // Height of the wall
                const wallThickness = 0.2; // Thickness of the wall

                // Create a 2D shape for the wall base
                const shape = new THREE.Shape();
                shape.moveTo(-length / 2, -wallHeight / 2); // Bottom-left corner
                shape.lineTo(length / 2, -wallHeight / 2); // Bottom-right corner
                shape.lineTo(length / 2, wallHeight / 2); // Top-right corner
                shape.lineTo(-length / 2, wallHeight / 2); // Top-left corner
                shape.lineTo(-length / 2, -wallHeight / 2); // Close the shape

                // Extrude settings
                const extrudeSettings = {
                    steps: 1,
                    depth: wallThickness, // Extrude along the Y-axis
                    bevelEnabled: false,
                };

                // Create the extruded geometry
                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

                // Calculate the midpoint and rotation angle for the wall

                const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                const angle = Math.atan2(end.z - start.z, end.x - start.x);

                // Create the mesh for the wall
                return (
                    <mesh
                        key={`3d-wall-${index}`}
                        geometry={geometry}
                        position={[midpoint.x, wallHeight / 2, midpoint.z]} // Position at midpoint
                        rotation={[0, -angle, 0]} // Rotate to align with the wall direction
                    >
                        <meshStandardMaterial
                            color={selectedRoom && selectedRoom === rooms[wall.roomIndex] ? 0xffcc00 : 0xcccccc}
                            side={THREE.DoubleSide}
                            roughness={0.7}
                            metalness={0.1}
                        />
                    </mesh>
                );
            } else {
                // Render 2D walls for top-down view
                return (
                    <group key={`2d-wall-${index}`}>
                        <line>
                            <bufferGeometry
                                attach="geometry"
                                attributes={{
                                    position: new THREE.BufferAttribute(
                                        new Float32Array([
                                            start.x, 0, start.z,
                                            end.x, 0, end.z
                                        ]),
                                        3
                                    ),
                                }}
                            />
                            <lineBasicMaterial
                                attach="material"
                                color={selectedRoom && selectedRoom === rooms[wall.roomIndex] ? "yellow" : "black"}
                                linewidth={2}
                            />
                        </line>
                    </group>
                );
            }
        });
    };


    const renderRooms = () => {
        return rooms.map((room, index) => {
            if (is3DView) return null;

            // Calculate room dimensions (length and width)
            const points = room.points;
            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;

            points.forEach((point) => {
                if (point.x < minX) minX = point.x;
                if (point.x > maxX) maxX = point.x;
                if (point.z < minZ) minZ = point.z;
                if (point.z > maxZ) maxZ = point.z;
            });

            const length = (maxX - minX).toFixed(2); // Horizontal dimension
            const width = (maxZ - minZ).toFixed(2);  // Vertical dimension

            const shape = createShapeFromPoints(room.points);
            const geometry = new THREE.ShapeGeometry(shape);
            const isSelected = room === selectedRoom;

            return (
                <group key={`room-${index}`} style={{ cursor: "pointer" }}>
                    <mesh geometry={geometry}>
                        <meshBasicMaterial
                            color={isSelected ? "yellow" : "white"}
                            side={THREE.DoubleSide}
                            transparent
                            opacity={isSelected ? 0.5 : 0.7}
                        />
                    </mesh>
                    <Html position={[room.center.x, 0, room.center.z]}>
                        <div className="room-label">
                            <div>{room.name}</div>
                            <div>{length} m x {width} m</div> {/* Display dimensions as length x width */}
                        </div>
                    </Html>
                </group>
            );
        });
    };

    return (
        <>
            {/* Walls */}
            {renderWalls()}
            {/* Rooms */}

            {renderRooms()}
            {/* Highlight selected room points */}
            {selectedRoom && selectedRoom.points.map((point, index) => (
                <mesh key={`point-${index}`} position={[point.x, 0.2, point.z]}>
                    <sphereGeometry args={[0.2, 16, 16]} />
                    <meshBasicMaterial color="red" />
                </mesh>
            ))}
            {/* Rectangle Preview */}
            {!is3DView && drawingMode === "rectangle" && renderRectanglePreview()}
            {/* Polygon Preview */}
            {!is3DView && drawingMode === "polygon" && renderPolygonPreview()}
            {/* Dashed Line Preview */}
            {!is3DView && renderDashedLinePreview()}
            {/* Polygon Drawing Helper */}
            {!is3DView && renderPolygonDrawingHelper()}
            {/* Event handlers */}
            <mesh
                onPointerDown={handleMouseDown}
                onPointerMove={handleMouseMove}
                onPointerUp={handleMouseUp}
                visible={false}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial transparent opacity={1} />
            </mesh>
        </>
    );
};