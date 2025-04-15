import React, { useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";

const DrawingTool = ({ drawingMode, isEditMode }) => {
  const [lines, setLines] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [gridSnappingEnabled, setGridSnappingEnabled] = useState(true);
  const [roomNamePopup, setRoomNamePopup] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [currentMousePos, setCurrentMousePos] = useState(null);
  const { camera, size } = useThree();

  // Handle ESC key press to cancel polygon drawing
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && polygonPoints.length > 0) {
        setPolygonPoints([]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [polygonPoints]);

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
    if (points.length < 3) return 0; // Need at least 3 points to form a polygon
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

  // Helper function to check if a point lies on a line segment
  const isPointOnLineSegment = (point, start, end) => {
    const tolerance = 0.1;
    const crossProduct = Math.abs(
      (end.y - start.y) * (point.x - start.x) -
        (end.x - start.x) * (point.y - start.y)
    );
    if (crossProduct > tolerance) return false;
    const dotProduct =
      (point.x - start.x) * (end.x - start.x) +
      (point.y - start.y) * (end.y - start.y);
    if (dotProduct < 0) return false;
    const squaredLength =
      (end.x - start.x) * (end.x - start.x) +
      (end.y - start.y) * (end.y - start.y);
    if (dotProduct > squaredLength) return false;
    return true;
  };

  // Helper function to check if a point lies on any line of a room
  const isPointOnRoomBoundary = (point, room) => {
    for (let i = 0; i < room.points.length; i++) {
      const startPoint = room.points[i];
      const endPoint = room.points[(i + 1) % room.points.length];
      if (isPointOnLineSegment(point, startPoint, endPoint)) {
        return true;
      }
    }
    return false;
  };

  // Calculate bounding box for polygon points
  const calculateBoundingBox = (points) => {
    if (points.length < 2) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    return [
      new THREE.Vector3(minX, minY, 0),
      new THREE.Vector3(maxX, minY, 0),
      new THREE.Vector3(maxX, maxY, 0),
      new THREE.Vector3(minX, maxY, 0),
    ];
  };

  // Handle mouse down events
  const handleMouseDown = (event) => {
    const worldPosition = getWorldPosition(event);
    const snappedPosition = gridSnappingEnabled
      ? snapToNearbyRooms(snapToGrid(worldPosition))
      : worldPosition;
    if (event.button !== 0) return;

    // Check if a room is being clicked (for dragging)
    const clickedRoom = rooms.find((room) =>
      room.points.some((point) => point.distanceTo(snappedPosition) < 0.5)
    );
    if (clickedRoom) {
      if (drawingMode === "polygon" && polygonPoints.length > 0) {
        // Check if we should auto-close the polygon
        if (polygonPoints.length >= 2) {
          const updatedPolygonPoints = [...polygonPoints, snappedPosition];
          const boundingBoxPoints = calculateBoundingBox(updatedPolygonPoints);
          if (boundingBoxPoints) {
            const area = calculateArea(boundingBoxPoints);
            if (area > 0.1) {
              const center = calculateRoomCenter(boundingBoxPoints);
              const newRoom = {
                points: boundingBoxPoints,
                area,
                center,
                name: `Room ${rooms.length + 1}`,
              };
              setRooms((prevRooms) => [...prevRooms, newRoom]);
              setPolygonPoints([]);
              setRoomNamePopup(newRoom);
            }
          }
        }
      } else {
        setIsDragging(true);
      }
      return;
    }

    // Start drawing a new shape
    if (drawingMode === "rectangle") {
      setStartPoint(snappedPosition);
      setIsDragging(true);
    } else if (drawingMode === "polygon") {
      if (polygonPoints.length >= 2) {
        // Check if the new point lies on any room boundary
        let boundaryPoint = null;
        for (const room of rooms) {
          if (isPointOnRoomBoundary(snappedPosition, room)) {
            boundaryPoint = snappedPosition.clone();
            break;
          }
        }
        if (boundaryPoint) {
          const updatedPolygonPoints = [...polygonPoints, boundaryPoint];
          const boundingBoxPoints = calculateBoundingBox(updatedPolygonPoints);
          if (boundingBoxPoints) {
            const area = calculateArea(boundingBoxPoints);
            if (area > 0.1) {
              const center = calculateRoomCenter(boundingBoxPoints);
              const newRoom = {
                points: boundingBoxPoints,
                area,
                center,
                name: `Room ${rooms.length + 1}`,
              };
              setRooms((prevRooms) => [...prevRooms, newRoom]);
              setPolygonPoints([]);
              setRoomNamePopup(newRoom);
              return;
            }
          }
        }
      }
      // Add the point to the polygon
      setPolygonPoints((prev) => [...prev, snappedPosition]);
    }
  };

  // Handle mouse move to update previews or drag rooms
  const handleMouseMove = (event) => {
    const worldPosition = getWorldPosition(event);
    const snappedPosition = gridSnappingEnabled
      ? snapToNearbyRooms(snapToGrid(worldPosition))
      : worldPosition;
    setCurrentMousePos(snappedPosition);
    if (isDragging && startPoint) {
      setEndPoint(snappedPosition);
    }
  };

  // Handle mouse up to finish dragging or drawing
  const handleMouseUp = () => {
    if (isDragging && startPoint && endPoint) {
      if (drawingMode === "rectangle") {
        finalizeRectangle();
      }
      setIsDragging(false);
      setStartPoint(null);
      setEndPoint(null);
    }
  };

  // Finalize rectangle
  const finalizeRectangle = () => {
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
  };

  // Render dashed line preview for polygon
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
                  lastPoint.x,
                  lastPoint.y,
                  0,
                  currentMousePos.x,
                  currentMousePos.y,
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
    }
    return null;
  };

  // Render polygon preview
  const renderPolygonPreview = () => {
    if (polygonPoints.length < 1) return null;
    const previewPoints = [...polygonPoints];
    if (currentMousePos) {
      previewPoints.push(currentMousePos);
    }
    // Add closing line if we have enough points
    if (previewPoints.length >= 3) {
      previewPoints.push(previewPoints[0]);
    }
    return (
      <line>
        <bufferGeometry
          attach="geometry"
          attributes={{
            position: new THREE.BufferAttribute(
              new Float32Array(previewPoints.flatMap((p) => [p.x, p.y, 0])),
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

  // Render rectangle preview
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
                startPoint.y,
                0,
                endPoint.x,
                startPoint.y,
                0,
                endPoint.x,
                endPoint.y,
                0,
                startPoint.x,
                endPoint.y,
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
    );
  };

  return (
    <>
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
            color: "black",
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
        const shape = new THREE.Shape();
        shape.moveTo(room.points[0].x, room.points[0].y);
        for (let i = 1; i < room.points.length; i++) {
          shape.lineTo(room.points[i].x, room.points[i].y);
        }
        shape.lineTo(room.points[0].x, room.points[0].y);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
          color: "white",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        return (
          <group key={`room-${index}`}>
            <mesh geometry={geometry} material={material} />
            <Html position={[room.center.x, room.center.y, 0]} transform>
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.8)",
                  padding: "2px 5px",
                  borderRadius: "3px",
                  fontSize: "12px",
                  pointerEvents: "none",
                  textAlign: "center",
                }}
              >
                <div>{room.name}</div>
                <div>{room.area.toFixed(2)} m²</div>
              </div>
            </Html>
          </group>
        );
      })}
      {/* Rectangle Preview */}
      {drawingMode === "rectangle" && renderRectanglePreview()}
      {/* Polygon Preview */}
      {drawingMode === "polygon" && renderPolygonPreview()}
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
      onContextMenu={(e) => e.preventDefault()}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <DrawingTool drawingMode={drawingMode} isEditMode={isEditMode} />
    </Canvas>
  );
};

export default DrawLayout;


