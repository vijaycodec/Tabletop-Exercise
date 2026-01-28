import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { participantAPI } from '../services/api';
import { FaUsers, FaArrowRight } from 'react-icons/fa';

const JoinExercise = () => {
  const [formData, setFormData] = useState({
    accessCode: '',
    name: '',
    team: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await participantAPI.joinExercise(formData);
      
      // Save participant ID to localStorage
      localStorage.setItem('participantId', response.data.participant.participantId);
      
      // Navigate to participant dashboard
      navigate(`/exercise/${response.data.participant.exerciseId}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to join exercise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUsers className="text-3xl text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Join Exercise</h2>
          <p className="text-gray-400">Enter the access code provided by your facilitator</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Access Code *
            </label>
            <input
              type="text"
              value={formData.accessCode}
              onChange={(e) => setFormData({ ...formData, accessCode: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              placeholder="XXXXXX"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="John Doe"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Team Name (Optional)
            </label>
            <input
              type="text"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Team Alpha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 flex items-center justify-center font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Joining...
              </>
            ) : (
              <>
                Join Exercise
                <FaArrowRight className="ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <h3 className="font-bold mb-2 text-blue-300">How to join:</h3>
          <ol className="list-decimal pl-5 text-sm text-gray-300 space-y-1">
            <li>Get the access code from your facilitator</li>
            <li>Enter the code above</li>
            <li>Wait for the facilitator to admit you</li>
            <li>Start participating in the exercise</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default JoinExercise;