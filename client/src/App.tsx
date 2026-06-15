import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Spin } from 'antd';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerLayout from './layouts/CustomerLayout';
import AgentLayout from './layouts/AgentLayout';
import CustomerTickets from './pages/customer/Tickets';
import CustomerTicketDetail from './pages/customer/TicketDetail';
import CreateTicket from './pages/customer/CreateTicket';
import AgentTickets from './pages/agent/Tickets';
import AgentTicketDetail from './pages/agent/TicketDetail';
import AgentProfile from './pages/agent/Profile';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

      {user?.role === 'CUSTOMER' && (
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/tickets" />} />
          <Route path="tickets" element={<CustomerTickets />} />
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:id" element={<CustomerTicketDetail />} />
        </Route>
      )}

      {(user?.role === 'AGENT' || user?.role === 'ADMIN') && (
        <Route path="/" element={<AgentLayout />}>
          <Route index element={<Navigate to="/tickets" />} />
          <Route path="tickets" element={<AgentTickets />} />
          <Route path="tickets/:id" element={<AgentTicketDetail />} />
          <Route path="profile" element={<AgentProfile />} />
        </Route>
      )}

      <Route path="*" element={user ? <Navigate to="/" /> : <Navigate to="/login" />} />
    </Routes>
  );
};

export default App;
