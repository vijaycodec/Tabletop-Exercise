import React, { useState, useEffect } from 'react';
import { FaUserCheck, FaTimes, FaUsers } from 'react-icons/fa';
import { participantAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ParticipantNotification = ({ waitingParticipants, onUpdate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (waitingParticipants && waitingParticipants.length > 0) {
      setIsVisible(true);
      setCurrentIndex(0);
    } else {
      setIsVisible(false);
    }
  }, [waitingParticipants]);

  const handleAdmit = async (participantId) => {
    try {
      await participantAPI.updateParticipantStatus(participantId, 'active');
      toast.success('Participant admitted!');
      moveToNext();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to admit participant');
    }
  };

  const handleReject = async (participantId) => {
    try {
      await participantAPI.updateParticipantStatus(participantId, 'left');
      toast.success('Participant rejected');
      moveToNext();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to reject participant');
    }
  };

  const moveToNext = () => {
    if (currentIndex < waitingParticipants.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsVisible(false);
    }
  };

  const dismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !waitingParticipants || waitingParticipants.length === 0) {
    return null;
  }

  const currentParticipant = waitingParticipants[currentIndex];
  if (!currentParticipant || !currentParticipant.name) {
    return null;
  }
  const remainingCount = waitingParticipants.length - currentIndex;

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl shadow-2xl p-5 min-w-[400px] max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/20 p-2 rounded-full">
              <FaUsers className="text-blue-400 text-lg" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Participant Requesting to Join</h3>
              {remainingCount > 1 && (
                <p className="text-gray-400 text-sm">{remainingCount} participants waiting</p>
              )}
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Participant Info */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {currentParticipant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{currentParticipant.name}</p>
              {currentParticipant.team && (
                <p className="text-gray-400 text-sm">Team: {currentParticipant.team}</p>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Joined: {new Date(currentParticipant.joinedAt).toLocaleTimeString()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => handleReject(currentParticipant.participantId)}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <FaTimes />
            <span>Reject</span>
          </button>
          <button
            onClick={() => handleAdmit(currentParticipant.participantId)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg"
          >
            <FaUserCheck />
            <span>Admit</span>
          </button>
        </div>

        {/* Progress Indicator */}
        {remainingCount > 1 && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Participant {currentIndex + 1} of {waitingParticipants.length}</span>
              <div className="flex space-x-1">
                {waitingParticipants.slice(0, 5).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx === currentIndex ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
                {waitingParticipants.length > 5 && (
                  <span className="text-gray-500 ml-1">+{waitingParticipants.length - 5}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantNotification;
