import * as THREE from "three";
import { Html } from "@react-three/drei";
import React, { useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";

export const CONSTANTS = {
  wallConfig: {
    height: 2.5, // Wall height in meters
    width: 0.2,  // Wall thickness in meters
  },
};

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
  const [draggedPointIndex, setDraggedPointIndex] = useState(null); // For dragging room points
  const { camera, size, set } = useThree();
  const [hoveredWall, setHoveredWall] = useState(null);

  useEffect(() => {
    if (selectedRoom) {
      // Find by ID instead of object reference
      const updatedRoom = rooms.find(room => room.id === selectedRoom.id);
      if (updatedRoom) {
        setSelectedRoom(updatedRoom);
      }
    }
  }, [rooms, selectedRoom?.id]); // Watch for ID changes instead of points


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
            id: Date.now(), // Add unique ID
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
            id: Date.now(), // Add unique ID
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

  const isValidPolygon = (points) => {
    return points.length >= 3 && calculateArea(points) > 0;
  };

  const renderRooms = () => {
    return rooms
      .filter((room) => isValidPolygon(room.points)) // Filter out invalid rooms
      .map((room) => {
        const shape = createShapeFromPoints(room.points);
        const geometry = new THREE.ShapeGeometry(shape);
        const bounds = calculateRoomBounds(room.points);
        const center = calculateRoomCenter(room.points);
        const adjustedPos = adjustLabelPosition([1.5, 1.0], bounds, center);
        const isSelected = room === selectedRoom;
        return (
          <group key={`room-${room.id}`}>
            {/* Render only if the geometry is valid */}
            {isValidPolygon(room.points) && (
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
            )}
            <Html
              position={[adjustedPos.x, 0.02, adjustedPos.z]}
              occlude
            >
              <div
                className="room-label"
                style={{
                  background: "rgba(255, 102, 102, 0.8)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "white",
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRoom(room);
                  setSelectedVeranda(null);
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
      return (
        <group key={`veranda-${index}`}>
          {/* Veranda grid lines */}
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
                  <boxGeometry args={[length, 0.05, 0.05]} />
                  <meshStandardMaterial
                    color={0xcccccc}
                    side={THREE.DoubleSide}
                    roughness={0.8}
                    metalness={0.1}
                  />
                </mesh>
              );
            })}
          {/* Veranda label */}
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
      if (is3DView && wall.isVeranda) return null;
      const { start, end, layer = 1 } = wall; // Ensure wall has a layer property

      if (is3DView) {
        const length = start.distanceTo(end);
        const wallHeight = 2;
        const wallThickness = 0.1;

        // Create shape matching loadWalls' dimensions
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(length, 0);
        shape.lineTo(length, wallHeight);
        shape.lineTo(0, wallHeight);
        shape.closePath();

        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: wallThickness,
          bevelEnabled: false,
        });

        const angle = Math.atan2(end.z - start.z, end.x - start.x);

        return (
          <mesh
            key={`3d-wall-${index}`}
            geometry={geometry}
            position={[start.x, (layer - 1) * wallHeight, start.z]}
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
        // Keep 2D rendering logic unchanged
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
              color={wall.isGrid ? 0x888888 : wall.isVeranda ? 0xf5deb3 : "black"}
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

  // Render draggable points for selected room
  const renderSelectedRoomPoints = () => {
    if (!selectedRoom) return null;

    const roomIndex = rooms.indexOf(selectedRoom);
    return selectedRoom.points.map((point, index) => (
      <mesh
        key={`editable-point-${roomIndex}-${index}`} // Unique key based on room and point index
        position={[point.x, 0.2, point.z]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDraggedPointIndex(index);
        }}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="red" />
      </mesh>
    ));
  };

  const getRoomsSharingPoint = (point) => {
    return [...rooms, ...verandas].filter((space) =>
      space.points.some((p) => p.equals(point))
    );
  };

  // Handle dragging of points
  useEffect(() => {
    if (draggedPointIndex === null || !selectedRoom) return;

    const handleMouseMove = (event) => {
      const worldPosition = getWorldPosition(event);
      const snappedPosition = gridSnappingEnabled
        ? snapToNearbyRooms(snapToGrid(worldPosition))
        : worldPosition;

      // Find all rooms sharing the dragged point
      const sharingRooms = getRoomsSharingPoint(selectedRoom.points[draggedPointIndex]);

      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (sharingRooms.includes(room)) {
            const updatedPoints = [...room.points];
            updatedPoints[draggedPointIndex] = snappedPosition;
            return {
              ...room,
              points: updatedPoints,
              area: calculateArea(updatedPoints),
              center: calculateRoomCenter(updatedPoints),
              bounds: calculateRoomBounds(updatedPoints),
            };
          }
          return room;
        })
      );

      setVerandas((prevVerandas) =>
        prevVerandas.map((veranda) => {
          if (sharingRooms.includes(veranda)) {
            const updatedPoints = [...veranda.points];
            updatedPoints[draggedPointIndex] = snappedPosition;
            return {
              ...veranda,
              points: updatedPoints,
              area: calculateArea(updatedPoints),
              center: calculateRoomCenter(updatedPoints),
              bounds: calculateRoomBounds(updatedPoints),
            };
          }
          return veranda;
        })
      );
    };

    window.addEventListener("pointermove", handleMouseMove);
    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
    };
  }, [draggedPointIndex, selectedRoom?.id]);
  // Event handlers
  const handleMouseDown = (event) => {
    const isLabelClick = event.nativeEvent.target.closest(
      ".room-label, .veranda-label"
    );
    if (isLabelClick) return;

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
    // Add point mode
    if (drawingMode === "addPoint" && hoveredWall) {
      const { room, insertIndex, position } = hoveredWall;

      if (room) {

        if (!selectedRoom) return null;
        const updatedPoints = [...room.points];
        updatedPoints.splice(insertIndex, 0, position);

        if (rooms.some(r => r.id === room.id)) {
          setRooms(prevRooms =>
            prevRooms.map(r =>
              r.id === room.id
                ? {
                  ...r,
                  points: updatedPoints,
                  area: calculateArea(updatedPoints),
                  center: calculateRoomCenter(updatedPoints),
                  bounds: calculateRoomBounds(updatedPoints)
                }
                : r
            )
          );
        } else if (verandas.some(v => v.id === room.id)) {
          setVerandas(prevVerandas =>
            prevVerandas.map(v =>
              v.id === room.id
                ? {
                  ...v,
                  points: updatedPoints,
                  area: calculateArea(updatedPoints),
                  center: calculateRoomCenter(updatedPoints),
                  bounds: calculateRoomBounds(updatedPoints)
                }
                : v
            )
          );
        }
      }
      return;
    }
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

  // Find closest wall segment to mouse position
  const findClosestWallSegment = (position) => {
    let closestWall = null;
    let closestDistance = Infinity;
    let closestPosition = null;
    let closestRoom = null;
    let insertIndex = -1;

    // Check rooms
    rooms.forEach((room) => {
      for (let i = 0; i < room.points.length; i++) {
        const nextIndex = (i + 1) % room.points.length;
        const start = room.points[i];
        const end = room.points[nextIndex];

        const line = new THREE.Line3(
          new THREE.Vector3(start.x, 0, start.z),
          new THREE.Vector3(end.x, 0, end.z)
        );

        const closestPoint = new THREE.Vector3();
        line.closestPointToPoint(position, true, closestPoint);
        const distance = position.distanceTo(closestPoint);

        if (distance < 1.0 && distance < closestDistance) {
          closestDistance = distance;
          closestWall = { start, end };
          closestPosition = closestPoint;
          closestRoom = room;
          insertIndex = nextIndex;
        }
      }
    });

    // Check verandas
    verandas.forEach((veranda) => {
      for (let i = 0; i < veranda.points.length; i++) {
        const nextIndex = (i + 1) % veranda.points.length;
        const start = veranda.points[i];
        const end = veranda.points[nextIndex];

        const line = new THREE.Line3(
          new THREE.Vector3(start.x, 0, start.z),
          new THREE.Vector3(end.x, 0, end.z)
        );

        const closestPoint = new THREE.Vector3();
        line.closestPointToPoint(position, true, closestPoint);
        const distance = position.distanceTo(closestPoint);

        if (distance < 1.0 && distance < closestDistance) {
          closestDistance = distance;
          closestWall = { start, end };
          closestPosition = closestPoint;
          closestRoom = veranda;
          insertIndex = nextIndex;
        }
      }
    });

    return closestWall
      ? { wall: closestWall, position: closestPosition, room: closestRoom, insertIndex }
      : null;
  };



  const handleMouseMove = (event) => {
    const isLabelClick = event.nativeEvent.target.closest(
      ".room-label, .veranda-label"
    );
    if (isLabelClick) return;

    if (is3DView) return;
    const worldPosition = getWorldPosition(event);
    const snappedPosition = gridSnappingEnabled
      ? snapToNearbyRooms(snapToGrid(worldPosition))
      : worldPosition;
    setCurrentMousePos(snappedPosition);
    if (isDragging && startPoint) {
      setEndPoint(snappedPosition);
    }

    // Wall segment detection for addPoint mode
    if (drawingMode === "addPoint") {
      console.log('drawingMode: ', drawingMode);
      const closest = findClosestWallSegment(snappedPosition);
      setHoveredWall(closest);
    } else {
      setHoveredWall(null);
    }
  };

  const handleMouseUp = (event) => {
    const isLabelClick = event.nativeEvent.target.closest(
      ".room-label, .veranda-label"
    );
    if (isLabelClick) return;

    if (is3DView || !isDragging || !startPoint || !endPoint) return;
    if (drawingMode === "rectangle" || drawingMode === "veranda-rectangle") {
      finalizeRectangle();
    }
    setIsDragging(false);
    setStartPoint(null);
    setEndPoint(null);
  };


  const renderWallSegmentHighlight = () => {
    if (!selectedRoom) return null;

    if (drawingMode !== "addPoint" || !hoveredWall || is3DView) return null;


    return (
      <>
        {/* Highlight the wall segment */}
        <line>
          <bufferGeometry
            attach="geometry"
            attributes={{
              position: new THREE.BufferAttribute(
                new Float32Array([
                  hoveredWall.wall.start.x, 0, hoveredWall.wall.start.z,
                  hoveredWall.wall.end.x, 0, hoveredWall.wall.end.z
                ]),
                3
              ),
            }}
          />
          <lineBasicMaterial
            attach="material"
            color="yellow"
            linewidth={4}
          />
        </line>

        {/* Preview point */}
        <mesh position={[hoveredWall.position.x, 0.2, hoveredWall.position.z]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="yellow" transparent opacity={0.8} />
        </mesh>
      </>
    );
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
      {/* {selectedRoom?.points.map((point, i) => (
        <mesh key={`room-point-${i}`} position={[point.x, 0.2, point.z]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="red" />
        </mesh>
      ))} */}
      {selectedVeranda?.points.map((point, i) => (
        <mesh key={`veranda-point-${i}`} position={[point.x, 0.2, point.z]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#FFA07A" />
        </mesh>
      ))}
      {/* Draggable points for selected room */}
      {!is3DView && renderSelectedRoomPoints()}

      {/* Wall segment highlight and preview */}
      {renderWallSegmentHighlight()}

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


// "@react-three/drei": "^9.113.0",
// Before pressing explore 3d user should select a room after pressed explore camera should smoothly move to the selected room and then the user can start exploring the room iin 3d view
// If user havenot selected a room then camera should move to the room 1 or and then the user can start exploring the room in 3d view