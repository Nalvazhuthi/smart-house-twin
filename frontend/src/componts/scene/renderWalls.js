import * as THREE from "three";

export const renderWalls = () => {
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

      const midpoint = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);
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
            color={
              selectedRoom && selectedRoom === rooms[wall.roomIndex]
                ? 0xffcc00
                : 0xcccccc
            }
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
                  new Float32Array([start.x, 0, start.z, end.x, 0, end.z]),
                  3
                ),
              }}
            />
            <lineBasicMaterial
              attach="material"
              color={
                selectedRoom && selectedRoom === rooms[wall.roomIndex]
                  ? "yellow"
                  : "black"
              }
              linewidth={2}
            />
          </line>
        </group>
      );
    }
  });
};
