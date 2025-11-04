import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './AdminDashboard.css';

const HomeIcon = ({ selected }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={selected ? "#2563eb" : "#64748b"} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6"/></svg>
);
  const OfficeSeatIcon = ({ selected }) => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={selected ? "#2563eb" : "#64748b"} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
  );
  const ParkingIcon = ({ selected }) => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={selected ? "#2563eb" : "#64748b"} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
  );
  const UsersIcon = ({ selected }) => (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={selected ? "#2563eb" : "#64748b"} strokeWidth="2">
      <circle cx="12" cy="8" r="4" strokeWidth="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" strokeWidth="2" />
    </svg>
  );
const BookingsIcon = ({ selected }) => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={selected ? "#2563eb" : "#64748b"} strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M3 11h18"/></svg>
);

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0];
  return parts[0][0] + parts[1][0];
}

const AdminDashboard = ({ onBookingsSelect }) => {
  // Parking booking modals state
  const [editParkingBooking, setEditParkingBooking] = React.useState(null);
  const [deleteParkingBookingId, setDeleteParkingBookingId] = React.useState(null);
  const [seatBookings, setSeatBookings] = useState([]);
  const [editBooking, setEditBooking] = useState(null); // Booking object for edit modal
  const [deleteBookingId, setDeleteBookingId] = useState(null); // Booking id for delete modal
  const [parkingBookings, setParkingBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(null); // For modal
  const [selectedMenu, setSelectedMenu] = useState('home');
  // Filter states
  // Set default date to today in YYYY-MM-DD format
  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [filterUser, setFilterUser] = useState("");
  const [filterUsersBooked, setFilterUsersBooked] = useState("");
  const [filterSeatsBooked, setFilterSeatsBooked] = useState("");
  const [filterSeatsAvailable, setFilterSeatsAvailable] = useState("");
  const [filterSeatsNotBooked, setFilterSeatsNotBooked] = useState("");
  // For obookings endpoint loading
  const [obookingsLoading, setObookingsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(null); // user object
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const sidebarRef = useRef(null);

  // Fetch all users and parking bookings on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch all users
      const { data: usersData } = await supabase
        .from('Users')
        .select('*');
      setUsers(usersData || []);
      // Fetch parking bookings
      const { data: parkingData } = await supabase
        .from('parking_bookings')
        .select('*');
      setParkingBookings(parkingData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Fetch users when 'users' menu is selected
  useEffect(() => {
    if (selectedMenu === 'users') {
      const fetchUsers = async () => {
        setLoading(true);
        const { data: usersData } = await supabase
          .from('Users')
          .select('*');
        setUsers(usersData || []);
        setLoading(false);
      };
      fetchUsers();
    }
  }, [selectedMenu]);

  // Fetch seat bookings when 'obookings' menu is selected
  // Fetch parking bookings when 'parkbookings' menu is selected
  useEffect(() => {
    if (selectedMenu === 'parkbookings') {
      const fetchParkingBookings = async () => {
        setLoading(true);
        // Fetch all users
        const { data: usersData } = await supabase.from('Users').select('*');
        setUsers(usersData || []);
        // Fetch all parking bookings
        const { data: parkingData } = await supabase.from('parking_bookings').select('*');
        // Map bookings to user details
        const bookingsWithUser = (parkingData || []).map(b => {
          const user = (usersData || []).find(u => u.User_id === b.booked_by_user_id) || {};
          // Format booking date
          const bookingDate = b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '';
          // Format timeslot
          let timeslot = '';
          if (b.start_time && b.end_time) {
            const start = new Date(b.start_time);
            const end = new Date(b.end_time);
            const pad = n => String(n).padStart(2, '0');
            const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
            const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
            timeslot = `${startStr} - ${endStr}`;
          }
          return {
            ...b,
            userName: user.Name || 'Unknown',
            userEmail: user.email || '',
            bookingDate,
            timeslot,
            slot: b.slot_id,
            vehicle_type: b.Vehicle_Type || 'NA',
            vehicle_number: b.vehicle_number || 'NA',
          };
        });
        setParkingBookings(bookingsWithUser);
        setLoading(false);
      };
      fetchParkingBookings();
    }
  }, [selectedMenu]);
  useEffect(() => {
    if (selectedMenu === 'obookings' || selectedMenu === 'home') {
      const fetchObookings = async () => {
        setObookingsLoading(true);
        // Fetch all users
        const { data: usersData } = await supabase.from('Users').select('*');
        // Fetch all seat bookings
        const { data: seatData } = await supabase.from('Bookings').select('*');
        // Transform seat bookings for display
        const transformedSeatBookings = (seatData || []).map(b => {
          // Find user info
          const user = (usersData || []).find(u => u.User_id === b.User_id) || {};
          // Format date to UK date (DD/MM/YYYY) for analytics
          const createdAt = b.created_at ? new Date(b.created_at) : null;
          const bookingDate = createdAt ? createdAt.toLocaleDateString('en-GB') : '';
          // Parse timeslot
          let bookingTime = '';
          if (b.Timeslot) {
            try {
              const timeslotObj = typeof b.Timeslot === 'string' ? JSON.parse(b.Timeslot) : b.Timeslot;
              if (timeslotObj && timeslotObj.timeslot && timeslotObj.timeslot.length > 0) {
                bookingTime = timeslotObj.timeslot.map(t => t.join(' - ')).join(', ');
              }
            } catch (e) {
              bookingTime = '';
            }
          }
          // Section and Seat from Seat_Number
          let section = '';
          let seat = '';
          if (b.Seat_Number) {
            section = b.Seat_Number[0];
            seat = b.Seat_Number.slice(1);
          }
          return {
            id: b.Booking_id,
            guest: user.Name || '',
            guestEmail: user.email || '',
            bookingDate,
            bookingTime,
            section,
            seat,
          };
        });
        setSeatBookings(transformedSeatBookings);
        setObookingsLoading(false);
      };
      fetchObookings();
    }
  }, [selectedMenu]);

  // Helper to get user info by id

  // Edit booking
  const handleEditBooking = async (booking) => {
    // Prepare update payload for Bookings table
    // Convert bookingDate (YYYY-MM-DD) to JS Date for created_at
    const [year, month, day] = booking.bookingDate.split('-');
    const newCreatedAt = new Date(year, month - 1, day).toISOString();
    const updatePayload = {
      Seat_Number: booking.section + booking.seat,
      Timeslot: JSON.stringify({ timeslot: booking.bookingTime.split(',').map(s => s.split(' - ')) }),
      created_at: newCreatedAt,
      // Add other fields as needed
    };
    const { error } = await supabase.from('Bookings').update(updatePayload).eq('Booking_id', booking.id);
    if (error) {
      alert('Failed to update booking: ' + error.message);
      return;
    }
    // Update seatBookings state immediately
    setSeatBookings(prev => prev.map(b => b.id === booking.id ? {
      ...b,
      section: booking.section,
      seat: booking.seat,
      bookingDate: booking.bookingDate.split('-').reverse().join('-'),
      bookingTime: booking.bookingTime
    } : b));
    setEditBooking(null);
  };

  // Delete booking
  const handleDeleteBooking = async (bookingId) => {
    const { error } = await supabase.from('Bookings').delete().eq('Booking_id', bookingId);
    if (error) {
      alert('Failed to delete booking: ' + error.message);
      return;
    }
    setDeleteBookingId(null);
    setSeatBookings(prev => prev.filter(b => b.id !== bookingId)); // Remove from state immediately
  };
  const handleAddUser = async (user) => {
    setLoading(true);
    const { error } = await supabase.from('Users').insert([user]);
    if (error) {
      alert('Failed to add user: ' + error.message);
      setLoading(false);
      return;
    }
    const { data: usersData } = await supabase
      .from('Users')
      .select('*');
    setUsers(usersData || []);
    setShowAddUser(false);
    setLoading(false);
  };

  // Edit user
  const handleEditUser = async (user) => {
    setLoading(true);
    const { error } = await supabase.from('Users').update(user).eq('User_id', user.User_id);
    if (error) {
      alert('Failed to update user: ' + error.message);
      setLoading(false);
      return;
    }
    const { data: usersData } = await supabase
      .from('Users')
      .select('*');
    setUsers(usersData || []);
    setShowEditUser(null);
    setLoading(false);
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    setLoading(true);
    const { error } = await supabase.from('Users').delete().eq('User_id', userId);
    if (error) {
      alert('Failed to delete user: ' + error.message);
      setLoading(false);
      return;
    }
    const { data: usersData } = await supabase
      .from('Users')
      .select('*');
    setUsers(usersData || []);
    setDeleteUserId(null);
    setLoading(false);
  };
  const getUser = (userId) => users.find(u => u.User_id === userId) || {};

  return (
  <div style={{position:'relative', minHeight:'100vh', margin:0, padding:0, boxSizing:'border-box', width:'100vw'}}>
      {/* Burger Button for Sidebar */}
      <button
        style={{position:'fixed',top:20,left:20,zIndex:100,background:'#2563eb',color:'#fff',border:'none',borderRadius:'8px',padding:'10px',cursor:'pointer',boxShadow:'0 2px 8px #2563eb22'}}
        onClick={()=>setSidebarOpen(v=>!v)}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        &#9776;
      </button>
      {/* Sidebar Navigation */}
      {sidebarOpen && (
  <nav ref={sidebarRef} style={{position:'absolute', top:0, left:0, height:'100vh', width:'220px', background:'#fff', borderRight:'1px solid #e5e7eb', display:'flex', flexDirection:'column', padding:'2rem 0', transition:'all 0.3s', boxSizing:'border-box', margin:0, zIndex:10}}>
          <div style={{fontWeight:700, fontSize:'1.3rem', color:'#2563eb', textAlign:'center', marginBottom:'2.5rem', letterSpacing:'-1px'}}>Admin</div>
          <button
            className={selectedMenu==='home' ? 'admin-nav-btn selected' : 'admin-nav-btn'}
            style={{display:'flex',alignItems:'center',gap:'0.8rem',padding:'0.7rem 1.5rem',background:selectedMenu==='home'?'#eff6ff':'none',border:'none',outline:'none',cursor:'pointer',color:selectedMenu==='home'?'#2563eb':'#334155',fontWeight:600,fontSize:'1rem',marginBottom:'0.5rem',width:'100%',borderRight:selectedMenu==='home'?'3px solid #2563eb':'3px solid transparent'}}
            onClick={()=>setSelectedMenu('home')}
          >
            <HomeIcon selected={selectedMenu==='home'} /> Home
          </button>
          <button
            className={selectedMenu==='obookings' ? 'admin-nav-btn selected' : 'admin-nav-btn'}
            style={{display:'flex',alignItems:'center',gap:'0.8rem',padding:'0.7rem 1.5rem',background:selectedMenu==='obookings'?'#eff6ff':'none',border:'none',outline:'none',cursor:'pointer',color:selectedMenu==='obookings'?'#2563eb':'#334155',fontWeight:600,fontSize:'1rem',marginBottom:'0.5rem',width:'100%',borderRight:selectedMenu==='obookings'?'3px solid #2563eb':'3px solid transparent'}}
            onClick={()=>setSelectedMenu('obookings')}
          >
            <OfficeSeatIcon selected={selectedMenu==='obookings'} /> Office Seat 
          </button>
          <button
            className={selectedMenu==='parkbookings' ? 'admin-nav-btn selected' : 'admin-nav-btn'}
            style={{display:'flex',alignItems:'center',gap:'0.8rem',padding:'0.7rem 1.5rem',background:selectedMenu==='parkbookings'?'#eff6ff':'none',border:'none',outline:'none',cursor:'pointer',color:selectedMenu==='parkbookings'?'#2563eb':'#334155',fontWeight:600,fontSize:'1rem',marginBottom:'0.5rem',width:'100%',borderRight:selectedMenu==='parkbookings'?'3px solid #2563eb':'3px solid transparent'}}
            onClick={()=>setSelectedMenu('parkbookings')}
          >
            <ParkingIcon selected={selectedMenu==='parkbookings'} /> Parking Slot
          </button>
          <button
            className={selectedMenu==='users' ? 'admin-nav-btn selected' : 'admin-nav-btn'}
            style={{display:'flex',alignItems:'center',gap:'0.8rem',padding:'0.7rem 1.5rem',background:selectedMenu==='users'?'#eff6ff':'none',border:'none',outline:'none',cursor:'pointer',color:selectedMenu==='users'?'#2563eb':'#334155',fontWeight:600,fontSize:'1rem',marginBottom:'0.5rem',width:'100%',borderRight:selectedMenu==='users'?'3px solid #2563eb':'3px solid transparent'}}
            onClick={()=>setSelectedMenu('users')}
          >
            <UsersIcon selected={selectedMenu==='users'} /> Users
          </button>
        </nav>
      )}
      {/* Main Content */}
  <div style={{position:'absolute', top:0, left: sidebarOpen ? '220px' : '0', width: sidebarOpen ? 'calc(100vw - 220px)' : '100vw', minHeight:'100vh', transition:'left 0.3s, width 0.3s', boxSizing:'border-box', paddingLeft:0}}>
  {selectedMenu==='home' && (
    <div className="admin-dashboard-container">
      <h1 className="admin-dashboard-title">Admin Dashboard</h1>
      {/* Filter Bar */}
      <div style={{display:'flex',gap:'1.5rem',marginBottom:'2rem',flexWrap:'wrap',alignItems:'center'}}>
        <div>
          <label style={{fontWeight:500,marginRight:'0.5rem'}}>Date</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{border:'1px solid #e5e7eb',borderRadius:'6px',padding:'4px 8px'}} />
        </div>
      </div>
      {/* Analytics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
          marginBottom: '2.5rem',
          width: '100%',
        }}
      >
        {/* Users Booked Seats Card */}
        <div style={{
          background: '#fff',
          borderRadius: '18px',
          boxShadow: '0 4px 24px #33415511',
          padding: '2rem 2.2rem',
          minWidth: '0',
          width: '100%',
          height: '170px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}>
          <div style={{fontWeight:600,fontSize:'1.08rem',color:'#334155',marginBottom:'0.7rem'}}>Users Booked Seats</div>
          <div style={{fontWeight:700,fontSize:'2.1rem',color:'#2563eb',marginBottom:'0.5rem'}}>{(() => {
            if (loading) return '...';
            if (!seatBookings || seatBookings.length === 0) return 0;
            let dateToCheck;
            if (filterDate) {
              const [year, month, day] = filterDate.split('-').map(Number);
              dateToCheck = { day, month, year };
            } else {
              const now = new Date();
              dateToCheck = { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
            }
            const usersBooked = new Set(
              seatBookings.filter(b => {
                if (!b.bookingDate) return false;
                const [day, month, year] = b.bookingDate.split(/[\/\-]/).map(Number);
                return day === dateToCheck.day && month === dateToCheck.month && year === dateToCheck.year;
              }).map(b => b.guest)
            );
            return usersBooked.size;
          })()}</div>
          <div style={{display:'flex',alignItems:'center',gap:'0.7rem',marginTop:'0.5rem'}}>
            <span style={{fontSize:'1.7rem',color:'#059669'}}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2"><rect x="4" y="8" width="16" height="10" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M8 8V6a4 4 0 018 0v2"/></svg>
            </span>
            <span style={{fontWeight:500,color:'#64748b'}}>Total Users: {users ? users.length : 0}</span>
          </div>

        </div>
        {/* 2 Wheeler Parking Card */}
        <div style={{background:'#fff',borderRadius:'18px',boxShadow:'0 4px 24px #33415511',padding:'2rem 2.2rem',minWidth:'220px',flex:'1',display:'flex',flexDirection:'column',alignItems:'flex-start'}}>
          <div style={{fontWeight:600,fontSize:'1.08rem',color:'#334155',marginBottom:'0.7rem'}}>2 Wheeler</div>
          <div style={{fontWeight:700,fontSize:'2.1rem',color:'#2563eb',marginBottom:'0.5rem'}}>{(() => {
            const totalSlots = 10;
            if (loading) return '...';
            if (!parkingBookings || parkingBookings.length === 0) return `0/${totalSlots}`;
            let dateToCheck;
            if (filterDate) {
              const [year, month, day] = filterDate.split('-').map(Number);
              dateToCheck = { day, month, year };
            } else {
              const now = new Date();
              dateToCheck = { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
            }
            const booked = parkingBookings.filter(b => {
              if (!b.bookingDate) return false;
              // Try to parse bookingDate as ISO or as dd-mm-yyyy
              let bookingDateObj;
              if (b.bookingDate.includes('T')) {
                bookingDateObj = new Date(b.bookingDate);
              } else {
                const [day, month, year] = b.bookingDate.split(/[\/\-]/).map(Number);
                bookingDateObj = new Date(year, month - 1, day);
              }
              return bookingDateObj.getDate() === dateToCheck.day &&
                bookingDateObj.getMonth() + 1 === dateToCheck.month &&
                bookingDateObj.getFullYear() === dateToCheck.year &&
                (b.vehicle_type === 2 || b.vehicle_type === '2');
            });
            // Get unique slot numbers
            const slotValues = booked.map(b => b.slot_number || b.slot || b.id).filter(Boolean);
            const uniqueSlots = Array.from(new Set(slotValues));
            return `${uniqueSlots.length}/${totalSlots}`;
          })()}</div>
          <div style={{display:'flex',alignItems:'center',gap:'0.7rem',marginTop:'0.5rem'}}>
            <span style={{fontSize:'1.7rem',color:'#059669'}}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2"><rect x="4" y="8" width="16" height="10" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M8 8V6a4 4 0 018 0v2"/></svg>
            </span>
            <span style={{fontWeight:500,color:'#64748b'}}>Total Slots: 10</span>
          </div>
        </div>
        {/* 4 Wheeler Parking Card */}
        <div style={{background:'#fff',borderRadius:'18px',boxShadow:'0 4px 24px #33415511',padding:'2rem 2.2rem',minWidth:'220px',flex:'1',display:'flex',flexDirection:'column',alignItems:'flex-start'}}>
          <div style={{fontWeight:600,fontSize:'1.08rem',color:'#334155',marginBottom:'0.7rem'}}>4 Wheeler</div>
          <div style={{fontWeight:700,fontSize:'2.1rem',color:'#2563eb',marginBottom:'0.5rem'}}>{(() => {
            const totalSlots = 5;
            if (loading) return '...';
            if (!parkingBookings || parkingBookings.length === 0) return `0/${totalSlots}`;
            let dateToCheck;
            if (filterDate) {
              const [year, month, day] = filterDate.split('-').map(Number);
              dateToCheck = { day, month, year };
            } else {
              const now = new Date();
              dateToCheck = { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
            }
            const booked = parkingBookings.filter(b => {
              if (!b.bookingDate) return false;
              let bookingDateObj;
              if (b.bookingDate.includes('T')) {
                bookingDateObj = new Date(b.bookingDate);
              } else {
                const [day, month, year] = b.bookingDate.split(/[\/\-]/).map(Number);
                bookingDateObj = new Date(year, month - 1, day);
              }
              return bookingDateObj.getDate() === dateToCheck.day &&
                bookingDateObj.getMonth() + 1 === dateToCheck.month &&
                bookingDateObj.getFullYear() === dateToCheck.year &&
                (b.vehicle_type === 4 || b.vehicle_type === '4');
            });
            const slotValues = booked.map(b => b.slot_number || b.slot || b.id).filter(Boolean);
            const uniqueSlots = Array.from(new Set(slotValues));
            return `${uniqueSlots.length}/${totalSlots}`;
          })()}</div>
          <div style={{display:'flex',alignItems:'center',gap:'0.7rem',marginTop:'0.5rem'}}>
            <span style={{fontSize:'1.7rem',color:'#2563eb'}}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2"><rect x="6" y="10" width="12" height="8" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 10V8a3 3 0 016 0v2"/></svg>
            </span>
            <span style={{fontWeight:500,color:'#64748b'}}>Total Slots: 5</span>
          </div>
        </div>
        {/* Seats Booked Card */}
        <div style={{background:'#fff',borderRadius:'18px',boxShadow:'0 4px 24px #33415511',padding:'2rem 2.2rem',minWidth:'220px',flex:'1',display:'flex',flexDirection:'column',alignItems:'flex-start'}}>
          <div style={{fontWeight:600,fontSize:'1.08rem',color:'#334155',marginBottom:'0.7rem'}}>Seats Booked</div>
          <div style={{fontWeight:700,fontSize:'2.1rem',color:'#2563eb',marginBottom:'0.5rem'}}>{(() => {
            const totalSeats = 74;
            if (loading) return '...';
            if (!seatBookings || seatBookings.length === 0) return 0;
            let dateToCheck;
            if (filterDate) {
              const [year, month, day] = filterDate.split('-').map(Number);
              dateToCheck = { day, month, year };
            } else {
              const now = new Date();
              dateToCheck = { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
            }
            const bookedSeats = new Set();
            seatBookings.forEach(b => {
              if (!b.bookingDate) return;
              const [day, month, year] = b.bookingDate.split(/[\/\-]/).map(Number);
              if (day === dateToCheck.day && month === dateToCheck.month && year === dateToCheck.year) {
                bookedSeats.add(b.seat);
              }
            });
            return bookedSeats.size;
          })()}</div>
          <div style={{display:'flex',alignItems:'center',gap:'0.7rem',marginTop:'0.5rem'}}>
            <span style={{fontSize:'1.7rem',color:'#f59e42'}}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#f59e42" strokeWidth="2"><rect x="6" y="10" width="12" height="8" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 10V8a3 3 0 016 0v2"/></svg>
            </span>
            <span style={{fontWeight:500,color:'#64748b'}}>Total Seats: 74</span>
          </div>
        </div>
        {/* Seats Available Card */}
        <div style={{background:'#fff',borderRadius:'18px',boxShadow:'0 4px 24px #33415511',padding:'2rem 2.2rem',minWidth:'220px',flex:'1',display:'flex',flexDirection:'column',alignItems:'flex-start'}}>
          <div style={{fontWeight:600,fontSize:'1.08rem',color:'#334155',marginBottom:'0.7rem'}}>Seats Available</div>
          <div style={{fontWeight:700,fontSize:'2.1rem',color:'#059669',marginBottom:'0.5rem'}}>{(() => {
            const totalSeats = 74;
            if (loading) return '...';
            if (!seatBookings || seatBookings.length === 0) return totalSeats;
            let dateToCheck;
            if (filterDate) {
              const [year, month, day] = filterDate.split('-').map(Number);
              dateToCheck = { day, month, year };
            } else {
              const now = new Date();
              dateToCheck = { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
            }
            const bookedSeats = new Set();
            seatBookings.forEach(b => {
              if (!b.bookingDate) return;
              const [day, month, year] = b.bookingDate.split(/[\/\-]/).map(Number);
              if (day === dateToCheck.day && month === dateToCheck.month && year === dateToCheck.year) {
                bookedSeats.add(b.seat);
              }
            });
            return totalSeats - bookedSeats.size;
          })()}</div>
          <div style={{display:'flex',alignItems:'center',gap:'0.7rem',marginTop:'0.5rem'}}>
            <span style={{fontSize:'1.7rem',color:'#2563eb'}}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2"><rect x="6" y="10" width="12" height="8" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 10V8a3 3 0 016 0v2"/></svg>
            </span>
            <span style={{fontWeight:500,color:'#64748b'}}>Total Seats: 74</span>
          </div>
        </div>
        {/* Seats Not Booked Card */}
        
      </div>
      {/* Table removed from home page as requested */}
    </div>
  )}

  {selectedMenu==='users' && (
    <div className="admin-dashboard-container">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.2rem'}}>
        <h2 className="admin-dashboard-title" style={{fontSize: '1.5rem', fontWeight: 700, color: '#334155', marginBottom:0}}>Users</h2>
        <button
          onClick={() => {
            // CSV download logic for users
            const headers = ['User', 'Email', 'Role'];
            let csvContent = '';
            csvContent += headers.join(',') + '\n';
            users.forEach(u => {
              csvContent += [u.Name, u.email, u.Role]
                .map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
            });
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'users.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          style={{
            background: 'linear-gradient(90deg,#2563eb 0%,#1e40af 100%)',
            color:'#fff',
            fontWeight:600,
            fontSize:'1.08rem',
            border:'none',
            borderRadius:'12px',
            padding:'0.85rem 2.2rem',
            cursor:'pointer',
            boxShadow:'0 4px 16px #2563eb33',
            transition:'all 0.18s cubic-bezier(.4,0,.2,1)',
            position:'relative',
            overflow:'hidden',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg,#1e40af 0%,#2563eb 100%)'}
          onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg,#2563eb 0%,#1e40af 100%)'}
        >
          <span style={{display:'inline-flex',alignItems:'center',gap:'0.7em'}}>
            <span style={{background:'#fff',borderRadius:'50%',padding:'0.32em',display:'inline-flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px #2563eb22'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2" style={{verticalAlign:'middle'}}>
                <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2" fill="#fff" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v6m0 0l-3-3m3 3l3-3" />
              </svg>
            </span>
            <span style={{fontWeight:700,letterSpacing:'0.5px'}}>Download</span>
          </span>
        </button>
      </div>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <section>
            <button className="admin-add-btn" style={{marginBottom:'1rem'}} onClick={()=>setShowAddUser(true)}>Add User</button>
            <div className="admin-table-wrapper" style={{overflowX:'auto', maxWidth:'100vw', paddingBottom:'1rem'}}>
              <table className="admin-table" style={{minWidth:'900px'}}>
                <thead>
                  <tr>
                    <th style={{whiteSpace:'nowrap'}}>User</th>
                    <th style={{whiteSpace:'nowrap'}}>Email</th>
                    <th style={{whiteSpace:'nowrap'}}>Role</th>
                    <th style={{whiteSpace:'nowrap'}}>Vehicle Type</th>
                    <th style={{whiteSpace:'nowrap'}}>Vehicle Number</th>
                    <th style={{whiteSpace:'nowrap'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} style={{textAlign:'center', color:'#94a3b8', padding:'2rem'}}>No users found.</td></tr>
                  ) : users.map(u => (
                    <tr key={u.User_id}>
                      <td style={{display:'flex',alignItems:'center',gap:'0.7rem',minWidth:'180px'}}>
                        <span className="admin-avatar" style={{flexShrink:0}}>{getInitials(u.Name)}</span>
                        <span style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.Name}</span>
                      </td>
                      <td style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'220px'}}>{u.email}</td>
                      <td style={{whiteSpace:'nowrap'}}>{u.Role}</td>
                      <td style={{whiteSpace:'nowrap'}}>{u.Vehicle_Type && String(u.Vehicle_Type).trim() !== '' ? u.Vehicle_Type : 'NA'}</td>
                      <td style={{whiteSpace:'nowrap'}}>{u.Vehicle_Number && String(u.Vehicle_Number).trim() !== '' ? u.Vehicle_Number : 'NA'}</td>
                      <td style={{minWidth:'140px',whiteSpace:'nowrap'}}>
                        <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                          <button className="admin-edit-btn" style={{marginRight:0,marginBottom:'0.3rem',minWidth:'60px'}} onClick={()=>setShowEditUser(u)}>Edit</button>
                          <button className="admin-delete-btn" style={{minWidth:'60px'}} onClick={()=>setDeleteUserId(u.User_id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Add User Modal */}
            {showAddUser && (
              <div className="admin-modal-bg">
                <div className="admin-modal" style={{maxWidth:'400px', padding:'2rem 2.2rem'}}>
                  <h3 className="admin-modal-title">Add User</h3>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const form = e.target;
                    handleAddUser({
                      Name: form.Name.value,
                      email: form.email.value,
                      Vehicle_Type: (form.Vehicle_Type.value === 'NA' || form.Vehicle_Type.value === '') ? null : form.Vehicle_Type.value,
                      Vehicle_Number: (form.Vehicle_Type.value === 'NA' || form.Vehicle_Type.value === '') ? '' : form.Vehicle_Number.value,
                      Role: form.Role.value
                    });
                  }}>
                    <input name="Name" placeholder="Name" required />
                    <input name="email" placeholder="Email" required type="email" />
                    <div style={{display:'flex',gap:'1rem',alignItems:'center',marginBottom:'0.7rem'}}>
                      <div style={{flex:1}}>
                        <label style={{fontWeight:'200',fontSize:'0.9rem',marginBottom:'0.2rem',display:'block'}}>Vehicle Type</label>
                        <select name="Vehicle_Type" id="addVehicleType" style={{width:'100%',padding:'0.4em',borderRadius:'5px',border:'1px solid #cbd5e1'}} onChange={e => {
                          const vehicleType = e.target.value;
                          const vehicleNumberDiv = document.getElementById('addVehicleNumberDiv');
                          if (vehicleNumberDiv) {
                            vehicleNumberDiv.style.display = (vehicleType === '2' || vehicleType === '4') ? 'block' : 'none';
                          }
                        }}>
                          <option value="">Select</option>
                          <option value="2">2 wheeler</option>
                          <option value="4">4 wheeler</option>
                          <option value="NA">NA</option>
                        </select>
                      </div>
                      <div style={{flex:1,display:'none'}} id="addVehicleNumberDiv">
                        <label style={{fontWeight:'200',fontSize:'0.9rem', marginBottom:'0.2rem',display:'block'}}>Vehicle Number</label>
                        <input name="Vehicle_Number" placeholder="Vehicle Number" style={{width:'100%',padding:'0.4em',borderRadius:'5px',border:'1px solid #cbd5e1'}} />
                      </div>
                    </div>
                    <select name="Role" required>
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                      <option value="Lead">Lead</option>
                    </select>
                    <div className="admin-modal-actions">
                      <button className="primary-btn" type="submit">Add</button>
                      <button className="cancel-btn" type="button" onClick={()=>setShowAddUser(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {/* Edit User Modal */}
            {showEditUser && (
              <div className="admin-modal-bg">
                <div className="admin-modal">
                  <h3 className="admin-modal-title">Edit User</h3>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const form = e.target;
                    handleEditUser({
                      User_id: showEditUser.User_id,
                      Name: form.Name.value,
                      email: form.email.value,
                      Role: form.Role.value,
                      Vehicle_Type: (form.Vehicle_Type.value === 'NA' || form.Vehicle_Type.value === '') ? null : form.Vehicle_Type.value,
                      Vehicle_Number: form.Vehicle_Type.value === 'NA' ? '' : form.Vehicle_Number.value
                    });
                  }}>
                    <div style={{marginBottom:'0.4rem'}}>
                      <label htmlFor="editUserName" style={{display:'block', fontWeight:600, marginBottom:'0.15rem', color:'#334155', fontSize:'0.97em'}}>Name</label>
                      <input id="editUserName" name="Name" defaultValue={showEditUser.Name} required style={{width:'100%',padding:'0.35em',borderRadius:'5px',border:'1px solid #cbd5e1', fontSize:'0.97em'}} />
                    </div>
                    <div style={{marginBottom:'0.4rem'}}>
                      <label htmlFor="editUserEmail" style={{display:'block', fontWeight:600, marginBottom:'0.15rem', color:'#334155', fontSize:'0.97em'}}>Email</label>
                      <input id="editUserEmail" name="email" defaultValue={showEditUser.email} required type="email" style={{width:'100%',padding:'0.35em',borderRadius:'5px',border:'1px solid #cbd5e1', fontSize:'0.97em'}} />
                    </div>
                    <div style={{display:'flex',gap:'1rem',alignItems:'center',marginBottom:'0.7rem'}}>
                      <div style={{flex:1}}>
                        <label style={{fontWeight:500,marginBottom:'0.2rem',display:'block'}}>Vehicle Type</label>
                        <select name="Vehicle_Type" id="editVehicleType" defaultValue={showEditUser.Vehicle_Type || ''} style={{width:'100%',padding:'0.4em',borderRadius:'5px',border:'1px solid #cbd5e1'}} onChange={e => {
                          const vehicleType = e.target.value;
                          const vehicleNumberDiv = document.getElementById('editVehicleNumberDiv');
                          if (vehicleNumberDiv) {
                            vehicleNumberDiv.style.display = vehicleType === 'NA' ? 'none' : 'block';
                          }
                        }}>
                          <option value="">Select</option>
                          <option value="2">2 wheeler</option>
                          <option value="4">4 wheeler</option>
                          <option value="NA">NA</option>
                        </select>
                      </div>
                      <div style={{flex:1}} id="editVehicleNumberDiv">
                        <label style={{fontWeight:500,marginBottom:'0.2rem',display:'block'}}>Vehicle Number</label>
                        <input name="Vehicle_Number" defaultValue={showEditUser.Vehicle_Number || ''} placeholder="Vehicle Number" style={{width:'100%',padding:'0.4em',borderRadius:'5px',border:'1px solid #cbd5e1'}} />
                      </div>
                    </div>
                    <div style={{marginBottom:'0.4rem'}}>
                      <label htmlFor="editUserRole" style={{display:'block', fontWeight:600, marginBottom:'0.15rem', color:'#334155', fontSize:'0.97em'}}>Role</label>
                      <select id="editUserRole" name="Role" defaultValue={showEditUser.Role} required style={{width:'100%',padding:'0.35em',borderRadius:'5px',border:'1px solid #cbd5e1', fontSize:'0.97em'}}>
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                        <option value="Lead">Lead</option>
                      </select>
                    </div>
                    <div className="admin-modal-actions">
                      <button className="primary-btn" type="submit">Update</button>
                      <button className="cancel-btn" type="button" onClick={()=>setShowEditUser(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {/* Delete User Modal */}
            {deleteUserId && (
              <div className="admin-modal-bg">
                <div className="admin-modal">
                  <h3 className="admin-modal-title">Delete User</h3>
                  <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                    <span style={{fontSize: '2.5rem', color: '#ef4444', display: 'block', marginBottom: '0.7rem'}}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: '2em', height: '2em'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <div style={{fontSize: '1.1rem', color:'#334155'}}>Are you sure you want to delete this user?</div>
                  </div>
                  <div className="admin-modal-actions" style={{gap:'1rem', marginTop:'0.5rem'}}>
                    <button 
                      className="delete-btn"
                      style={{
                        minWidth:'120px', fontWeight:600, fontSize:'1rem', padding:'0.8rem 2.2rem', borderRadius:'6px'
                      }}
                      onClick={()=>handleDeleteUser(deleteUserId)}
                    >
                      Delete
                    </button>
                    <button 
                      className="cancel-btn"
                      type="button"
                      style={{
                        minWidth:'120px', fontWeight:500, fontSize:'1rem', padding:'0.8rem 2.2rem', borderRadius:'6px',
                        background:'#f1f5f9', color:'#64748b', border:'1px solid #cbd5e1'
                      }}
                      onClick={()=>setDeleteUserId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )}

  {selectedMenu==='obookings' && (
    <div className="admin-dashboard-container">
      {obookingsLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <section>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.2rem'}}>
            <h2 className="admin-section-title" style={{fontSize: '1.5rem', fontWeight: 700}}>Office Seat Bookings</h2>
            <button
              onClick={() => {
                // CSV download logic
                const headers = ['User', 'Booking Date', 'Section', 'Seat', 'Timeslot'];
                let csvContent = '';
                csvContent += headers.join(',') + '\n';
                seatBookings.forEach(b => {
                  // Each column matches dashboard: guest, bookingDate, section, seat, bookingTime
                  csvContent += [b.guest, b.bookingDate, b.section, b.seat, b.bookingTime]
                    .map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
                });
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'office-seat-bookings.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              style={{
                background: 'linear-gradient(90deg,#2563eb 0%,#1e40af 100%)',
                color:'#fff',
                fontWeight:600,
                fontSize:'1.08rem',
                border:'none',
                borderRadius:'12px',
                padding:'0.85rem 2.2rem',
                cursor:'pointer',
                boxShadow:'0 4px 16px #2563eb33',
                transition:'all 0.18s cubic-bezier(.4,0,.2,1)',
                position:'relative',
                overflow:'hidden',
                marginLeft:'auto'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg,#1e40af 0%,#2563eb 100%)'}
              onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg,#2563eb 0%,#1e40af 100%)'}
            >
              <span style={{display:'inline-flex',alignItems:'center',gap:'0.7em'}}>
                <span style={{background:'#fff',borderRadius:'50%',padding:'0.32em',display:'inline-flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px #2563eb22'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2" style={{verticalAlign:'middle'}}>
                    <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2" fill="#fff" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                </span>
                <span style={{fontWeight:700,letterSpacing:'0.5px'}}>Download</span>
              </span>
            </button>
          </div>
          {/* Date and User Filters */}
          <div style={{display:'flex',gap:'1.5rem',marginBottom:'2rem',flexWrap:'wrap',alignItems:'center'}}>
            <div>
              <label style={{fontWeight:500,marginRight:'0.5rem'}}>Date</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{border:'1px solid #e5e7eb',borderRadius:'6px',padding:'4px 8px'}} />
            </div>
            <div>
              <label style={{fontWeight:500,marginRight:'0.5rem'}}>User</label>
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{border:'1px solid #e5e7eb',borderRadius:'6px',padding:'4px 8px',minWidth:'140px'}}>
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.User_id} value={u.User_id}>{u.Name}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="admin-add-btn" style={{margin:'0.2rem 0 1rem 0',background:'#2563eb',color:'#fff',fontWeight:500,fontSize:'0.98rem',border:'none',borderRadius:'6px',padding:'0.45rem 1.2rem',cursor:'pointer',boxShadow:'0 2px 8px #2563eb22',transition:'all 0.18s cubic-bezier(.4,0,.2,1)'}} onClick={()=>setShowAddBooking(true)}>
            Add Booking
          </button>
          {/* Add Booking Modal */}
          {showAddBooking && (
            <div className="admin-modal-bg" style={{zIndex:1000}}>
              <div className="admin-modal" style={{maxWidth:'400px', padding:'2rem 2.2rem', background:'#f8fafc', borderRadius:'18px', boxShadow:'0 8px 32px #33415522', position:'relative'}}>
                <h3 className="admin-modal-title" style={{fontWeight:700, fontSize:'1.35rem', marginBottom:'1.2rem', color:'#222', textAlign:'center'}}>Add Booking</h3>
                <form onSubmit={e => {
                  e.preventDefault();
                  // Add booking logic here
                  setShowAddBooking(false);
                }} style={{display:'flex', flexDirection:'column', gap:'1.2rem'}}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'0.7rem', marginBottom:'0.5rem'}}>
                    
                    <span style={{
                      display:'inline-block',
                      background:'#e0e7ff',
                      color:'#2563eb',
                      fontWeight:700,
                      fontSize:'1.25rem',
                      padding:'0.5rem 2.2rem',
                      borderRadius:'999px',
                      letterSpacing:'1px',
                      border:'1.5px solid #2563eb',
                      boxShadow:'0 2px 12px #2563eb22',
                      textAlign:'center',
                      minWidth:'160px',
                      margin:'0.2rem 0'
                    }}>{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                  <div>
                    <label style={{fontWeight:600, color:'#334155', marginBottom:'0.7rem', display:'block', fontSize:'1.08rem'}}>Timeslots</label>
                    {/* Timeslot fields - allow multiple */}
                    <div style={{display:'flex', alignItems:'center', gap:'1.2rem', marginBottom:'0.7rem', justifyContent:'center'}}>
                      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'0.3rem'}}>
                        <span style={{color:'#2563eb', fontWeight:600, fontSize:'1.05rem'}}>Check-in:</span>
                        <input type="time" name="checkin" required style={{border:'2px solid #2563eb', borderRadius:'8px', padding:'0.5rem 1.2rem', fontSize:'1.08rem', outline:'none', boxShadow:'0 2px 8px #2563eb22'}} />
                      </div>
                      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'0.3rem'}}>
                        <span style={{color:'#2563eb', fontWeight:600, fontSize:'1.05rem'}}>Check-out:</span>
                        <input type="time" name="checkout" required style={{border:'2px solid #2563eb', borderRadius:'8px', padding:'0.5rem 1.2rem', fontSize:'1.08rem', outline:'none', boxShadow:'0 2px 8px #2563eb22'}} />
                      </div>
                      <button type="button" style={{background:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', padding:'0.3rem 0.7rem', fontWeight:700, fontSize:'1.2rem', boxShadow:'0 2px 8px #2563eb22', cursor:'pointer', marginTop:'1.2rem'}} title="Add timeslot">+</button>
                    </div>
                  </div>
                  <div style={{display:'flex', justifyContent:'center', gap:'2rem', marginTop:'1.2rem'}}>
                    <button
                      type="submit"
                      style={{
                        background:'linear-gradient(90deg,#2563eb 0%,#1e40af 100%)',
                        color:'#fff',
                        fontWeight:600,
                        fontSize:'1.12rem',
                        border:'none',
                        borderRadius:'10px',
                        padding:'0.85rem 2.5rem',
                        cursor:'pointer',
                        boxShadow:'0 4px 16px #2563eb33',
                        transition:'transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s cubic-bezier(.4,0,.2,1)',
                        position:'relative',
                        left:0
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'scale(1.07)';
                        e.currentTarget.style.boxShadow = '0 8px 24px #2563eb44';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 16px #2563eb33';
                      }}
                    >Book</button>
                    <button
                      type="button"
                      style={{
                        background:'linear-gradient(90deg,#ef4444 0%,#dc2626 100%)',
                        color:'#fff',
                        fontWeight:600,
                        fontSize:'1.12rem',
                        border:'none',
                        borderRadius:'10px',
                        padding:'0.85rem 2.5rem',
                        cursor:'pointer',
                        boxShadow:'0 4px 16px #ef444433',
                        transition:'transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s cubic-bezier(.4,0,.2,1)',
                        position:'relative',
                        left:0
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'scale(1.07)';
                        e.currentTarget.style.boxShadow = '0 8px 24px #ef444444';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 16px #ef444433';
                      }}
                      onClick={()=>setShowAddBooking(false)}
                    >Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Booking Date</th>
                  <th>Section</th>
                  <th>Seat</th>
                  <th>Timeslot</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {seatBookings.length === 0 ? (
                  <tr><td colSpan={6} style={{textAlign:'center', color:'#94a3b8', padding:'2rem'}}>No seat bookings found.</td></tr>
                ) : seatBookings
                  .filter(b => {
                    // Filter by date
                    let matchDate = true;
                    if (filterDate) {
                      const [day, month, year] = b.bookingDate.split(/[\/\-]/).map(Number);
                      const [fYear, fMonth, fDay] = filterDate.split('-').map(Number);
                      matchDate = day === fDay && month === fMonth && year === fYear;
                    }
                    // Filter by user
                    let matchUser = true;
                    if (filterUser) {
                      matchUser = b.guestEmail && users.find(u => u.User_id === filterUser && u.email === b.guestEmail);
                    }
                    return matchDate && matchUser;
                  })
                  .map(b => (
                    <tr key={b.id}>
                      <td>
                        <span className="admin-avatar">{getInitials(b.guest)}</span>
                        <span>
                          <div style={{fontWeight:600}}>{b.guest || 'Unknown'}</div>
                          <div style={{fontSize:'0.85em', color:'#64748b'}}>{b.guestEmail}</div>
                        </span>
                      </td>
                      <td>{b.bookingDate}</td>
                      <td>{b.section}</td>
                      <td>{b.seat}</td>
                      <td>
                        <button
                          className="admin-notes-btn"
                          onClick={() => setShowNotes(b.bookingTime || 'No timeslot')}
                        >
                          View Timeslot
                        </button>
                      </td>
                      <td>
                        <button className="admin-edit-btn" style={{marginRight:'0.5rem'}} onClick={() => setEditBooking(b)}>Edit</button>
                        <button className="admin-delete-btn" onClick={() => setDeleteBookingId(b.id)}>Delete</button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Edit Booking Modal */}
          {editBooking && (
            <div className="admin-modal-bg">
              <div className="admin-modal" style={{maxWidth:'370px', padding:'1.3rem 1.3rem'}}>
                <h3 className="admin-modal-title">Edit Booking</h3>
                <form onSubmit={e => {
                  e.preventDefault();
                  const form = e.target;
                  handleEditBooking({
                    ...editBooking,
                    section: form.section.value,
                    seat: form.seat.value,
                    bookingDate: form.bookingDate.value,
                    bookingTime: `${form.startTime.value} - ${form.endTime.value}`
                  });
                }}>
                  <div style={{marginBottom:'0.6rem'}}>
                    <label htmlFor="section" style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Section</label>
                    <input id="section" name="section" defaultValue={editBooking.section} required placeholder="Section" style={{width:'100%',padding:'0.55em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}} />
                  </div>
                  <div style={{marginBottom:'0.6rem'}}>
                    <label htmlFor="seat" style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Seat Number</label>
                    <input id="seat" name="seat" defaultValue={editBooking.seat} required placeholder="Seat" style={{width:'100%',padding:'0.55em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}} />
                  </div>
                  <div style={{marginBottom:'0.6rem'}}>
                    <label htmlFor="bookingDate" style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Booking Date</label>
                    <input
                      id="bookingDate"
                      name="bookingDate"
                      type="date"
                      required
                      defaultValue={
                        (() => {
                          // Accepts DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD, always outputs YYYY-MM-DD
                          const val = editBooking.bookingDate;
                          if (!val) return '';
                          if (/\d{4}-\d{2}-\d{2}/.test(val)) return val; // already correct
                          if (/\d{2}[/-]\d{2}[/-]\d{4}/.test(val)) {
                            const [dd, mm, yyyy] = val.split(/[/-]/);
                            return `${yyyy}-${mm}-${dd}`;
                          }
                          return '';
                        })()
                      }
                      style={{width:'100%',padding:'0.55em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}}
                    />
                  </div>
                  <div style={{marginBottom:'0.6rem'}}>
                      <label style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Timeslot</label>
                      <div style={{display:'flex', gap:'0.5em'}}>
                        <div style={{flex:1}}>
                          <label htmlFor="startTime" style={{fontWeight:500, fontSize:'0.97em'}}>Check-in</label>
                          <input
                            id="startTime"
                            name="startTime"
                            type="time"
                            required
                            defaultValue={(() => {
                              // Extract start time from bookingTime string (e.g., "09:00 - 10:00")
                              const val = editBooking.bookingTime;
                              if (!val) return '';
                              const [start] = val.split(' - ');
                              return start.trim();
                            })()}
                            style={{width:'100%',padding:'0.45em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}}
                          />
                        </div>
                        <div style={{flex:1}}>
                          <label htmlFor="endTime" style={{fontWeight:500, fontSize:'0.97em'}}>Check-out</label>
                          <input
                            id="endTime"
                            name="endTime"
                            type="time"
                            required
                            defaultValue={(() => {
                              // Extract end time from bookingTime string (e.g., "09:00 - 10:00")
                              const val = editBooking.bookingTime;
                              if (!val) return '';
                              const parts = val.split(' - ');
                              return parts[1] ? parts[1].trim() : '';
                            })()}
                            style={{width:'100%',padding:'0.45em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}}
                          />
                        </div>
                      </div>
                  </div>
                  <div className="admin-modal-actions">
                    <button className="primary-btn" type="submit">Update</button>
                    <button className="cancel-btn" type="button" onClick={()=>setEditBooking(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Delete Booking Modal */}
          {deleteBookingId && (
            <div className="admin-modal-bg">
              <div className="admin-modal">
                <h3 className="admin-modal-title">Delete Booking</h3>
                <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                  <span style={{fontSize: '2.5rem', color: '#ef4444', display: 'block', marginBottom: '0.7rem'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: '2em', height: '2em'}}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div style={{fontSize: '1.1rem', color:'#334155'}}>Are you sure you want to delete this booking?</div>
                </div>
                <div className="admin-modal-actions" style={{gap:'1rem', marginTop:'0.5rem'}}>
                  <button 
                    className="delete-btn"
                    style={{
                      minWidth:'120px', fontWeight:600, fontSize:'1rem', padding:'0.8rem 2.2rem', borderRadius:'6px'
                    }}
                    onClick={()=>handleDeleteBooking(deleteBookingId)}
                  >
                    Delete
                  </button>
                  <button 
                    className="cancel-btn"
                    type="button"
                    style={{
                      minWidth:'120px', fontWeight:500, fontSize:'1rem', padding:'0.8rem 2.2rem', borderRadius:'6px',
                      background:'#f1f5f9', color:'#64748b', border:'1px solid #cbd5e1'
                    }}
                    onClick={()=>setDeleteBookingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )}
        {(selectedMenu==='parkbookings') && (
          <div className="admin-dashboard-container">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h2 className="admin-dashboard-title" style={{fontSize: '1.5rem', fontWeight: 700 ,color:'#334155'}}>Parking Slot Bookings</h2>
              <button
                style={{
                  background: 'linear-gradient(90deg,#2563eb 0%,#1e40af 100%)',
                  color:'#fff',
                  fontWeight:600,
                  fontSize:'1.08rem',
                  border:'none',
                  borderRadius:'12px',
                  padding:'0.85rem 2.2rem',
                  cursor:'pointer',
                  boxShadow:'0 4px 16px #2563eb33',
                  transition:'all 0.18s cubic-bezier(.4,0,.2,1)',
                  position:'relative',
                  overflow:'hidden',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg,#1e40af 0%,#2563eb 100%)'}
                onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg,#2563eb 0%,#1e40af 100%)'}
                onClick={() => {
                  // Prepare CSV data from parkingBookings
                  const columns = ['User', 'Booking Date', 'Slot', 'Timeslot', 'Vehicle Type', 'Vehicle Number'];
                  const rows = parkingBookings.map(b => [
                    b.userName,
                    b.bookingDate,
                    b.slot,
                    b.timeslot,
                    b.vehicle_type,
                    b.vehicle_number
                  ]);
                  let csvContent = columns.join(',') + '\n' + rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
                  // Download CSV
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `parking_bookings_${filterDate}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <span style={{display:'inline-flex',alignItems:'center',gap:'0.7em'}}>
                  <span style={{background:'#fff',borderRadius:'50%',padding:'0.32em',display:'inline-flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px #2563eb22'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2" style={{verticalAlign:'middle'}}>
                      <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2" fill="#fff" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v6m0 0l-3-3m3 3l3-3" />
                    </svg>
                  </span>
                  <span style={{fontWeight:700,letterSpacing:'0.5px'}}>Download</span>
                </span>
              </button>
            </div>
            {loading ? (
              <div className="text-center text-gray-500">Loading...</div>
            ) : (
              <section>
                <div style={{display:'flex',gap:'1.5rem',marginBottom:'2rem',flexWrap:'wrap',alignItems:'center'}}>
                  <div>
                    <label style={{fontWeight:500,marginRight:'0.5rem'}}>Date</label>
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{border:'1px solid #e5e7eb',borderRadius:'6px',padding:'4px 8px'}} />
                  </div>
                  <div>
                    <label style={{fontWeight:500,marginRight:'0.5rem'}}>User</label>
                    <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{border:'1px solid #e5e7eb',borderRadius:'6px',padding:'4px 8px',minWidth:'140px'}}>
                      <option value="">All Users</option>
                      {users.map(u => (
                        <option key={u.User_id} value={u.User_id}>{u.Name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="admin-table-wrapper" style={{overflowX:'auto', maxWidth:'100vw', minWidth:'800px'}}>
                  <table className="admin-table" style={{minWidth:'900px', whiteSpace:'nowrap'}}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Booking Date</th>
                        <th>Slot</th>
                        <th>Timeslot</th>
                        <th>Vehicle Type</th>
                        <th>Vehicle Number</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parkingBookings.length === 0 ? (
                        <tr><td colSpan={7} style={{textAlign:'center', color:'#94a3b8', padding:'2rem'}}>No parking bookings found.</td></tr>
                      ) : parkingBookings
                        .filter(b => {
                          // Filter by date
                          let matchDate = true;
                          if (filterDate) {
                            const bookingDate = b.bookingDate;
                            if (bookingDate) {
                              // bookingDate: DD/MM/YYYY, filterDate: YYYY-MM-DD
                              const [fYear, fMonth, fDay] = filterDate.split('-').map(Number);
                              const [bDay, bMonth, bYear] = bookingDate.split(/[\/\-]/).map(Number);
                              matchDate = bDay === fDay && bMonth === fMonth && bYear === fYear;
                            }
                          }
                          // Filter by user
                          let matchUser = true;
                          if (filterUser) {
                            matchUser = b.booked_by_user_id === filterUser;
                          }
                          return matchDate && matchUser;
                        })
                        .map(b => (
                          <tr key={b.id || b.slot_id + b.start_time}>
                            <td>
                              <span className="admin-avatar">{getInitials(b.userName)}</span>
                              <span>
                                <div style={{fontWeight:600}}>{b.userName}</div>
                                <div style={{fontSize:'0.85em', color:'#64748b'}}>{b.userEmail}</div>
                              </span>
                            </td>
                            <td>{b.bookingDate}</td>
                            <td>{b.slot}</td>
                            <td>{b.timeslot}</td>
                            <td>{b.vehicle_type}</td>
                            <td>{b.vehicle_number}</td>
                            <td>
                              <button className="admin-edit-btn" style={{marginRight:'0.5rem'}} onClick={() => setEditParkingBooking(b)}>Edit</button>
                              <button className="admin-delete-btn" onClick={() => setDeleteParkingBookingId(b.id || b.slot_id + b.start_time)}>Delete</button>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Edit Parking Booking Modal */}
                {editParkingBooking && (
                  <div className="admin-modal-bg">
                    <div className="admin-modal" style={{maxWidth:'370px', padding:'1.3rem 1.3rem'}}>
                      <h3 className="admin-modal-title">Edit Parking Booking</h3>
                      <form onSubmit={async e => {
                        e.preventDefault();
                        const form = e.target;
                        const updatedBooking = {
                          ...editParkingBooking,
                          slot: form.slot.value,
                          vehicle_type: parseInt(form.vehicle_type.value, 10),
                          vehicle_number: form.vehicle_number.value,
                          bookingDate: form.bookingDate.value,
                          start_time: form.startTime.value,
                          end_time: form.endTime.value
                        };
                        // Construct ISO strings for start_time and end_time
                        const bookingDateStr = updatedBooking.bookingDate; // e.g. '2025-11-04'
                        // If bookingDate is not valid, fallback to today
                        const validDate = bookingDateStr && /^\d{4}-\d{2}-\d{2}$/.test(bookingDateStr) ? bookingDateStr : (new Date()).toISOString().slice(0,10);
                        const startTimeStr = updatedBooking.start_time; // e.g. '09:00'
                        const endTimeStr = updatedBooking.end_time; // e.g. '17:00'
                        // Combine date and time to ISO string
                        const startISO = startTimeStr ? new Date(`${validDate}T${startTimeStr}:00`).toISOString() : null;
                        const endISO = endTimeStr ? new Date(`${validDate}T${endTimeStr}:00`).toISOString() : null;
                        const createdISO = new Date(validDate).toISOString();
                        // Fetch all parking bookings and log their ids before update
                        const { data: allParkingBookings } = await supabase.from('parking_bookings').select('id');
                        console.log('All parking_bookings ids in DB:', allParkingBookings?.map(b => b.id));
                        // Debug log to check booking id before update
                        console.log('Booking id for update:', editParkingBooking.id, 'Booking object:', editParkingBooking);
                        // Supabase update logic
                        if (!editParkingBooking.id) {
                          console.warn('No id found in booking object:', editParkingBooking);
                          alert('Cannot update: No booking id found.');
                          setEditParkingBooking(null);
                          return;
                        }
                        console.log('Updating booking with id:', editParkingBooking.id);
                        const { data, error } = await supabase
                          .from('parking_bookings')
                          .update({
                            slot_id: updatedBooking.slot,
                            Vehicle_Type: updatedBooking.vehicle_type, // Now integer
                            vehicle_number: updatedBooking.vehicle_number,
                            created_at: createdISO,
                            start_time: startISO,
                            end_time: endISO
                          })
                          .eq('id', editParkingBooking.id)
                          .select(); // Get updated row from Supabase
                        if (error) {
                          console.error('Supabase update error:', error);
                          alert('Failed to update parking booking: ' + error.message);
                          setEditParkingBooking(null);
                          return;
                        }
                        if (!data || data.length === 0) {
                          console.warn('Supabase update returned no data for id:', editParkingBooking.id);
                          alert('No booking was updated. Please check the booking id.');
                          setEditParkingBooking(null);
                          return;
                        }
                          // Refetch parking bookings from Supabase to sync dashboard
                          const { data: parkingData } = await supabase.from('parking_bookings').select('*');
                          // Fetch users for mapping
                          const { data: usersData } = await supabase.from('Users').select('*');
                          const bookingsWithUser = (parkingData || []).map(b => {
                            const user = (usersData || []).find(u => u.User_id === b.booked_by_user_id) || {};
                            // Format booking date
                            const bookingDate = b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '';
                            // Format timeslot
                            let timeslot = '';
                            if (b.start_time && b.end_time) {
                              const start = new Date(b.start_time);
                              const end = new Date(b.end_time);
                              const pad = n => String(n).padStart(2, '0');
                              const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
                              const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
                              timeslot = `${startStr} - ${endStr}`;
                            }
                            return {
                              ...b,
                              userName: user.Name || 'Unknown',
                              userEmail: user.email || '',
                              bookingDate,
                              timeslot,
                              slot: b.slot_id,
                              vehicle_type: b.Vehicle_Type || 'NA',
                              vehicle_number: b.vehicle_number || 'NA',
                            };
                          });
                          setParkingBookings(bookingsWithUser);
                          setEditParkingBooking(null);
                      }}>
                        <div style={{display:'flex', gap:'1.2rem', marginBottom:'1.2rem', flexWrap:'wrap', alignItems:'center'}}>
                          {/* Booking Date */}
                          <div style={{flex:'1 1 160px', minWidth:'160px'}}>
                            <label htmlFor="bookingDate" style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Booking Date</label>
                            <input id="bookingDate" name="bookingDate" type="date" required defaultValue={(() => {
                              const val = editParkingBooking.bookingDate;
                              if (!val) return '';
                              if (/\d{4}-\d{2}-\d{2}/.test(val)) return val;
                              if (/\d{2}[/-]\d{2}[/-]\d{4}/.test(val)) {
                                const [dd, mm, yyyy] = val.split(/[/-]/);
                                return `${yyyy}-${mm}-${dd}`;
                              }
                              return '';
                            })()} style={{width:'100%',padding:'0.55em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}} />
                          </div>
                          {/* Timeslot */}
                          <div style={{flex:'1 1 220px', minWidth:'220px'}}>
                            <label style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Timeslot</label>
                            <div style={{display:'flex', gap:'0.5em'}}>
                              <div style={{flex:1}}>
                                <label htmlFor="startTime" style={{fontWeight:500, fontSize:'0.97em'}}>Check-in</label>
                                <input id="startTime" name="startTime" type="time" required defaultValue={(() => {
                                  const val = editParkingBooking.timeslot || editParkingBooking.bookingTime;
                                  if (!val) return '';
                                  const [start] = val.split(' - ');
                                  return start ? start.trim() : '';
                                })()} style={{width:'100%',padding:'0.45em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}} />
                              </div>
                              <div style={{flex:1}}>
                                <label htmlFor="endTime" style={{fontWeight:500, fontSize:'0.97em'}}>Check-out</label>
                                <input id="endTime" name="endTime" type="time" required defaultValue={(() => {
                                  const val = editParkingBooking.timeslot || editParkingBooking.bookingTime;
                                  if (!val) return '';
                                  const parts = val.split(' - ');
                                  return parts[1] ? parts[1].trim() : '';
                                })()} style={{width:'100%',padding:'0.45em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{display:'flex', gap:'1.2rem', marginBottom:'1.2rem', flexWrap:'wrap', alignItems:'center'}}>
                          {/* Vehicle Type & Vehicle Number in one row */}
                          <div style={{flex:'1 1 120px', minWidth:'120px'}}>
                            <label htmlFor="vehicle_type" style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Vehicle Type</label>
                            <select id="vehicle_type" name="vehicle_type" required
                              defaultValue={
                                editParkingBooking.Vehicle_Type !== undefined ? String(editParkingBooking.Vehicle_Type)
                                : (editParkingBooking.vehicle_type !== undefined ? String(editParkingBooking.vehicle_type) : '0')
                              }
                              style={{width:'100%',padding:'0.55em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}}>
                              <option value="0">NA</option>
                              <option value="2">2 wheeler</option>
                              <option value="4">4 Wheeler</option>
                            </select>
                          </div>
                          <div style={{flex:'1 1 160px', minWidth:'160px'}}>
                            <label htmlFor="vehicle_number" style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Vehicle Number</label>
                            <input id="vehicle_number" name="vehicle_number" defaultValue={editParkingBooking.vehicle_number} required placeholder="Vehicle Number" style={{width:'100%',padding:'0.55em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}} />
                          </div>
                        </div>
                        <div style={{marginBottom:'1.2rem'}}>
                          {/* Slot in its own row */}
                          <label htmlFor="slot" style={{display:'block', fontWeight:600, marginBottom:'0.22rem', color:'#334155', fontSize:'1em'}}>Slot</label>
                          <input id="slot" name="slot" defaultValue={editParkingBooking.slot} required placeholder="Slot" style={{width:'100%',padding:'0.55em',borderRadius:'7px',border:'1px solid #cbd5e1', fontSize:'1em'}} />
                        </div>
                        <div className="admin-modal-actions">
                          <button className="primary-btn" type="submit">Update</button>
                          <button className="cancel-btn" type="button" onClick={()=>setEditParkingBooking(null)}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
                {/* Delete Parking Booking Modal */}
                {deleteParkingBookingId && (
                  <div className="admin-modal-bg">
                    <div className="admin-modal">
                      <h3 className="admin-modal-title">Delete Parking Booking</h3>
                      <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                        <span style={{fontSize: '2.5rem', color: '#ef4444', display: 'block', marginBottom: '0.7rem'}}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width: '2em', height: '2em'}}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <div style={{fontSize: '1.1rem', color:'#334155'}}>Are you sure you want to delete this parking booking?</div>
                      </div>
                      <div className="admin-modal-actions" style={{gap:'1rem', marginTop:'0.5rem'}}>
                        <button 
                          className="delete-btn"
                          style={{minWidth:'120px', fontWeight:600, fontSize:'1rem', padding:'0.8rem 2.2rem', borderRadius:'6px'}}
                          onClick={()=>{
                            // Backend delete logic for parking booking
                            (async () => {
                              if (!deleteParkingBookingId) return;
                              const { error } = await supabase
                                .from('parking_bookings')
                                .delete()
                                .eq('id', deleteParkingBookingId);
                              if (error) {
                                alert('Failed to delete parking booking: ' + error.message);
                              }
                              // Refetch parking bookings to update dashboard
                              const { data: parkingData } = await supabase.from('parking_bookings').select('*');
                              // Fetch users for mapping
                              const { data: usersData } = await supabase.from('Users').select('*');
                              const bookingsWithUser = (parkingData || []).map(b => {
                                const user = (usersData || []).find(u => u.User_id === b.booked_by_user_id) || {};
                                const bookingDate = b.created_at ? new Date(b.created_at).toLocaleDateString('en-GB') : '';
                                let timeslot = '';
                                if (b.start_time && b.end_time) {
                                  const start = new Date(b.start_time);
                                  const end = new Date(b.end_time);
                                  const pad = n => String(n).padStart(2, '0');
                                  const startStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
                                  const endStr = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
                                  timeslot = `${startStr} - ${endStr}`;
                                }
                                return {
                                  ...b,
                                  userName: user.Name || 'Unknown',
                                  userEmail: user.email || '',
                                  bookingDate,
                                  timeslot,
                                  slot: b.slot_id,
                                  vehicle_type: b.Vehicle_Type || 'NA',
                                  vehicle_number: b.vehicle_number || 'NA',
                                };
                              });
                              setParkingBookings(bookingsWithUser);
                              setDeleteParkingBookingId(null);
                            })();
                          }}
                        >
                          Delete
                        </button>
                        <button 
                          className="cancel-btn"
                          type="button"
                          style={{minWidth:'120px', fontWeight:500, fontSize:'1rem', padding:'0.8rem 2.2rem', borderRadius:'6px', background:'#f1f5f9', color:'#64748b', border:'1px solid #cbd5e1'}}
                          onClick={()=>setDeleteParkingBookingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
        {/* Notes Modal */}
        {showNotes && (
          <div className="admin-modal-bg">
            <div className="admin-modal">
              <h3 className="admin-modal-title">Timeslot</h3>
              <div style={{color:'#334155', marginBottom:'1.2rem', whiteSpace:'pre-line', textAlign:'center', display:'flex', flexWrap:'wrap', gap:'0.5rem', justifyContent:'center'}}>
                {(() => {
                  let slots = showNotes;
                  if (typeof slots === 'string') {
                    slots = slots.split(',').map(s => s.trim()).filter(Boolean);
                  }
                  if (!Array.isArray(slots)) slots = [String(slots)];
                  const formatTime = t => {
                    if (!t) return '';
                    let [h, m] = t.split(':');
                    h = parseInt(h, 10);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12 || 12;
                    return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                  };
                  return slots.map((slot, idx) => {
                    const [start, end] = slot.split(' - ');
                    return (
                      <span key={idx} style={{
                        display:'inline-block',
                        background:'#e0e7ff',
                        color:'#3730a3',
                        fontWeight:600,
                        borderRadius:'999px',
                        padding:'0.45em 1.1em',
                        fontSize:'1.05em',
                        boxShadow:'0 2px 8px #6366f122',
                        letterSpacing:'0.5px',
                        marginRight: idx < slots.length-1 ? 0 : 0
                      }}>
                        {formatTime(start)} – {formatTime(end)}
                      </span>
                    );
                  });
                })()}
              </div>
              <div style={{display:'flex', justifyContent:'center'}}>
                <button className="admin-modal-close timeslot-close-btn" style={{background:'#2563eb', color:'#fff', fontWeight:600, borderRadius:'8px', padding:'0.7rem 2.2rem', fontSize:'1rem', border:'none', cursor:'pointer', margin:'0 auto', boxShadow:'0 2px 8px #2563eb22', transition:'all 0.18s cubic-bezier(.4,0,.2,1)'}} onClick={() => setShowNotes(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
