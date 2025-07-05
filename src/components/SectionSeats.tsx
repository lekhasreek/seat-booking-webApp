import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";


import SectionA from "../assets/Section-A.svg";
import SectionB from "../assets/Section-B.svg";
import SectionC from "../assets/Section-C.svg";
import SectionD from "../assets/Section-D.svg";
import SectionE from "../assets/Section-E.svg";

import SectionF from "../assets/Section-F.svg";
import SectionG from "../assets/Section-G.svg";


// Only one SectionSeats component definition
// (Removed duplicate SectionSeats definition)




// Utility to parse SVG string and extract seat rectangles by group id (A1, A2, ...)
function extractSeatsFromSVG(svgText: string, prefix: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const seatGroups = Array.from(doc.querySelectorAll(`g[id^='${prefix}']`));
  const seats: { id: string; x: number; y: number; width: number; height: number }[] = [];
  seatGroups.forEach(g => {
    const id = g.id;
    // Find the <path> with the rectangle
    const path = g.querySelector('path');
    if (path) {
      const d = path.getAttribute('d') || '';
      // Match both horizontal and vertical rectangle path formats
      // Format 1: M x y H x2 V y2 H x V y Z
      let match = d.match(/M(\d+) (\d+)H(\d+)V(\d+)H\d+V\d+Z/);
      if (match) {
        const x = parseInt(match[1], 10);
        const y = parseInt(match[2], 10);
        const x2 = parseInt(match[3], 10);
        const y2 = parseInt(match[4], 10);
        const rectX = Math.min(x, x2);
        const rectY = Math.min(y, y2);
        const width = Math.abs(x2 - x);
        const height = Math.abs(y2 - y);
        seats.push({ id, x: rectX, y: rectY, width, height });
        return;
      }
      // Format 2: M x y V y2 H x2 V y H x Z (vertical)
      match = d.match(/M(\d+) (\d+)V(\d+)H(\d+)V(\d+)H(\d+)Z/);
      if (match) {
        const x = parseInt(match[1], 10);
        const y = parseInt(match[2], 10);
        const y2 = parseInt(match[3], 10);
        const x2 = parseInt(match[4], 10);
        const rectX = Math.min(x, x2);
        const rectY = Math.min(y, y2);
        const width = Math.abs(x2 - x);
        const height = Math.abs(y2 - y);
        seats.push({ id, x: rectX, y: rectY, width, height });
        return;
      }
    }
  });
  return seats;
}

const sectionSVGs: Record<string, string> = {
  A: SectionA,
  B: SectionB,
  C: SectionC,
  D: SectionD,
  E: SectionE,
  F: SectionF,
  G: SectionG,
};

// We'll dynamically extract seats for Section A from the SVG
const sectionSeats: Record<string, { id: string; x: number; y: number; width: number; height: number }[]> = {
  // A: will be filled at runtime
};

const svgWidth = 1440;
const svgHeight = 1024;

const SectionSeats: React.FC = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const [bookedSeats, setBookedSeats] = useState<Record<string, boolean>>({});
  const [seats, setSeats] = React.useState<{ id: string; x: number; y: number; width: number; height: number }[]>([]);

  React.useEffect(() => {
    // Dynamically extract seats for any section (A, B, C, D, E, F)
    if (sectionId && sectionSVGs[sectionId]) {
      fetch(sectionSVGs[sectionId])
        .then(res => res.text())
        .then(svgText => {
          const extracted = extractSeatsFromSVG(svgText, sectionId);
          setSeats(extracted);
        });
    } else {
      setSeats([]);
    }
  }, [sectionId]);

  if (!sectionId || !sectionSVGs[sectionId]) {
    return <div className="p-8 text-center text-red-600">Invalid section</div>;
  }

  const handleBook = (seatId: string) => {
    setBookedSeats((prev) => ({ ...prev, [seatId]: true }));
  };

  const sectionBg = sectionSVGs[sectionId];

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <button
        className="self-start mb-4 text-blue-600 hover:underline"
        onClick={() => navigate(-1)}
      >
        ← Back to Floor Layout
      </button>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {sectionId ? `Seats in Section ${sectionId}` : "Section"}
      </h2>
      <div className="relative w-full max-w-5xl aspect-[1440/1024] bg-white rounded-lg shadow overflow-hidden">
        {/* Section SVG as background */}
        <img
          src={sectionBg}
          alt={`Section ${sectionId} layout`}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ zIndex: 1 }}
        />
        {/* Overlay seat rects */}
        <svg
          viewBox="0 0 1440 1024"
          width="100%"
          height="100%"
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 2 }}
        >
          {seats.map(seat => (
            <g key={seat.id} style={{ cursor: bookedSeats[seat.id] ? 'not-allowed' : 'pointer' }}>
              {/* Fill rect (no stroke) */}
              <rect
                x={seat.x}
                y={seat.y}
                width={seat.width}
                height={seat.height}
                rx={12}
                fill={bookedSeats[seat.id] ? '#fca5a5' : '#e5e7eb'}
                stroke="none"
                style={{ pointerEvents: 'all', filter: bookedSeats[seat.id] ? 'drop-shadow(0 0 8px #fca5a5)' : 'drop-shadow(0 0 4px #8882)'}}
                onClick={() => !bookedSeats[seat.id] && handleBook(seat.id)}
              />
              {/* Border rect (no fill, always on top) */}
              <rect
                x={seat.x}
                y={seat.y}
                width={seat.width}
                height={seat.height}
                rx={12}
                fill="none"
                stroke="#222"
                strokeWidth={3}
                pointerEvents="none"
              />
              <text
                x={seat.x + seat.width / 2}
                y={seat.y + seat.height / 2 + 5}
                textAnchor="middle"
                fontSize="28"
                fill={bookedSeats[seat.id] ? '#fff' : '#222'}
                pointerEvents="none"
                dominantBaseline="middle"
                style={{ userSelect: 'none', fontWeight: 600 }}
              >
                {seat.id}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="mt-6 text-gray-500">Click a seat to book. Booked seats are shown in red.</p>
    </div>
  );
};

export default SectionSeats;
