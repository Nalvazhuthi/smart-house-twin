import React from 'react'

const RayCasterPlane = ({ handleMouseDown, handleMouseMove, handleMouseUp }) => {
    return (
        < mesh
            onPointerDown={handleMouseDown}
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            visible={false}
            rotation={[-Math.PI / 2, 0, 0]}
        >
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh >
    )
}

export default RayCasterPlane
