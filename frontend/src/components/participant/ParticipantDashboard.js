import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import socketService from '../../services/socket';
import { participantAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FaFileAlt, FaLock, FaLockOpen,
  FaCheckCircle, FaClock, FaFlag, FaExclamationTriangle,
  FaDesktop, FaServer, FaNetworkWired, FaUserShield, FaQuestionCircle
} from 'react-icons/fa';
import { EffectivenessBadge } from '../../utils/effectivenessBadge';

const ParticipantDashboard = () => {
  const { exerciseId } = useParams();
  const [exerciseData, setExerciseData] = useState(null);
  const [participantData, setParticipantData] = useState(null);
  const [currentInject, setCurrentInject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [currentPhaseNumber, setCurrentPhaseNumber] = useState(1);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);
  const [phaseProgressionLocked, setPhaseProgressionLocked] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [pendingInject, setPendingInject] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    const participantId = localStorage.getItem('participantId');

    if (participantId && exerciseId) {
      console.log('🚀 Initializing participant dashboard for:', participantId);

      // Fetch exercise data
      fetchExerciseData(participantId);

      // Connect to socket
      console.log('🔌 Connecting socket...');
      socketService.connect();

      // Track connection status
      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);
      socketService.on('connect', onConnect);
      socketService.on('disconnect', onDisconnect);
      if (socketService.isConnected) setSocketConnected(true);

      // Set up all socket event listeners FIRST
      console.log('🔧 Setting up socket event listeners...');
      socketService.on('injectReleased', handleInjectReleased);
      socketService.on('responsesToggled', handleResponsesToggled);
      socketService.on('phaseProgressionToggled', handlePhaseProgressionToggled);
      socketService.on('scoreUpdate', handleScoreUpdate);
      socketService.on('participantAdmitted', handleParticipantAdmitted);
      console.log('✅ Socket listeners configured');

      // Join rooms (will join when socket connects)
      socketService.joinAsParticipant(participantId);
      socketService.joinExercise(exerciseId);

      // Start timer
      const timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);

      return () => {
        console.log('🧹 Cleaning up participant dashboard');
        clearInterval(timer);
        socketService.off('connect', onConnect);
        socketService.off('disconnect', onDisconnect);
        socketService.off('injectReleased');
        socketService.off('responsesToggled');
        socketService.off('phaseProgressionToggled');
        socketService.off('scoreUpdate');
        socketService.off('participantAdmitted');
        socketService.disconnect();
      };
    }
  }, [exerciseId]);

  // Countdown timer effect
  useEffect(() => {
    let countdownTimer;

    if (countdownActive && countdown > 0) {
      countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Countdown finished, load the new inject
            setCountdownActive(false);
            if (pendingInject) {
              setCurrentInject(pendingInject);
              if (pendingInject.phases) {
                setPhases(pendingInject.phases);
              }
              setCurrentPhaseNumber(1);
              setResponses({});
              setPendingInject(null);

              // Refresh participant data
              const participantId = localStorage.getItem('participantId');
              if (participantId) {
                fetchExerciseData(participantId);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }
    };
  }, [countdownActive, countdown, pendingInject]);

  const fetchExerciseData = async (participantId) => {
    try {
      console.log('Fetching exercise data...');
      const response = await participantAPI.getExerciseData(exerciseId, participantId);
      console.log('Exercise data response:', response.data);

      setExerciseData(response.data.exercise);
      setParticipantData({
        ...response.data.participant,
        responses: response.data.participant.responses || []
      });
      setCurrentInject(response.data.currentInject);

      // Get phases from current inject
      if (response.data.currentInject && response.data.currentInject.phases) {
        console.log('Phases found in inject:', response.data.currentInject.phases);
        setPhases(response.data.currentInject.phases);
      } else {
        console.log('No phases in current inject, using response phases:', response.data.phases);
        setPhases(response.data.phases || []);
      }

      // Set current phase number
      const currentPhase = response.data.currentPhaseNumber || response.data.participant?.currentPhase || 1;
      setCurrentPhaseNumber(currentPhase);
      console.log('Current phase:', currentPhase);

      // Set phase progression lock status
      setPhaseProgressionLocked(response.data.phaseProgressionLocked || false);
      console.log('Phase progression locked:', response.data.phaseProgressionLocked);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch exercise data:', error);
      setLoading(false);
    }
  };

  const handleInjectReleased = (data) => {
    console.log('Inject released:', data);

    // Store the pending inject and start countdown
    setPendingInject(data.inject);
    setCountdownActive(true);
    setCountdown(3);
  };

  const handleResponsesToggled = (data) => {
    console.log('✅ Socket event received - Responses toggled:', data);
    console.log('  Event inject:', data.injectNumber);
    console.log('  New responsesOpen state:', data.responsesOpen);

    // Update state directly - participant is in exercise-specific room so events are always relevant
    console.log('  ✅ Updating currentInject.responsesOpen to:', data.responsesOpen);
    setCurrentInject(prev => {
      if (!prev) return prev;
      // Only update if the inject number matches
      if (prev.injectNumber === data.injectNumber) {
        return {
          ...prev,
          responsesOpen: data.responsesOpen
        };
      }
      return prev;
    });

    // Show toast notification to user
    if (data.responsesOpen) {
      toast.success('Responses opened! You may now submit your answers.', {
        duration: 4000,
        icon: '🔓'
      });
    } else {
      toast.error('Responses closed. You can no longer submit answers.', {
        duration: 4000,
        icon: '🔒'
      });
    }
  };

  const handlePhaseProgressionToggled = (data) => {
    console.log('✅ Socket event received - Phase progression toggled:', data);
    console.log('  Event inject:', data.injectNumber);
    console.log('  New phaseProgressionLocked state:', data.phaseProgressionLocked);

    // Update state directly - participant is in exercise-specific room so events are always relevant
    console.log('  ✅ Updating phaseProgressionLocked to:', data.phaseProgressionLocked);
    setPhaseProgressionLocked(data.phaseProgressionLocked);

    // Update current inject as well
    setCurrentInject(prev => {
      if (!prev) return prev;
      // Only update if the inject number matches
      if (prev.injectNumber === data.injectNumber) {
        return {
          ...prev,
          phaseProgressionLocked: data.phaseProgressionLocked
        };
      }
      return prev;
    });

    // Show toast notification to user
    if (!data.phaseProgressionLocked) {
      toast.success('Phase progression unlocked! You may now proceed to the next phase.', {
        duration: 4000,
        icon: '🔓'
      });
    } else {
      toast('Phase progression locked for discussion. Please wait.', {
        duration: 4000,
        icon: '🔒',
        style: {
          background: '#f97316',
          color: '#fff'
        }
      });
    }
  };

  const handleScoreUpdate = (data) => {
    console.log('Score update:', data);
    setParticipantData(prev => {
      if (!prev) return prev;
      if (data.participantId === prev.participantId) {
        return { ...prev, totalScore: data.totalScore };
      }
      return prev;
    });
  };

  const handleParticipantAdmitted = (data) => {
    console.log('✅ Socket event received - Participant admitted:', data);
    // Show success message
    toast.success(`Welcome! You have been admitted to ${data.exerciseTitle}. Loading exercise...`, {
      duration: 5000,
      icon: '🎉'
    });
    // Refresh exercise data to update participant status
    const participantId = localStorage.getItem('participantId');
    if (participantId) {
      fetchExerciseData(participantId);
    }
  };

  const handleAnswerSelect = (phaseNumber, questionIndex, answer) => {
    console.log('Answer selected:', phaseNumber, questionIndex, answer);
    setResponses({
      ...responses,
      [`${phaseNumber}_${questionIndex}`]: answer
    });
  };

  const submitResponse = async (phaseNumber, questionIndex) => {
    const answer = responses[`${phaseNumber}_${questionIndex}`];
    if (!answer) {
      alert('Please select an answer');
      return;
    }

    // Check if responses are open
    if (!currentInject?.responsesOpen) {
      alert('Responses are currently closed by the facilitator');
      return;
    }

    try {
      const response = await participantAPI.submitResponse({
        participantId: participantData.participantId,
        exerciseId,
        injectNumber: currentInject.injectNumber,
        phaseNumber,
        questionIndex,
        answer
      });

      if (response.data.success) {
        // Create new response entry
        const newResponse = {
          injectNumber: currentInject.injectNumber,
          phaseNumber: phaseNumber,
          questionIndex: questionIndex,
          answer: answer,
          pointsEarned: response.data.pointsEarned,
          submittedAt: new Date()
        };

        // Update participant data with new response and score
        setParticipantData(prev => ({
          ...prev,
          totalScore: response.data.totalScore,
          responses: [...(prev.responses || []), newResponse]
        }));

        alert(`Response submitted! You earned ${response.data.pointsEarned} points!`);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit response');
    }
  };

  const handleNextPhase = async () => {
    if (phaseProgressionLocked) {
      alert('Phase progression is locked by the facilitator. Please wait for the discussion period to complete.');
      return;
    }

    try {
      const response = await participantAPI.nextPhase({
        participantId: participantData.participantId,
        exerciseId,
        currentInjectNumber: currentInject.injectNumber,
        currentPhaseNumber: currentPhaseNumber
      });

      if (response.data.success) {
        if (response.data.allPhasesCompleted) {
          alert('All phases completed for this inject! Waiting for next inject...');
        } else {
          setCurrentPhaseNumber(response.data.currentPhase);
          // Clear response for new phase
          setResponses({});
        }
      }
    } catch (error) {
      if (error.response?.data?.locked) {
        alert(error.response.data.message);
      } else {
        alert(error.response?.data?.message || 'Failed to move to next phase');
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading exercise data...</p>
        </div>
      </div>
    );
  }

  if (!participantData || participantData.status !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="animate-pulse">
            <FaClock className="text-5xl text-yellow-400 mx-auto mb-4" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white">Waiting for Admission</h2>
          <p className="text-gray-400 mb-6">
            You are currently on the waiting list. The facilitator will admit you soon.
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-300">
              Once admitted, you'll be able to see the exercise injects and start answering questions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FaUserShield className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{exerciseData?.title}</h1>
                <p className="text-gray-400 text-sm">{exerciseData?.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">PARTICIPANT</div>
                <div className="text-white font-semibold text-lg flex items-center gap-2">
                  {participantData?.name || 'Anonymous'}
                  {participantData?.team && <span className="text-gray-400 text-sm">({participantData.team})</span>}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">TIME</div>
                <div className="text-white font-mono font-bold text-lg flex items-center gap-2">
                  <FaClock className="text-blue-400" />
                  {formatTime(timeSpent)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">LIVE</div>
                <div className={`w-3 h-3 rounded-full mx-auto ${socketConnected ? 'bg-green-400 shadow-lg shadow-green-500/50' : 'bg-red-400 animate-pulse'}`}></div>
              </div>
              <div className="text-center bg-gradient-to-br from-green-500/20 to-emerald-600/20 px-6 py-3 rounded-lg border border-green-500/30">
                <div className="text-xs text-green-300 mb-1">SCORE</div>
                <div className="text-white font-bold text-2xl">{participantData?.totalScore || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Inject Content or Countdown */}
          <div>
            {countdownActive && pendingInject ? (
              /* Countdown Display - Replaces Inject Content */
              <div className="bg-gradient-to-br from-cyan-600/20 via-blue-600/20 to-cyan-600/20 border-2 border-cyan-500/50 rounded-lg p-8 shadow-xl">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <h2 className="text-3xl font-bold text-white">New Inject Released!</h2>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-cyan-300 text-xl font-semibold">{pendingInject.title}</p>
                </div>

                <div className="flex flex-col items-center justify-center py-8">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full bg-cyan-500/20 flex items-center justify-center border-4 border-cyan-400/30">
                      <div className="text-6xl font-bold text-cyan-300">{countdown}</div>
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-ping opacity-20"></div>
                  </div>

                  <p className="text-2xl text-cyan-200 font-semibold mb-2">
                    Starting in {countdown} seconds
                  </p>
                  <p className="text-lg text-gray-400">Prepare to analyze the new scenario...</p>
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-center text-blue-300">
                    Get ready to review evidence and make critical decisions
                  </p>
                </div>
              </div>
            ) : currentInject ? (
              <>
                {/* Inject Header Card */}
                <div className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 rounded-lg p-6 mb-6 shadow-2xl border border-red-500/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                          <FaExclamationTriangle className="text-white text-xl animate-pulse" />
                        </div>
                        <div>
                          <div className="text-red-100 text-xs font-semibold tracking-wider">INJECT #{currentInject.injectNumber}</div>
                          <h2 className="text-2xl font-bold text-white">{currentInject.title}</h2>
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg flex items-center gap-2 font-semibold text-sm ${
                      currentInject.responsesOpen
                        ? 'bg-green-500/30 text-green-100 border border-green-400/50'
                        : 'bg-red-500/30 text-red-100 border border-red-400/50'
                    }`}>
                      {currentInject.responsesOpen ? (
                        <>
                          <FaLockOpen />
                          OPEN
                        </>
                      ) : (
                        <>
                          <FaLock />
                          CLOSED
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Narrative Section */}
                <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-6 mb-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <FaFileAlt className="text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Scenario Narrative</h3>
                  </div>
                  <div className="bg-black/30 border-l-4 border-blue-500 p-5 rounded-r-lg">
                    <p className="whitespace-pre-line text-gray-300 leading-relaxed">
                      {currentInject.narrative || "Inject narrative will appear here..."}
                    </p>
                  </div>
                </div>

                {/* Artifacts Section */}
                {currentInject.artifacts && currentInject.artifacts.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <FaFlag className="text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Evidence & Artifacts</h3>
                      <div className="ml-auto bg-gray-700/50 px-3 py-1 rounded-full text-sm text-gray-300">
                        {currentInject.artifacts.length} items
                      </div>
                    </div>

                    <div className="space-y-4">
                      {currentInject.artifacts.map((artifact, index) => (
                        <div key={index} className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg overflow-hidden shadow-xl hover:border-blue-500/50 transition-all duration-300">
                          {/* Artifact Header */}
                          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  artifact.type === 'log' ? 'bg-blue-500/20' :
                                  artifact.type === 'alert' ? 'bg-red-500/20' :
                                  artifact.type === 'network' ? 'bg-purple-500/20' :
                                  'bg-gray-500/20'
                                }`}>
                                  {artifact.type === 'log' && <FaDesktop className="text-blue-400" />}
                                  {artifact.type === 'alert' && <FaExclamationTriangle className="text-red-400" />}
                                  {artifact.type === 'network' && <FaNetworkWired className="text-purple-400" />}
                                  {artifact.type === 'document' && <FaFileAlt className="text-gray-400" />}
                                </div>
                                <div>
                                  <div className="text-white font-bold font-mono text-sm">{artifact.name}</div>
                                  <div className="text-gray-400 text-xs mt-1">
                                    {artifact.metadata?.eventId && (
                                      <span className="bg-gray-700 px-2 py-0.5 rounded mr-2">
                                        Event: {artifact.metadata.eventId}
                                      </span>
                                    )}
                                    {artifact.metadata?.alertId && (
                                      <span className="bg-gray-700 px-2 py-0.5 rounded mr-2">
                                        Alert: {artifact.metadata.alertId}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {artifact.metadata?.severity && (
                                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                                  artifact.metadata.severity === 'Critical' ? 'bg-red-500/20 text-red-300 border border-red-500/50' :
                                  artifact.metadata.severity === 'High' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50' :
                                  artifact.metadata.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                                  'bg-green-500/20 text-green-300 border border-green-500/50'
                                }`}>
                                  {artifact.metadata.severity.toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Artifact Content */}
                          <div className="p-4 bg-black/30">
                            <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-900/50 border border-gray-700 p-4 rounded-lg text-gray-300 overflow-x-auto">
{artifact.content}
                            </pre>

                            {/* Metadata Footer */}
                            {artifact.metadata && (
                              <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 gap-3 text-xs">
                                {artifact.metadata.timestamp && (
                                  <div className="flex items-center gap-2">
                                    <FaClock className="text-blue-400" />
                                    <span className="text-gray-400">Timestamp:</span>
                                    <span className="text-gray-300 font-mono">{artifact.metadata.timestamp}</span>
                                  </div>
                                )}
                                {artifact.metadata.source && (
                                  <div className="flex items-center gap-2">
                                    <FaServer className="text-purple-400" />
                                    <span className="text-gray-400">Source:</span>
                                    <span className="text-gray-300 font-mono">{artifact.metadata.source}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700 p-12 text-center shadow-xl">
                <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaFileAlt className="text-4xl text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Waiting for Inject</h3>
                <p className="text-gray-400">The facilitator will release the first inject shortly.</p>
              </div>
            )}
          </div>

          {/* Right Panel - Phase Questions */}
          <div>
            {countdownActive && pendingInject ? (
              /* Countdown Info - Replaces Phase Section */
              <div className="bg-gradient-to-br from-cyan-600/20 via-blue-600/20 to-cyan-600/20 border-2 border-cyan-500/50 rounded-lg p-6 shadow-xl">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaQuestionCircle className="text-cyan-400 text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold text-cyan-300 mb-2">Tasks Loading...</h3>
                  <p className="text-cyan-200 text-sm">
                    {pendingInject.phases?.length || 0} tasks will be available after the countdown
                  </p>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mt-4">
                  <ul className="space-y-2 text-cyan-200 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                      Review the scenario narrative carefully
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                      Analyze all provided evidence and artifacts
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                      Prepare to make critical decisions
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Normal Phase Questions Section */
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <FaQuestionCircle className="text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Tasks</h2>
                  {phases && phases.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                      <div className="bg-blue-500/20 px-3 py-1 rounded-full text-sm text-blue-300 font-semibold">
                        Phase {currentPhaseNumber} of {phases.length}
                      </div>
                    </div>
                  )}
                </div>

                {phases && phases.length > 0 ? (
                <div className="space-y-4">
                  {/* Show only current phase */}
                  {phases.filter(phase => phase.phaseNumber === currentPhaseNumber).map((phase, phaseIndex) => (
                    <div key={phaseIndex} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl hover:border-blue-500/50 transition-all duration-300">
                      {/* Task Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white">
                              {phase.phaseNumber}
                            </div>
                            <div>
                              <div className="text-blue-100 text-xs font-semibold">TASK {phase.phaseNumber}</div>
                              <h3 className="text-white font-bold text-lg">{phase.phaseName}</h3>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Task Content */}
                      <div className="p-5">
                        {/* Question */}
                        <div className="mb-5">
                          <div className="text-gray-400 text-xs font-semibold mb-2 tracking-wider">QUESTION</div>
                          <p className="text-white font-medium leading-relaxed">{phase.question}</p>
                          {phase.questionType === 'multiple' && (
                            <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                              <FaCheckCircle />
                              <span>Select all that apply</span>
                            </div>
                          )}
                        </div>

                        {/* Options */}
                        <div className="space-y-2 mb-4">
                          {phase.questionType === 'single' && phase.options?.map((option, optIndex) => {
                            const hasAnswered = participantData?.responses?.some(
                              r => r.injectNumber === currentInject?.injectNumber && r.phaseNumber === phase.phaseNumber
                            );
                            const isCorrect = phase.correctAnswer?.includes(option.id);
                            const wasSelected = hasAnswered && participantData?.responses?.find(
                              r => r.injectNumber === currentInject?.injectNumber && r.phaseNumber === phase.phaseNumber
                            )?.answer === option.id;

                            return (
                              <label key={optIndex} className={`flex items-center justify-between p-3 bg-black/30 border rounded-lg transition-all duration-200 ${
                                hasAnswered
                                  ? (isCorrect
                                      ? 'border-green-500 bg-green-500/10'
                                      : wasSelected
                                        ? 'border-red-500 bg-red-500/10'
                                        : 'border-gray-700')
                                  : responses[`${phase.phaseNumber}_0`] === option.id
                                    ? 'border-blue-500 bg-blue-500/10 cursor-pointer'
                                    : 'border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer'
                              } ${!currentInject?.responsesOpen && !hasAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <div className="flex items-center flex-1">
                                  <input
                                    type="radio"
                                    name={`phase-${phase.phaseNumber}`}
                                    value={option.id}
                                    checked={responses[`${phase.phaseNumber}_0`] === option.id}
                                    onChange={(e) => handleAnswerSelect(phase.phaseNumber, 0, e.target.value)}
                                    className="w-4 h-4 text-blue-600 mr-3 flex-shrink-0"
                                    disabled={!currentInject?.responsesOpen || hasAnswered}
                                  />
                                  <div className="flex-1">
                                    <div className="text-white font-medium">{option.text}</div>
                                  </div>
                                </div>
                                {hasAnswered && option.magnitude && (
                                  <div className="ml-3">
                                    <EffectivenessBadge magnitude={option.magnitude} />
                                  </div>
                                )}
                              </label>
                            );
                          })}

                          {phase.questionType === 'multiple' && phase.options?.map((option, optIndex) => {
                            const hasAnswered = participantData?.responses?.some(
                              r => r.injectNumber === currentInject?.injectNumber && r.phaseNumber === phase.phaseNumber
                            );
                            const isCorrect = phase.correctAnswer?.includes(option.id);
                            const responseData = participantData?.responses?.find(
                              r => r.injectNumber === currentInject?.injectNumber && r.phaseNumber === phase.phaseNumber
                            );
                            const userAnswer = responseData?.answer;
                            const wasSelected = hasAnswered && Array.isArray(userAnswer) && userAnswer.includes(option.id);

                            return (
                              <label key={optIndex} className={`flex items-center justify-between p-3 bg-black/30 border rounded-lg transition-all duration-200 ${
                                hasAnswered
                                  ? (isCorrect && wasSelected
                                      ? 'border-green-500 bg-green-500/10'
                                      : isCorrect && !wasSelected
                                        ? 'border-yellow-500 bg-yellow-500/10'
                                        : wasSelected && !isCorrect
                                          ? 'border-red-500 bg-red-500/10'
                                          : 'border-gray-700')
                                  : (responses[`${phase.phaseNumber}_0`] || []).includes(option.id)
                                    ? 'border-blue-500 bg-blue-500/10 cursor-pointer'
                                    : 'border-gray-700 hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer'
                              } ${!currentInject?.responsesOpen && !hasAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <div className="flex items-center flex-1">
                                  <input
                                    type="checkbox"
                                    checked={(responses[`${phase.phaseNumber}_0`] || []).includes(option.id)}
                                    onChange={(e) => {
                                      const currentAnswers = responses[`${phase.phaseNumber}_0`] || [];
                                      let newAnswers;
                                      if (e.target.checked) {
                                        newAnswers = [...currentAnswers, option.id];
                                      } else {
                                        newAnswers = currentAnswers.filter(id => id !== option.id);
                                      }
                                      handleAnswerSelect(phase.phaseNumber, 0, newAnswers);
                                    }}
                                    className="w-4 h-4 text-blue-600 mr-3 flex-shrink-0 rounded"
                                    disabled={!currentInject?.responsesOpen || hasAnswered}
                                  />
                                  <div className="flex-1">
                                    <div className="text-white font-medium">{option.text}</div>
                                  </div>
                                </div>
                                {hasAnswered && option.magnitude && (
                                  <div className="ml-3">
                                    <EffectivenessBadge magnitude={option.magnitude} />
                                  </div>
                                )}
                              </label>
                            );
                          })}

                          {phase.questionType === 'text' && (
                            <textarea
                              value={responses[`${phase.phaseNumber}_0`] || ''}
                              onChange={(e) => handleAnswerSelect(phase.phaseNumber, 0, e.target.value)}
                              className="w-full p-4 bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              rows="5"
                              placeholder="Type your answer here..."
                              disabled={!currentInject?.responsesOpen}
                            />
                          )}
                        </div>

                        {/* Check if current phase has been answered */}
                        {(() => {
                          const hasAnswered = participantData?.responses?.some(
                            r => r.injectNumber === currentInject?.injectNumber && r.phaseNumber === phase.phaseNumber
                          );
                          const responseData = participantData?.responses?.find(
                            r => r.injectNumber === currentInject?.injectNumber && r.phaseNumber === phase.phaseNumber
                          );

                          if (hasAnswered) {
                            // Show Next Phase button if already answered
                            return (
                              <div className="space-y-3">
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                                  <div className="flex items-center justify-center gap-3 mb-2">
                                    <FaCheckCircle className="text-green-400 text-lg" />
                                    <span className="text-green-300 font-medium">Answer Submitted</span>
                                  </div>
                                  {responseData && (
                                    <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-green-500/30">
                                      {responseData.magnitude && (
                                        <EffectivenessBadge magnitude={responseData.magnitude} showDescription={true} />
                                      )}
                                      <div className="text-white font-bold">
                                        {responseData.pointsEarned} points
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Phase Progression Lock Message */}
                                {phaseProgressionLocked && currentPhaseNumber < phases.length && (
                                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 text-center">
                                    <FaLock className="inline mr-2 text-orange-400 text-lg" />
                                    <div className="text-orange-300 font-semibold mb-1">Discussion Period</div>
                                    <div className="text-orange-200 text-sm">
                                      The facilitator has locked phase progression for team discussion.
                                      <br />
                                      Please wait for the unlock to proceed to the next phase.
                                    </div>
                                  </div>
                                )}

                                <button
                                  onClick={handleNextPhase}
                                  disabled={currentPhaseNumber >= phases.length || phaseProgressionLocked}
                                  className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-bold transition-all duration-300 shadow-lg ${
                                    currentPhaseNumber >= phases.length || phaseProgressionLocked
                                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
                                  }`}
                                >
                                  {phaseProgressionLocked ? (
                                    <>
                                      <FaLock className="mr-2" />
                                      Locked - Discussion in Progress
                                    </>
                                  ) : currentPhaseNumber >= phases.length ? (
                                    <>
                                      <FaFlag className="mr-2" />
                                      All Phases Complete
                                    </>
                                  ) : (
                                    <>
                                      <FaFlag className="mr-2" />
                                      Go to Next Phase
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          } else if (currentInject?.responsesOpen && responses[`${phase.phaseNumber}_0`]) {
                            // Show Submit button if not answered yet
                            return (
                              <button
                                onClick={() => submitResponse(phase.phaseNumber, 0)}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 flex items-center justify-center font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                              >
                                <FaCheckCircle className="mr-2" />
                                Submit Answer
                              </button>
                            );
                          }
                          return null;
                        })()}

                        {!currentInject?.responsesOpen && (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                            <FaLock className="inline mr-2 text-yellow-400" />
                            <span className="text-yellow-300 font-medium">Responses Closed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-8 text-center">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaQuestionCircle className="text-3xl text-gray-500" />
                  </div>
                  <p className="text-white font-bold mb-1">No Tasks Available</p>
                  <p className="text-gray-400 text-sm">Tasks will appear here when the facilitator adds them.</p>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;