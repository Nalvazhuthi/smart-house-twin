import { useRef } from "react";
import { useDrag } from "@react-three/drei";
import * as THREE from "three";
export const DraggablePoint = ({ position, onDrag }) => {
  const ref = useRef();

  const [bindDrag] = useDrag(
    ({ offset: [x, , z] }) => {
      onDrag(new THREE.Vector3(x, 0, z));
    },
    { pointerEvents: true }
  );

  return (
    <mesh
      {...bindDrag()}
      ref={ref}
      position={position}
      visible
      castShadow
    >
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

