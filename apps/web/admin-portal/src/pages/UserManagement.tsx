import React, { useState, useEffect } from 'react';

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    // Simulate fetching users from an API
    const fetchUsers = async () => {
      const mockUsers = [
        { id: 1, name: 'John Doe', email: 'john.doe@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com' },
      ];
      setUsers(mockUsers);
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h2>User Management</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;
