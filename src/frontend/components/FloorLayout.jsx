
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
  // hoveredSection and hover tooltip removed per UX request
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
        <div className="w-full flex justify-center floor-layout-heading">
          <h1 className="text-3xl font-bold text-gray-800 floor-layout-title">
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
            const sectionClass = `section-${section.id}`;
            const available = availableBySection[section.id] || { morning: '-', afternoon: '-', evening: '-' };
            return (
              <div
                key={section.id}
                className={`floor-layout-section ${sectionClass} group cursor-pointer`}
                aria-label={section.label}
                onClick={() => navigate(`/seat-booking/section/${section.id}`)}
                tabIndex={0}
                role="button"
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/seat-booking/section/${section.id}`);
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
