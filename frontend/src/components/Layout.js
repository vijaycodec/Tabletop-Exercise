import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaHome, FaUser, FaSignOutAlt, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if current route is a participant route (exercise view)
  const isParticipantRoute = location.pathname.startsWith('/exercise/') && !location.pathname.includes('/build') && !location.pathname.includes('/control');
  const isJoinPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <nav className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-2xl border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <FaHome className="text-blue-400 text-xl" />
                <span className="text-xl font-bold text-white">
                  Tabletop Exercise
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-300 flex items-center">
                    <FaUser className="mr-2" />
                    {user.username} ({user.role})
                  </span>
                  {user.role === 'facilitator' && (
                    <Link
                      to="/dashboard"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-red-400 hover:text-red-300 transition-colors"
                  >
                    <FaSignOutAlt className="mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {/* Hide login/register buttons on participant routes and join page */}
                  {!isParticipantRoute && !isJoinPage && (
                    <>
                      <Link
                        to="/login"
                        className="flex items-center text-gray-300 hover:text-blue-400 transition-colors"
                      >
                        <FaSignInAlt className="mr-2" />
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                      >
                        <FaUserPlus className="mr-2" />
                        Register
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;