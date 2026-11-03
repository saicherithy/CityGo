
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <div className="grid">
        <Link to="/offer" className="tile">Offer a Ride</Link>
        <Link to="/search" className="tile">Find a Ride</Link>
        <Link to="/bookings" className="tile">My Bookings</Link>
<Link to="/my-rides" className="tile">My Rides (Driver)</Link>
      </div>
    </div>
  );
}
