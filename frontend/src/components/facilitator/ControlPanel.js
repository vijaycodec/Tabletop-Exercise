import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExercise } from '../../contexts/ExerciseContext';
import { exerciseAPI, participantAPI } from '../../services/api';
import socketService from '../../services/socket';
import toast from 'react-hot-toast';
import {
  FaPlay, FaUsers, FaLock,
  FaLockOpen, FaCopy, FaArrowLeft, FaTrash, FaUserCheck, FaClipboardList,
  FaChevronDown, FaChevronRight, FaSearch, FaDesktop, FaFileAlt, FaQuestionCircle,
  FaBullseye, FaExclamationTriangle, FaNetworkWired, FaServer, FaList, FaSync
} from 'react-icons/fa';
import ParticipantNotification from './ParticipantNotification';
import { EffectivenessBadge } from '../../utils/effectivenessBadge';

const ControlPanel = () => {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const {
    currentExercise,
    participants,
    releaseInject,
    toggleResponses,
    fetchParticipants,
    getExercise
  } = useExercise();
  
  const [activeTab, setActiveTab] = useState('control');
  const [loading, setLoading] = useState(true);
  const [expandedParticipants, setExpandedParticipants] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPresentationInject, setSelectedPresentationInject] = useState(null);
  const [expandedArtifacts, setExpandedArtifacts] = useState(new Set());
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [selectedSummaryPhase, setSelectedSummaryPhase] = useState(0);

  useEffect(() => {
    if (exerciseId) {
      loadExerciseData();
    }

    return () => {
      cleanupSocketListeners();
      socketService.disconnect();
    };
  }, [exerciseId]);

  const setupSocketListeners = () => {
    console.log('🔧 Setting up socket listeners for exercise:', exerciseId);

    // Listen for new participants joining
    socketService.on('participantJoined', (data) => {
      console.log('✅ Socket event received - Participant joined:', data);
      toast.success(`${data.participant.name} joined the exercise!`);
      fetchParticipants(exerciseId);
    });

    // Listen for participant status updates
    socketService.on('participantStatusUpdated', (data) => {
      console.log('✅ Socket event received - Participant status updated:', data);
      fetchParticipants(exerciseId);
    });

    // Listen for score updates
    socketService.on('scoreUpdate', (data) => {
      console.log('✅ Socket event received - Score updated:', data);
      toast.success(`${data.name} earned ${data.pointsEarned} points!`);
      fetchParticipants(exerciseId);
    });

    console.log('✅ All socket listeners set up successfully');
  };

  const cleanupSocketListeners = () => {
    console.log('🧹 Cleaning up socket listeners');
    socketService.off('participantJoined');
    socketService.off('participantStatusUpdated');
    socketService.off('scoreUpdate');
  };

  const loadExerciseData = async () => {
    try {
      setLoading(true);
      await getExercise(exerciseId);
      await fetchParticipants(exerciseId);

      // Connect socket and set up listeners
      console.log('🔌 Connecting socket for exercise:', exerciseId);
      socketService.connect();

      // Set up listeners first
      setupSocketListeners();

      // Then join the room (this will happen when socket connects)
      socketService.joinExercise(exerciseId);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load exercise:', error);
      toast.error('Failed to load exercise data');
      setLoading(false);
    }
  };

  const handleReleaseInject = async (injectNumber) => {
    try {
      const response = await exerciseAPI.releaseInject(exerciseId, {
        injectNumber
      });
      
      if (response.data.success) {
        toast.success(`Inject ${injectNumber} released!`);
        
        // Refresh exercise data
        await getExercise(exerciseId);
      }
    } catch (error) {
      console.error('Failed to release inject:', error);
      toast.error(error.response?.data?.message || 'Failed to release inject');
    }
  };

  const handleToggleResponses = async (injectNumber, currentStatus) => {
    try {
      const response = await exerciseAPI.toggleResponses(exerciseId, {
        injectNumber,
        responsesOpen: !currentStatus
      });

      if (response.data.success) {
        toast.success(`Responses ${!currentStatus ? 'opened' : 'closed'}`);

        // Refresh exercise data
        await getExercise(exerciseId);
      }
    } catch (error) {
      console.error('Failed to toggle responses:', error);
      toast.error(error.response?.data?.message || 'Failed to toggle responses');
    }
  };

  const handleTogglePhaseProgression = async (injectNumber, currentStatus) => {
    try {
      const response = await exerciseAPI.togglePhaseProgression(exerciseId, {
        injectNumber,
        phaseProgressionLocked: !currentStatus
      });

      if (response.data.success) {
        toast.success(`Phase progression ${!currentStatus ? 'locked for discussion' : 'unlocked'}`);

        // Refresh exercise data
        await getExercise(exerciseId);
      }
    } catch (error) {
      console.error('Failed to toggle phase progression:', error);
      toast.error(error.response?.data?.message || 'Failed to toggle phase progression');
    }
  };

  const [showResetExerciseModal, setShowResetExerciseModal] = useState(false);
  const [showResetInjectModal, setShowResetInjectModal] = useState(false);
  const [resetInjectNumber, setResetInjectNumber] = useState(null);

  const handleResetExercise = async () => {
    try {
      await exerciseAPI.resetExercise(exerciseId);
      toast.success('Exercise reset! All responses and scores cleared.');
      setShowResetExerciseModal(false);
      await getExercise(exerciseId);
      await fetchParticipants(exerciseId);
    } catch (error) {
      console.error('Failed to reset exercise:', error);
      toast.error(error.response?.data?.message || 'Failed to reset exercise');
    }
  };

  const handleResetInject = async () => {
    try {
      await exerciseAPI.resetInject(exerciseId, { injectNumber: resetInjectNumber });
      toast.success(`Inject ${resetInjectNumber} reset successfully!`);
      setShowResetInjectModal(false);
      setResetInjectNumber(null);
      await getExercise(exerciseId);
      await fetchParticipants(exerciseId);
    } catch (error) {
      console.error('Failed to reset inject:', error);
      toast.error(error.response?.data?.message || 'Failed to reset inject');
    }
  };

  const handleAdmitParticipant = async (participantId) => {
    try {
      const response = await participantAPI.updateParticipantStatus(participantId, 'active');
      
      if (response.data.success) {
        toast.success('Participant admitted successfully!');
        
        // Refresh participants list
        await fetchParticipants(exerciseId);
        
        // Send socket notification
        socketService.emit('notifyParticipant', { 
          participantId,
          type: 'admitted',
          exerciseId 
        });
      }
    } catch (error) {
      console.error('Failed to admit participant:', error);
      toast.error(error.response?.data?.message || 'Failed to admit participant');
    }
  };


  const handleDeleteParticipant = async (participantId) => {
    try {
      await participantAPI.deleteParticipant(participantId);
      toast.success('Participant deleted permanently');
      setSelectedParticipants(prev => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
      await fetchParticipants(exerciseId);
    } catch (error) {
      console.error('Failed to delete participant:', error);
      toast.error(error.response?.data?.message || 'Failed to delete participant');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const participantId of selectedParticipants) {
        await participantAPI.deleteParticipant(participantId);
      }
      toast.success(`Deleted ${selectedParticipants.size} participant(s)`);
      setSelectedParticipants(new Set());
      await fetchParticipants(exerciseId);
    } catch (error) {
      console.error('Failed to delete selected:', error);
      toast.error('Failed to delete some participants');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await participantAPI.deleteAllParticipants(exerciseId);
      toast.success('All participants deleted');
      setSelectedParticipants(new Set());
      setShowDeleteAllModal(false);
      await fetchParticipants(exerciseId);
    } catch (error) {
      console.error('Failed to delete all:', error);
      toast.error(error.response?.data?.message || 'Failed to delete all participants');
    }
  };

  const toggleSelectParticipant = (participantId) => {
    setSelectedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.participantId)));
    }
  };

  const copyAccessCode = () => {
    if (currentExercise?.accessCode) {
      navigator.clipboard.writeText(currentExercise.accessCode);
      toast.success('Access code copied to clipboard!');
    }
  };

  const toggleParticipantExpansion = (participantId) => {
    setExpandedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const toggleArtifactExpansion = (artifactId) => {
    setExpandedArtifacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(artifactId)) {
        newSet.delete(artifactId);
      } else {
        newSet.add(artifactId);
      }
      return newSet;
    });
  };

  const handleViewSummary = async () => {
    try {
      const response = await exerciseAPI.getSummary(exerciseId);
      setSummaryData(response.data.summary || []);
      setSelectedSummaryPhase(0);
    } catch (error) {
      console.error('Failed to load summary:', error);
      toast.error('Failed to load summary');
    }
  };

  const getArtifactIcon = (type) => {
    switch (type) {
      case 'log':
        return <FaFileAlt className="text-blue-400" />;
      case 'alert':
        return <FaExclamationTriangle className="text-red-400" />;
      case 'network':
        return <FaNetworkWired className="text-green-400" />;
      case 'server':
        return <FaServer className="text-purple-400" />;
      default:
        return <FaList className="text-gray-400" />;
    }
  };

  const getArtifactColor = (type) => {
    switch (type) {
      case 'log':
        return 'border-blue-500/50 bg-blue-500/10';
      case 'alert':
        return 'border-red-500/50 bg-red-500/10';
      case 'network':
        return 'border-green-500/50 bg-green-500/10';
      case 'server':
        return 'border-purple-500/50 bg-purple-500/10';
      default:
        return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 border border-gray-700">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading exercise data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 border border-gray-700">
          <div className="text-center py-12">
            <h3 className="text-xl font-bold mb-4 text-white">Exercise Not Found</h3>
            <p className="text-gray-400 mb-6">The exercise data could not be loaded.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center mx-auto transition-all shadow-lg"
            >
              <FaArrowLeft className="mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl p-6 mb-6 border border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">{currentExercise?.title}</h1>
            <p className="text-gray-400">{currentExercise?.description}</p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              currentExercise.status === 'active'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {currentExercise.status}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl overflow-hidden border border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="flex">
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'summary' ? 'border-b-2 border-purple-500 text-purple-400 bg-purple-500/10' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => { setActiveTab('summary'); handleViewSummary(); }}
            >
              <FaFileAlt className="inline mr-2" />
              View Summary
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'control' ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('control')}
            >
              <FaPlay className="inline mr-2" />
              Exercise Control
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'participants' ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('participants')}
            >
              <FaUsers className="inline mr-2" />
              Participants ({participants.length})
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'responses' ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('responses')}
            >
              <FaClipboardList className="inline mr-2" />
              Responses
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'presentation' ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('presentation')}
            >
              <FaDesktop className="inline mr-2" />
              Presentation
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'control' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Exercise Control Panel</h3>
                <button
                  onClick={() => setShowResetExerciseModal(true)}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg text-sm flex items-center transition-all"
                >
                  <FaSync className="mr-1" />
                  Reset Exercise
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inject Queue */}
                <div className="bg-black/30 border border-gray-700 rounded-lg p-4">
                  <h4 className="font-bold mb-3 text-lg text-white">Inject Queue</h4>

                  {currentExercise?.injects?.length > 0 ? (
                    <div className="space-y-3">
                      {currentExercise.injects.map((inject) => (
                        <div key={inject.injectNumber} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-blue-500/50 transition-all">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <h5 className="font-semibold text-white">{inject.title}</h5>
                              <span className="text-sm text-gray-400">
                                Inject #{inject.injectNumber}
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              {!inject.isActive ? (
                                <button
                                  onClick={() => handleReleaseInject(inject.injectNumber)}
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-lg text-sm hover:from-green-600 hover:to-emerald-700 flex items-center transition-all shadow-lg"
                                >
                                  <FaPlay className="mr-1" />
                                  Release
                                </button>
                              ) : (
                                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs flex items-center border border-green-500/30">
                                  <FaPlay className="mr-1" />
                                  Active
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-300">
                                Responses: {inject.responsesOpen ? 'Open' : 'Closed'}
                              </span>
                              <button
                                onClick={() => handleToggleResponses(inject.injectNumber, inject.responsesOpen)}
                                className={`flex items-center text-sm px-2 py-1 rounded-lg transition-all ${
                                  inject.responsesOpen
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                                }`}
                              >
                                {inject.responsesOpen ? (
                                  <>
                                    <FaLock className="mr-1" />
                                    Close
                                  </>
                                ) : (
                                  <>
                                    <FaLockOpen className="mr-1" />
                                    Open
                                  </>
                                )}
                              </button>
                            </div>

                            {inject.isActive && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">
                                  Phase Progression: {inject.phaseProgressionLocked ? 'Locked' : 'Unlocked'}
                                </span>
                                <button
                                  onClick={() => handleTogglePhaseProgression(inject.injectNumber, inject.phaseProgressionLocked)}
                                  className={`flex items-center text-sm px-2 py-1 rounded-lg transition-all ${
                                    inject.phaseProgressionLocked
                                      ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
                                      : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                                  }`}
                                >
                                  {inject.phaseProgressionLocked ? (
                                    <>
                                      <FaLockOpen className="mr-1" />
                                      Unlock Discussion
                                    </>
                                  ) : (
                                    <>
                                      <FaLock className="mr-1" />
                                      Lock for Discussion
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {inject.isActive && (
                              <div className="flex justify-end mt-2 pt-2 border-t border-gray-700">
                                <button
                                  onClick={() => { setResetInjectNumber(inject.injectNumber); setShowResetInjectModal(true); }}
                                  className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-lg text-sm flex items-center transition-all"
                                >
                                  <FaSync className="mr-1" />
                                  Reset Inject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>No injects created yet.</p>
                      <button
                        onClick={() => navigate(`/exercise/${exerciseId}/build`)}
                        className="mt-2 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Go to Exercise Builder to add injects
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="bg-black/30 border border-gray-700 rounded-lg p-4">
                  <h4 className="font-bold mb-3 text-lg text-white">Quick Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-300">
                      <span>Total Injects:</span>
                      <span className="font-bold text-white">{currentExercise?.injects?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Active Injects:</span>
                      <span className="font-bold text-green-400">
                        {currentExercise?.injects?.filter(i => i.isActive).length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Active Participants:</span>
                      <span className="font-bold text-blue-400">
                        {participants.filter(p => p.status === 'active').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Waiting Participants:</span>
                      <span className="font-bold text-yellow-400">
                        {participants.filter(p => p.status === 'waiting').length}
                      </span>
                    </div>
                  </div>

                  {/* Access Code Display */}
                  {currentExercise?.accessCode && (
                    <div className="mt-6 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <h5 className="font-bold mb-1 text-blue-300">Access Code</h5>
                      <div className="flex items-center">
                        <code className="bg-gray-700 px-3 py-2 rounded-md border border-gray-600 text-lg font-mono flex-grow text-white">
                          {currentExercise.accessCode}
                        </code>
                        <button
                          onClick={copyAccessCode}
                          className="ml-2 text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                        >
                          <FaCopy className="mr-1" />
                          Copy
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Share this code with participants to join
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Participants Management</h3>
                <div className="flex items-center space-x-2">
                  {selectedParticipants.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-lg text-sm hover:from-red-600 hover:to-red-700 flex items-center transition-all shadow-lg"
                    >
                      <FaTrash className="mr-1" />
                      Delete Selected ({selectedParticipants.size})
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteAllModal(true)}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg text-sm flex items-center transition-all"
                  >
                    <FaTrash className="mr-1" />
                    Delete All
                  </button>
                  <button
                    onClick={() => fetchParticipants(exerciseId)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded-lg text-sm hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {participants.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={participants.length > 0 && selectedParticipants.size === participants.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Team
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Inject
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Score
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                      {participants.map((participant) => (
                        <tr key={participant.participantId} className={`transition-colors ${selectedParticipants.has(participant.participantId) ? 'bg-blue-500/10' : 'hover:bg-gray-700/50'}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedParticipants.has(participant.participantId)}
                              onChange={() => toggleSelectParticipant(participant.participantId)}
                              className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-white">
                            {participant.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                            {participant.team}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              participant.status === 'active'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : participant.status === 'waiting'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {participant.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                            {participant.currentInject || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-400">
                            {participant.totalScore || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                            {new Date(participant.joinedAt).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap space-x-2">
                            {participant.status === 'waiting' && (
                              <button
                                onClick={() => handleAdmitParticipant(participant.participantId)}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 py-1 rounded-lg text-xs hover:from-green-600 hover:to-emerald-700 flex items-center inline-flex transition-all shadow-lg"
                              >
                                <FaUserCheck className="mr-1" />
                                Admit
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteParticipant(participant.participantId)}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg text-xs flex items-center inline-flex transition-all"
                            >
                              <FaTrash className="mr-1" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FaUsers className="text-4xl mx-auto mb-3 text-gray-600" />
                  <p>No participants have joined yet.</p>
                  <p className="text-sm mt-1">Share the access code to invite participants.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'responses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Participant Responses</h3>
                <button
                  onClick={() => fetchParticipants(exerciseId)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded-lg text-sm hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
                >
                  Refresh
                </button>
              </div>

              {participants.filter(p => p.status === 'active' && p.responses && p.responses.length > 0).length > 0 ? (
                <div>
                  {/* Search Bar */}
                  <div className="mb-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search participants by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Accordion List */}
                  <div className="space-y-2">
                    {participants
                      .filter(p => p.status === 'active' && p.responses && p.responses.length > 0)
                      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((participant) => {
                        const isExpanded = expandedParticipants.has(participant.participantId);

                        return (
                          <div key={participant.participantId} className="bg-black/30 border border-gray-700 rounded-lg overflow-hidden">
                            {/* Clickable Header */}
                            <div
                              onClick={() => toggleParticipantExpansion(participant.participantId)}
                              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <FaChevronDown className="text-blue-400" />
                                ) : (
                                  <FaChevronRight className="text-gray-400" />
                                )}
                                <div>
                                  <h4 className="font-bold text-lg text-white">{participant.name}</h4>
                                  {participant.team && (
                                    <span className="text-sm text-gray-400">Team: {participant.team}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-xs text-gray-400">Responses</div>
                                  <div className="text-lg font-bold text-blue-400">{participant.responses.length}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-400">Total Score</div>
                                  <div className="text-lg font-bold text-green-400">{participant.totalScore || 0}</div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-700 p-4 bg-gray-800/20">
                                <div className="space-y-2">
                                  {participant.responses.map((response, idx) => {
                                    // Find the inject and phase to get question details
                                    const inject = currentExercise?.injects?.find(inj => inj.injectNumber === response.injectNumber);
                                    const phase = inject?.phases?.find(p => p.phaseNumber === response.phaseNumber);

                                    return (
                                      <div key={idx} className="p-3 rounded-lg border bg-gray-800/30 border-gray-600">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="font-semibold text-white">
                                                Inject #{response.injectNumber} - Phase {response.phaseNumber}
                                              </span>
                                              <EffectivenessBadge
                                                magnitude={response.magnitude || 'least_effective'}
                                                showDescription={true}
                                              />
                                            </div>
                                            {phase && (
                                              <div className="text-sm text-gray-400 mt-1">
                                                Q: {phase.question}
                                              </div>
                                            )}
                                            <div className="text-sm text-gray-300 mt-2">
                                              <span className="text-gray-400">Answer:</span>{' '}
                                              {Array.isArray(response.answer)
                                                ? response.answer.join(', ')
                                                : response.answer}
                                            </div>
                                            {phase?.correctAnswer && (
                                              <div className="text-sm text-gray-400 mt-1">
                                                <span>Correct Answer:</span>{' '}
                                                {Array.isArray(phase.correctAnswer)
                                                  ? phase.correctAnswer.map(optId => {
                                                      const option = phase.options?.find(o => o.id === optId);
                                                      return option?.text || optId;
                                                    }).join(', ')
                                                  : phase.correctAnswer}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right ml-4">
                                            <div className="text-lg font-bold text-blue-400">
                                              {response.pointsEarned || 0} pts
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* No Results Message */}
                  {participants
                    .filter(p => p.status === 'active' && p.responses && p.responses.length > 0)
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .length === 0 && searchQuery && (
                    <div className="text-center py-8 text-gray-400">
                      <FaSearch className="text-4xl mx-auto mb-3 text-gray-600" />
                      <p>No participants found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FaClipboardList className="text-4xl mx-auto mb-3 text-gray-600" />
                  <p>No responses submitted yet.</p>
                  <p className="text-sm mt-1">Participant responses will appear here when they submit answers.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'presentation' && (
            <div>
              <h3 className="text-xl font-bold mb-4 text-white">Presentation Mode</h3>
              <p className="text-gray-400 mb-6">
                Use this view to present the exercise content to participants during discussions and reviews.
              </p>

              {/* Inject Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Inject to Present
                </label>
                <select
                  value={selectedPresentationInject || ''}
                  onChange={(e) => {
                    setSelectedPresentationInject(e.target.value ? parseInt(e.target.value) : null);
                    setExpandedArtifacts(new Set());
                    setSelectedPhase(1);
                  }}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors text-lg"
                >
                  <option value="">-- Select an Inject --</option>
                  {currentExercise?.injects?.filter(inject => inject.isActive).map((inject) => (
                    <option key={inject.injectNumber} value={inject.injectNumber}>
                      Inject #{inject.injectNumber} - {inject.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Inject Display */}
              {selectedPresentationInject && (() => {
                const inject = currentExercise?.injects?.find(inj => inj.injectNumber === selectedPresentationInject);

                if (!inject) {
                  return (
                    <div className="text-center py-8 text-gray-400">
                      <p>Selected inject not found.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Inject Title and Narrative */}
                    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 rounded-lg p-6 shadow-xl">
                      <div className="flex items-center mb-3">
                        <FaBullseye className="text-3xl text-blue-400 mr-3" />
                        <div>
                          <h2 className="text-3xl font-bold text-white">{inject.title}</h2>
                          <span className="text-blue-300 text-lg">Inject #{inject.injectNumber}</span>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-black/30 rounded-lg border border-blue-500/30">
                        <h4 className="text-lg font-semibold text-blue-300 mb-2">Scenario Narrative</h4>
                        <p className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">
                          {inject.narrative}
                        </p>
                      </div>
                    </div>

                    {/* Artifacts Section */}
                    {inject.artifacts && inject.artifacts.length > 0 && (
                      <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                          <FaFileAlt className="mr-3 text-green-400" />
                          Evidence & Artifacts ({inject.artifacts.length})
                        </h3>
                        <div className="space-y-3">
                          {inject.artifacts.map((artifact, idx) => {
                            const artifactId = `artifact-${inject.injectNumber}-${idx}`;
                            const isExpanded = expandedArtifacts.has(artifactId);

                            return (
                              <div
                                key={idx}
                                className={`border-2 rounded-lg overflow-hidden transition-all ${getArtifactColor(artifact.type)}`}
                              >
                                <div
                                  onClick={() => toggleArtifactExpansion(artifactId)}
                                  className="flex justify-between items-center p-4 cursor-pointer hover:bg-black/20 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                      <FaChevronDown className="text-xl text-blue-400" />
                                    ) : (
                                      <FaChevronRight className="text-xl text-gray-400" />
                                    )}
                                    {getArtifactIcon(artifact.type)}
                                    <div>
                                      <h4 className="font-bold text-xl text-white">{artifact.title}</h4>
                                      <span className="text-sm text-gray-300 uppercase tracking-wide">
                                        Type: {artifact.type}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="border-t-2 border-current p-5 bg-black/30">
                                    <pre className="text-gray-200 text-base whitespace-pre-wrap font-mono bg-gray-900/50 p-4 rounded-lg border border-gray-600 overflow-x-auto">
                                      {artifact.content}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Phases Section */}
                    {inject.phases && inject.phases.length > 0 && (
                      <div className="bg-black/30 border border-gray-700 rounded-lg p-6">
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                          <FaQuestionCircle className="mr-3 text-yellow-400" />
                          Decision Phases ({inject.phases.length})
                        </h3>

                        {/* Phase Selector Dropdown */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Select Phase to Present
                          </label>
                          <select
                            value={selectedPhase}
                            onChange={(e) => setSelectedPhase(parseInt(e.target.value))}
                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500 transition-colors text-lg"
                          >
                            {inject.phases.map((phase) => (
                              <option key={phase.phaseNumber} value={phase.phaseNumber}>
                                Phase {phase.phaseNumber} - {phase.phaseName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selected Phase Content */}
                        {(() => {
                          const phase = inject.phases.find(p => p.phaseNumber === selectedPhase);

                          if (!phase) {
                            return (
                              <div className="text-center py-8 text-gray-400">
                                <p>Selected phase not found.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="border-2 border-yellow-500/50 bg-yellow-500/10 rounded-lg overflow-hidden">
                              {/* Phase Header */}
                              <div className="p-5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold text-xl">
                                    Phase {phase.phaseNumber}
                                  </span>
                                  <span className="text-sm text-gray-300 bg-black/30 px-3 py-1 rounded-full border border-gray-600">
                                    {phase.questionType === 'single' ? 'Single Choice' : phase.questionType === 'multiple' ? 'Multiple Choice' : 'Text Response'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-2xl text-white mt-2">
                                  {phase.question}
                                </h4>
                              </div>

                              {/* Phase Content */}
                              <div className="p-5 bg-black/30">
                                {(phase.questionType === 'single' || phase.questionType === 'multiple') && phase.options && (
                                  <div className="space-y-3">
                                    <h5 className="text-lg font-semibold text-yellow-300 mb-3">
                                      Response Options:
                                    </h5>
                                    {phase.options.map((option, optIdx) => (
                                      <div
                                        key={option.id || optIdx}
                                        className="p-4 bg-gray-800/50 border-2 border-gray-600 rounded-lg hover:border-blue-500/50 transition-all"
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-sm font-mono border border-blue-500/30">
                                                {String.fromCharCode(65 + optIdx)}
                                              </span>
                                              <span className="text-white text-lg font-medium">
                                                {option.text}
                                              </span>
                                            </div>
                                            {option.feedback && (
                                              <p className="text-gray-300 text-base mt-2 pl-10">
                                                <span className="text-gray-400 font-semibold">Feedback:</span> {option.feedback}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex-shrink-0">
                                            <EffectivenessBadge
                                              magnitude={option.magnitude || 'least_effective'}
                                              showDescription={true}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {phase.questionType === 'text' && (
                                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                    <p className="text-blue-300 text-lg">
                                      This is a text response question. Participants will provide their own answers.
                                    </p>
                                  </div>
                                )}

                                {/* Correct Answer Display */}
                                {phase.correctAnswer && (phase.questionType === 'single' || phase.questionType === 'multiple') && (
                                  <div className="mt-4 p-4 bg-green-500/10 border-2 border-green-500/50 rounded-lg">
                                    <h5 className="text-lg font-bold text-green-300 mb-2 flex items-center">
                                      <FaBullseye className="mr-2" />
                                      Correct Answer(s):
                                    </h5>
                                    <div className="space-y-2">
                                      {(Array.isArray(phase.correctAnswer) ? phase.correctAnswer : [phase.correctAnswer]).map((answerId) => {
                                        const option = phase.options?.find(o => o.id === answerId);
                                        if (!option) return null;
                                        const optIdx = phase.options.indexOf(option);
                                        return (
                                          <div key={answerId} className="flex items-center gap-3 text-white text-lg">
                                            <span className="bg-green-500 text-black px-2 py-1 rounded font-mono font-bold">
                                              {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            <span>{option.text}</span>
                                            <EffectivenessBadge
                                              magnitude={option.magnitude || 'least_effective'}
                                              showDescription={false}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* No Content Message */}
                    {(!inject.artifacts || inject.artifacts.length === 0) &&
                     (!inject.phases || inject.phases.length === 0) && (
                      <div className="text-center py-12 text-gray-400 bg-black/30 border border-gray-700 rounded-lg">
                        <FaFileAlt className="text-4xl mx-auto mb-3 text-gray-600" />
                        <p>This inject has no artifacts or phases configured yet.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* No Inject Selected */}
              {!selectedPresentationInject && (
                <div className="text-center py-12 text-gray-400 bg-black/30 border border-gray-700 rounded-lg">
                  <FaDesktop className="text-5xl mx-auto mb-4 text-gray-600" />
                  <p className="text-xl mb-2">Select an inject from the dropdown above to begin presenting.</p>
                  <p className="text-sm">
                    Only active injects are available for presentation.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div>
              <h3 className="text-xl font-bold mb-4 text-white">Exercise Summary</h3>
              <p className="text-gray-400 mb-6">
                View the exercise drill presentation phases and content.
              </p>

              {summaryData.length === 0 ? (
                <div className="flex items-center justify-center p-12 text-gray-400 bg-black/30 border border-gray-700 rounded-lg">
                  <div className="text-center">
                    <FaFileAlt className="text-5xl mx-auto mb-4 text-gray-600" />
                    <p className="text-lg">No summary phases have been added yet.</p>
                    <p className="text-sm mt-2">Go to Dashboard → Summary to add presentation phases.</p>
                  </div>
                </div>
              ) : (
                <div className="flex bg-black/30 border border-gray-700 rounded-lg overflow-hidden" style={{ minHeight: '500px' }}>
                  {/* Phase Navigation Sidebar */}
                  <div className="w-64 bg-black/30 border-r border-gray-700 p-4 overflow-y-auto">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">Phases</h4>
                    <div className="space-y-2">
                      {summaryData.map((phase, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSummaryPhase(index)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                            selectedSummaryPhase === index
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-transparent'
                          }`}
                        >
                          <div className="text-xs text-gray-500 mb-1">Phase {phase.phaseNumber}</div>
                          <div className="font-medium text-sm line-clamp-2">{phase.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phase Content */}
                  <div className="flex-1 p-8 overflow-y-auto">
                    {summaryData[selectedSummaryPhase] && (
                      <div>
                        <div className="mb-6">
                          <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded text-sm font-semibold border border-purple-500/30">
                            Phase {summaryData[selectedSummaryPhase].phaseNumber}
                          </span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-6">
                          {summaryData[selectedSummaryPhase].title}
                        </h2>
                        <div
                          className="summary-content"
                          dangerouslySetInnerHTML={{ __html: summaryData[selectedSummaryPhase].description }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Navigation */}
              {summaryData.length > 0 && (
                <div className="mt-4 flex justify-between items-center">
                  <button
                    onClick={() => setSelectedSummaryPhase(prev => Math.max(0, prev - 1))}
                    disabled={selectedSummaryPhase === 0}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous Phase
                  </button>
                  <span className="text-gray-400">
                    Phase {selectedSummaryPhase + 1} of {summaryData.length}
                  </span>
                  <button
                    onClick={() => setSelectedSummaryPhase(prev => Math.min(summaryData.length - 1, prev + 1))}
                    disabled={selectedSummaryPhase === summaryData.length - 1}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next Phase →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reset Exercise Modal */}
      {showResetExerciseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-500/20 p-3 rounded-full">
                <FaExclamationTriangle className="text-red-400 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reset Exercise</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Resetting will clear all inject states, participant responses, and scores. All injects will be set back to unreleased state.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowResetExerciseModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetExercise}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
              >
                Reset Exercise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Inject Modal */}
      {showResetInjectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-orange-500/20 p-3 rounded-full">
                <FaExclamationTriangle className="text-orange-400 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reset Inject #{resetInjectNumber}</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              Resetting will clear this inject's state and all participant responses for this inject. Scores will be recalculated.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowResetInjectModal(false); setResetInjectNumber(null); }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetInject}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-semibold"
              >
                Reset Inject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Participants Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-500/20 p-3 rounded-full">
                <FaExclamationTriangle className="text-red-400 text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete All Participants</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              This will permanently delete all {participants.length} participant(s) and their responses from this exercise.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Admission Notification */}
      <ParticipantNotification
        waitingParticipants={participants.filter(p => p.status === 'waiting')}
        onUpdate={() => fetchParticipants(exerciseId)}
      />
    </div>
  );
};

export default ControlPanel;