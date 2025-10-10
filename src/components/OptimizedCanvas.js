import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { ref, push, set, remove as firebaseRemove } from 'firebase/database';
import { database } from '../firebase';
import { useRealtimeQuery } from '../utils/useFirebase';
import { debounce } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';

const OptimizedCanvas = ({ darkMode }) => {
  const { currentUser } = useAuth();
  const { coupleId } = useCouple();

  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState([]);
  const [color, setColor] = useState('#000000');
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const batchRef = useRef([]);

  const transformStrokes = useCallback((val) => (val ? Object.values(val) : []), []);

  const { data: remoteStrokes } = useRealtimeQuery(
    `canvasStrokes/${coupleId}`,
    {
      transform: transformStrokes,
      enabled: !!coupleId
    }
  );

  useEffect(() => {
    if (remoteStrokes) {
      setLines(remoteStrokes);
    }
  }, [remoteStrokes]);

  const uploadBatch = useCallback(async () => {
    if (batchRef.current.length === 0 || !coupleId || !currentUser) return;

    const strokesToUpload = [...batchRef.current];
    batchRef.current = [];

    try {
      const strokesRef = ref(database, `canvasStrokes/${coupleId}`);
      await Promise.all(
        strokesToUpload.map(stroke => {
          const newStrokeRef = push(strokesRef);
          return set(newStrokeRef, {
            ...stroke,
            userId: currentUser.uid,
            timestamp: Date.now()
          });
        })
      );
    } catch (error) {
      console.error('Batch upload error:', error);
    }
  }, [coupleId, currentUser]);
  
  const scheduleUpload = useCallback(debounce(uploadBatch, 1000), [uploadBatch]);

  const handleMouseDown = useCallback((e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = {
      tool,
      points: [pos.x, pos.y],
      color,
      strokeWidth: tool === 'pen' ? 2 : 20
    };
    setLines(prev => [...prev, newLine]);
  }, [tool, color]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    setLines(prev => {
      // THE FIX: Add a guard clause to prevent the error on an empty array.
      if (prev.length === 0) {
        return prev;
      }

      // Use a safer, more explicit immutable update pattern.
      const lastLine = prev[prev.length - 1];
      const newPoints = lastLine.points.concat([point.x, point.y]);
      const updatedLastLine = { ...lastLine, points: newPoints };
      
      return [...prev.slice(0, -1), updatedLastLine];
    });
  }, []); // Empty dependency array is correct here because we use the functional 'prev' state.

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    // We use a functional update for setLines, so we access the latest 'lines' state here for batching.
    setLines(currentLines => {
      const lastLine = currentLines[currentLines.length - 1];
      if (lastLine && lastLine.points.length > 2) {
        batchRef.current.push(lastLine);
        scheduleUpload();
      }
      return currentLines;
    });
  }, [scheduleUpload]);

  const handleClear = useCallback(async () => {
    if (!coupleId) return;
    setLines([]);
    const strokesRef = ref(database, `canvasStrokes/${coupleId}`);
    await firebaseRemove(strokesRef);
  }, [coupleId]);

  if (!coupleId) {
    return <div>Loading Canvas...</div>;
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Toolbar */}
      <div className={`flex gap-2 mb-4 p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow`}>
        <button
          onClick={() => setTool('pen')}
          className={`px-3 py-1 rounded ${tool === 'pen' ? 'bg-pink-500 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
        >
          Pen
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`px-3 py-1 rounded ${tool === 'eraser' ? 'bg-pink-500 text-white' : darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
        >
          Eraser
        </button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
        />
        <button
          onClick={handleClear}
          className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
        >
          Clear
        </button>
      </div>

      {/* Canvas */}
      <Stage
        ref={stageRef}
        width={window.innerWidth > 768 ? 600 : window.innerWidth - 60}
        height={400}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        className={`border-2 rounded-lg ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'}`}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.tool === 'eraser' ? (darkMode ? '#1f2937' : '#ffffff') : line.color}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default OptimizedCanvas;