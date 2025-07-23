
import React, { useEffect, useState } from "react";
import Header from "./Header";
import { useNavigate } from "react-router-dom";
import FloorMap from "../../assets/FloorMap.svg";
import { getBookedSeatsBySectionAndDate } from '../../../backend/bookings';
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


const TOTAL_SEATS = {
  A: 16, B: 13, C: 9, D: 10, E:8 , F: 8, G: 10 // Adjust as per your actual seat count per section
};

const FloorLayout = () => {
  const navigate = useNavigate();
  const [hoveredSection, setHoveredSection] = useState(null);
  const [availableBySection, setAvailableBySection] = useState({});

  useEffect(() => {
    // Fetch available seats for today for all sections
    const fetchAll = async () => {
      const today = new Date().toISOString().split('T')[0];
      const result = {};
      for (const section of sectionAreas) {
        try {
          const { bookings } = await getBookedSeatsBySectionAndDate(section.id, today);
          // Count booked by slot
          const slotCounts = { morning: 0, afternoon: 0, evening: 0 };
          bookings.forEach(b => {
            if (slotCounts[b.Timeslot] !== undefined) slotCounts[b.Timeslot]++;
          });
          result[section.id] = {
            morning: (TOTAL_SEATS[section.id] || 0) - slotCounts.morning,
            afternoon: (TOTAL_SEATS[section.id] || 0) - slotCounts.afternoon,
            evening: (TOTAL_SEATS[section.id] || 0) - slotCounts.evening,
          };
        } catch {
          result[section.id] = { morning: '-', afternoon: '-', evening: '-' };
        }
      }
      setAvailableBySection(result);
    };
    fetchAll();
  }, []);

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
            const available = availableBySection[section.id] || { morning: '-', afternoon: '-', evening: '-' };
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
                onMouseEnter={e => setHoveredSection(section.id)}
                onMouseLeave={e => setHoveredSection(null)}
              >
                <div className="w-full h-full" />
                {hoveredSection === section.id && (
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '100%',
                    transform: 'translate(-50%, 10px)',
                    background: '#fff',
                    border: '1px solid #2563eb',
                    borderRadius: 8,
                    padding: 12,
                    minWidth: 160,
                    boxShadow: '0 2px 12px #0002',
                    zIndex: 1000,
                    fontSize: 15,
                  }}>
                    <div style={{ fontWeight: 600, color: '#2563eb', marginBottom: 4 }}>Available seats:</div>
                    <div>Morning: {available.morning}</div>
                    <div>Afternoon: {available.afternoon}</div>
                    <div>Evening: {available.evening}</div>
                  </div>
                )}
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
