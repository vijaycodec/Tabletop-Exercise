import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExercise } from '../../contexts/ExerciseContext';
import { exerciseAPI, participantAPI } from '../../services/api';
import socketService from '../../services/socket';
import toast from 'react-hot-toast';
import {
  FaPlay, FaUsers, FaLock,
  FaLockOpen, FaCopy, FaArrowLeft, FaTrash, FaUserCheck, FaClipboardList,
  FaChevronDown, FaChevronRight, FaSearch, FaDesktop, FaFileAlt,
  FaExclamationTriangle, FaNetworkWired, FaServer, FaList, FaSync,
  FaEye, FaEyeSlash, FaCheck
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
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

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

    // Listen for participant disconnections
    socketService.on('participantDisconnected', (data) => {
      console.log('⚠️ Socket event received - Participant disconnected:', data);
      toast(`${data.name} has left the exercise`, { icon: '👋' });
      fetchParticipants(exerciseId);
    });

    // Listen for participant reconnections
    socketService.on('participantRejoined', (data) => {
      console.log('🔄 Socket event received - Participant rejoined:', data);
      toast.success(`${data.name} has rejoined the exercise`);
      fetchParticipants(exerciseId);
    });

    console.log('✅ All socket listeners set up successfully');
  };

  const cleanupSocketListeners = () => {
    console.log('🧹 Cleaning up socket listeners');
    socketService.off('participantJoined');
    socketService.off('participantStatusUpdated');
    socketService.off('scoreUpdate');
    socketService.off('participantDisconnected');
    socketService.off('participantRejoined');
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
        return <FaFileAlt className="text-gray-400" />;
      case 'alert':
        return <FaExclamationTriangle className="text-gray-400" />;
      case 'network':
        return <FaNetworkWired className="text-gray-400" />;
      case 'server':
        return <FaServer className="text-gray-400" />;
      default:
        return <FaList className="text-gray-400" />;
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
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center mx-auto transition-all"
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
                ? 'bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400/80 border border-amber-500/20'
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
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'summary' ? 'border-b-2 border-blue-400/80 text-white bg-gray-700/30' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => { setActiveTab('summary'); handleViewSummary(); }}
            >
              <FaFileAlt className="inline mr-2" />
              View Summary
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'control' ? 'border-b-2 border-blue-400/80 text-white bg-gray-700/30' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('control')}
            >
              <FaPlay className="inline mr-2" />
              Exercise Control
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'participants' ? 'border-b-2 border-blue-400/80 text-white bg-gray-700/30' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('participants')}
            >
              <FaUsers className="inline mr-2" />
              Participants ({participants.length})
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'responses' ? 'border-b-2 border-blue-400/80 text-white bg-gray-700/30' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => setActiveTab('responses')}
            >
              <FaClipboardList className="inline mr-2" />
              Responses
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all ${activeTab === 'presentation' ? 'border-b-2 border-blue-400/80 text-white bg-gray-700/30' : 'text-gray-400 hover:text-gray-200'}`}
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
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400/80 border border-red-500/20 px-3 py-1 rounded-lg text-sm flex items-center transition-all"
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
                        <div key={inject.injectNumber} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-all">
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
                                  className="bg-blue-600/80 hover:bg-blue-500/80 text-white px-3 py-1 rounded-lg text-sm flex items-center transition-all"
                                >
                                  <FaPlay className="mr-1" />
                                  Release
                                </button>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-400/80 px-2 py-1 rounded text-xs flex items-center border border-emerald-500/20">
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
                                    ? 'bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/20 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 border border-emerald-500/20'
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
                                      ? 'bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/20 border border-amber-500/20'
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
                                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400/80 border border-red-500/20 px-2 py-1 rounded-lg text-sm flex items-center transition-all"
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
                        className="mt-2 text-gray-400 hover:text-gray-300 transition-colors"
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
                      <span className="font-bold text-white">
                        {currentExercise?.injects?.filter(i => i.isActive).length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Active Participants:</span>
                      <span className="font-bold text-white">
                        {participants.filter(p => p.status === 'active').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Waiting Participants:</span>
                      <span className="font-bold text-white">
                        {participants.filter(p => p.status === 'waiting').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Left:</span>
                      <span className="font-bold text-white">
                        {participants.filter(p => p.status === 'left').length}
                      </span>
                    </div>
                  </div>

                  {/* Access Code Display */}
                  {currentExercise?.accessCode && (
                    <div className="mt-6 p-3 bg-gray-800/60 rounded-lg border border-gray-600">
                      <h5 className="font-bold mb-1 text-gray-300">Access Code</h5>
                      <div className="flex items-center">
                        <code className="bg-gray-700 px-3 py-2 rounded-md border border-gray-600 text-lg font-mono flex-grow text-white">
                          {currentExercise.accessCode}
                        </code>
                        <button
                          onClick={copyAccessCode}
                          className="ml-2 text-gray-400 hover:text-gray-300 flex items-center transition-colors"
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
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400/80 border border-red-500/20 px-3 py-1 rounded-lg text-sm flex items-center transition-all"
                    >
                      <FaTrash className="mr-1" />
                      Delete Selected ({selectedParticipants.size})
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteAllModal(true)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400/80 border border-red-500/20 px-3 py-1 rounded-lg text-sm flex items-center transition-all"
                  >
                    <FaTrash className="mr-1" />
                    Delete All
                  </button>
                  <button
                    onClick={() => fetchParticipants(exerciseId)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm transition-all"
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
                            className="w-4 h-4 rounded border-gray-600 accent-gray-400 focus:ring-gray-500 bg-gray-700"
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
                        <tr key={participant.participantId} className={`transition-colors ${selectedParticipants.has(participant.participantId) ? 'bg-gray-700/30' : 'hover:bg-gray-700/50'}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedParticipants.has(participant.participantId)}
                              onChange={() => toggleSelectParticipant(participant.participantId)}
                              className="w-4 h-4 rounded border-gray-600 accent-gray-400 focus:ring-gray-500 bg-gray-700"
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
                                ? 'bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20'
                                : participant.status === 'waiting'
                                ? 'bg-amber-500/10 text-amber-400/80 border border-amber-500/20'
                                : participant.status === 'left'
                                ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                : participant.status === 'completed'
                                ? 'bg-sky-500/10 text-sky-400/80 border border-sky-500/20'
                                : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            }`}>
                              {participant.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                            {participant.currentInject || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-bold text-white">
                            {participant.totalScore || 0}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                            {new Date(participant.joinedAt).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap space-x-2">
                            {participant.status === 'waiting' && (
                              <button
                                onClick={() => handleAdmitParticipant(participant.participantId)}
                                className="bg-blue-600/80 hover:bg-blue-500/80 text-white px-2 py-1 rounded-lg text-xs flex items-center inline-flex transition-all"
                              >
                                <FaUserCheck className="mr-1" />
                                Admit
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteParticipant(participant.participantId)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400/80 border border-red-500/20 px-2 py-1 rounded-lg text-xs flex items-center inline-flex transition-all"
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
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm transition-all"
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
                      className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/50 transition-colors"
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
                                  <FaChevronDown className="text-gray-300" />
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
                                  <div className="text-lg font-bold text-white">{participant.responses.length}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-400">Total Score</div>
                                  <div className="text-lg font-bold text-white">{participant.totalScore || 0}</div>
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
                                            <div className="text-lg font-bold text-white">
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
              {/* Header Row */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Presentation Mode</h3>
                  <p className="text-gray-500 text-sm mt-1">Present exercise content to participants during discussions.</p>
                </div>
                <select
                  value={selectedPresentationInject || ''}
                  onChange={(e) => {
                    setSelectedPresentationInject(e.target.value ? parseInt(e.target.value) : null);
                    setExpandedArtifacts(new Set());
                    setSelectedPhase(1);
                    setShowCorrectAnswers(false);
                  }}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/50 transition-colors"
                >
                  <option value="">Select Inject</option>
                  {currentExercise?.injects?.filter(inject => inject.isActive).map((inject) => (
                    <option key={inject.injectNumber} value={inject.injectNumber}>
                      Inject #{inject.injectNumber} — {inject.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Inject Display */}
              {selectedPresentationInject && (() => {
                const inject = currentExercise?.injects?.find(inj => inj.injectNumber === selectedPresentationInject);

                if (!inject) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <p>Selected inject not found.</p>
                    </div>
                  );
                }

                // Count responses for this inject
                const respondedCount = participants.filter(p =>
                  p.status === 'active' && p.responses?.some(r => r.injectNumber === inject.injectNumber && r.phaseNumber === selectedPhase)
                ).length;
                const activeCount = participants.filter(p => p.status === 'active').length;

                return (
                  <div className="space-y-5">
                    {/* Inject Header */}
                    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inject #{inject.injectNumber}</span>
                          <h2 className="text-2xl font-bold text-white mt-1">{inject.title}</h2>
                        </div>
                        <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-xs font-medium">
                          {inject.phases?.length || 0} Phases · {inject.artifacts?.length || 0} Artifacts
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                          {inject.narrative}
                        </p>
                      </div>
                    </div>

                    {/* Artifacts Section */}
                    {inject.artifacts && inject.artifacts.length > 0 && (
                      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-5">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                          Evidence & Artifacts
                        </h4>
                        <div className="space-y-2">
                          {inject.artifacts.map((artifact, idx) => {
                            const artifactId = `artifact-${inject.injectNumber}-${idx}`;
                            const isExpanded = expandedArtifacts.has(artifactId);

                            return (
                              <div
                                key={idx}
                                className="border border-gray-700 rounded-lg overflow-hidden"
                              >
                                <div
                                  onClick={() => toggleArtifactExpansion(artifactId)}
                                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                                >
                                  {isExpanded ? (
                                    <FaChevronDown className="text-sm text-gray-400" />
                                  ) : (
                                    <FaChevronRight className="text-sm text-gray-500" />
                                  )}
                                  {getArtifactIcon(artifact.type)}
                                  <span className="font-medium text-white">{artifact.title}</span>
                                  <span className="text-xs text-gray-500 uppercase ml-auto">{artifact.type}</span>
                                </div>

                                {isExpanded && (
                                  <div className="border-t border-gray-700 p-4 bg-gray-900/40">
                                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono bg-black/30 p-4 rounded border border-gray-700 overflow-x-auto">
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
                      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-5">
                        {/* Phase Header with selector and controls */}
                        <div className="flex items-center justify-between mb-5">
                          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            Decision Phases
                          </h4>
                          <div className="flex items-center gap-3">
                            {/* Response counter */}
                            <span className="text-xs text-gray-500">
                              {respondedCount}/{activeCount} responded
                            </span>
                            {/* Reveal answer toggle */}
                            <button
                              onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                showCorrectAnswers
                                  ? 'bg-gray-600 text-white'
                                  : 'bg-gray-800 text-gray-400 border border-gray-600 hover:border-gray-500'
                              }`}
                            >
                              {showCorrectAnswers ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                              {showCorrectAnswers ? 'Hide Answers' : 'Reveal Answers'}
                            </button>
                          </div>
                        </div>

                        {/* Phase tabs */}
                        <div className="flex gap-1 mb-5 bg-gray-900/40 p-1 rounded-lg">
                          {inject.phases.map((phase) => (
                            <button
                              key={phase.phaseNumber}
                              onClick={() => { setSelectedPhase(phase.phaseNumber); setShowCorrectAnswers(false); }}
                              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                                selectedPhase === phase.phaseNumber
                                  ? 'bg-gray-700 text-white'
                                  : 'text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              Phase {phase.phaseNumber}
                            </button>
                          ))}
                        </div>

                        {/* Selected Phase Content */}
                        {(() => {
                          const phase = inject.phases.find(p => p.phaseNumber === selectedPhase);

                          if (!phase) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <p>Selected phase not found.</p>
                              </div>
                            );
                          }

                          // Determine correct answer IDs for highlighting
                          const correctIds = phase.correctAnswer
                            ? (Array.isArray(phase.correctAnswer) ? phase.correctAnswer : [phase.correctAnswer])
                            : [];

                          return (
                            <div>
                              {/* Question */}
                              <div className="mb-5">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {phase.questionType === 'single' ? 'Single Choice' : phase.questionType === 'multiple' ? 'Multiple Choice' : 'Text Response'}
                                  </span>
                                </div>
                                <h4 className="text-xl font-semibold text-white leading-snug">
                                  {phase.question}
                                </h4>
                              </div>

                              {/* Options */}
                              {(phase.questionType === 'single' || phase.questionType === 'multiple') && phase.options && (
                                <div className="space-y-2">
                                  {phase.options.map((option, optIdx) => {
                                    const isCorrect = correctIds.includes(option.id);
                                    const showAsCorrect = showCorrectAnswers && isCorrect;
                                    const showAsIncorrect = showCorrectAnswers && !isCorrect;

                                    return (
                                      <div
                                        key={option.id || optIdx}
                                        className={`p-4 rounded-lg border transition-all ${
                                          showAsCorrect
                                            ? 'bg-emerald-500/5 border-emerald-500/25'
                                            : showAsIncorrect
                                            ? 'bg-gray-800/30 border-gray-700/40 opacity-50'
                                            : 'bg-gray-800/40 border-gray-700'
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <span className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                                            showAsCorrect
                                              ? 'bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20'
                                              : 'bg-gray-700 text-gray-300 border border-gray-600'
                                          }`}>
                                            {showAsCorrect ? <FaCheck className="text-xs" /> : String.fromCharCode(65 + optIdx)}
                                          </span>
                                          <div className="flex-1">
                                            <span className="text-white text-base font-medium">
                                              {option.text}
                                            </span>
                                            {showCorrectAnswers && option.feedback && (
                                              <p className="text-gray-400 text-sm mt-2">
                                                {option.feedback}
                                              </p>
                                            )}
                                          </div>
                                          {showCorrectAnswers && (
                                            <div className="flex-shrink-0">
                                              <EffectivenessBadge
                                                magnitude={option.magnitude || 'least_effective'}
                                                showDescription={false}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {phase.questionType === 'text' && (
                                <div className="p-4 bg-gray-800/40 border border-gray-700 rounded-lg">
                                  <p className="text-gray-400">
                                    Open-ended response — participants will provide their own written answers.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* No Content */}
                    {(!inject.artifacts || inject.artifacts.length === 0) &&
                     (!inject.phases || inject.phases.length === 0) && (
                      <div className="text-center py-12 text-gray-500 bg-gray-800/40 border border-gray-700 rounded-lg">
                        <FaFileAlt className="text-3xl mx-auto mb-3 text-gray-600" />
                        <p>This inject has no artifacts or phases configured yet.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* No Inject Selected */}
              {!selectedPresentationInject && (
                <div className="text-center py-16 text-gray-500">
                  <FaDesktop className="text-4xl mx-auto mb-4 text-gray-600" />
                  <p className="text-lg">Select an inject to begin presenting.</p>
                  <p className="text-sm mt-1 text-gray-600">
                    Only active injects are available.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div>
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Exercise Summary</h3>
                  <p className="text-gray-500 text-sm mt-1">Review drill presentation phases and content.</p>
                </div>
                {summaryData.length > 0 && (
                  <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-xs font-medium">
                    {summaryData.length} {summaryData.length === 1 ? 'Phase' : 'Phases'}
                  </span>
                )}
              </div>

              {summaryData.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <FaFileAlt className="text-4xl mx-auto mb-4 text-gray-600" />
                  <p className="text-lg">No summary phases have been added yet.</p>
                  <p className="text-sm mt-1 text-gray-600">Go to Dashboard to add presentation phases.</p>
                </div>
              ) : (
                <div className="flex bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden" style={{ minHeight: '500px' }}>
                  {/* Phase Navigation Sidebar */}
                  <div className="w-60 border-r border-gray-700 overflow-y-auto">
                    <div className="p-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">Phases</h4>
                      <div className="space-y-1">
                        {summaryData.map((phase, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedSummaryPhase(index)}
                            className={`w-full text-left px-3 py-3 rounded-lg transition-all ${
                              selectedSummaryPhase === index
                                ? 'bg-blue-600/10 text-white border border-blue-500/20'
                                : 'text-gray-400 hover:bg-gray-700/40 hover:text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                                selectedSummaryPhase === index
                                  ? 'bg-blue-600/20 text-blue-400/80'
                                  : 'bg-gray-800 text-gray-500 border border-gray-700'
                              }`}>
                                {phase.phaseNumber}
                              </span>
                              <span className="font-medium text-sm line-clamp-2">{phase.title}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Phase Content */}
                  <div className="flex-1 overflow-y-auto">
                    {summaryData[selectedSummaryPhase] && (
                      <div className="p-8">
                        <div className="flex items-center gap-3 mb-5">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phase {summaryData[selectedSummaryPhase].phaseNumber}
                          </span>
                          <span className="text-gray-700">·</span>
                          <span className="text-xs text-gray-500">
                            {selectedSummaryPhase + 1} of {summaryData.length}
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-6 leading-snug">
                          {summaryData[selectedSummaryPhase].title}
                        </h2>
                        <div className="border-t border-gray-700 pt-6">
                          <div
                            className="summary-content"
                            dangerouslySetInnerHTML={{ __html: summaryData[selectedSummaryPhase].description }}
                          />
                        </div>
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
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 hover:border-gray-500 text-gray-300 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    {selectedSummaryPhase + 1} / {summaryData.length}
                  </span>
                  <button
                    onClick={() => setSelectedSummaryPhase(prev => Math.min(summaryData.length - 1, prev + 1))}
                    disabled={selectedSummaryPhase === summaryData.length - 1}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
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
              <div className="bg-red-500/10 p-3 rounded-full">
                <FaExclamationTriangle className="text-red-400/80 text-xl" />
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
                className="flex-1 px-4 py-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-lg transition-colors font-semibold"
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
              <div className="bg-red-500/10 p-3 rounded-full">
                <FaExclamationTriangle className="text-red-400/80 text-xl" />
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
                className="flex-1 px-4 py-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-lg transition-colors font-semibold"
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
              <div className="bg-red-500/10 p-3 rounded-full">
                <FaExclamationTriangle className="text-red-400/80 text-xl" />
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
                className="flex-1 px-4 py-2 bg-red-600/80 hover:bg-red-500/80 text-white rounded-lg transition-colors font-semibold"
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