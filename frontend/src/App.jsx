
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import OfferRide from "./pages/OfferRide";
import SearchRides from "./pages/SearchRides";
import MyBookings from "./pages/MyBookings";
import MyRides from "./pages/MyRides";
import DriveRide from "./pages/DriveRide";
import TrackRide from "./pages/TrackRide";


function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading...</p>;
  return user ? children : <Navigate to="/login" replace />;
}

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="nav">
      <Link to="/" className="brand">CityGo</Link>
      {user && (
        <div>
          <span>{user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          
<Route path="/offer" element={<Protected><OfferRide /></Protected>} />
<Route path="/search" element={<Protected><SearchRides /></Protected>} />

<Route path="/bookings" element={<Protected><MyBookings /></Protected>} />
<Route path="/my-rides" element={<Protected><MyRides /></Protected>} />
<Route path="/drive/:id" element={<Protected><DriveRide /></Protected>} />
<Route path="/track/:id" element={<Protected><TrackRide /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
