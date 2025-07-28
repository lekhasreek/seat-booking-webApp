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

  // --- New logic for booking status ---
  const seatBookings = bookedSeatsMap[selectedDate]?.[seatLabel] || {};
  const timeslots = ['morning', 'afternoon', 'evening'];
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
          ? '#2563eb' // blue fill for selected
          : isFullyBooked
          ? '#d1d5db' // gray fill for fully booked
          : isPartiallyBooked
          ? '#fff4e5' // light orange
          : isAvailable
          ? '#e6fbe8' // light green
          : '#fff',
        border: isActive
          ? '2.5px solid #2563eb' // blue border for selected
          : isFullyBooked
          ? '2.5px solid #888' // gray border for fully booked
          : isAvailable
          ? '2.5px solid #22c55e' // green
          : isPartiallyBooked
          ? '2.5px solid #f59e42' // orange
          : '2px solid #888', // fallback gray
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
          setShowBooking({
            seatId: overlay.id,
            seatLabel: seatLabel,
            date: selectedDate,
          });
        } else {
          setViewBookingDetails({
            seatId: overlay.id,
            seatLabel: seatLabel,
            bookingDetailsForSeat: seatBookings,
          });
        }
      }}
      onMouseEnter={e => {
        if (!isAvailable) {
          setHoverBookingDetails({
            seatId: overlay.id,
            seatLabel: seatLabel,
            details: {
              name: Object.values(seatBookings)[0]?.Name || 'N/A',
              timeSlotsStatus: timeslots.map(slot => ({
                slot: slot,
                isBooked: !!seatBookings[slot],
                bookedBy: seatBookings[slot]?.Name || '',
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
      // Store actual booking object under Seat_Number and Timeslot
      if (!newBookedSeatDataForDate[booking.Seat_Number]) { // Changed: Use Seat_Number as key here
        newBookedSeatDataForDate[booking.Seat_Number] = {};
      }
      newBookedSeatDataForDate[booking.Seat_Number][booking.Timeslot] = booking; // Changed: Use Seat_Number here
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
        // Force re-fetch to ensure we have the latest data
        fetchBooked();
        
        // Also update local state immediately for instant UI update
        setBookedSeatsMap(prev => {
          const updated = { ...prev };
          
          // Ensure section and date exist
          if (!updated[selectedDate]) updated[selectedDate] = {};
          
          const { eventType, seatNumber, booking } = update;
          
          if (eventType === 'DELETE') {
            // Remove the booking
            if (updated[selectedDate][seatNumber] && booking?.Timeslot) {
              delete updated[selectedDate][seatNumber][booking.Timeslot];
              
              // Clean up empty objects
              if (Object.keys(updated[selectedDate][seatNumber]).length === 0) {
                delete updated[selectedDate][seatNumber];
              }
            }
          } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
            // Add or update the booking
            if (!updated[selectedDate][seatNumber]) {
              updated[selectedDate][seatNumber] = {};
            }
            updated[selectedDate][seatNumber][booking.Timeslot] = booking;
          }
          
          console.log('📊 Updated booking state:', updated[selectedDate]);
          return updated;
        });
      });
      
      activeSubscriptionRef.current = subscriptionKey;
    };
    
    setupSubscription();
    
    // Set up aggressive refresh for instant updates (every 2 seconds)
    const refreshInterval = setInterval(() => {
      fetchBooked();
    }, 2000);
    
    // Also set up focus refresh - when user switches back to tab
    const handleFocus = () => {
      fetchBooked();
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBooked();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      if (activeSubscriptionRef.current) {
        unsubscribeFromBookings(activeSubscriptionRef.current);
        activeSubscriptionRef.current = null;
      }
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }
}, [sectionId, selectedDate, subscribeToBookings, unsubscribeFromBookings]);

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
          const seatBoxes = extractSeatsFromSVG(svgText);
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
                const todayStr = new Date().toISOString().split('T')[0];
                if (
                  showBooking &&
                  showBooking.seatId &&
                  selectedDate >= todayStr &&
                  selectedTimeSlots.length > 0 &&
                  !Object.keys(bookedSeatsMap[selectedDate]?.[currentSeatLabel] || {}).some(slot => selectedTimeSlots.includes(slot))
                ) {
                  await handleBook(showBooking.seatId, selectedDate);
                } else {
                  toast.error('Cannot book seats for past dates or selected timeslots are already booked.');
                }
              }}
              isBookDisabled={
                selectedDate < new Date().toISOString().split('T')[0] ||
                selectedTimeSlots.length === 0 ||
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
                  // Immediately refresh booking data
                  fetchBooked();
                } catch (err) {
                  toast.error('Failed to cancel booking: ' + err.message);
                }
              }}
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
                    {['morning', 'afternoon', 'evening'].map(slot => {
                      const booking = viewBookingDetails.bookingDetailsForSeat[slot];
                      const isAvailable = !booking;
                      return (
                        <li key={slot} style={{
                          marginBottom: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: isAvailable ? 'pointer' : 'default',
                          padding: '0 0 0 2px',
                          minHeight: 32,
                        }}
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
                          <span style={{ textTransform: 'capitalize', fontSize: 15 }}>{slot}</span>
                          <span style={{
                            fontWeight: 600,
                            color: booking ? '#e11d48' : '#059669',
                            textDecoration: isAvailable ? 'underline' : 'none',
                            fontSize: 15,
                            marginLeft: 8,
                            marginRight: booking ? 10 : 0,
                          }}>
                            {booking ? `Booked by ${booking.Name || 'N/A'}` : 'Available'}
                          </span>
                          {/* Delete button for booked slots only */}
                          {booking && booking.Booking_id && (
                            <span style={{ display: 'flex', gap: '8px', marginLeft: 8 }}>
                              <button
                                title="Delete booking"
                                style={{
                                  background: '#e11d48',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  padding: '3px 16px',
                                  fontWeight: 700,
                                  letterSpacing: 0.5,
                                  boxShadow: '0 2px 8px #e11d4822',
                                  transition: 'background 0.15s',
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this booking?')) {
                                    deleteBooking(booking.Booking_id)
                                      .then(() => {
                                        toast.success('Booking deleted.');
                                        setViewBookingDetails(null);
                                        // Auto-refresh seat map
                                        fetchBooked();
                                      })
                                      .catch(err => toast.error('Failed to delete booking: ' + err.message));
                                  }
                                }}
                              >Delete</button>
                            </span>
                          )}
                        </li>
                      );
                    })}
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