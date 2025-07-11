// Overlay for a single seat, with hover state for booked seats
function SeatOverlay({ overlay, isBooked, setShowBooking, setBookingName, selectedDate }) {
  // Use lifted state for blue highlight
  const { activeSeat, selectedDateForActive, setActiveSeat } = React.useContext(SeatOverlayContext);
  const isActive = activeSeat === overlay.id && selectedDateForActive === selectedDate;
  return (
    <div
      style={{
        position: 'absolute',
        left: overlay.left,
        top: overlay.top,
        width: overlay.width,
        height: overlay.height,
        background: isBooked ? '#d1d5db' : isActive ? '#42b0f4' : '#fff',
        border: '2px solid #000',
        borderRadius: 6,
        zIndex: 10,
        pointerEvents: 'all', // allow click for both booked and available
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#000',
        fontWeight: 600,
        fontSize: 16,
        cursor: isBooked ? 'pointer' : 'pointer', // always pointer
        opacity: isBooked ? 0.7 : 1,
        transition: 'background 0.15s',
      }}
      onClick={() => {
        if (!isBooked) {
          setActiveSeat(overlay.id, selectedDate);
          setShowBooking({
            seatId: overlay.id,
            seatName: overlay.id.replace(/^Square-/, ''),
            date: selectedDate,
          });
          setBookingName('');
        } else {
          setViewBookingDetails({
            seatId: overlay.id,
            seatName: overlay.id.replace(/^Square-/, ''),
            booking: bookedSeats[selectedDate]?.[overlay.id],
          });
        }
      }}
      onMouseEnter={e => {
        if (isBooked) {
          setHoverBookingDetails({
            seatId: overlay.id,
            seatName: overlay.id.replace(/^Square-/, ''),
            booking: bookedSeats[selectedDate]?.[overlay.id],
            x: e.clientX,
            y: e.clientY,
          });
          e.currentTarget.style.cursor = 'pointer';
        }
      }}
      onMouseLeave={() => {
        setHoverBookingDetails(null);
      }}
    >
      {overlay.id.replace(/^Square-/, '')}
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import CalendarBar from "./CalendarBar";
import { useParams, useNavigate } from "react-router-dom";


import SectionA from "../assets/Section-A.svg";
import SectionB from "../assets/Section-B.svg";
import SectionC from "../assets/Section-C.svg";
import SectionD from "../assets/Section-D.svg";
import SectionE from "../assets/Section-E.svg";

import SectionF from "../assets/Section-F.svg";
import SectionG from "../assets/Section-G.svg";


// Context to lift active seat highlight state
const SeatOverlayContext = React.createContext({
  activeSeat: null,
  selectedDateForActive: '',
  setActiveSeat: () => {},
});

// Only one SectionSeats component definition
// (Removed duplicate SectionSeats definition)





// Utility to extract seat positions from SVG <g> or <path> with id format Seat-A1, Seat-A2, ...
function extractSeatsFromSVG(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  // Find all <g> with id like Seat-A1, Seat-A2, ...
  const seatGroups = Array.from(doc.querySelectorAll('g[id^="Seat-"]'));
  const seats = [];
  for (const g of seatGroups) {
    const id = g.getAttribute('id') || '';
    // Parse transform="translate(x, y)" if present
    let tx = 0, ty = 0;
    const transform = g.getAttribute('transform');
    if (transform) {
      const match = transform.match(/translate\(([^,\s)]+)[,\s]*([^,\s)]+)?\)/);
      if (match) {
        tx = parseFloat(match[1]);
        ty = match[2] !== undefined ? parseFloat(match[2]) : 0;
      }
    }
    // Try to find a <rect> inside the group
    const rect = g.querySelector('rect');
    if (rect) {
      let x = parseFloat(rect.getAttribute('x') || '0');
      let y = parseFloat(rect.getAttribute('y') || '0');
      const width = parseFloat(rect.getAttribute('width') || '0');
      const height = parseFloat(rect.getAttribute('height') || '0');
      // Apply group translation
      x += tx;
      y += ty;
      seats.push({ id, name: id, x, y, width, height });
      continue;
    }
    // If no rect, try to parse path bounding box
    const path = g.querySelector('path');
    if (path) {
      const d = path.getAttribute('d') || '';
      // Parse all M/m, h, v, H, V, L, l commands to get all points
      let x = 0, y = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g);
      if (tokens) {
        let i = 0;
        while (i < tokens.length) {
          let cmd = tokens[i++];
          if (/[a-zA-Z]/.test(cmd)) {
            switch (cmd) {
              case 'M':
                x = parseFloat(tokens[i++]);
                y = parseFloat(tokens[i++]);
                break;
              case 'm':
                x += parseFloat(tokens[i++]);
                y += parseFloat(tokens[i++]);
                break;
              case 'h':
                x += parseFloat(tokens[i++]);
                break;
              case 'H':
                x = parseFloat(tokens[i++]);
                break;
              case 'v':
                y += parseFloat(tokens[i++]);
                break;
              case 'V':
                y = parseFloat(tokens[i++]);
                break;
              case 'l':
                x += parseFloat(tokens[i++]);
                y += parseFloat(tokens[i++]);
                break;
              case 'L':
                x = parseFloat(tokens[i++]);
                y = parseFloat(tokens[i++]);
                break;
              default:
                // skip unsupported commands (z, c, q, etc.)
                break;
            }
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
        if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
          // Apply group translation
          seats.push({ id, name: id, x: minX + tx, y: minY + ty, width: maxX - minX, height: maxY - minY });
        }
      }
    }
    // Fallback: skip if no rect or path
  }
  return seats;
}

const sectionSVGs = {
  A: SectionA,
  B: SectionB,
  C: SectionC,
  D: SectionD,
  E: SectionE,
  F: SectionF,
  G: SectionG,
};

// We'll dynamically extract seats for Section A from the SV

const SectionSeats = () => {
  const [activeSeat, setActiveSeatState] = useState(null);
  const [selectedDateForActive, setSelectedDateForActive] = useState('');
  const setActiveSeat = (seatId, date) => {
    setActiveSeatState(seatId);
    setSelectedDateForActive(date);
  };
  const { sectionId } = useParams();
  const navigate = useNavigate();
  // Bookings are now specific to date: { [date]: { [seatId]: true } }
  const [bookedSeats, setBookedSeats] = useState({});

  const [seats, setSeats] = useState([]);

  const [showBooking, setShowBooking] = useState(null);
  const [bookingName, setBookingName] = useState('');
  // Store SVG text for inline rendering
  const [svgText, setSvgText] = useState(null);

  // Refs for each seat rect or path (including Square-A* paths)
  const seatRefs = useRef({});

  // Ref for the SVG container
  const svgContainerRef = useRef(null);

  // Log screen coordinates for each seat after render (including Square-A* paths)
  useEffect(() => {
    Object.entries(seatRefs.current).forEach(([id, el]) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        console.log(`Seat ${id} screen coords:`, rect);
      }
    });
    // Also log all Square-* paths if present
    const svg = document.querySelector('svg');
    if (svg) {
      const squarePaths = svg.querySelectorAll('path[id^="Square-"]');
      squarePaths.forEach(path => {
        const rect = path.getBoundingClientRect();
        console.log(`Square seat ${path.id} screen coords:`, rect);
      });
    }
  }, [seats]);


  React.useEffect(() => {
    if (sectionId && sectionSVGs[sectionId]) {
      fetch(sectionSVGs[sectionId])
        .then(res => res.text())
        .then(svgText => {
          setSvgText(svgText); // Save for inline rendering
          const seatBoxes = extractSeatsFromSVG(svgText);
          console.log('Extracted seats:', seatBoxes);
          setSeats(Array.isArray(seatBoxes) ? seatBoxes.filter(Boolean) : []);
        });
    } else {
      setSeats([]);
      setSvgText(null);
    }
  }, [sectionId]);

  if (!sectionId || !sectionSVGs[sectionId]) {
    return <div className="p-8 text-center text-red-600">Invalid section</div>;
  }

  // Add this state for time slots
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);

  const handleBook = (seatId, date, timeSlots) => {
    setBookedSeats(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [seatId]: { booked: true, timeSlots, name: bookingName },
      },
    }));
    setShowBooking(null);
    setBookingName('');
    setSelectedTimeSlots([]);
  };



  // Utility to extract all path elements with id like Square-A1, Square-A2, ... from the inline SVG
  // and map their SVG coordinates to container pixel coordinates (robust to scroll/resize)
  function extractSquarePathsFromDOM() {
    const result = [];
    const container = svgContainerRef.current;
    if (!container) return result;
    const svg = container.querySelector('svg');
    if (!svg) return result;
    // Get viewBox and rendered size
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) return result;
    const [vbX, vbY, vbW, vbH] = viewBox.split(/\s+/).map(Number);
    const renderedW = svg.clientWidth;
    const renderedH = svg.clientHeight;
    // For each Square-* path, get its bbox and map to container px
    const squarePaths = svg.querySelectorAll('path[id^="Square-"]');
    squarePaths.forEach(path => {
      const bbox = path.getBBox();
      // Map SVG coords to px in container
      const left = ((bbox.x - vbX) / vbW) * renderedW;
      const top = ((bbox.y - vbY) / vbH) * renderedH;
      const width = (bbox.width / vbW) * renderedW;
      const height = (bbox.height / vbH) * renderedH;
      result.push({ id: path.id, left, top, width, height });
    });
    return result;
  }

  // State to hold overlays for Square-A* paths
  const [squareOverlays, setSquareOverlays] = useState([]);

  // Extract overlays after SVG is rendered and on resize
  useEffect(() => {
    if (!svgText) return;
    // Recompute overlays after render and on resize
    const updateOverlays = () => {
      const overlays = extractSquarePathsFromDOM();
      setSquareOverlays(overlays);
    };
    // Use requestAnimationFrame to ensure DOM is ready
    const raf = requestAnimationFrame(updateOverlays);
    // Listen for resize
    window.addEventListener('resize', updateOverlays);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateOverlays);
    };
  }, [svgText, seats]);

  // Get selected date for booking context (from CalendarBar or modal, fallback to today)
  // We'll use a controlled date state for the whole section, so overlays always reflect the selected date
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Pass setSelectedDate to CalendarBar (if CalendarBar supports it)
  // If not, render a date picker above the seats for date selection

  // If CalendarBar does not provide a way to select date, add a date picker here:
  // (Uncomment if needed)
  // <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />

  // Add state for viewing booking details and tooltip
  const [viewBookingDetails, setViewBookingDetails] = useState(null);
  const [hoverBookingDetails, setHoverBookingDetails] = useState(null);

  return (
    <SeatOverlayContext.Provider value={{ activeSeat, selectedDateForActive, setActiveSeat }}>
      <div style={{ background: '#f7fafd', minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar (fixed, only rendered once) */}
      <Sidebar />
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Fixed Header */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 260,
            right: 0,
            height: 80,
            zIndex: 101,
            background: '#f7fafd',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 32,
            paddingRight: 32,
          }}
        >
          <Header />
        </div>
        {/* Scrollable Section View Only */}
        <div
          style={{
            marginTop: 80,
            paddingLeft: 24,
            paddingRight: 24,
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: 0,
          }}
        >
          <button
            className="self-start mb-4 text-blue-600 hover:underline"
            style={{ marginTop: 24 }}
            onClick={() => navigate(-1)}
          >
            ← Back to Floor Layout
          </button>
          {/* CalendarBar controls the selected date for booking */}
          <CalendarBar
            daysToShow={7}
            onDateChange={date => setSelectedDate(date.toISOString().split('T')[0])}
          />
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            {sectionId ? `Seats in Section ${sectionId}` : "Section"}
          </h2>
          <div className="relative w-full max-w-[800px] aspect-[16/10] bg-white rounded-lg shadow overflow-hidden" style={{ position: 'relative' }} ref={svgContainerRef}>
            {/* Debug: Display extracted seat data */}
            {/*
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: '#fff', border: '1px solid #2563eb', borderRadius: 8, padding: 8, maxHeight: 200, overflow: 'auto', fontSize: 12, minWidth: 180 }}>
              <div style={{ fontWeight: 600, color: '#2563eb', marginBottom: 4 }}>Extracted Seats</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(seats, null, 2)}</pre>
            </div>
            */}
            {/* Seat overlays rendered below (rects only) */}
            {/* Inline SVG rendering for DOM access */}
            {svgText && (
              <div
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 1, pointerEvents: 'none' }}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: svgText }}
              />
            )}
            {/* Render clickable seat rects with pixel-accurate overlay */}
            <svg
              viewBox="0 0 1440 1024"
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 2, pointerEvents: 'none' }}
            >
              {/* No seat overlays rendered here */}
            </svg>
            {/* Render overlays for all Square-A* paths */}
            {squareOverlays.map(overlay => (
              <SeatOverlay
                key={overlay.id}
                overlay={overlay}
                isBooked={!!bookedSeats[selectedDate]?.[overlay.id]}
                setShowBooking={setShowBooking}
                setBookingName={setBookingName}
                selectedDate={selectedDate}
              />
            ))}

            {/* Tooltip for hover on booked seat */}
            {hoverBookingDetails && hoverBookingDetails.booking && (
              <div
                style={{
                  position: 'fixed',
                  left: hoverBookingDetails.x + 12,
                  top: hoverBookingDetails.y + 12,
                  background: '#fff',
                  border: '1px solid #2563eb',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px #0002',
                  padding: '12px 18px',
                  zIndex: 200,
                  minWidth: 180,
                  fontSize: 14,
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Booked by: {hoverBookingDetails.booking.name}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {['morning', 'afternoon', 'evening'].map(slot => (
                    <li key={slot} style={{ marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ textTransform: 'capitalize' }}>{slot}</span>
                      <span style={{ fontWeight: 600, color: hoverBookingDetails.booking.timeSlots.includes(slot) ? '#e11d48' : '#059669' }}>
                        {hoverBookingDetails.booking.timeSlots.includes(slot) ? 'Booked' : 'Available'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Booking Form Modal */}
            {showBooking && showBooking.seatId && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  zIndex: 50,
                  background: '#fff',
                  border: '2px solid #2563eb',
                  borderRadius: 12,
                  boxShadow: '0 4px 24px #0002',
                  padding: 20,
                  minWidth: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Book {showBooking.seatName}</div>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={bookingName}
                  onChange={e => setBookingName(e.target.value)}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: 6,
                    padding: '6px 10px',
                    marginBottom: 12,
                    width: '100%',
                  }}
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    setShowBooking(showBooking => showBooking ? { ...showBooking, date: e.target.value } : null);
                  }}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: 6,
                    padding: '6px 10px',
                    marginBottom: 12,
                    width: '100%',
                  }}
                />
                <div style={{ width: '100%', marginBottom: 12 }}>
                  <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>Time Slot</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['morning', 'afternoon', 'evening'].map(slot => (
                      <label key={slot} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={selectedTimeSlots.includes(slot)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedTimeSlots(prev => [...prev, slot]);
                            } else {
                              setSelectedTimeSlots(prev => prev.filter(s => s !== slot));
                            }
                          }}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{slot}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (
                      bookingName.trim() &&
                      showBooking &&
                      showBooking.seatId &&
                      selectedDate &&
                      selectedTimeSlots.length > 0 &&
                      !bookedSeats[selectedDate]?.[showBooking.seatId]
                    ) {
                      handleBook(showBooking.seatId, selectedDate, selectedTimeSlots);
                    }
                  }}
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '7px 18px',
                    fontWeight: 600,
                    cursor:
                      bookingName.trim() && showBooking && showBooking.seatId && selectedTimeSlots.length > 0 && !bookedSeats[selectedDate]?.[showBooking.seatId]
                        ? 'pointer'
                        : 'not-allowed',
                    marginBottom: 6,
                    width: '100%',
                    opacity:
                      bookingName.trim() && showBooking && showBooking.seatId && selectedTimeSlots.length > 0 && !bookedSeats[selectedDate]?.[showBooking.seatId]
                        ? 1
                        : 0.6,
                  }}
                  disabled={
                    Boolean(!bookingName || !bookingName.trim() || selectedTimeSlots.length === 0 ||
                    (showBooking && showBooking.seatId && bookedSeats[selectedDate]?.[showBooking.seatId]))
                  }
                >
                  {showBooking && showBooking.seatId && bookedSeats[selectedDate]?.[showBooking.seatId] ? 'Already Booked' : 'Book'}
                </button>
                <button
                  onClick={() => {
                    setShowBooking(null);
                    setActiveSeat(null, '');
                  }}
                  style={{
                    background: 'none',
                    color: '#2563eb',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Modal for viewing booking details */}
            {viewBookingDetails && viewBookingDetails.booking && (
              <div
                style={{
                  position: 'fixed',
                  left: 0,
                  top: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.3)',
                  zIndex: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => setViewBookingDetails(null)}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 4px 24px #0002',
                    padding: 24,
                    minWidth: 260,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Booking Details</div>
                  <div style={{ marginBottom: 8 }}><strong>Seat:</strong> {viewBookingDetails.seatName}</div>
                  <div style={{ marginBottom: 8 }}><strong>Name:</strong> {viewBookingDetails.booking.name}</div>
                  <div style={{ marginBottom: 8 }}><strong>Time Slots:</strong></div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
                    {['morning', 'afternoon', 'evening'].map(slot => (
                      <li key={slot} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ textTransform: 'capitalize' }}>{slot}</span>
                        <span style={{ fontWeight: 600, color: viewBookingDetails.booking.timeSlots.includes(slot) ? '#e11d48' : '#059669' }}>
                          {viewBookingDetails.booking.timeSlots.includes(slot) ? 'Booked' : 'Available'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    style={{
                      marginTop: 16,
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '7px 18px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setViewBookingDetails(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="mt-6 text-gray-800">Click a seat to book. Booked seats are shown in grey.</p>
        </div>
      </div>
    </div>
    </SeatOverlayContext.Provider>
  );
}

export default SectionSeats;
