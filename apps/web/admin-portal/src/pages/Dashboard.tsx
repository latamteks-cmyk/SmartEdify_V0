import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { setToken } = useAuth();

  const handleLogout = () => {
    setToken(null);
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p>Welcome to the admin dashboard!</p>
      <nav>
        <ul>
          <li>
            <Link to="/user-management">User Management</Link>
          </li>
        </ul>
      </nav>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;
