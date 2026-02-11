import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ExerciseProvider } from './contexts/ExerciseContext';

// Layout
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import JoinExercise from './pages/JoinExercise';

// Facilitator Components
import ExerciseBuilder from './components/facilitator/ExerciseBuilder';
import ControlPanel from './components/facilitator/ControlPanel';

// Participant Component
import ParticipantDashboard from './components/participant/ParticipantDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, requireFacilitator = false }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    return <Navigate to="/facilitator/login" />;
  }

  if (requireFacilitator && (!user || (user.role !== 'facilitator' && user.role !== 'admin'))) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ExerciseProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Public Routes */}
              <Route index element={<Navigate to="/participant/join" />} />
              <Route path="participant/join" element={<JoinExercise />} />
              <Route path="facilitator/login" element={<Login />} />
              <Route path="facilitator/register" element={<Register />} />
              
              {/* Protected Facilitator Routes */}
              <Route path="dashboard" element={
                <ProtectedRoute requireFacilitator={true}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="exercise/:exerciseId/build" element={
                <ProtectedRoute requireFacilitator={true}>
                  <ExerciseBuilder />
                </ProtectedRoute>
              } />
              
              <Route path="exercise/:exerciseId/control" element={
                <ProtectedRoute requireFacilitator={true}>
                  <ControlPanel />
                </ProtectedRoute>
              } />
              
              {/* Participant Route */}
              <Route path="exercise/:exerciseId" element={<ParticipantDashboard />} />
            </Route>
          </Routes>
        </Router>
      </ExerciseProvider>
    </AuthProvider>
  );
}

export default App;