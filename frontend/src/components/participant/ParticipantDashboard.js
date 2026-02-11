import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketService from '../../services/socket';
import { participantAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FaFileAlt, FaLock, FaLockOpen, FaSync,
  FaClock, FaExclamationTriangle,
  FaDesktop, FaServer, FaNetworkWired, FaQuestionCircle
} from 'react-icons/fa';
import { EffectivenessBadge } from '../../utils/effectivenessBadge';

// Reusable typewriter text component — types out text character by character
const TypewriterText = ({ text, animate = false, delay = 0, totalDuration = 3500 }) => {
  const [displayed, setDisplayed] = useState(animate ? '' : (text || ''));
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!text || !animate) {
      setDisplayed(text || '');
      return;
    }

    let intervalId;
    const delayTimer = setTimeout(() => {
      setTyping(true);
      const speed = Math.max(15, Math.min(45, totalDuration / text.length));
      let i = 0;

      intervalId = setInterval(() => {
        i += 1;
        if (i >= text.length) {
          setDisplayed(text);
          setTyping(false);
          clearInterval(intervalId);
        } else {
          setDisplayed(text.slice(0, i));
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, []); // runs on mount only — component is keyed for remount

  return (
    <>
      {displayed}
      {typing && <span className="typing-cursor">|</span>}
    </>
  );
};

const ParticipantDashboard = () => {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
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
  const [animationTrigger, setAnimationTrigger] = useState(0);

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
      socketService.on('participantTerminated', handleParticipantTerminated);
      socketService.on('reconnected', () => {
        console.log('🔄 Reconnected — refetching exercise data');
        toast.success('Session restored successfully!', { icon: '🔄' });
        fetchExerciseData(participantId);
      });
      console.log('✅ Socket listeners configured');

      // Join rooms (will join when socket connects)
      socketService.joinAsParticipant(participantId);
      socketService.joinExercise(exerciseId);

      // Persistent timer — store start time in localStorage
      const timerKey = `ttx_timer_${exerciseId}_${participantId}`;
      let startTime = localStorage.getItem(timerKey);
      if (!startTime) {
        startTime = Date.now();
        localStorage.setItem(timerKey, startTime.toString());
      } else {
        startTime = parseInt(startTime);
      }
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));

      const timer = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
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
        socketService.off('participantTerminated');
        socketService.off('reconnected');
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
              setAnimationTrigger(prev => prev + 1);

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

  const handleParticipantTerminated = (data) => {
    console.log('❌ Socket event received - Participant terminated:', data);
    localStorage.removeItem('participantId');
    toast.error(data.message || 'You have been removed from this exercise by the facilitator.', {
      duration: 6000,
      icon: '⚠️'
    });
    navigate('/participant/join');
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

    // Check if phase progression is locked (discussion period)
    if (phaseProgressionLocked) {
      alert('Submissions are locked during the discussion period. Please wait for the facilitator to unlock.');
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
    const isLeft = participantData?.status === 'left';
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            {isLeft ? (
              <FaSync className="text-2xl text-gray-400 animate-spin" />
            ) : (
              <FaClock className="text-2xl text-gray-400 animate-pulse" />
            )}
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">
            {isLeft ? 'Reconnecting...' : 'Waiting for Admission'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isLeft
              ? 'Restoring your previous session. Please wait a moment.'
              : 'You are on the waiting list. The facilitator will admit you shortly.'}
          </p>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              {isLeft
                ? 'Your answers and progress have been saved. You will be reconnected automatically.'
                : 'Once admitted, you\'ll see the exercise injects and can start answering.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 participant-dashboard">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="space-y-1.5">
                <h1 className="text-lg font-bold text-white leading-relaxed">{exerciseData?.title}</h1>
                <p className="text-gray-500 text-xs leading-relaxed">{exerciseData?.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 ml-6">
              <div className="text-right">
                <div className="text-white font-medium text-sm flex items-center gap-2">
                  {participantData?.name || 'Anonymous'}
                  {participantData?.team && <span className="text-gray-500 text-xs">({participantData.team})</span>}
                </div>
              </div>
              <div className="text-gray-400 text-sm font-mono">
                {formatTime(timeSpent)}
              </div>
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-gray-600 animate-pulse'}`}></div>
              <div className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg">
                <div className="text-xs text-gray-500 mb-0.5">SCORE</div>
                <div className="text-white font-bold text-lg leading-none">{participantData?.totalScore || 0}</div>
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
              /* Countdown Display */
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-8">
                <div className="text-center mb-6">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">New Inject</span>
                  <h2 className="text-2xl font-bold text-white mt-1">{pendingInject.title}</h2>
                </div>

                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center border-2 border-gray-600">
                      <div className="text-5xl font-bold text-white">{countdown}</div>
                    </div>
                  </div>
                  <p className="text-lg text-gray-400 font-medium">
                    Starting in {countdown}s
                  </p>
                </div>

                <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
                  <p className="text-center text-gray-400 text-sm">
                    Prepare to review evidence and make decisions
                  </p>
                </div>
              </div>
            ) : currentInject ? (
              <>
                {/* Inject Header Card */}
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-5 mb-5 inject-card-animate">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inject #{currentInject.injectNumber}</span>
                      <h2 className="text-xl font-bold text-white mt-1">{currentInject.title}</h2>
                    </div>
                    <span className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${
                      currentInject.responsesOpen
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-600'
                    }`}>
                      {currentInject.responsesOpen ? <FaLockOpen className="text-xs" /> : <FaLock className="text-xs" />}
                      {currentInject.responsesOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>

                {/* Narrative Section */}
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-5 mb-5 inject-card-animate" style={{ animationDelay: '0.1s' }}>
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Scenario Narrative</h4>
                  <p className="whitespace-pre-line text-gray-300 leading-relaxed">
                    <TypewriterText
                      key={`narrative-${animationTrigger}`}
                      text={currentInject.narrative || "Inject narrative will appear here..."}
                      animate={animationTrigger > 0}
                      delay={200}
                      totalDuration={8000}
                    />
                  </p>
                </div>

                {/* Artifacts Section */}
                {currentInject.artifacts && currentInject.artifacts.length > 0 && (
                  <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-5 mb-5 inject-card-animate" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Evidence & Artifacts</h4>
                      <span className="text-xs text-gray-500">{currentInject.artifacts.length} items</span>
                    </div>

                    <div className="space-y-2">
                      {currentInject.artifacts.map((artifact, index) => (
                        <div key={index} className="border border-gray-700 rounded-lg overflow-hidden artifact-animate" style={{ animationDelay: `${0.3 + index * 0.15}s` }}>
                          {/* Artifact Header */}
                          <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
                                  {artifact.type === 'log' && <FaDesktop className="text-gray-400 text-sm" />}
                                  {artifact.type === 'alert' && <FaExclamationTriangle className="text-gray-400 text-sm" />}
                                  {artifact.type === 'network' && <FaNetworkWired className="text-gray-400 text-sm" />}
                                  {artifact.type === 'document' && <FaFileAlt className="text-gray-400 text-sm" />}
                                  {!['log', 'alert', 'network', 'document'].includes(artifact.type) && <FaFileAlt className="text-gray-400 text-sm" />}
                                </div>
                                <div>
                                  <div className="text-white font-medium text-sm">{artifact.name}</div>
                                  <div className="text-gray-500 text-xs mt-0.5 flex gap-2">
                                    <span className="uppercase">{artifact.type}</span>
                                    {artifact.metadata?.eventId && <span>Event: {artifact.metadata.eventId}</span>}
                                    {artifact.metadata?.alertId && <span>Alert: {artifact.metadata.alertId}</span>}
                                  </div>
                                </div>
                              </div>
                              {artifact.metadata?.severity && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-300 border border-gray-600">
                                  {artifact.metadata.severity}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Artifact Content */}
                          <div className="p-4 bg-gray-900/40">
                            <pre className="whitespace-pre-wrap text-sm font-mono bg-black/30 border border-gray-700 p-4 rounded text-gray-300 overflow-x-auto">
<TypewriterText
                                key={`artifact-${index}-${animationTrigger}`}
                                text={artifact.content}
                                animate={animationTrigger > 0}
                                delay={600 + index * 500}
                                totalDuration={6000}
                              />
                            </pre>

                            {/* Metadata Footer */}
                            {artifact.metadata && (artifact.metadata.timestamp || artifact.metadata.source) && (
                              <div className="mt-3 pt-3 border-t border-gray-700 flex gap-6 text-xs">
                                {artifact.metadata.timestamp && (
                                  <div className="flex items-center gap-1.5">
                                    <FaClock className="text-gray-500" />
                                    <span className="text-gray-500">Timestamp:</span>
                                    <span className="text-gray-400 font-mono">{artifact.metadata.timestamp}</span>
                                  </div>
                                )}
                                {artifact.metadata.source && (
                                  <div className="flex items-center gap-1.5">
                                    <FaServer className="text-gray-500" />
                                    <span className="text-gray-500">Source:</span>
                                    <span className="text-gray-400 font-mono">{artifact.metadata.source}</span>
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
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-12 text-center">
                <div className="w-14 h-14 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaFileAlt className="text-xl text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Waiting for Inject</h3>
                <p className="text-gray-500 text-sm">The facilitator will release the first inject shortly.</p>
              </div>
            )}
          </div>

          {/* Right Panel - Phase Questions */}
          <div>
            {countdownActive && pendingInject ? (
              /* Countdown Info */
              <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaQuestionCircle className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Tasks Loading</h3>
                  <p className="text-gray-500 text-sm">
                    {pendingInject.phases?.length || 0} tasks available after countdown
                  </p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
                  <ul className="space-y-2 text-gray-400 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                      Review the scenario narrative carefully
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                      Analyze all provided evidence and artifacts
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                      Prepare to make critical decisions
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Normal Phase Questions Section */
              <div className="space-y-4">
                {phases && phases.length > 0 ? (
                <div className="space-y-4">
                  {/* Show only current phase */}
                  {phases.filter(phase => phase.phaseNumber === currentPhaseNumber).map((phase, phaseIndex) => (
                    <div key={phaseIndex} className="bg-gray-800/60 border border-gray-700 rounded-lg overflow-hidden inject-card-animate" style={{ animationDelay: '0.3s' }}>
                      {/* Task Header */}
                      <div className="p-4 border-b border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-9 h-9 bg-gray-700 border border-gray-600 rounded flex items-center justify-center text-sm font-bold text-white">
                              {phase.phaseNumber}
                            </span>
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wider">Task {phase.phaseNumber}</div>
                              <h3 className="text-white font-semibold">{phase.phaseName}</h3>
                            </div>
                          </div>
                          <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded text-xs font-medium border border-gray-700">
                            Phase {currentPhaseNumber} of {phases.length}
                          </span>
                        </div>
                      </div>

                      {/* Task Content */}
                      <div className="p-5">
                        {/* Question */}
                        <div className="mb-5">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Question</div>
                          <p className="text-white font-medium leading-relaxed">{phase.question}</p>
                          {phase.questionType === 'multiple' && (
                            <div className="mt-2 text-xs text-gray-500">
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
                            const isDisabled = !currentInject?.responsesOpen || hasAnswered || phaseProgressionLocked;

                            return (
                              <label key={optIndex} className={`flex items-center justify-between p-3.5 border rounded-lg transition-all duration-200 ${
                                hasAnswered
                                  ? (isCorrect
                                      ? 'border-emerald-500/25 bg-emerald-500/5'
                                      : wasSelected
                                        ? 'border-rose-500/25 bg-rose-500/5'
                                        : 'border-gray-700/40 bg-gray-800/20 opacity-60')
                                  : responses[`${phase.phaseNumber}_0`] === option.id
                                    ? 'border-blue-500/40 bg-blue-500/5 cursor-pointer'
                                    : 'border-gray-700/60 bg-gray-800/20 hover:border-gray-600 hover:bg-gray-800/40 cursor-pointer'
                              } ${isDisabled && !hasAnswered ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                <div className="flex items-center flex-1">
                                  <input
                                    type="radio"
                                    name={`phase-${phase.phaseNumber}`}
                                    value={option.id}
                                    checked={responses[`${phase.phaseNumber}_0`] === option.id}
                                    onChange={(e) => handleAnswerSelect(phase.phaseNumber, 0, e.target.value)}
                                    className="w-4 h-4 accent-blue-500 mr-3 flex-shrink-0"
                                    disabled={isDisabled}
                                  />
                                  <div className="flex-1">
                                    <div className={`font-medium text-sm ${hasAnswered && !isCorrect && !wasSelected ? 'text-gray-500' : 'text-gray-200'}`}>{option.text}</div>
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
                            const isDisabled = !currentInject?.responsesOpen || hasAnswered || phaseProgressionLocked;

                            return (
                              <label key={optIndex} className={`flex items-center justify-between p-3.5 border rounded-lg transition-all duration-200 ${
                                hasAnswered
                                  ? (isCorrect && wasSelected
                                      ? 'border-emerald-500/25 bg-emerald-500/5'
                                      : isCorrect && !wasSelected
                                        ? 'border-amber-500/25 bg-amber-500/5'
                                        : wasSelected && !isCorrect
                                          ? 'border-rose-500/25 bg-rose-500/5'
                                          : 'border-gray-700/40 bg-gray-800/20 opacity-60')
                                  : (responses[`${phase.phaseNumber}_0`] || []).includes(option.id)
                                    ? 'border-blue-500/40 bg-blue-500/5 cursor-pointer'
                                    : 'border-gray-700/60 bg-gray-800/20 hover:border-gray-600 hover:bg-gray-800/40 cursor-pointer'
                              } ${isDisabled && !hasAnswered ? 'opacity-40 cursor-not-allowed' : ''}`}>
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
                                    className="w-4 h-4 accent-blue-500 mr-3 flex-shrink-0 rounded"
                                    disabled={isDisabled}
                                  />
                                  <div className="flex-1">
                                    <div className={`font-medium text-sm ${hasAnswered && !isCorrect && !wasSelected ? 'text-gray-500' : 'text-gray-200'}`}>{option.text}</div>
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
                              className={`w-full p-4 bg-gray-800/20 border border-gray-700/60 rounded-lg text-gray-200 placeholder-gray-600 focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all text-sm ${
                                (!currentInject?.responsesOpen || phaseProgressionLocked) ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                              rows="5"
                              placeholder="Type your answer here..."
                              disabled={!currentInject?.responsesOpen || phaseProgressionLocked}
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
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                                  <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="text-gray-300 font-medium text-sm">Answer Submitted</span>
                                  </div>
                                  {responseData && (
                                    <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-700">
                                      {responseData.magnitude && (
                                        <EffectivenessBadge magnitude={responseData.magnitude} showDescription={true} />
                                      )}
                                      <div className="text-white font-bold text-sm">
                                        {responseData.pointsEarned} points
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Phase Progression Lock Message */}
                                {phaseProgressionLocked && currentPhaseNumber < phases.length && (
                                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                                    <div className="text-gray-300 font-medium text-sm mb-1">Discussion Period</div>
                                    <div className="text-gray-500 text-xs">
                                      Phase progression locked for team discussion. Please wait for unlock.
                                    </div>
                                  </div>
                                )}

                                <button
                                  onClick={handleNextPhase}
                                  disabled={currentPhaseNumber >= phases.length || phaseProgressionLocked}
                                  className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center font-medium text-sm transition-all ${
                                    currentPhaseNumber >= phases.length || phaseProgressionLocked
                                      ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                                      : 'bg-blue-600/80 hover:bg-blue-500/80 text-white'
                                  }`}
                                >
                                  {phaseProgressionLocked ? (
                                    'Locked — Discussion in Progress'
                                  ) : currentPhaseNumber >= phases.length ? (
                                    'All Phases Complete'
                                  ) : (
                                    'Next Phase'
                                  )}
                                </button>
                              </div>
                            );
                          } else if (currentInject?.responsesOpen && responses[`${phase.phaseNumber}_0`] && !phaseProgressionLocked) {
                            // Show Submit button if not answered yet and not locked
                            return (
                              <button
                                onClick={() => submitResponse(phase.phaseNumber, 0)}
                                className="w-full bg-blue-600/80 hover:bg-blue-500/80 text-white py-2.5 px-4 rounded-lg flex items-center justify-center font-medium text-sm transition-all"
                              >
                                Submit Answer
                              </button>
                            );
                          } else if (phaseProgressionLocked && !hasAnswered) {
                            // Show locked message when phase is locked but not answered
                            return (
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                                <div className="text-gray-300 font-medium text-sm mb-1">Discussion Period</div>
                                <div className="text-gray-500 text-xs">
                                  Submissions locked for team discussion. Please wait for unlock.
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {!currentInject?.responsesOpen && !phaseProgressionLocked && (
                          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                            <span className="text-gray-400 font-medium text-sm">Responses Closed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-8 text-center">
                  <div className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaQuestionCircle className="text-lg text-gray-500" />
                  </div>
                  <p className="text-white font-medium text-sm mb-1">No Tasks Available</p>
                  <p className="text-gray-500 text-xs">Tasks will appear here when the facilitator adds them.</p>
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