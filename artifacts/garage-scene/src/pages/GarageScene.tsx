import React from "react";
import { motion } from "framer-motion";

const TILE_W = 60;
const TILE_H = 30;
const ORIGIN_X = 400;
const ORIGIN_Y = 150;

function iso(x: number, y: number, z: number) {
  const sx = (x - y) * TILE_W / 2 + ORIGIN_X;
  const sy = (x + y) * TILE_H / 2 - z * TILE_H + ORIGIN_Y;
  return { x: sx, y: sy };
}

function IsoPoly({ points, fill, stroke = "rgba(0,0,0,0.1)", strokeWidth = 1 }: { points: number[][], fill: string, stroke?: string, strokeWidth?: number }) {
  const p = points.map(pt => {
    const coords = iso(pt[0], pt[1], pt[2]);
    return `${coords.x},${coords.y}`;
  }).join(" ");
  return <polygon points={p} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
}

export default function GarageScene() {
  return (
    <div className="relative w-full h-[100dvh] flex flex-col items-center overflow-hidden bg-background">
      {/* HUD Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between pointer-events-none">
        
        {/* Bugs Left */}
        <div className="flex items-center gap-2 pointer-events-auto bg-orange-100 p-2 rounded-full shadow-sm border border-orange-200">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">0</div>
          <span className="font-semibold text-orange-900 pr-2">Bugs</span>
        </div>

        {/* Center Panel */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md border border-gray-200 pointer-events-auto">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-orange-400 text-white flex items-center justify-center font-bold text-sm">4</div>
              <span className="text-xs font-semibold text-gray-700 hidden sm:block">Design</span>
            </div>
            
            <div className="flex flex-col items-center px-4 border-x border-gray-200 min-w-[200px]">
              <span className="font-bold text-gray-800">Space Elitist</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Space / Simulation</span>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-1 overflow-hidden relative">
                <div className="absolute top-0 left-0 bottom-0 bg-green-500 w-2/3"></div>
              </div>
              <span className="text-[9px] text-gray-400 mt-0.5">Level Design</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-700 hidden sm:block">Tech</span>
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">5</div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-700 hidden sm:block">Research</span>
              <div className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center font-bold text-sm">7</div>
            </div>
          </div>
        </div>

        {/* Top Right Panel */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-200 font-mono text-xs flex flex-col items-end">
            <span className="text-gray-600">0 Fans | Y 1 M 1 W 4*</span>
            <span className="text-green-600 font-bold mt-1 text-sm">Cash: 40K</span>
          </div>
        </div>
      </div>

      {/* Isometric SVG Scene */}
      <div className="flex-1 w-full max-w-4xl flex items-center justify-center">
        <svg viewBox="0 0 800 600" className="w-full h-full drop-shadow-xl" preserveAspectRatio="xMidYMid meet">
          {/* Floor */}
          <IsoPoly points={[[0,0,0], [10,0,0], [10,10,0], [0,10,0]]} fill="#b0b0b0" stroke="#999" />
          
          {/* Left Wall (y=0 plane) */}
          <IsoPoly points={[[0,0,0], [10,0,0], [10,0,5], [0,0,5]]} fill="#8fb07a" stroke="#7a9b65" />
          
          {/* Right Wall (x=0 plane) */}
          <IsoPoly points={[[0,0,0], [0,10,0], [0,10,5], [0,0,5]]} fill="#7a9b65" stroke="#688555" />

          {/* Door on Left Wall */}
          <IsoPoly points={[[2,0,0], [4,0,0], [4,0,4], [2,0,4]]} fill="#f0f0f0" stroke="#d0d0d0" />
          <IsoPoly points={[[3.6,0,1.8], [3.8,0,1.8], [3.8,0,2], [3.6,0,2]]} fill="#aaa" stroke="#888" /> {/* Knob */}

          {/* Corkboard on Left Wall */}
          <IsoPoly points={[[6,0,2], [8,0,2], [8,0,4], [6,0,4]]} fill="#cda87a" stroke="#a88558" />
          <IsoPoly points={[[6.2,0,2.5], [6.6,0,2.5], [6.6,0,2.9], [6.2,0,2.9]]} fill="#f4e57d" stroke="none" />
          <IsoPoly points={[[6.8,0,3.2], [7.2,0,3.2], [7.2,0,3.6], [6.8,0,3.6]]} fill="#e57df4" stroke="none" />
          <IsoPoly points={[[7.4,0,2.2], [7.8,0,2.2], [7.8,0,2.6], [7.4,0,2.6]]} fill="#7de5f4" stroke="none" />

          {/* Blackboard on Back Wall (Corner) */}
          <IsoPoly points={[[0,1,2], [0,5,2], [0,5,4.5], [0,1,4.5]]} fill="#2c3e35" stroke="#1a2520" strokeWidth={2} />
          {/* Pong details on blackboard */}
          <IsoPoly points={[[0,1.5,3], [0,1.8,3], [0,1.8,3.5], [0,1.5,3.5]]} fill="#fff" stroke="none" />
          <IsoPoly points={[[0,4.2,2.5], [0,4.5,2.5], [0,4.5,3.0], [0,4.2,3.0]]} fill="#fff" stroke="none" />
          <IsoPoly points={[[0,3,3], [0,3.2,3], [0,3.2,3.2], [0,3,3.2]]} fill="#fff" stroke="none" />

          {/* Ladder leaning on Right Wall */}
          <IsoPoly points={[[0,6,0], [0,6.2,0], [0,6.2,4.5], [0,6,4.5]]} fill="#8c5a35" />
          <IsoPoly points={[[0,7,0], [0,7.2,0], [0,7.2,4.5], [0,7,4.5]]} fill="#8c5a35" />
          <IsoPoly points={[[0,6,1], [0,7,1], [0,7,1.2], [0,6,1.2]]} fill="#a8754b" />
          <IsoPoly points={[[0,6,2], [0,7,2], [0,7,2.2], [0,6,2.2]]} fill="#a8754b" />
          <IsoPoly points={[[0,6,3], [0,7,3], [0,7,3.2], [0,6,3.2]]} fill="#a8754b" />
          <IsoPoly points={[[0,6,4], [0,7,4], [0,7,4.2], [0,6,4.2]]} fill="#a8754b" />

          {/* Bookshelf on Left Wall */}
          <IsoPoly points={[[8,0,0], [10,0,0], [10,1,0], [8,1,0]]} fill="#6e4225" />
          <IsoPoly points={[[8,1,0], [10,1,0], [10,1,5], [8,1,5]]} fill="#5c361e" />
          <IsoPoly points={[[8,0,5], [10,0,5], [10,1,5], [8,1,5]]} fill="#8c5a35" />
          {/* Bookshelf shelves */}
          <IsoPoly points={[[8,0,1.5], [10,0,1.5], [10,1,1.5], [8,1,1.5]]} fill="#4a2a15" />
          <IsoPoly points={[[8,0,3.0], [10,0,3.0], [10,1,3.0], [8,1,3.0]]} fill="#4a2a15" />
          {/* Some books */}
          <IsoPoly points={[[8.5,0.2,1.5], [8.8,0.2,1.5], [8.8,0.8,1.5], [8.5,0.8,1.5]]} fill="#d94b4b" />
          <IsoPoly points={[[8.5,0.2,1.5], [8.5,0.2,2.5], [8.8,0.2,2.5], [8.8,0.2,1.5]]} fill="#c23b3b" />
          <IsoPoly points={[[9.2,0.2,3.0], [9.4,0.2,3.0], [9.4,0.8,3.0], [9.2,0.8,3.0]]} fill="#4b8dd9" />
          <IsoPoly points={[[9.2,0.2,3.0], [9.2,0.2,4.0], [9.4,0.2,4.0], [9.4,0.2,3.0]]} fill="#3b7bc2" />

          {/* Desk Right Wall */}
          <IsoPoly points={[[0,8,0], [2,8,0], [2,10,0], [0,10,0]]} fill="#4a3a2a" />
          <IsoPoly points={[[2,8,0], [2,10,0], [2,10,2], [2,8,2]]} fill="#8c6a4a" />
          <IsoPoly points={[[0,10,0], [2,10,0], [2,10,2], [0,10,2]]} fill="#6a4a3a" />
          <IsoPoly points={[[0,8,2], [2,8,2], [2,10,2], [0,10,2]]} fill="#a8855a" />
          {/* Drawers */}
          <IsoPoly points={[[1.9,8.2,1.2], [1.9,9.8,1.2], [1.9,9.8,1.8], [1.9,8.2,1.8]]} fill="#5c422a" />
          <IsoPoly points={[[1.9,8.2,0.4], [1.9,9.8,0.4], [1.9,9.8,1.0], [1.9,8.2,1.0]]} fill="#5c422a" />

          {/* Framed Graph on Right Wall */}
          <IsoPoly points={[[0,8,3], [0,10,3], [0,10,4.5], [0,8,4.5]]} fill="#e0e0e0" stroke="#333" strokeWidth={2} />
          {/* Graph lines */}
          <IsoPoly points={[[0,8.2,3.2], [0,8.8,3.8], [0,9.2,3.5], [0,9.8,4.2]]} fill="none" stroke="#d94b4b" strokeWidth={2} />
          <IsoPoly points={[[0,8.2,3.5], [0,8.6,3.2], [0,9.4,4.0], [0,9.8,3.8]]} fill="none" stroke="#4b8dd9" strokeWidth={2} />

          {/* Teal Rug */}
          <IsoPoly points={[[3,3,0.01], [7,3,0.01], [7,7,0.01], [3,7,0.01]]} fill="#3a8c8c" />

          {/* Main Desk */}
          {/* Legs */}
          <IsoPoly points={[[3.5,3.5,0], [4,3.5,0], [4,3.5,1.5], [3.5,3.5,1.5]]} fill="#5c422a" />
          <IsoPoly points={[[3.5,6.5,0], [4,6.5,0], [4,6.5,1.5], [3.5,6.5,1.5]]} fill="#5c422a" />
          <IsoPoly points={[[4.5,3.5,0], [5,3.5,0], [5,3.5,1.5], [4.5,3.5,1.5]]} fill="#5c422a" />
          <IsoPoly points={[[4.5,6.5,0], [5,6.5,0], [5,6.5,1.5], [4.5,6.5,1.5]]} fill="#5c422a" />
          {/* Top */}
          <IsoPoly points={[[3.2,3.2,1.5], [5.2,3.2,1.5], [5.2,6.8,1.5], [3.2,6.8,1.5]]} fill="#cda87a" />
          <IsoPoly points={[[5.2,3.2,1.5], [5.2,6.8,1.5], [5.2,6.8,1.6], [5.2,3.2,1.6]]} fill="#b08a5a" />
          <IsoPoly points={[[3.2,6.8,1.5], [5.2,6.8,1.5], [5.2,6.8,1.6], [3.2,6.8,1.6]]} fill="#8c6a3a" />
          <IsoPoly points={[[3.2,3.2,1.6], [5.2,3.2,1.6], [5.2,6.8,1.6], [3.2,6.8,1.6]]} fill="#e5c89f" />

          {/* Computer Monitor */}
          <IsoPoly points={[[3.8,4.5,1.6], [4.8,4.5,1.6], [4.8,5.5,1.6], [3.8,5.5,1.6]]} fill="#e0e0e0" />
          <IsoPoly points={[[4.8,4.5,1.6], [4.8,5.5,1.6], [4.8,5.5,2.6], [4.8,4.5,2.6]]} fill="#c0c0c0" />
          <IsoPoly points={[[3.8,5.5,1.6], [4.8,5.5,1.6], [4.8,5.5,2.6], [3.8,5.5,2.6]]} fill="#a0a0a0" />
          <IsoPoly points={[[3.8,4.5,2.6], [4.8,4.5,2.6], [4.8,5.5,2.6], [3.8,5.5,2.6]]} fill="#f0f0f0" />
          
          <motion.g
            animate={{ opacity: [0.8, 1, 0.9, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            {/* Screen Glow / Face */}
            <IsoPoly points={[[4.7,4.6,1.8], [4.7,5.4,1.8], [4.7,5.4,2.4], [4.7,4.6,2.4]]} fill="#4a90e2" />
            <IsoPoly points={[[4.71,4.7,1.9], [4.71,5.3,1.9], [4.71,5.3,2.3], [4.71,4.7,2.3]]} fill="#6ab0ff" />
          </motion.g>

          {/* Keyboard & Mouse */}
          <IsoPoly points={[[4.5,4.6,1.62], [4.9,4.6,1.62], [4.9,5.2,1.62], [4.5,5.2,1.62]]} fill="#d0d0d0" />
          <IsoPoly points={[[4.6,5.3,1.62], [4.8,5.3,1.62], [4.8,5.4,1.62], [4.6,5.4,1.62]]} fill="#d0d0d0" />

          {/* Blue Trash Bin */}
          <IsoPoly points={[[2.5,6,0], [3.2,6,0], [3.2,6.5,0], [2.5,6.5,0]]} fill="#2a5bb4" />
          <IsoPoly points={[[3.2,6,0], [3.2,6.5,0], [3.2,6.5,1], [3.2,6,1]]} fill="#3a6bc4" />
          <IsoPoly points={[[2.5,6.5,0], [3.2,6.5,0], [3.2,6.5,1], [2.5,6.5,1]]} fill="#1a4ba4" />

          {/* Character */}
          <motion.g
            animate={{ y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            {/* Chair Base/Pole */}
            <IsoPoly points={[[5.2,4.8,0], [5.6,4.8,0], [5.6,5.2,0], [5.2,5.2,0]]} fill="#222" />
            <IsoPoly points={[[5.3,4.9,0], [5.5,4.9,0], [5.5,5.1,0], [5.3,5.1,0]]} fill="#444" />
            <IsoPoly points={[[5.3,4.9,0], [5.3,5.1,0], [5.3,5.1,0.8], [5.3,4.9,0.8]]} fill="#333" />
            
            {/* Chair Seat */}
            <IsoPoly points={[[5.0,4.6,0.8], [5.8,4.6,0.8], [5.8,5.4,0.8], [5.0,5.4,0.8]]} fill="#333" />
            <IsoPoly points={[[5.8,4.6,0.8], [5.8,5.4,0.8], [5.8,5.4,0.9], [5.8,4.6,0.9]]} fill="#222" />
            <IsoPoly points={[[5.0,5.4,0.8], [5.8,5.4,0.8], [5.8,5.4,0.9], [5.0,5.4,0.9]]} fill="#111" />
            <IsoPoly points={[[5.0,4.6,0.9], [5.8,4.6,0.9], [5.8,5.4,0.9], [5.0,5.4,0.9]]} fill="#444" />

            {/* Chair Back */}
            <IsoPoly points={[[5.6,4.6,0.9], [5.8,4.6,0.9], [5.8,5.4,0.9], [5.6,5.4,0.9]]} fill="#333" />
            <IsoPoly points={[[5.8,4.6,0.9], [5.8,5.4,0.9], [5.8,5.4,2.0], [5.8,4.6,2.0]]} fill="#222" />
            <IsoPoly points={[[5.6,5.4,0.9], [5.8,5.4,0.9], [5.8,5.4,2.0], [5.6,5.4,2.0]]} fill="#111" />

            {/* Character Body (Light Shirt) */}
            <IsoPoly points={[[5.2,4.7,0.9], [5.6,4.7,0.9], [5.6,5.3,0.9], [5.2,5.3,0.9]]} fill="#f5f5f5" />
            <IsoPoly points={[[5.6,4.7,0.9], [5.6,5.3,0.9], [5.6,5.3,1.8], [5.6,4.7,1.8]]} fill="#e0e0e0" />
            <IsoPoly points={[[5.2,5.3,0.9], [5.6,5.3,0.9], [5.6,5.3,1.8], [5.2,5.3,1.8]]} fill="#d0d0d0" />
            <IsoPoly points={[[5.2,4.7,1.8], [5.6,4.7,1.8], [5.6,5.3,1.8], [5.2,5.3,1.8]]} fill="#fff" />

            {/* Character Head (Orange Hair) */}
            <IsoPoly points={[[5.3,4.8,1.8], [5.7,4.8,1.8], [5.7,5.2,1.8], [5.3,5.2,1.8]]} fill="#ff8c42" />
            <IsoPoly points={[[5.7,4.8,1.8], [5.7,5.2,1.8], [5.7,5.2,2.2], [5.7,4.8,2.2]]} fill="#e6732e" />
            <IsoPoly points={[[5.3,5.2,1.8], [5.7,5.2,1.8], [5.7,5.2,2.2], [5.3,5.2,2.2]]} fill="#cc5c1a" />
            <IsoPoly points={[[5.3,4.8,2.2], [5.7,4.8,2.2], [5.7,5.2,2.2], [5.3,5.2,2.2]]} fill="#ffa066" />
          </motion.g>

          {/* Foreground Car under Tarp */}
          <g>
            <path 
              d={`M ${iso(7,5,0).x} ${iso(7,5,0).y} 
                  C ${iso(8,4,1).x} ${iso(8,4,1).y}, ${iso(9,5,1.5).x} ${iso(9,5,1.5).y}, ${iso(10,5,0).x} ${iso(10,5,0).y}
                  C ${iso(10,6,0).x} ${iso(10,6,0).y}, ${iso(9,7,1.5).x} ${iso(9,7,1.5).y}, ${iso(8,7,1).x} ${iso(8,7,1).y}
                  C ${iso(7,8,0).x} ${iso(7,8,0).y}, ${iso(6,7,0).x} ${iso(6,7,0).y}, ${iso(7,5,0).x} ${iso(7,5,0).y}`}
              fill="#2a5bb4"
              stroke="#1a4ba4"
              strokeWidth={2}
            />
            {/* Tarp folds */}
            <path d={`M ${iso(8,4.5,1).x} ${iso(8,4.5,1).y} Q ${iso(8.5,5,1.2).x} ${iso(8.5,5,1.2).y} ${iso(9,5.5,0.5).x} ${iso(9,5.5,0.5).y}`} stroke="#3a6bc4" strokeWidth={3} fill="none" />
            <path d={`M ${iso(8.5,6.5,1).x} ${iso(8.5,6.5,1).y} Q ${iso(9,6,1.2).x} ${iso(9,6,1.2).y} ${iso(9.5,5.5,0.5).x} ${iso(9.5,5.5,0.5).y}`} stroke="#3a6bc4" strokeWidth={2} fill="none" />
          </g>

        </svg>
      </div>
    </div>
  );
}
