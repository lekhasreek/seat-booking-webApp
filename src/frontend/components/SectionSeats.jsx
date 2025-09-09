import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { getBookedSeatsBySectionAndDate, insertBooking } from '../services/bookingService.js';
import { deleteBooking, editBooking } from '../services/bookingService.js';
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
function SeatOverlay({ overlay, isBooked, setShowBooking, selectedDate, setHoverBookingDetails = () => {}, setViewBookingDetails, bookedSeatsMap, selectedRange, userRole, selectedSeatsForBooking, setSelectedSeatsForBooking, openBookingModal }) { // Added selectedRange for time filter
  // Use lifted state for blue highlight
  const { activeSeat, selectedDateForActive, setActiveSeat } = React.useContext(SeatOverlayContext);
  // Correct the date comparison for isActive
  const isActive = activeSeat === overlay.id && selectedDateForActive && new Date(selectedDateForActive).toDateString() === new Date(selectedDate).toDateString();

  // Get the normalized seat label from the overlay ID (e.g., 'Square-A1' -> 'A1')
  const seatLabel = overlay.id.replace(/^Square-/, '');

  // --- New logic for booking status ---
  // Support both array and object mapping for seatBookings
  let seatBookingsRaw = bookedSeatsMap[selectedDate]?.[seatLabel];
  let seatBookings = {};
  if (Array.isArray(seatBookingsRaw)) {
    // Convert array of bookings to timeslot mapping
    seatBookingsRaw.forEach(b => {
      if (b.Timeslot) {
        if (typeof b.Timeslot === 'string') {
          try {
            const parsed = JSON.parse(b.Timeslot);
            if (Array.isArray(parsed.timeslot)) {
              parsed.timeslot.forEach(([start, end]) => {
                seatBookings[`${start}-${end}`] = b;
              });
            }
          } catch (e) {}
        } else if (typeof b.Timeslot === 'object' && Array.isArray(b.Timeslot.timeslot)) {
          b.Timeslot.timeslot.forEach(([start, end]) => {
            seatBookings[`${start}-${end}`] = b;
          });
        }
      }
    });
  } else if (typeof seatBookingsRaw === 'object' && seatBookingsRaw !== null) {
    seatBookings = seatBookingsRaw;
  }
  // For legacy morning/afternoon/evening slots, fallback
  const timeslots = Object.keys(seatBookings).length > 0 ? Object.keys(seatBookings) : ['morning', 'afternoon', 'evening'];
  const bookedCount = timeslots.filter(slot => !!seatBookings[slot]).length;
  const isFullyBooked = bookedCount === timeslots.length;
  const isPartiallyBooked = bookedCount > 0 && bookedCount < timeslots.length;
  const isAvailable = bookedCount === 0;
  // --- End new logic ---

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
        // If user is a lead, toggle multi-select for available seats
        if (userRole === 'lead' && !isFullyBooked) {
          const label = seatLabel;
          if (selectedSeatsForBooking.includes(label)) {
            setSelectedSeatsForBooking(prev => prev.filter(s => s !== label));
            setActiveSeat(null, '');
          } else {
            setSelectedSeatsForBooking(prev => [...prev, label]);
            setActiveSeat(overlay.id, selectedDate);
          }
          return;
        }
          if (!isFullyBooked) {
          // Open modal after refreshing backend bookings to avoid overwriting existing slots
          (async () => {
            const hasAppliedRange = selectedRange?.checkIn && selectedRange?.checkOut;
            const preRange = hasAppliedRange ? [selectedRange.checkIn, selectedRange.checkOut] : undefined;
            if (typeof openBookingModal === 'function') {
              await openBookingModal({
                seatId: overlay.id,
                seatLabel: seatLabel,
                date: selectedDate,
                ...(hasAppliedRange ? { preselectedRange: preRange } : {}),
              });
            } else {
              setShowBooking({
                seatId: overlay.id,
                seatLabel: seatLabel,
                date: selectedDate,
                ...(hasAppliedRange ? { preselectedRange: preRange } : {}),
              });
            }
          })();
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
  // Harmonized: always use object mapping for seat bookings
  const [bookedSeatsMap, setBookedSeatsMap] = useState({});

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
      // Always store as object mapping timeslot to booking (keyed by start_end)
      if (!newBookedSeatDataForDate[booking.Seat_Number]) {
        newBookedSeatDataForDate[booking.Seat_Number] = {};
      }
      // Normalize Timeslot into array of [start,end]
      let timeslotArr = [];
      if (booking.Timeslot) {
        if (typeof booking.Timeslot === 'string') {
          try {
            const parsed = JSON.parse(booking.Timeslot);
            if (Array.isArray(parsed.timeslot)) timeslotArr = parsed.timeslot;
          } catch (e) {}
        } else if (booking.Timeslot && Array.isArray(booking.Timeslot.timeslot)) {
          timeslotArr = booking.Timeslot.timeslot;
        }
      }
      if (timeslotArr.length > 0) {
        timeslotArr.forEach(([s, e]) => {
          const key = `${s}_${e}`;
          newBookedSeatDataForDate[booking.Seat_Number][key] = booking;
        });
      } else {
        const key = typeof booking.Timeslot === 'string' ? booking.Timeslot : JSON.stringify(booking.Timeslot);
        newBookedSeatDataForDate[booking.Seat_Number][key] = booking;
      }
    });
    setBookedSeatsMap(prev => ({
      ...prev,
      [selectedDate]: { ...newBookedSeatDataForDate }
    }));
  } catch (err) {
    console.error('Failed to fetch booked seats:', err);
  }
}

  // Open booking modal after fetching latest bookings for the selected date.
  // Ensures the modal and booking details always reflect backend state (all slots).
  const openBookingModal = async (payload = {}) => {
    if (!sectionId || !selectedDate) {
      // Fallback to just opening modal
      setShowBooking(payload);
      return;
    }
    try {
      const { bookings } = await getBookedSeatsBySectionAndDate(sectionId, selectedDate);
      const newBookedSeatDataForDate = {};
      bookings.forEach(booking => {
        if (!newBookedSeatDataForDate[booking.Seat_Number]) {
          newBookedSeatDataForDate[booking.Seat_Number] = {};
        }
        newBookedSeatDataForDate[booking.Seat_Number][booking.Timeslot] = booking;
      });
      // Update local map so modal sees the freshest state
      setBookedSeatsMap(prev => ({ ...prev, [selectedDate]: newBookedSeatDataForDate }));

      // If payload requested a specific bookingId, try to attach the bookingDetails
      let bookingDetails = payload.bookingDetails;
      if (!bookingDetails && payload.bookingId) {
        bookingDetails = bookings.find(b => b.Booking_id === payload.bookingId);
      }

      setActiveSeat(payload.seatId || null, selectedDate);
      setShowBooking({ ...payload, bookingDetails });
    } catch (err) {
      console.error('Failed to fetch bookings before opening modal', err);
      // fallback: still open modal with whatever payload
      setShowBooking(payload);
    }
  };

useEffect(() => {
  // Fetch bookings for current section/date and set up real-time subscription
  fetchBooked();

  if (!sectionId || !selectedDate) return;

  // If there's an existing subscription, unsubscribe it first
  if (activeSubscriptionRef.current) {
    try {
      unsubscribeFromBookings(activeSubscriptionRef.current);
    } catch (e) { /* ignore */ }
    activeSubscriptionRef.current = null;
  }

  let mounted = true;
  const setupSubscription = async () => {
    const subscriptionKey = await subscribeToBookings(sectionId, selectedDate, (update) => {
      if (!mounted) return;
      const { eventType, seatNumber, booking } = update;
      setBookedSeatsMap(prev => {
        const updated = { ...prev };
        if (!updated[selectedDate]) updated[selectedDate] = {};
        const seatLabel = seatNumber;
        if (eventType === 'DELETE') {
          if (updated[selectedDate][seatLabel] && booking?.Timeslot) {
            try {
              let times = [];
              if (typeof booking.Timeslot === 'string') {
                const parsed = JSON.parse(booking.Timeslot);
                if (Array.isArray(parsed.timeslot)) times = parsed.timeslot;
              } else if (booking.Timeslot && Array.isArray(booking.Timeslot.timeslot)) {
                times = booking.Timeslot.timeslot;
              }
              if (times.length > 0) {
                times.forEach(([s, e]) => delete updated[selectedDate][seatLabel][`${s}_${e}`]);
              } else {
                delete updated[selectedDate][seatLabel][typeof booking.Timeslot === 'string' ? booking.Timeslot : JSON.stringify(booking.Timeslot)];
              }
            } catch (e) {
              delete updated[selectedDate][seatLabel][booking.Timeslot];
            }
            if (Object.keys(updated[selectedDate][seatLabel]).length === 0) {
              delete updated[selectedDate][seatLabel];
            }
          }
        } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (!updated[selectedDate][seatLabel]) {
            updated[selectedDate][seatLabel] = {};
          }
          try {
            let times = [];
            if (typeof booking.Timeslot === 'string') {
              const parsed = JSON.parse(booking.Timeslot);
              if (Array.isArray(parsed.timeslot)) times = parsed.timeslot;
            } else if (booking.Timeslot && Array.isArray(booking.Timeslot.timeslot)) {
              times = booking.Timeslot.timeslot;
            }
            if (times.length > 0) {
              times.forEach(([s, e]) => {
                updated[selectedDate][seatLabel][`${s}_${e}`] = booking;
              });
            } else {
              const key = typeof booking.Timeslot === 'string' ? booking.Timeslot : JSON.stringify(booking.Timeslot);
              updated[selectedDate][seatLabel][key] = booking;
            }
          } catch (e) {
            updated[selectedDate][seatLabel][booking.Timeslot] = booking;
          }
        }
        return updated;
      });
    });
    activeSubscriptionRef.current = subscriptionKey;
  };

  setupSubscription();

  return () => {
    mounted = false;
    if (activeSubscriptionRef.current) {
      try { unsubscribeFromBookings(activeSubscriptionRef.current); } catch (e) { }
      activeSubscriptionRef.current = null;
    }
  };
}, [sectionId, selectedDate]);

  const [seats, setSeats] = useState([]);
  const [userRole, setUserRole] = useState(null);
  // Fetch role for current user (if available) so we can enable lead-only features
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_ENDPOINTS.USERS}/${userId}`);
        if (!mounted) return;
        if (res.ok) {
          const body = await res.json();
          setUserRole(body?.role || body?.Role || null);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const [showBooking, setShowBooking] = useState(null);
  // Multi-select for lead users
  const [selectedSeatsForBooking, setSelectedSeatsForBooking] = useState([]); // array of seat labels (e.g., 'A1')
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
      // Batch insert all selected timeslots in one request. The backend will return
      // { inserted: [ ... ], conflicts: [ ... ] } for partial success.
      try {
        const payload = {
          created_at: date,
          Seat_id: seatUUID,
          Timeslot: JSON.stringify({ timeslot: selectedTimeSlots }),
          User_id: userId,
        };
        const res = await insertBooking(payload);

        // Merge inserted rows into local state without discarding other bookings
        if (res && Array.isArray(res.inserted)) {
          setBookedSeatsMap(prev => {
            const updated = { ...(prev || {}) };
            if (!updated[date]) updated[date] = {};
            for (const booking of res.inserted) {
              const seatNum = booking.Seat_Number;
              if (!updated[date][seatNum]) updated[date][seatNum] = {};
              // Normalize Timeslot into array
              let timeslotArr = [];
              if (booking.Timeslot) {
                if (typeof booking.Timeslot === 'string') {
                  try {
                    const parsed = JSON.parse(booking.Timeslot);
                    if (Array.isArray(parsed.timeslot)) timeslotArr = parsed.timeslot;
                  } catch (e) {}
                } else if (booking.Timeslot && Array.isArray(booking.Timeslot.timeslot)) {
                  timeslotArr = booking.Timeslot.timeslot;
                }
              }
              if (timeslotArr.length > 0) {
                timeslotArr.forEach(([s, e]) => {
                  const key = `${s}_${e}`;
                  updated[date][seatNum][key] = booking;
                });
              } else {
                const key = typeof booking.Timeslot === 'string' ? booking.Timeslot : JSON.stringify(booking.Timeslot);
                updated[date][seatNum][key] = booking;
              }
            }
            return updated;
          });
        }

        // Notify user about partial conflicts if any
        if (res && Array.isArray(res.conflicts) && res.conflicts.length > 0) {
          toast.warn('Some requested timeslots conflicted with existing bookings and were skipped.');
        }
      } catch (err) {
        toast.error('Failed to book seat: ' + err.message);
      }
      
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
              // Always fetch bookings for the selected date, including previous days
              fetchBooked();
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
              <div key={overlay.id} style={{ position: 'relative' }}>
                {/* For lead users allow multi-select by ctrl/cmd click - here we enable toggle on click when role is lead via userService or user metadata; fallback: allow always if userId present and multi-select not harmful */}
                <SeatOverlay
                overlay={overlay}
                // isBooked if there are any bookings for this seat on the selected date
                isBooked={Object.keys(bookedSeatsMap[selectedDate]?.[overlay.id.replace(/^Square-/, '')] || {}).length > 0} // Changed: Use normalized seat label here
                setShowBooking={setShowBooking}
                selectedDate={selectedDate}
                setHoverBookingDetails={setHoverBookingDetails}
                setViewBookingDetails={setViewBookingDetails} // Pass down
                bookedSeatsMap={bookedSeatsMap} // Pass down
                selectedRange={appliedRange}
                userRole={userRole}
                selectedSeatsForBooking={selectedSeatsForBooking}
                setSelectedSeatsForBooking={setSelectedSeatsForBooking}
                openBookingModal={openBookingModal}
              />
                {/* Small checkbox indicator for selected seats (lead multi-select) */}
                {selectedSeatsForBooking.includes(overlay.id.replace(/^Square-/, '')) && (
                  <div style={{ position: 'absolute', top: overlay.top - 10, left: overlay.left + overlay.width - 18, zIndex: 30 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>✓</div>
                  </div>
                )}
              </div>
            ))}

            {/* Multi-select controls - show only when there's at least one selection */}
            {selectedSeatsForBooking.length > 0 && (
              <div style={{ position: 'absolute', left: 16, bottom: 24, zIndex: 60, display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    // Open the booking modal for the selected seats; ensure backend state is fresh
                    await openBookingModal({
                      seatId: null,
                      seatLabel: null,
                      date: selectedDate,
                      preselectedRange: null,
                    });
                  }}
                  style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Book Selected ({selectedSeatsForBooking.length})
                </button>
                <button
                  onClick={() => setSelectedSeatsForBooking([])}
                  style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>
            )}

            {/* Tooltip for hover on booked seat */}
            {/* Tooltip for hover on booked seat (refactored) */}
            {/* Tooltip for hover on booked seat removed as per user request */}

            {/* Booking Form Modal (refactored) */}
            <BookingModal
              isOpen={!!(showBooking && (() => {
                const now = new Date();
                const todayStr = new Date().toISOString().split('T')[0];
                if (selectedDate < todayStr) {
                  setShowBooking(null);
                  setActiveSeat(null, '');
                  setSelectedTimeSlots([]);
                  setSelectedSeatsForBooking([]);
                  toast.error('Bookings cannot be done on past days');
                  return false;
                }
                return true;
              })())}
              onClose={() => {
                setShowBooking(null);
                setActiveSeat(null, '');
                setSelectedTimeSlots([]);
                setSelectedSeatsForBooking([]);
                fetchBooked();
              }}
              seatLabel={showBooking?.seatLabel}
              selectedDate={selectedDate}
              selectedTimeSlots={showBooking?.preselectedRange ? [[showBooking.preselectedRange[0], showBooking.preselectedRange[1]]] : selectedTimeSlots}
              preselectedRange={showBooking?.preselectedRange}
              bookingId={showBooking?.bookingId}
              isEdit={showBooking?.isEdit}
              bookingDetails={showBooking?.bookingDetails}
              selectedSeats={selectedSeatsForBooking}
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
                  const todayStr = new Date().toISOString().split('T')[0];
                  if (selectedDate !== todayStr || !(bookingData.timeslot?.timeslot?.length > 0)) {
                    toast.error('Bookings should be made for today only and timeslot must be valid.');
                    return;
                  }

                  // Multi-seat booking when there are selectedSeatsForBooking and no single seat in showBooking
                  if ((!showBooking || !showBooking.seatId) && selectedSeatsForBooking.length > 0) {
                    // Fetch seat UUIDs once
                    let allSeats = null;
                    try {
                      const res = await fetch(API_ENDPOINTS.SEATS);
                      allSeats = await res.json();
                    } catch (err) {
                      toast.error('Failed to fetch seats: ' + err.message);
                      return;
                    }
                    for (const seatLabel of selectedSeatsForBooking) {
                      const match = allSeats.seats.find(s => s.Seat_Number === seatLabel);
                      if (!match) {
                        toast.error('Seat UUID not found for ' + seatLabel);
                        continue;
                      }
                      try {
                        await insertBooking({
                          created_at: selectedDate,
                          Seat_id: match.Seat_id,
                          Timeslot: JSON.stringify({ timeslot: bookingData.timeslot.timeslot }),
                          User_id: userId,
                        });
                      } catch (err) {
                        toast.error('Failed to book ' + seatLabel + ': ' + err.message);
                      }
                    }
                    toast.success('Selected seats booked');
                    setSelectedSeatsForBooking([]);
                  } else if (showBooking && showBooking.seatId) {
                    // Existing single-seat behavior
                    const currentSeatLabel = showBooking?.seatId?.replace(/^Square-/, '');
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
                    try {
                      const res = await insertBooking({
                        created_at: selectedDate,
                        Seat_id: seatUUID,
                        Timeslot: JSON.stringify({ timeslot: bookingData.timeslot.timeslot }),
                        User_id: userId,
                      });

                      if (res && Array.isArray(res.inserted)) {
                        // Merge inserted rows into UI state
                        setBookedSeatsMap(prev => {
                          const updated = { ...(prev || {}) };
                          if (!updated[selectedDate]) updated[selectedDate] = {};
                          for (const booking of res.inserted) {
                            const seatNum = booking.Seat_Number;
                            if (!updated[selectedDate][seatNum]) updated[selectedDate][seatNum] = {};
                            let timeslotArr = [];
                            if (booking.Timeslot) {
                              if (typeof booking.Timeslot === 'string') {
                                try {
                                  const parsed = JSON.parse(booking.Timeslot);
                                  if (Array.isArray(parsed.timeslot)) timeslotArr = parsed.timeslot;
                                } catch (e) {}
                              } else if (booking.Timeslot && Array.isArray(booking.Timeslot.timeslot)) {
                                timeslotArr = booking.Timeslot.timeslot;
                              }
                            }
                            if (timeslotArr.length > 0) {
                              timeslotArr.forEach(([s, e]) => {
                                const key = `${s}_${e}`;
                                updated[selectedDate][seatNum][key] = booking;
                              });
                            } else {
                              const key = typeof booking.Timeslot === 'string' ? booking.Timeslot : JSON.stringify(booking.Timeslot);
                              updated[selectedDate][seatNum][key] = booking;
                            }
                          }
                          return updated;
                        });
                      }

                      if (res && Array.isArray(res.conflicts) && res.conflicts.length > 0) {
                        toast.warn('Some requested timeslots conflicted with existing bookings and were skipped.');
                      } else {
                        toast.success('Seat booked successfully');
                      }
                      setShowBooking(null);
                      setViewBookingDetails(null);
                      // Return the API result so the caller can await and the modal can close after UI update
                      return res;
                    } catch (err) {
                      toast.error('Failed to book seat: ' + (err?.message || err));
                      // Rethrow so parent can handle
                      throw err;
                    }
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
                (showBooking && showBooking.seatId && (() => {
                  const seatLabel = showBooking.seatId.replace(/^Square-/, '');
                  const existingKeys = Object.keys(bookedSeatsMap[selectedDate]?.[seatLabel] || {});
                  const selectedKeys = selectedTimeSlots.map(s => `${s[0]}_${s[1]}`);
                  return selectedKeys.some(k => existingKeys.includes(k));
                })())
              }
              isAlreadyBooked={
                showBooking && showBooking.seatId && (() => {
                  const seatLabel = showBooking.seatId.replace(/^Square-/, '');
                  const existingKeys = Object.keys(bookedSeatsMap[selectedDate]?.[seatLabel] || {});
                  const selectedKeys = selectedTimeSlots.map(s => `${s[0]}_${s[1]}`);
                  return selectedKeys.some(k => existingKeys.includes(k));
                })()
              }
              bookedSeatsMap={bookedSeatsMap}
              onDelete={async () => {
                // Find bookingId for this seat, date, and timeslot
                const seatLabel = showBooking?.seatId?.replace(/^Square-/, '');
                const timeslot = selectedTimeSlots[0]; // Assume single timeslot for simplicity
                const key = timeslot ? `${timeslot[0]}_${timeslot[1]}` : null;
                const bookingDetails = key ? bookedSeatsMap[selectedDate]?.[seatLabel]?.[key] : null;
                if (!bookingDetails || !bookingDetails.Booking_id) {
                  toast.error('Booking not found for cancellation.');
                  return;
                }
                try {
                  // Parse timeslot array
                  let timeslotArr = [];
                  if (bookingDetails.Timeslot) {
                    if (typeof bookingDetails.Timeslot === 'string') {
                      try {
                        const parsed = JSON.parse(bookingDetails.Timeslot);
                        if (Array.isArray(parsed.timeslot)) {
                          timeslotArr = parsed.timeslot;
                        }
                      } catch (e) {}
                    } else if (typeof bookingDetails.Timeslot === 'object' && Array.isArray(bookingDetails.Timeslot.timeslot)) {
                      timeslotArr = bookingDetails.Timeslot.timeslot;
                    }
                  }
                  // Remove the selected timeslot
                  const toDelete = selectedTimeSlots[0];
                  timeslotArr = timeslotArr.filter(([start, end]) => !(start === toDelete[0] && end === toDelete[1]));
                  // Always send the full updated array when editing
                  if (timeslotArr.length === 0) {
                    await deleteBooking(bookingDetails.Booking_id);
                    toast.success('Booking cancelled.');
                  } else {
                    const timeslotJson = JSON.stringify({ timeslot: timeslotArr });
                    await editBooking(bookingDetails.Booking_id, {
                      Seat_id: bookingDetails.Seat_id,
                      Timeslot: timeslotJson,
                      User_id: userId,
                      created_at: selectedDate,
                    });
                    toast.success('Timeslot removed from booking.');
                  }
                  setShowBooking(null);
                  fetchBooked();
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
                    padding: 0,
                    minWidth: 320,
                    maxWidth: 420,
                    width: '90vw',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: '24px 28px 12px 28px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, letterSpacing: 0.2, textAlign: 'center' }}>Booking Details</div>
                    <div style={{ marginBottom: 8, fontSize: 17, textAlign: 'center' }}><strong>Seat:</strong> <span style={{ fontWeight: 600 }}>{viewBookingDetails.seatLabel}</span></div>
                    <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 600, textAlign: 'center' }}>Time Slots:</div>
                  </div>
                  <div style={{ padding: '0 28px 0 28px', width: '100%', boxSizing: 'border-box', flex: 1, overflowY: 'auto' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
                      {(() => {
                        const DAY_START = "00:00";
                        const DAY_END = "23:59";
                        const seatLabel = viewBookingDetails.seatLabel;
                        let allBookingsForSeat = [];
                        if (bookedSeatsMap[selectedDate] && bookedSeatsMap[selectedDate][seatLabel]) {
                          const raw = bookedSeatsMap[selectedDate][seatLabel];
                          if (Array.isArray(raw)) {
                            allBookingsForSeat = raw;
                          } else if (typeof raw === 'object' && raw !== null) {
                            // Deduplicate by Booking_id because the same booking object may be
                            // referenced under multiple keys (fallback string key + start_end key).
                            const seen = new Set();
                            const uniq = [];
                            Object.values(raw).forEach(b => {
                              const id = b && (b.Booking_id || b.booking_id || b.id);
                              if (id) {
                                if (!seen.has(id)) { seen.add(id); uniq.push(b); }
                              } else {
                                // If no id, still include but avoid exact object duplicates
                                if (!uniq.includes(b)) uniq.push(b);
                              }
                            });
                            allBookingsForSeat = uniq;
                          }
                        }
                        // Debug: log all bookings for this seat/date
                        console.log('All bookings for seat', seatLabel, 'on', selectedDate, allBookingsForSeat);
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
                            bookedRanges.push({ start, end, name: booking.Name, booking });
                          });
                        });
                        bookedRanges.sort((a, b) => a.start.localeCompare(b.start));
                        let slots = [];
                        let prevEnd = DAY_START;
                        for (let b of bookedRanges) {
                          if (prevEnd < b.start) {
                            slots.push({ start: prevEnd, end: b.start, name: null });
                          }
                          slots.push({ start: b.start, end: b.end, name: b.name, booking: b.booking });
                          prevEnd = b.end;
                        }
                        if (prevEnd < DAY_END) {
                          slots.push({ start: prevEnd, end: DAY_END, name: null });
                        }
                        slots = slots.filter(s => s.start !== s.end);
                        return slots.map((range, idx) => {
                          const isCreator = range.booking && range.booking.User_id === userId;
                          return (
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
                              {/* Show edit/delete buttons only for creator */}
                              {isCreator && range.booking && (
                                <span style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, cursor: 'pointer' }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      // Open modal for editing this booking
                                      setShowBooking({
                                        seatId: viewBookingDetails.seatId,
                                        seatLabel: viewBookingDetails.seatLabel,
                                        date: selectedDate,
                                        preselectedSlot: null,
                                        preselectedRange: [range.start, range.end],
                                        bookingId: range.booking.Booking_id,
                                        isEdit: true,
                                        bookingDetails: range.booking,
                                      });
                                      setSelectedTimeSlots([[range.start, range.end]]);
                                      setViewBookingDetails(null);
                                    }}
                                  >Edit</button>
                                  <button
                                    style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 600, cursor: 'pointer' }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await deleteBooking(range.booking.Booking_id);
                                        toast.success('Booking deleted.');
                                        fetchBooked();
                                        setViewBookingDetails(null);
                                      } catch (err) {
                                        toast.error('Failed to delete booking: ' + err.message);
                                      }
                                    }}
                                  >Delete</button>
                                </span>
                              )}
                            </li>
                          );
                        });
                      })()}
                  </ul>
                </div>
                <div style={{ padding: '16px 28px', width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center' }}>
                  <button
                    style={{
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