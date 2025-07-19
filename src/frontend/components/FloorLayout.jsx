
import React from "react";
import Header from "./Header";
import { useNavigate } from "react-router-dom";
import FloorMap from "../../assets/FloorMap.svg";
import "./FloorLayout.css";

const sectionAreas = [
  { id: "A", label: "Section A", svgId: "Section-A" },
  { id: "B", label: "Section B", svgId: "Section-B" },
  { id: "C", label: "Section C", svgId: "Section-C" },
  { id: "D", label: "Section D", svgId: "Section-D" },
  { id: "E", label: "Section E", svgId: "Section-E" },
  { id: "F", label: "Section F", svgId: "Section-F" },
  { id: "G", label: "Section G", svgId: "Section-G" },
];

const FloorLayout = () => {
  const navigate = useNavigate();
  // Inline SVG import for interactivity
  return (
    <div className="floor-layout-container">
      <div className="floor-layout-main">
        <Header />
        <div className="w-full flex justify-center">
          <h1 className="text-3xl font-bold mb-8 text-gray-800 floor-layout-title">
            Workspace Floor Layout
          </h1>
        </div>
        <div className="floor-layout-svg-wrapper">
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
              <div
                key={section.id}
                className="floor-layout-section group cursor-pointer"
                style={style}
                aria-label={section.label}
                onClick={() => navigate(`/section/${section.id}`)}
                tabIndex={0}
                role="button"
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/section/${section.id}`);
                  }
                }}
              >
                <div className="w-full h-full" />
              </div>
            );
          })}
        </div>
        <p className="floor-layout-instruction">Click a section to view or book seats.</p>
      </div>
    </div>
  );
};

export default FloorLayout;
