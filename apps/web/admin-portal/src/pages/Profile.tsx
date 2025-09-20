import React from 'react';
import { Link } from 'react-router-dom';

const Profile = () => {
  // Placeholder user data
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
  };

  return (
    <div>
      <h2>Profile</h2>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  );
};

export default Profile;
