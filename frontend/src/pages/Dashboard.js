import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { exerciseAPI } from '../services/api';
import { FaPlus, FaPlay, FaEdit, FaCopy, FaTrash, FaCheck } from 'react-icons/fa';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [newExercise, setNewExercise] = useState({
    title: '',
    description: '',
    maxParticipants: 50
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const response = await exerciseAPI.getMyExercises();
      setExercises(response.data);
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  };

  const handleCreateExercise = async () => {
    try {
      const response = await exerciseAPI.createExercise(newExercise);
      setExercises([response.data.exercise, ...exercises]);
      setShowCreateModal(false);
      setNewExercise({
        title: '',
        description: '',
        maxParticipants: 50
      });
    } catch (error) {
      console.error('Failed to create exercise:', error);
    }
  };

  const copyAccessCode = (code) => {
    navigator.clipboard.writeText(code);
    showNotification('Access code copied to clipboard!', 'success');
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleDeleteClick = (exercise) => {
    setExerciseToDelete(exercise);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!exerciseToDelete) return;

    try {
      await exerciseAPI.deleteExercise(exerciseToDelete._id);
      setExercises(exercises.filter(ex => ex._id !== exerciseToDelete._id));
      setShowDeleteModal(false);
      setExerciseToDelete(null);
      showNotification('Exercise deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      showNotification('Failed to delete exercise. Please try again.', 'error');
      setShowDeleteModal(false);
      setExerciseToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setExerciseToDelete(null);
  };

  const handleActivateExercise = async (exerciseId) => {
    try {
      await exerciseAPI.updateExercise(exerciseId, { status: 'active' });
      // Refresh exercises list
      fetchExercises();
      showNotification('Exercise activated successfully!', 'success');
    } catch (error) {
      console.error('Failed to activate exercise:', error);
      showNotification('Failed to activate exercise. Please try again.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Facilitator Dashboard</h1>
          <p className="text-gray-400">Welcome back, {user?.username}!</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center transition-all shadow-lg"
        >
          <FaPlus className="mr-2" />
          Create Exercise
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-2 text-gray-300">Total Exercises</h3>
          <p className="text-3xl font-bold text-blue-400">{exercises.length}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-2 text-gray-300">Active</h3>
          <p className="text-3xl font-bold text-green-400">
            {exercises.filter(e => e.status === 'active').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-2 text-gray-300">Draft</h3>
          <p className="text-3xl font-bold text-yellow-400">
            {exercises.filter(e => e.status === 'draft').length}
          </p>
        </div>
      </div>

      {/* Exercises List */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl overflow-hidden border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Your Exercises</h2>
        </div>

        {exercises.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FaPlus className="text-4xl mx-auto mb-3 text-gray-600" />
            <p>No exercises yet. Create your first exercise to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {exercises.map((exercise) => (
              <div key={exercise._id} className="p-6 hover:bg-gray-700/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg mb-1 text-white">{exercise.title}</h3>
                    <p className="text-gray-400 mb-2">{exercise.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`px-2 py-1 rounded ${
                        exercise.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : exercise.status === 'draft'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {exercise.status}
                      </span>
                      <span className="text-gray-400">Created: {format(new Date(exercise.createdAt), 'MMM d, yyyy')}</span>
                      <span className="flex items-center text-gray-400">
                        Access Code:
                        <code className="bg-gray-700 px-2 py-1 rounded ml-2 font-mono text-blue-400 border border-gray-600">
                          {exercise.accessCode}
                        </code>
                        <button
                          onClick={() => copyAccessCode(exercise.accessCode)}
                          className="ml-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <FaCopy />
                        </button>
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {exercise.status === 'draft' && (
                      <button
                        onClick={() => handleActivateExercise(exercise._id)}
                        className="flex items-center bg-cyan-500/20 text-cyan-400 px-3 py-2 rounded hover:bg-cyan-500/30 border border-cyan-500/30 transition-colors"
                        title="Activate Exercise"
                      >
                        <FaCheck className="mr-1" />
                        Activate
                      </button>
                    )}
                    <Link
                      to={`/exercise/${exercise._id}/build`}
                      className="flex items-center bg-blue-500/20 text-blue-400 px-3 py-2 rounded hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
                      title="Edit Exercise"
                    >
                      <FaEdit className="mr-1" />
                      Edit
                    </Link>
                    <Link
                      to={`/exercise/${exercise._id}/control`}
                      className="flex items-center bg-green-500/20 text-green-400 px-3 py-2 rounded hover:bg-green-500/30 border border-green-500/30 transition-colors"
                      title="Control Exercise"
                    >
                      <FaPlay className="mr-1" />
                      Control
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(exercise)}
                      className="flex items-center bg-red-500/20 text-red-400 px-3 py-2 rounded hover:bg-red-500/30 border border-red-500/30 transition-colors"
                      title="Delete Exercise"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className={`rounded-lg shadow-2xl p-4 border ${
            notification.type === 'success'
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Create Exercise Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 text-white">Create New Exercise</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Exercise Title *
                  </label>
                  <input
                    type="text"
                    value={newExercise.title}
                    onChange={(e) => setNewExercise({ ...newExercise, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Cyber Attack Simulation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newExercise.description}
                    onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Brief description of the exercise..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={newExercise.maxParticipants}
                    onChange={(e) => setNewExercise({ ...newExercise, maxParticipants: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateExercise}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                >
                  Create Exercise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl w-full max-w-md border border-red-700">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-500/20 p-3 rounded-full mr-4">
                  <FaTrash className="text-2xl text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Delete Exercise</h3>
              </div>

              <p className="text-gray-300 mb-2">
                Are you sure you want to delete this exercise?
              </p>
              {exerciseToDelete && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4 border border-gray-600">
                  <p className="font-bold text-white">{exerciseToDelete.title}</p>
                  <p className="text-sm text-gray-400">{exerciseToDelete.description}</p>
                </div>
              )}
              <p className="text-sm text-red-400 mb-4">
                This action cannot be undone. All exercise data, injects, and participant responses will be permanently deleted.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
                >
                  Delete Exercise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;