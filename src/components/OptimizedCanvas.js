import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { ref, push, set } from 'firebase/database';
import { database } from '../firebase';
import { useRealtimeQuery } from '../utils/useFirebase';
import { debounce } from '../utils/helpers';

const OptimizedCanvas = ({ coupleId, userId, darkMode }) => {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState([]);
  const [color, setColor] = useState('#000000');
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const batchRef = useRef([]);
  const timeoutRef = useRef(null);

  // Load existing strokes
  const { data: remoteStrokes } = useRealtimeQuery(
    `canvasStrokes/${coupleId}`,
    (val) => val ? Object.values(val) : []
  );

  useEffect(() => {
    if (remoteStrokes) {
      setLines(remoteStrokes);
    }
  }, [remoteStrokes]);

  // Batched stroke upload
  const uploadBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;

    const strokesToUpload = [...batchRef.current];
    batchRef.current = [];

    try {
      const strokesRef = ref(database, `canvasStrokes/${coupleId}`);
      await Promise.all(
        strokesToUpload.map(stroke => {
          const newStrokeRef = push(strokesRef);
          return set(newStrokeRef, {
            ...stroke,
            userId,
            timestamp: Date.now()
          });
        })
      );
    } catch (error) {
      console.error('Batch upload error:', error);
    }
  }, [coupleId, userId]);

  // Debounced upload
  const scheduleUpload = useCallback(
    debounce(() => {
      uploadBatch();
    }, 1000),
    [uploadBatch]
  );

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
      const lastLine = prev[prev.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      return prev.slice(0, -1).concat(lastLine);
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const lastLine = lines[lines.length - 1];
    if (lastLine && lastLine.points.length > 2) {
      batchRef.current.push(lastLine);
      scheduleUpload();
    }
  }, [lines, scheduleUpload]);

  const handleClear = useCallback(async () => {
    setLines([]);
    const strokesRef = ref(database, `canvasStrokes/${coupleId}`);
    await set(strokesRef, null);
  }, [coupleId]);

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className={`flex gap-2 mb-4 p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <button
          onClick={() => setTool('pen')}
          className={`px-3 py-1 rounded ${tool === 'pen' ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}
        >
          Pen
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`px-3 py-1 rounded ${tool === 'eraser' ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}
        >
          Eraser
        </button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-8 rounded cursor-pointer"
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
        width={window.innerWidth > 768 ? 600 : window.innerWidth - 40}
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