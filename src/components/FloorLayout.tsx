import React from "react";
import { useNavigate } from "react-router-dom";
import FloorMap from "../assets/FloorMap.svg";

const sectionAreas = [
  { id: "A", label: "Section A", svgId: "Section-A" },
  { id: "B", label: "Section B", svgId: "Section-B" },
  { id: "C", label: "Section C", svgId: "Section-C" },
  { id: "D", label: "Section D", svgId: "Section-D" },
  { id: "E", label: "Section E", svgId: "Section-E" },
  { id: "F", label: "Section F", svgId: "Section-F" },
  { id: "G", label: "Section G", svgId: "Section-G" },
];

const FloorLayout: React.FC = () => {
  const navigate = useNavigate();
  // Inline SVG import for interactivity
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Workspace Floor Layout</h1>
      <div className="relative w-full max-w-5xl">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <object
          type="image/svg+xml"
          data={FloorMap}
          className="w-full h-auto"
          aria-label="Workspace Floor Map"
          id="floor-svg"
        />
        {/* Overlay clickable areas */}
        {sectionAreas.map((section) => {
          // These coordinates should be adjusted to match the SVG layout
          // Example: Section A overlay
          let style = {};
          switch (section.id) {
            case "A":
              style = { left: "1.5%", top: "22%", width: "15%", height: "19%" };
              break;
            case "B":
              style = { left: "27.5%", top: "22%", width: "16%", height: "19%" };
              break;
            case "C":
              style = { left: "64.5%", top: "22%", width: "13.5%", height: "19%" };
              break;
            case "D":
              style = { left: "85.5%", top: "22%", width: "13%", height: "19%" };
              break;
            case "E":
              style = { left: "14.5%", top: "58.5%", width: "13.5%", height: "19%" };
              break;
            case "F":
              style = { left: "36.5%", top: "58.5%", width: "11.5%", height: "19%" };
              break;
            case "G":
              style = { left: "68.5%", top: "58.5%", width: "16%", height: "19%" };
              break;
            default:
              break;
          }
          return (
            <button
              key={section.id}
              className="absolute bg-transparent border-2 border-transparent hover:border-blue-400 transition focus:outline-none"
              style={{ ...style, position: "absolute", background: 'transparent' }}
              aria-label={section.label}
              onClick={() => navigate(`/section/${section.id}`)}
              tabIndex={0}
            />
          );
        })}
      </div>
      <p className="mt-6 text-gray-500">Click a section to view or book seats.</p>
    </div>
  );
};

export default FloorLayout;
