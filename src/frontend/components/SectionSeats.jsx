import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { getBookedSeatsBySectionAndDate, insertBooking } from '../services/bookingService.js';
import { deleteBooking } from '../../../backend/bookings';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from "./Header.jsx";
import { API_ENDPOINTS } from '../config/api.js';
import { useRealtime } from '../contexts/RealtimeContext.jsx';

import './SectionSeats.css';

import BookingModal from "./BookingModal.jsx";
import Popover from "./Popover.jsx";
import TimeFilter from "./TimeFilter.jsx";

import CalendarBar from "./CalendarBar.jsx";
import Sidebar from "./Sidebar.jsx";
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
function SeatOverlay({ overlay, isBooked, setShowBooking, selectedDate, setHoverBookingDetails = () => {}, setViewBookingDetails, bookedSeatsMap, selectedRange }) { // Added selectedRange for time filter
  // Use lifted state for blue highlight
  const { activeSeat, selectedDateForActive, setActiveSeat } = React.useContext(SeatOverlayContext);
  // Correct the date comparison for isActive
  const isActive = activeSeat === overlay.id && selectedDateForActive && new Date(selectedDateForActive).toDateString() === new Date(selectedDate).toDateString();

  // Get the normalized seat label from the overlay ID (e.g., 'Square-A1' -> 'A1')
  const seatLabel = overlay.id.replace(/^Square-/, '');

  // --- Availability logic (supports time-range filter) ---
  // Gather all booked time ranges for this seat on the selected date
  const seatBookingsRaw = bookedSeatsMap[selectedDate]?.[seatLabel];
  const allBookedRanges = [];
  if (Array.isArray(seatBookingsRaw)) {
    seatBookingsRaw.forEach(b => {
      if (!b?.Timeslot) return;
      if (typeof b.Timeslot === 'string') {
        try {
          const parsed = JSON.parse(b.Timeslot);
          if (Array.isArray(parsed?.timeslot)) {
            parsed.timeslot.forEach(([s, e]) => allBookedRanges.push([s, e]));
          }
        } catch (_) {}
      } else if (typeof b.Timeslot === 'object' && Array.isArray(b.Timeslot.timeslot)) {
        b.Timeslot.timeslot.forEach(([s, e]) => allBookedRanges.push([s, e]));
      }
    });
  } else if (seatBookingsRaw && typeof seatBookingsRaw === 'object') {
    Object.keys(seatBookingsRaw).forEach(k => {
      const v = seatBookingsRaw[k];
      if (!v?.Timeslot) return;
      if (typeof v.Timeslot === 'string') {
        try {
          const parsed = JSON.parse(v.Timeslot);
          if (Array.isArray(parsed?.timeslot)) {
            parsed.timeslot.forEach(([s, e]) => allBookedRanges.push([s, e]));
          }
        } catch (_) {}
      } else if (typeof v.Timeslot === 'object' && Array.isArray(v.Timeslot.timeslot)) {
        v.Timeslot.timeslot.forEach(([s, e]) => allBookedRanges.push([s, e]));
      }
    });
  }

  // Helper: convert HH:MM to minutes from midnight
  const toMin = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };

  // Determine availability flags
  let isFullyBooked = false;
  let isPartiallyBooked = false;
  let isAvailable = true;

  if (selectedRange?.checkIn && selectedRange?.checkOut) {
    const qStart = toMin(selectedRange.checkIn);
    const qEnd = toMin(selectedRange.checkOut);
    if (qStart != null && qEnd != null && qEnd > qStart) {
      // Compute total coverage of overlaps between bookings and query range
      let covered = 0;
      const segments = [];
      allBookedRanges.forEach(([s, e]) => {
        const bs = toMin(s);
        const be = toMin(e);
        if (bs == null || be == null) return;
        const ovlStart = Math.max(qStart, bs);
        const ovlEnd = Math.min(qEnd, be);
        if (ovlEnd > ovlStart) segments.push([ovlStart, ovlEnd]);
      });
      // Merge overlapping segments
      segments.sort((a, b) => a[0] - b[0]);
      let cur = null;
      const merged = [];
      for (const seg of segments) {
        if (!cur || seg[0] > cur[1]) {
          if (cur) merged.push(cur);
          cur = [...seg];
        } else {
          cur[1] = Math.max(cur[1], seg[1]);
        }
      }
      if (cur) merged.push(cur);
      covered = merged.reduce((sum, [s, e]) => sum + (e - s), 0);
      const requested = qEnd - qStart;
      if (covered >= requested && requested > 0) {
        isFullyBooked = true;
        isAvailable = false;
      } else if (covered > 0) {
        isPartiallyBooked = true;
        isAvailable = false;
      } else {
        isAvailable = true;
      }
    }
  } else {
    // Fallback to existing logic (no filter): booked if any booking exists
    const hasAnyBooking = allBookedRanges.length > 0;
    isFullyBooked = hasAnyBooking;
    isAvailable = !hasAnyBooking;
    isPartiallyBooked = false;
  }
  // --- End availability logic ---

  return (
    <div
      style={{
        position: 'absolute',
        left: overlay.left,
        top: overlay.top,
        width: overlay.width,
        height: overlay.height,
        background: isActive
          ? '#2563eb'
          : isFullyBooked
          ? '#d1d5db'
          : isPartiallyBooked
          ? '#fff4e5'
          : isAvailable
          ? '#e6fbe8'
          : '#fff',
        border: isActive
          ? '2.5px solid #2563eb'
          : isFullyBooked
          ? '2.5px solid #888'
          : isAvailable
          ? '2.5px solid #22c55e'
          : isPartiallyBooked
          ? '2.5px solid #f59e42'
          : '2px solid #888',
        color: isActive ? '#fff' : '#000',
        borderRadius: 6,
        zIndex: 10,
        pointerEvents: 'all',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: 16,
        cursor: isFullyBooked ? 'pointer' : 'pointer',
        opacity: isFullyBooked ? 0.7 : 1,
        transition: 'background 0.15s, border 0.15s',
      }}
      onClick={() => {
        if (!isFullyBooked) {
          setActiveSeat(overlay.id, selectedDate);
          // If a time filter is applied, prefill the modal with that range
          const hasAppliedRange = selectedRange?.checkIn && selectedRange?.checkOut;
          const preRange = hasAppliedRange ? [selectedRange.checkIn, selectedRange.checkOut] : undefined;
          setShowBooking({
            seatId: overlay.id,
            seatLabel: seatLabel,
            date: selectedDate,
            ...(hasAppliedRange ? { preselectedRange: preRange } : {}),
          });
        } else {
          setViewBookingDetails({
            seatId: overlay.id,
            seatLabel: seatLabel,
            bookingDetailsForSeat: bookedSeatsMap[selectedDate]?.[seatLabel],
          });
        }
      }}
      onMouseEnter={e => {
        if (!isAvailable) {
          setHoverBookingDetails({
            seatId: overlay.id,
            seatLabel: seatLabel,
            details: {
              name: (Array.isArray(seatBookingsRaw) ? seatBookingsRaw[0]?.Name : Object.values(seatBookingsRaw || {})[0]?.Name) || 'N/A',
              timeSlotsStatus: (Array.isArray(seatBookingsRaw)
                ? seatBookingsRaw.flatMap(b => {
                    try {
                      const parsed = typeof b.Timeslot === 'string' ? JSON.parse(b.Timeslot) : b.Timeslot;
                      return Array.isArray(parsed?.timeslot)
                        ? parsed.timeslot.map(([s, e]) => ({ slot: `${s}-${e}`, isBooked: true, bookedBy: b.Name || '' }))
                        : [];
                    } catch { return []; }
                  })
                : Object.keys(seatBookingsRaw || {}).map(k => ({ slot: k, isBooked: true, bookedBy: seatBookingsRaw[k]?.Name || '' }))
              ),
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
      {seatLabel}
    </div>
  );
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

  // Get real-time context
  const { subscribeToBookings, unsubscribeFromBookings, bookingsBySection } = useRealtime();

  // Track active subscription
  const activeSubscriptionRef = useRef(null);

  // Fetch booked seats from backend for this section and date
// Fetch booked seats from backend for this section and date
async function fetchBooked() {
  if (!sectionId || !selectedDate) return;
  try {
    const { bookings } = await getBookedSeatsBySectionAndDate(sectionId, selectedDate); // `bookings` is an array

    const newBookedSeatDataForDate = {};
    bookings.forEach(booking => {
      // Store all bookings for a seat as an array
      if (!newBookedSeatDataForDate[booking.Seat_Number]) {
        newBookedSeatDataForDate[booking.Seat_Number] = [];
      }
      newBookedSeatDataForDate[booking.Seat_Number].push(booking);
    });

    setBookedSeatsMap(prev => ({
      // Create a new object reference for React to detect changes
      ...prev,
      [selectedDate]: { ...newBookedSeatDataForDate }
    }));
  } catch (err) {
    console.error('Failed to fetch booked seats:', err);
  }
}

useEffect(() => {
  // Initial fetch
  fetchBooked();
  
  // Set up real-time subscription
  if (sectionId && selectedDate) {
    console.log(`🔄 Setting up subscription for ${sectionId} on ${selectedDate}`);
    
    // Unsubscribe from previous subscription if exists
    if (activeSubscriptionRef.current) {
      console.log('🧹 Cleaning up previous subscription');
      unsubscribeFromBookings(activeSubscriptionRef.current);
    }
    
    // Subscribe to real-time updates
    const setupSubscription = async () => {
      const subscriptionKey = await subscribeToBookings(sectionId, selectedDate, (update) => {
        const { eventType, seatNumber, booking } = update;

        setBookedSeatsMap(prev => {
          const updated = { ...prev };
          if (!updated[selectedDate]) updated[selectedDate] = {};
          const seatLabel = seatNumber;
          // Ensure seat entry as array cache
          if (!Array.isArray(updated[selectedDate][seatLabel])) {
            // normalize existing object map to array
            if (updated[selectedDate][seatLabel] && typeof updated[selectedDate][seatLabel] === 'object' && !Array.isArray(updated[selectedDate][seatLabel])) {
              updated[selectedDate][seatLabel] = Object.values(updated[selectedDate][seatLabel]);
            } else if (!updated[selectedDate][seatLabel]) {
              updated[selectedDate][seatLabel] = [];
            }
          }

          if (eventType === 'DELETE') {
            if (booking?.Booking_id) {
              updated[selectedDate][seatLabel] = (updated[selectedDate][seatLabel] || []).filter(b => b.Booking_id !== booking.Booking_id);
              if (updated[selectedDate][seatLabel].length === 0) delete updated[selectedDate][seatLabel];
            }
          } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
            // Replace existing by Booking_id or push
            if (booking?.Booking_id) {
              const arr = updated[selectedDate][seatLabel] || [];
              const idx = arr.findIndex(b => b.Booking_id === booking.Booking_id);
              if (idx >= 0) {
                arr[idx] = booking;
              } else {
                arr.push(booking);
              }
              updated[selectedDate][seatLabel] = arr;
            }
          }
          return updated;
        });
      });
      activeSubscriptionRef.current = subscriptionKey;
    };
    
    setupSubscription();
    
    // Cleanup function
    return () => {
      if (activeSubscriptionRef.current) {
        unsubscribeFromBookings(activeSubscriptionRef.current);
        activeSubscriptionRef.current = null;
      }
    };
  }
}, []);
// [sectionId, selectedDate, subscribeToBookings, unsubscribeFromBookings]

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
    // Also log all Square-* paths if present
    const svg = document.querySelector('svg');
    if (svg) {
      const squarePaths = svg.querySelectorAll('path[id^="Square-"]');
    }
  }, [seats]);


  React.useEffect(() => {
    if (sectionId && sectionSVGs[sectionId]) {
      fetch(sectionSVGs[sectionId])
        .then(res => res.text())
        .then(svgText => {
          setSvgText(svgText); // Save for inline rendering
          // Removed call to extractSeatsFromSVG (not defined) to prevent runtime error
          // setSeats(...) is not needed for overlays; overlays are computed from DOM paths
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
  // Applied time filter (explicitly set by user clicking "Check availability")
  const [appliedRange, setAppliedRange] = useState({ checkIn: '', checkOut: '' });
  // Time filter state (HH:MM 24h)
  const [selectedRange, setSelectedRange] = useState({ checkIn: '', checkOut: '' });
  // Helper to format time like 02:00 -> 2, 14:30 -> 14:30
  const formatCompactTime = (hhmm) => {
    if (!hhmm) return '';
    const [hStr, mStr] = hhmm.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
    if (m === 0) return String(h);
    return `${h}:${mStr.padStart(2, '0')}`;
  };
  const setPresetRange = (type) => {
    // Quick presets
    if (type === 'checkin') {
      // Use now rounded to next 15 min as default check-in
      const d = new Date();
      const m = d.getMinutes();
      const rounded = m % 15 === 0 ? m : m + (15 - (m % 15));
      if (rounded >= 60) { d.setHours(d.getHours() + 1); d.setMinutes(0); } else { d.setMinutes(rounded); }
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      setSelectedRange(r => ({ ...r, checkIn: `${hh}:${mm}` }));
    } else if (type === 'checkout') {
      // Default +2h from check-in or 18:00
      if (selectedRange.checkIn) {
        const [h, m] = selectedRange.checkIn.split(':').map(Number);
        let mins = h * 60 + m + 120;
        mins = Math.min(mins, 23 * 60 + 59);
        const hh = String(Math.floor(mins / 60)).padStart(2, '0');
        const mm = String(mins % 60).padStart(2, '0');
        setSelectedRange(r => ({ ...r, checkOut: `${hh}:${mm}` }));
      } else {
        setSelectedRange(r => ({ ...r, checkOut: '18:00' }));
      }
    } else if (type === 'clear') {
      setSelectedRange({ checkIn: '', checkOut: '' });
    }
  };

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
      const res = await fetch(API_ENDPOINTS.SEATS);
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
      
      // Additional aggressive refreshes to ensure instant updates
      setTimeout(() => {
        fetchBooked();
      }, 500);
      
      setTimeout(() => {
        fetchBooked();
      }, 1500);
      
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
  {/* Sidebar shown only on section view; burger toggles the menu */}
  <Sidebar currentSection={sectionId} />
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
            onDateChange={date => {
              const dateStr = date.toISOString().split('T')[0];
              setSelectedDate(dateStr);
              // Use cached realtime bookings; avoid refetch to save egress
            }}
          />
            <TimeFilter
              selectedRange={selectedRange}
              onRangeChange={(r) => setSelectedRange(r)}
              onApply={() => setAppliedRange(selectedRange)}
              onClear={() => { setSelectedRange({ checkIn: '', checkOut: '' }); setAppliedRange({ checkIn: '', checkOut: '' }); }}
            />
    {appliedRange.checkIn && appliedRange.checkOut && appliedRange.checkOut > appliedRange.checkIn && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, marginBottom: 8 }}>
                <div style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  borderRadius: 9999,
                  padding: '6px 12px',
                  fontWeight: 600,
                  fontSize: 13,
                }}>
      Showing filtered availability: {formatCompactTime(appliedRange.checkIn)} – {formatCompactTime(appliedRange.checkOut)}
                </div>
              </div>
            )}
            <h2 className="sectionseats-title">
              {sectionId ? `Workspace ${sectionId}` : "Section"}
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
                selectedRange={appliedRange}
              />
            ))}

            {/* Tooltip for hover on booked seat */}
            {/* Tooltip for hover on booked seat (refactored) */}
            {/* Tooltip for hover on booked seat removed as per user request */}

            {/* Booking Form Modal (refactored) */}
            <BookingModal
              isOpen={!!(showBooking && showBooking.seatId && (() => {
                // Only prevent modal for past days
                const now = new Date();
                const todayStr = new Date().toISOString().split('T')[0];
                if (selectedDate < todayStr) {
                  setShowBooking(null);
                  setActiveSeat(null, '');
                  setSelectedTimeSlots([]);
                  toast.error('Bookings cannot be done on past days');
                  return false;
                }
                return true;
              })())}
              onClose={() => {
                setShowBooking(null);
                setActiveSeat(null, '');
                setSelectedTimeSlots([]);
              }}
              seatLabel={showBooking?.seatLabel}
              selectedDate={selectedDate}
              selectedTimeSlots={showBooking?.preselectedRange ? [[showBooking.preselectedRange[0], showBooking.preselectedRange[1]]] : selectedTimeSlots}
              preselectedRange={showBooking?.preselectedRange}
              onTimeSlotChange={(slot, checked, isBooked) => {
                if (isBooked) return;
                if (checked) {
                  setSelectedTimeSlots(prev => [...prev, slot]);
                } else {
                  setSelectedTimeSlots(prev => prev.filter(s => s !== slot));
                }
              }}
              onBook={async (bookingData) => {
                try {
                  const currentSeatLabel = showBooking?.seatId?.replace(/^Square-/, '');
                  const todayStr = new Date().toISOString().split('T')[0];
                  if (
                    showBooking &&
                    showBooking.seatId &&
                    selectedDate === todayStr &&
                    bookingData.timeslot?.timeslot?.length > 0
                  ) {
                    // Find seat UUID
                    let seatUUID = null;
                    try {
                      const res = await fetch(API_ENDPOINTS.SEATS);
                      const allSeats = await res.json();
                      const match = allSeats.seats.find(s => s.Seat_Number === currentSeatLabel);
                      if (!match) {
                        toast.error('Seat UUID not found for ' + currentSeatLabel);
                        return;
                      }
                      seatUUID = match.Seat_id;
                    } catch (err) {
                      toast.error('Failed to fetch seat UUID: ' + err.message);
                      return;
                    }
                    // Send all selected timeslots as a single booking request in JSON format
                    await insertBooking({
                      created_at: selectedDate,
                      Seat_id: seatUUID,
                      Timeslot: JSON.stringify({ timeslot: bookingData.timeslot.timeslot }),
                      User_id: userId,
                    });
                    toast.success('Seat booked successfully');
                    // Update cache locally without re-fetch
                    setBookedSeatsMap(prev => {
                      const updated = { ...prev };
                      if (!updated[selectedDate]) updated[selectedDate] = {};
                      const arr = updated[selectedDate][currentSeatLabel] || [];
                      // Store a synthetic booking item (server realtime will reconcile with Booking_id later)
                      arr.push({
                        created_at: selectedDate,
                        Seat_id: seatUUID,
                        Seat_Number: currentSeatLabel,
                        Timeslot: JSON.stringify({ timeslot: bookingData.timeslot.timeslot }),
                        User_id: userId,
                        Name: ''
                      });
                      updated[selectedDate][currentSeatLabel] = arr;
                      return updated;
                    });
                    setShowBooking(null);
                  } else {
                    toast.error('Bookings should be made for today only and timeslot must be valid.');
                  }
                } catch (err) {
                  toast.error('Unexpected error: ' + (err?.message || err));
                }
              }}
              isBookDisabled={
                selectedDate !== new Date().toISOString().split('T')[0] ||
                (showBooking?.preselectedRange ? false : selectedTimeSlots.length === 0) ||
                (showBooking && showBooking.seatId && Object.keys(bookedSeatsMap[selectedDate]?.[showBooking.seatId.replace(/^Square-/, '')] || {}).some(slot => selectedTimeSlots.includes(slot)))
              }
              isAlreadyBooked={
                showBooking && showBooking.seatId && Object.keys(bookedSeatsMap[selectedDate]?.[showBooking.seatId.replace(/^Square-/, '')] || {}).some(slot => selectedTimeSlots.includes(slot))
              }
              bookedSeatsMap={bookedSeatsMap}
              onDelete={async () => {
                // Find bookingId for this seat, date, and timeslot
                const seatLabel = showBooking?.seatId?.replace(/^Square-/, '');
                const timeslot = selectedTimeSlots[0]; // Assume single timeslot for simplicity
                const bookingDetails = bookedSeatsMap[selectedDate]?.[seatLabel]?.[timeslot];
                if (!bookingDetails || !bookingDetails.Booking_id) {
                  toast.error('Booking not found for cancellation.');
                  return;
                }
                try {
                  await deleteBooking(bookingDetails.Booking_id);
                  toast.success('Booking cancelled.');
                  setShowBooking(null);
                  // Update local cache; realtime will reconcile
                  setBookedSeatsMap(prev => {
                    const updated = { ...prev };
                    const arr = (updated[selectedDate]?.[seatLabel] || []).filter(b => b.Booking_id !== bookingDetails.Booking_id);
                    if (!updated[selectedDate]) updated[selectedDate] = {};
                    if (arr.length > 0) updated[selectedDate][seatLabel] = arr; else delete updated[selectedDate][seatLabel];
                    return updated;
                  });
                } catch (err) {
                  toast.error('Failed to cancel booking: ' + err.message);
                }
              }}
            />

            {/* Modal for viewing booking details */}
            {viewBookingDetails && (
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
                    borderRadius: 16,
                    boxShadow: '0 4px 24px #0002',
                    padding: '32px 36px 28px 36px',
                    minWidth: 320,
                    maxWidth: 400,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 18, letterSpacing: 0.2 }}>Booking Details</div>
                  <div style={{ marginBottom: 12, fontSize: 17 }}><strong>Seat:</strong> <span style={{ fontWeight: 600 }}>{viewBookingDetails.seatLabel}</span></div>
                  <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Time Slots:</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
                    {(() => {
                      // Define the full available time range for the day (24hr)
                      const DAY_START = "00:00";
                      const DAY_END = "23:59";
                      // Get all bookings for this seat and date from all rows
                      const seatLabel = viewBookingDetails.seatLabel;
                      // Find all bookings for this seat and date from the raw bookings array
                      let allBookingsForSeat = [];
                      if (bookedSeatsMap[selectedDate] && bookedSeatsMap[selectedDate][seatLabel]) {
                        const raw = bookedSeatsMap[selectedDate][seatLabel];
                        if (Array.isArray(raw)) {
                          allBookingsForSeat = raw;
                        } else if (typeof raw === 'object' && raw !== null) {
                          allBookingsForSeat = Object.values(raw);
                        }
                      }
                      // Collect all booked timeslots and names from ALL rows for this seat
                      let bookedRanges = [];
                      allBookingsForSeat.forEach(booking => {
                        let timeslotArr = [];
                        if (booking.Timeslot) {
                          if (typeof booking.Timeslot === 'string') {
                            try {
                              const parsed = JSON.parse(booking.Timeslot);
                              if (Array.isArray(parsed.timeslot)) {
                                timeslotArr = parsed.timeslot;
                              }
                            } catch (e) {
                              timeslotArr = [];
                            }
                          } else if (typeof booking.Timeslot === 'object' && Array.isArray(booking.Timeslot.timeslot)) {
                            timeslotArr = booking.Timeslot.timeslot;
                          }
                        }
                        timeslotArr.forEach(([start, end]) => {
                          bookedRanges.push({ start, end, name: booking.Name });
                        });
                      });
                      // Sort by start time
                      bookedRanges.sort((a, b) => a.start.localeCompare(b.start));

                      // Now split the day into available and booked slots
                      let slots = [];
                      let prevEnd = DAY_START;
                      for (let b of bookedRanges) {
                        if (prevEnd < b.start) {
                          slots.push({ start: prevEnd, end: b.start, name: null });
                        }
                        slots.push({ start: b.start, end: b.end, name: b.name });
                        prevEnd = b.end;
                      }
                      if (prevEnd < DAY_END) {
                        slots.push({ start: prevEnd, end: DAY_END, name: null });
                      }
                      slots = slots.filter(s => s.start !== s.end);
                      return slots.map((range, idx) => (
                        <li key={idx}
                          style={{
                            marginBottom: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 0 0 2px',
                            minHeight: 32,
                            cursor: !range.name ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (!range.name) {
                              setShowBooking({
                                seatId: viewBookingDetails.seatId,
                                seatLabel: viewBookingDetails.seatLabel,
                                date: selectedDate,
                                preselectedSlot: null,
                                preselectedRange: [range.start, range.end]
                              });
                              setSelectedTimeSlots([[range.start, range.end]]);
                              setViewBookingDetails(null);
                            }
                          }}
                        >
                          <span style={{ fontSize: 15 }}>{range.start} - {range.end}</span>
                          <span style={{
                            fontWeight: 600,
                            color: range.name ? '#e11d48' : '#059669',
                            fontSize: 15,
                            marginLeft: 8,
                            marginRight: range.name ? 10 : 0,
                            textDecoration: !range.name ? 'underline' : 'none',
                          }}>
                            {range.name ? `Booked by ${range.name}` : 'Available'}
                          </span>
                        </li>
                      ));
                    })()}
                  </ul>
                  <button
                    style={{
                      marginTop: 24,
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 32px',
                      fontWeight: 700,
                      fontSize: 16,
                      letterSpacing: 0.5,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px #2563eb22',
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