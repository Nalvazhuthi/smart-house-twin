import React, { useState } from 'react';

const RoomSetupPage = () => {
  const [rooms, setRooms] = useState([
    { name: '', length: '', width: '' }
  ]);

  const handleRoomChange = (index, field, value) => {
    const updatedRooms = [...rooms];
    updatedRooms[index][field] = value;
    setRooms(updatedRooms);
  };

  const addNewRoom = () => {
    setRooms([...rooms, { name: '', length: '', width: '' }]);
  };

  const handleGenerate = () => {
    const validRooms = rooms.filter(room => room.name && room.length && room.width);
    if (validRooms.length === 0) {
      alert('Please enter at least one valid room.');
      return;
    }

    const roomData = validRooms.map(
      r => `${r.name} ${r.length}m x ${r.width}m`
    ).join('\n');

    alert(`Generating rooms:\n${roomData}`);
    // Later: Pass data to 3D engine
  };

  return (
    <div className="room-setup-page">
      <h2>Room Configuration</h2>
      <p className="desc">Define each room's layout to begin your Smart Home Twin experience.</p>

      {rooms.map((room, index) => (
        <div key={index} className="room-entry">
          <input
            type="text"
            placeholder="Room Name"
            value={room.name}
            onChange={(e) => handleRoomChange(index, 'name', e.target.value)}
          />
          <input
            type="number"
            placeholder="Width (m)"
            value={room.width}
            onChange={(e) => handleRoomChange(index, 'width', e.target.value)}
          />
          <input
            type="number"
            placeholder="Length (m)"
            value={room.length}
            onChange={(e) => handleRoomChange(index, 'length', e.target.value)}
          />
        </div>
      ))}

      <button className="add-room-btn" onClick={addNewRoom}>+ Add New Room</button>

      <div className="buttons">
        <button className="generate-btn" onClick={handleGenerate}>Generate Room</button>
        <button className="customize-btn">Customize Room</button>
      </div>
    </div>
  );
};

export default RoomSetupPage;



// use the same stype
