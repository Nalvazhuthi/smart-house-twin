import * as THREE from "three";
import { Html } from "@react-three/drei";
import React, { useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";

export const DrawingTool = ({ drawingMode, isEditMode, is3DView }) => {
  // State management
  const [rooms, setRooms] = useState([]);
  const [verandas, setVerandas] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [gridSnappingEnabled, setGridSnappingEnabled] = useState(true);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [currentMousePos, setCurrentMousePos] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedVeranda, setSelectedVeranda] = useState(null);
  const { camera, size, set } = useThree();

  // Camera setup
  useEffect(() => {
    if (is3DView) {
      const perspectiveCamera = new THREE.PerspectiveCamera(
        75,
        size.width / size.height,
        0.1,
        1000
      );
      perspectiveCamera.position.set(10, 10, 10);
      perspectiveCamera.lookAt(0, 0, 0);
      set({ camera: perspectiveCamera });
    } else {
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
  }, [is3DView, size, set]);

  // Generate walls from rooms
  const generateWallsFromRooms = () => {
    const uniqueWalls = new Set();
    rooms.forEach((room) => {
      for (let i = 0; i < room.points.length; i++) {
        const nextIndex = (i + 1) % room.points.length;
        const start = room.points[i];
        const end = room.points[nextIndex];
        const sortedPoints = [start, end].sort((a, b) => {
          if (a.x !== b.x) return a.x - b.x;
          return a.z - b.z;
        });
        uniqueWalls.add({
          start: sortedPoints[0],
          end: sortedPoints[1],
          roomIndex: rooms.indexOf(room),
          isVeranda: false,
        });
      }
    });
    return Array.from(uniqueWalls);
  };

  // Generate veranda grid lines for 2D view
  const generateVerandaGrid = (veranda) => {
    const gridLines = [];
    const bounds = calculateRoomBounds(veranda.points);
    const gridSize = 0.5;

    // Horizontal grid lines
    for (let z = bounds.minZ; z <= bounds.maxZ; z += gridSize) {
      gridLines.push({
        start: new THREE.Vector3(bounds.minX, 0, z),
        end: new THREE.Vector3(bounds.maxX, 0, z),
        isVeranda: true,
        isGrid: true,
      });
    }

    // Vertical grid lines
    for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
      gridLines.push({
        start: new THREE.Vector3(x, 0, bounds.minZ),
        end: new THREE.Vector3(x, 0, bounds.maxZ),
        isVeranda: true,
        isGrid: true,
      });
    }

    return gridLines;
  };

  // Wall generation effect
  const [walls, setWalls] = useState([]);
  useEffect(() => {
    const roomWalls = generateWallsFromRooms();
    const verandaWalls = verandas.flatMap((veranda) =>
      generateVerandaGrid(veranda)
    );
    setWalls([...roomWalls, ...verandaWalls]);
  }, [rooms, verandas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (polygonPoints.length > 0) {
          setPolygonPoints([]);
        } else if (selectedRoom) {
          setSelectedRoom(null);
        } else if (selectedVeranda) {
          setSelectedVeranda(null);
        }
      }
      if (
        event.key === "Enter" &&
        (drawingMode === "polygon" || drawingMode === "veranda-polygon") &&
        polygonPoints.length >= 3
      ) {
        completePolygon();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [polygonPoints, drawingMode, selectedRoom, selectedVeranda]);

  // Utility functions
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
    [...rooms, ...verandas].forEach((space) => {
      space.points.forEach((point) => {
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

  const calculateRoomBounds = (points) => {
    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    });

    return { minX, maxX, minZ, maxZ };
  };

  const adjustLabelPosition = (labelSize, bounds, center) => {
    const [labelWidth, labelHeight] = labelSize;
    const halfWidth = labelWidth / 2;
    const halfHeight = labelHeight / 2;

    let adjustedX = center.x;
    let adjustedZ = center.z;

    if (adjustedX - halfWidth < bounds.minX)
      adjustedX = bounds.minX + halfWidth;
    if (adjustedX + halfWidth > bounds.maxX)
      adjustedX = bounds.maxX - halfWidth;
    if (adjustedZ - halfHeight < bounds.minZ)
      adjustedZ = bounds.minZ + halfHeight;
    if (adjustedZ + halfHeight > bounds.maxZ)
      adjustedZ = bounds.maxZ - halfHeight;

    return new THREE.Vector3(adjustedX, 0, adjustedZ);
  };

  // Shape creation functions
  const completePolygon = () => {
    if (polygonPoints.length < 3) return;

    const firstPoint = polygonPoints[0];
    const lastPoint = polygonPoints[polygonPoints.length - 1];
    const shouldClose = firstPoint.distanceTo(lastPoint) > 0.5;
    const finalizedPoints = shouldClose
      ? [...polygonPoints, firstPoint]
      : polygonPoints;
    const area = calculateArea(finalizedPoints);

    if (area > 0.1) {
      const center = calculateRoomCenter(finalizedPoints);
      const bounds = calculateRoomBounds(finalizedPoints);

      if (drawingMode === "veranda-polygon") {
        setVerandas((prev) => [
          ...prev,
          {
            points: finalizedPoints,
            area,
            center,
            bounds,
            name: `Veranda ${verandas.length + 1}`,
          },
        ]);
      } else {
        setRooms((prev) => [
          ...prev,
          {
            points: finalizedPoints,
            area,
            center,
            bounds,
            name: `Room ${rooms.length + 1}`,
          },
        ]);
      }
      setPolygonPoints([]);
    } else {
      alert("Area is too small");
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
    const bounds = calculateRoomBounds(rectPoints);

    if (drawingMode === "veranda-rectangle") {
      setVerandas((prev) => [
        ...prev,
        {
          points: rectPoints,
          area,
          center,
          bounds,
          name: `Veranda ${verandas.length + 1}`,
        },
      ]);
    } else {
      setRooms((prev) => [
        ...prev,
        {
          points: rectPoints,
          area,
          center,
          bounds,
          name: `Room ${rooms.length + 1}`,
        },
      ]);
    }
    setIsDragging(false);
    setStartPoint(null);
    setEndPoint(null);
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

  // Rendering functions
  const renderRooms = () => {
    return rooms.map((room, index) => {
      const shape = createShapeFromPoints(room.points);
      const geometry = new THREE.ShapeGeometry(shape);
      const bounds = calculateRoomBounds(room.points);
      const center = calculateRoomCenter(room.points);
      const adjustedPos = adjustLabelPosition([1.5, 1.0], bounds, center);
      const isSelected = room === selectedRoom;

      return (
        <group key={`room-${index}`}>
          <mesh
            geometry={geometry}
            rotation={[Math.PI * 0.5, 0, 0]}
            position={[0, 0.01, 0]}
          >
            <meshStandardMaterial
              color={isSelected ? "#ff9999" : "#ff6666"}
              side={THREE.DoubleSide}
              transparent
              opacity={0.7}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
          <Html position={[adjustedPos.x, 0.02, adjustedPos.z]}>
            <div
              className="room-label"
              style={{
                background: "rgba(255, 102, 102, 0.8)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                color: "white",
              }}
            >
              <div>{room.name}</div>
              <div>{room.area.toFixed(2)} m²</div>
            </div>
          </Html>
        </group>
      );
    });
  };

  const renderVerandas = () => {
    return verandas.map((veranda, index) => {
      const bounds = calculateRoomBounds(veranda.points);
      const center = calculateRoomCenter(veranda.points);
      const adjustedPos = adjustLabelPosition([1.5, 1.0], bounds, center);
      const isSelected = veranda === selectedVeranda;

      // Create a shape from veranda points
      const shape = new THREE.Shape();
      shape.moveTo(veranda.points[0].x, veranda.points[0].z);
      for (let i = 1; i < veranda.points.length; i++) {
        shape.lineTo(veranda.points[i].x, veranda.points[i].z);
      }
      shape.lineTo(veranda.points[0].x, veranda.points[0].z);

      // Extrude settings
      const extrudeSettings = {
        steps: 1,
        depth: 0.2, // Thickness of the veranda floor
        bevelEnabled: false,
      };

      // Create extruded geometry
      const extrudedGeometry = new THREE.ExtrudeGeometry(
        shape,
        extrudeSettings
      );

      return (
        <group key={`veranda-${index}`}>
          {/* 3D Extruded Grid Lines */}
          {is3DView &&
            generateVerandaGrid(veranda).map((line, i) => {
              const length = line.start.distanceTo(line.end);
              const midpoint = new THREE.Vector3()
                .addVectors(line.start, line.end)
                .multiplyScalar(0.5);
              const angle = Math.atan2(
                line.end.z - line.start.z,
                line.end.x - line.start.x
              );

              return (
                <mesh
                  key={`grid-${index}-${i}`}
                  position={[midpoint.x, 0.1, midpoint.z]}
                  rotation={[0, -angle, 0]}
                >
                  <boxGeometry args={[length, 0.05, 0.05]} />{" "}
                  {/* Width, Height, Depth */}
                  <meshStandardMaterial
                    color={0xcccccc}
                    side={THREE.DoubleSide}
                    roughness={0.8}
                    metalness={0.1}
                  />
                </mesh>
              );
            })}

          {/* 2D Grid Lines (for 2D view) */}
          {!is3DView && (
            <group>
              {generateVerandaGrid(veranda).map((line, i) => (
                <line key={`grid-${index}-${i}`}>
                  <bufferGeometry
                    attach="geometry"
                    attributes={{
                      position: new THREE.BufferAttribute(
                        new Float32Array([
                          line.start.x,
                          0,
                          line.start.z,
                          line.end.x,
                          0,
                          line.end.z,
                        ]),
                        3
                      ),
                    }}
                  />
                  <lineBasicMaterial
                    attach="material"
                    color={0x888888}
                    linewidth={1}
                    transparent
                    opacity={0.5}
                  />
                </line>
              ))}
            </group>
          )}

          {/* Label */}
          <Html position={[adjustedPos.x, 0.02, adjustedPos.z]}>
            <div
              className="veranda-label"
              style={{
                background: "rgba(245, 222, 179, 0.8)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              <div>{veranda.name}</div>
              <div>{veranda.area.toFixed(2)} m²</div>
            </div>
          </Html>
        </group>
      );
    });
  };
  const renderWalls = () => {
    return walls.map((wall, index) => {
      // Skip veranda walls in 3D view
      if (is3DView && wall.isVeranda) return null;

      const start = wall.start;
      const end = wall.end;

      if (is3DView) {
        const length = start.distanceTo(end);
        const wallHeight = 2.5;
        const wallThickness = 0.2;

        const shape = new THREE.Shape();
        shape.moveTo(-length / 2, -wallHeight / 2);
        shape.lineTo(length / 2, -wallHeight / 2);
        shape.lineTo(length / 2, wallHeight / 2);
        shape.lineTo(-length / 2, wallHeight / 2);
        shape.lineTo(-length / 2, -wallHeight / 2);

        const geometry = new THREE.ExtrudeGeometry(shape, {
          steps: 1,
          depth: wallThickness,
          bevelEnabled: false,
        });

        const midpoint = new THREE.Vector3()
          .addVectors(start, end)
          .multiplyScalar(0.5);
        const angle = Math.atan2(end.z - start.z, end.x - start.x);

        return (
          <mesh
            key={`3d-wall-${index}`}
            geometry={geometry}
            position={[midpoint.x, wallHeight / 2, midpoint.z]}
            rotation={[0, -angle, 0]}
          >
            <meshStandardMaterial
              color={0xcccccc}
              side={THREE.DoubleSide}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        );
      } else {
        // 2D rendering
        return (
          <line key={`2d-wall-${index}`}>
            <bufferGeometry
              attach="geometry"
              attributes={{
                position: new THREE.BufferAttribute(
                  new Float32Array([start.x, 0, start.z, end.x, 0, end.z]),
                  3
                ),
              }}
            />
            <lineBasicMaterial
              attach="material"
              color={
                wall.isGrid ? 0x888888 : wall.isVeranda ? 0xf5deb3 : "black"
              }
              linewidth={wall.isGrid ? 1 : 2}
              transparent={wall.isGrid}
              opacity={wall.isGrid ? 0.5 : 1}
            />
          </line>
        );
      }
    });
  };

  const renderDashedLinePreview = () => {
    if (
      (drawingMode === "polygon" || drawingMode === "veranda-polygon") &&
      polygonPoints.length > 0 &&
      currentMousePos
    ) {
      const lastPoint = polygonPoints[polygonPoints.length - 1];
      return (
        <line>
          <bufferGeometry
            attach="geometry"
            attributes={{
              position: new THREE.BufferAttribute(
                new Float32Array([
                  lastPoint.x,
                  0,
                  lastPoint.z,
                  currentMousePos.x,
                  0,
                  currentMousePos.z,
                ]),
                3
              ),
            }}
          />
          <lineDashedMaterial
            attach="material"
            color={drawingMode === "veranda-polygon" ? "#FFA07A" : "blue"}
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
    if (currentMousePos) previewPoints.push(currentMousePos);
    if (previewPoints.length >= 3) previewPoints.push(previewPoints[0]);

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
          color={drawingMode === "veranda-polygon" ? "#FFA07A" : "blue"}
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
                startPoint.x,
                0,
                startPoint.z,
                endPoint.x,
                0,
                startPoint.z,
                endPoint.x,
                0,
                endPoint.z,
                startPoint.x,
                0,
                endPoint.z,
                startPoint.x,
                0,
                startPoint.z,
              ]),
              3
            ),
          }}
        />
        <lineBasicMaterial
          attach="material"
          color={drawingMode === "veranda-rectangle" ? "#FFA07A" : "#4A90E2"}
          transparent
          opacity={1}
        />
      </line>
    );
  };

  // Event handlers
  const handleMouseDown = (event) => {
    if (is3DView) return;
    const worldPosition = getWorldPosition(event);
    const snappedPosition = gridSnappingEnabled
      ? snapToNearbyRooms(snapToGrid(worldPosition))
      : worldPosition;

    if (
      event.button === 2 &&
      (drawingMode === "polygon" || drawingMode === "veranda-polygon")
    ) {
      completePolygon();
      return;
    }
    if (event.button !== 0) return;

    if (
      (drawingMode === "polygon" || drawingMode === "veranda-polygon") &&
      polygonPoints.length >= 2
    ) {
      const firstPoint = polygonPoints[0];
      if (firstPoint.distanceTo(snappedPosition) < 1) {
        completePolygon();
        return;
      }
    }

    if (drawingMode === "rectangle" || drawingMode === "veranda-rectangle") {
      setStartPoint(snappedPosition);
      setIsDragging(true);
    } else if (drawingMode === "polygon" || drawingMode === "veranda-polygon") {
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
    if (is3DView || !isDragging || !startPoint || !endPoint) return;
    if (drawingMode === "rectangle" || drawingMode === "veranda-rectangle") {
      finalizeRectangle();
    }
    setIsDragging(false);
    setStartPoint(null);
    setEndPoint(null);
  };

  return (
    <>
      {/* Walls */}
      {renderWalls()}

      {/* Rooms */}
      {renderRooms()}

      {/* Verandas */}
      {renderVerandas()}

      {/* Selection highlights */}
      {selectedRoom?.points.map((point, i) => (
        <mesh key={`room-point-${i}`} position={[point.x, 0.2, point.z]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="red" />
        </mesh>
      ))}
      {selectedVeranda?.points.map((point, i) => (
        <mesh key={`veranda-point-${i}`} position={[point.x, 0.2, point.z]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#FFA07A" />
        </mesh>
      ))}

      {/* Drawing previews */}
      {!is3DView && (
        <>
          {(drawingMode === "rectangle" ||
            drawingMode === "veranda-rectangle") &&
            renderRectanglePreview()}
          {(drawingMode === "polygon" || drawingMode === "veranda-polygon") &&
            renderPolygonPreview()}
          {renderDashedLinePreview()}
        </>
      )}

      {/* Invisible plane for interaction */}
      <mesh
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
};
