import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { getBookedSeatsBySectionAndDate, insertBooking } from '../../../backend/bookings';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from "./Header.jsx";
import { API_ENDPOINTS } from '../config/api.js';

import './SectionSeats.css';

import BookingModal from "./BookingModal.jsx";
import Popover from "./Popover.jsx";

import CalendarBar from "./CalendarBar.jsx";
import SectionA from '../../assets/Section-A.svg';
import SectionB from '../../assets/Section-B.svg';
import SectionC from '../../assets/Section-C.svg';
import SectionD from '../../assets/Section-D.svg';
import SectionE from '../../assets/Section-E.svg';
import SectionF from '../../assets/Section-F.svg';
import SectionG from '../../assets/Section-G.svg';


// Context to lift active seat highlight state
const SeatOverlayContext = React.createContext({
  activeSeat: null,
  selectedDateForActive: '',
  setActiveSeat: () => {},
});


// Overlay for a single seat, with hover state for booked seats
function SeatOverlay({ overlay, isBooked, setShowBooking, selectedDate, setHoverBookingDetails = () => {}, setViewBookingDetails, bookedSeatsMap }) { // Added setViewBookingDetails, bookedSeatsMap
  // Use lifted state for blue highlight
  const { activeSeat, selectedDateForActive, setActiveSeat } = React.useContext(SeatOverlayContext);
  // Correct the date comparison for isActive
  const isActive = activeSeat === overlay.id && selectedDateForActive && new Date(selectedDateForActive).toDateString() === new Date(selectedDate).toDateString();

  // Get the normalized seat label from the overlay ID (e.g., 'Square-A1' -> 'A1')
  const seatLabel = overlay.id.replace(/^Square-/, '');

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
        pointerEvents: 'all',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#000',
        fontWeight: 600,
        fontSize: 16,
        cursor: isBooked ? 'pointer' : 'pointer',
        opacity: isBooked ? 0.7 : 1,
        transition: 'background 0.15s',
      }}
      onClick={() => {
        if (!isBooked) {
          setActiveSeat(overlay.id, selectedDate);
          setShowBooking({
            seatId: overlay.id,
            seatLabel: seatLabel, // Use the normalized label
            date: selectedDate,
          });
        } else {
          // If already booked, show booking details
          setViewBookingDetails({
            seatId: overlay.id,
            seatLabel: seatLabel, // Use the normalized label
            // Pass the timeslot-mapped object for this seat on this date using the normalized label
            bookingDetailsForSeat: bookedSeatsMap[selectedDate]?.[seatLabel], // Changed: Use seatLabel here
          });
        }
      }}
      onMouseEnter={e => {
        if (isBooked) {
          // Changed: Use seatLabel here to get seatBookings
          const seatBookings = bookedSeatsMap[selectedDate]?.[seatLabel] || {};
          const bookedByName = Object.values(seatBookings)[0]?.Name || 'N/A'; // Get name from any booked slot

          setHoverBookingDetails({
            seatId: overlay.id,
            seatLabel: seatLabel, // Use the normalized label
            // Provide structured details for tooltip
            details: {
              name: bookedByName, // Name of one of the bookers
              timeSlotsStatus: ['morning', 'afternoon', 'evening'].map(slot => ({
                slot: slot,
                isBooked: !!seatBookings[slot], // Check if this specific slot is booked
                bookedBy: seatBookings[slot]?.Name || '', // Who booked this specific slot
              })),
            },
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
      {seatLabel} {/* Display the normalized seat label */}
    </div>
  );
}


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


const SectionSeats = ({ userId }) => {
  // Always declare selectedDate at the top before any useEffect or usage
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeSeat, setActiveSeatState] = useState(null);
  const [selectedDateForActive, setSelectedDateForActive] = useState('');
  const setActiveSeat = (seatId, date) => {
    setActiveSeatState(seatId);
    setSelectedDateForActive(date);
  };
  let { sectionId } = useParams();
  sectionId = sectionId ? sectionId.toUpperCase() : sectionId;
  const navigate = useNavigate();

  // Bookings are now specific to date: { [date]: { [seatLabel]: { [timeslot]: bookingObject } } }
  const [bookedSeatsMap, setBookedSeatsMap] = useState({}); // Renamed state

  // Fetch booked seats from backend for this section and date
  useEffect(() => {
    async function fetchBooked() {
      if (!sectionId || !selectedDate) return;
      try {
        const { bookings } = await getBookedSeatsBySectionAndDate(sectionId, selectedDate); // `bookings` is an array

        const newBookedSeatDataForDate = {};
        bookings.forEach(booking => {
          // Store actual booking object under Seat_Number and Timeslot
          if (!newBookedSeatDataForDate[booking.Seat_Number]) { // Changed: Use Seat_Number as key here
            newBookedSeatDataForDate[booking.Seat_Number] = {};
          }
          newBookedSeatDataForDate[booking.Seat_Number][booking.Timeslot] = booking; // Changed: Use Seat_Number here
        });

        setBookedSeatsMap(prev => ({
          ...prev,
          [selectedDate]: newBookedSeatDataForDate // Store the mapped data for the specific date
        }));
        console.log('Fetched and mapped booked seats:', newBookedSeatDataForDate);
      } catch (err) {
        console.error('Failed to fetch booked seats:', err);
      }
    }
    fetchBooked();
  }, [sectionId, selectedDate]);

  const [seats, setSeats] = useState([]);

  const [showBooking, setShowBooking] = useState(null);
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

  // Async booking handler: insert into backend Bookings API
  const handleBook = async (seatId, date) => {
    if (selectedTimeSlots.length === 0) return;
    if (!userId) {
      toast.error('User not found. Please log in again.');
      return;
    }
    // Always extract seat number from overlay id (e.g., 'Square-A5' → 'A5')
    const seatNumber = seatId.replace(/^Square-/, '');
    let seatUUID = null;
    try {
      // Fetch all seats from backend (or cache)
      const res = await fetch('http://localhost:4000/api/seats');
      const allSeats = await res.json();
      // Find the seat with matching Seat_Number
      const match = allSeats.seats.find(s => s.Seat_Number === seatNumber);
      if (!match) {
        toast.error('Seat UUID not found for ' + seatNumber);
        return;
      }
      seatUUID = match.Seat_id;
      for (const timeslot of selectedTimeSlots) {
        await insertBooking({
          created_at: date,
          Seat_id: seatUUID, // send UUID
          Timeslot: timeslot,
          User_id: userId,
        });
      }
      // Refetch booked seats after booking
      const { bookings: updatedBookings } = await getBookedSeatsBySectionAndDate(sectionId, date);
      const newBookedSeatDataForDate = {};
      updatedBookings.forEach(booking => {
        // Changed: Use Seat_Number as key here
        if (!newBookedSeatDataForDate[booking.Seat_Number]) {
          newBookedSeatDataForDate[booking.Seat_Number] = {};
        }
        newBookedSeatDataForDate[booking.Seat_Number][booking.Timeslot] = booking;
      });
      setBookedSeatsMap(prev => ({ ...prev, [date]: newBookedSeatDataForDate })); // Use bookedSeatsMap
      setShowBooking(null);
      setSelectedTimeSlots([]);
      toast.success(
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#22c55e',
            color: '#fff',
            fontSize: 22,
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#22c55e"/>
              <path d="M6 10.5L9 13.5L14 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span style={{ fontSize: 18, color: '#444' }}>Seat booked successfully</span>
        </div>,
        {
          position: 'top-right',
          autoClose: 2500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          style: {
            minWidth: 320,
            borderRadius: 8,
            boxShadow: '0 4px 24px rgba(9, 91, 190, 0.13)',
          },
          icon: false,
        }
      );
    } catch (err) {
      toast.error('Failed to book seat: ' + err.message);
    }
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


  // Add state for viewing booking details and tooltip
  const [viewBookingDetails, setViewBookingDetails] = useState(null);
  const [hoverBookingDetails, setHoverBookingDetails] = useState(null);

  return (
    <SeatOverlayContext.Provider value={{ activeSeat, selectedDateForActive, setActiveSeat }}>
      <div className="sectionseats-bg">
        {/* Main Content Area */}
        <div className="sectionseats-main">
          {/* Fixed Header */}
          <div className="sectionseats-header">
            <Header />
          </div>
          {/* Scrollable Section View Only */}
          <div className="sectionseats-content">

          {/* CalendarBar controls the selected date for booking */}
          <CalendarBar
            daysToShow={7}
            onDateChange={date => setSelectedDate(date.toISOString().split('T')[0])}
          />
            <h2 className="sectionseats-title">
              {sectionId ? `Seats in Section ${sectionId}` : "Section"}
            </h2>
            <div className="sectionseats-svg-container" ref={svgContainerRef}>
            {/* Debug: Display extracted seat data */}
            {/*
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: '#fff', border: '1px solid #2563eb', borderRadius: 8, padding: 8, maxHeight: 200, overflow: 'auto', fontSize: 12, minWidth: 180 }}>
              <div style={{ fontWeight: 600, color: '#2563eb', marginBottom: 4 }}>Extracted Seats</div>
              <pre style={{ margin: 0, whiteWhiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(seats, null, 2)}</pre>
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
                // isBooked if there are any bookings for this seat on the selected date
                isBooked={Object.keys(bookedSeatsMap[selectedDate]?.[overlay.id.replace(/^Square-/, '')] || {}).length > 0} // Changed: Use normalized seat label here
                setShowBooking={setShowBooking}
                selectedDate={selectedDate}
                setHoverBookingDetails={setHoverBookingDetails}
                setViewBookingDetails={setViewBookingDetails} // Pass down
                bookedSeatsMap={bookedSeatsMap} // Pass down
              />
            ))}

            {/* Tooltip for hover on booked seat */}
            {/* Tooltip for hover on booked seat (refactored) */}
            {hoverBookingDetails && hoverBookingDetails.details && (
              <Popover
                x={hoverBookingDetails.x}
                y={hoverBookingDetails.y}
                details={hoverBookingDetails.details}
              />
            )}

            {/* Booking Form Modal (refactored) */}
            <BookingModal
              isOpen={!!(showBooking && showBooking.seatId && (() => {
                // Only allow modal for today between 4 AM and 10 PM
                const now = new Date();
                const todayStr = new Date().toISOString().split('T')[0];
                const hour = now.getHours();
                if (selectedDate === todayStr && hour >= 4 && hour < 22) return true;
                // If yesterday, show toast and prevent modal
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                if (selectedDate === yesterdayStr) {
                  setShowBooking(null);
                  setActiveSeat(null, '');
                  setSelectedTimeSlots([]);
                  toast.error('Bookings cannot be done on past days');
                  return false;
                }
                return false;
              })())}
              onClose={() => {
                setShowBooking(null);
                setActiveSeat(null, '');
                setSelectedTimeSlots([]);
              }}
              seatLabel={showBooking?.seatLabel}
              selectedDate={selectedDate}
              selectedTimeSlots={selectedTimeSlots}
              onTimeSlotChange={(slot, checked, isBooked) => {
                if (isBooked) return;
                if (checked) {
                  setSelectedTimeSlots(prev => [...prev, slot]);
                } else {
                  setSelectedTimeSlots(prev => prev.filter(s => s !== slot));
                }
              }}
              onBook={async () => {
                const currentSeatLabel = showBooking?.seatId?.replace(/^Square-/, '');
                const now = new Date();
                const todayStr = new Date().toISOString().split('T')[0];
                const hour = now.getHours();
                if (
                  showBooking &&
                  showBooking.seatId &&
                  selectedDate === todayStr &&
                  hour >= 4 && hour < 22 &&
                  selectedTimeSlots.length > 0 &&
                  !Object.keys(bookedSeatsMap[selectedDate]?.[currentSeatLabel] || {}).some(slot => selectedTimeSlots.includes(slot))
                ) {
                  await handleBook(showBooking.seatId, selectedDate);
                } else {
                  toast.error('Bookings should be made between 4 AM to 10 PM on the current day only.');
                }
              }}
              isBookDisabled={
                selectedDate !== new Date().toISOString().split('T')[0] ||
                (() => {
                  const hour = new Date().getHours();
                  return hour < 4 || hour >= 22;
                })() ||
                selectedTimeSlots.length === 0 ||
                (showBooking && showBooking.seatId && Object.keys(bookedSeatsMap[selectedDate]?.[showBooking.seatId.replace(/^Square-/, '')] || {}).some(slot => selectedTimeSlots.includes(slot)))
              }
              isAlreadyBooked={
                showBooking && showBooking.seatId && Object.keys(bookedSeatsMap[selectedDate]?.[showBooking.seatId.replace(/^Square-/, '')] || {}).some(slot => selectedTimeSlots.includes(slot))
              }
              bookedSeatsMap={bookedSeatsMap}
            />

            {/* Modal for viewing booking details */}
            {viewBookingDetails && viewBookingDetails.bookingDetailsForSeat && (
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
                  <div style={{ marginBottom: 8 }}><strong>Seat:</strong> {viewBookingDetails.seatLabel}</div>
                  <div style={{ marginBottom: 8 }}><strong>Time Slots:</strong></div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
                    {['morning', 'afternoon', 'evening'].map(slot => {
                      const booking = viewBookingDetails.bookingDetailsForSeat[slot];
                      const isAvailable = !booking;
                      return (
                        <li key={slot} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isAvailable ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (isAvailable) {
                              setShowBooking({
                                seatId: viewBookingDetails.seatId,
                                seatLabel: viewBookingDetails.seatLabel,
                                date: selectedDate,
                                preselectedSlot: slot
                              });
                              setSelectedTimeSlots([slot]);
                              setViewBookingDetails(null);
                            }
                          }}
                        >
                          <span style={{ textTransform: 'capitalize' }}>{slot}</span>
                          <span style={{ fontWeight: 600, color: booking ? '#e11d48' : '#059669', textDecoration: isAvailable ? 'underline' : 'none' }}>
                            {booking ? `Booked by ${booking.Name || 'N/A'}` : 'Available'}
                          </span>
                        </li>
                      );
                    })}
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
            <p className="sectionseats-info">Click a seat to book. Booked seats are shown in grey.</p>
        </div>
      </div>
    </div>
    </SeatOverlayContext.Provider>
  );
}

export default SectionSeats;