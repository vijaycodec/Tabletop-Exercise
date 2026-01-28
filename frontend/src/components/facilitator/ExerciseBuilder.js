import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useExercise } from '../../contexts/ExerciseContext';
import { exerciseAPI } from '../../services/api';
import { FaPlus, FaSave, FaEdit, FaTrash, FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';

const ExerciseBuilder = () => {
  const { exerciseId } = useParams();
  const { addInject, currentExercise, getExercise, refreshExercise } = useExercise();
  const [injectData, setInjectData] = useState({
    title: '',
    narrative: '',
    artifacts: [],
    phases: []
  });
  const [editMode, setEditMode] = useState(false);
  const [editingInjectNumber, setEditingInjectNumber] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInjectNumber, setDeleteInjectNumber] = useState(null);

  // Load exercise data when component mounts or exerciseId changes
  useEffect(() => {
    if (exerciseId) {
      console.log('Loading exercise:', exerciseId);
      getExercise(exerciseId);
    }
  }, [exerciseId]);

  const handleAddInject = async () => {
    if (!injectData.title || !injectData.narrative) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate phases have questions and options
    for (const phase of injectData.phases) {
      if (!phase.question || phase.options.length === 0) {
        alert(`Phase ${phase.phaseNumber} is missing question or options`);
        return;
      }
      if (phase.correctAnswer.length === 0) {
        alert(`Phase ${phase.phaseNumber} must have at least one correct answer selected`);
        return;
      }
    }

    try {
      await addInject(exerciseId, injectData);
      alert('Inject added successfully!');
      setInjectData({
        title: '',
        narrative: '',
        artifacts: [],
        phases: []
      });
      if (refreshExercise) {
        await refreshExercise(exerciseId);
      }
    } catch (error) {
      console.error('Failed to add inject:', error);
      alert('Failed to add inject: ' + error.message);
    }
  };

  const handleUpdateInject = async () => {
    if (!injectData.title || !injectData.narrative) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate phases have questions and options
    for (const phase of injectData.phases) {
      if (!phase.question || phase.options.length === 0) {
        alert(`Phase ${phase.phaseNumber} is missing question or options`);
        return;
      }
      if (phase.correctAnswer.length === 0) {
        alert(`Phase ${phase.phaseNumber} must have at least one correct answer selected`);
        return;
      }
    }

    try {
      await exerciseAPI.updateInject(exerciseId, editingInjectNumber, injectData);
      alert('Inject updated successfully!');
      setInjectData({
        title: '',
        narrative: '',
        artifacts: [],
        phases: []
      });
      setEditMode(false);
      setEditingInjectNumber(null);
      if (refreshExercise) {
        await refreshExercise(exerciseId);
      }
    } catch (error) {
      console.error('Failed to update inject:', error);
      alert('Failed to update inject: ' + error.message);
    }
  };

  const handleEditInject = (inject) => {
    setInjectData({
      title: inject.title,
      narrative: inject.narrative,
      artifacts: inject.artifacts || [],
      phases: inject.phases || []
    });
    setEditMode(true);
    setEditingInjectNumber(inject.injectNumber);
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setInjectData({
      title: '',
      narrative: '',
      artifacts: [],
      phases: []
    });
    setEditMode(false);
    setEditingInjectNumber(null);
  };

  const handleDeleteClick = (injectNumber) => {
    setDeleteInjectNumber(injectNumber);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await exerciseAPI.deleteInject(exerciseId, deleteInjectNumber);
      alert('Inject deleted successfully!');
      setShowDeleteConfirm(false);
      setDeleteInjectNumber(null);
      if (refreshExercise) {
        await refreshExercise(exerciseId);
      }
    } catch (error) {
      console.error('Failed to delete inject:', error);
      alert('Failed to delete inject: ' + error.message);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDeleteInjectNumber(null);
  };

  const addArtifact = () => {
    setInjectData({
      ...injectData,
      artifacts: [
        ...injectData.artifacts,
        {
          name: '',
          type: 'log',
          content: '',
          metadata: {
            timestamp: '',
            source: '',
            severity: 'Medium',
            eventId: ''
          },
          order: injectData.artifacts.length + 1
        }
      ]
    });
  };

  const removeArtifact = (index) => {
    const newArtifacts = injectData.artifacts.filter((_, i) => i !== index);
    setInjectData({ ...injectData, artifacts: newArtifacts });
  };

  const addPhase = () => {
    setInjectData({
      ...injectData,
      phases: [
        ...injectData.phases,
        {
          phaseNumber: injectData.phases.length + 1,
          phaseName: '',
          question: '',
          options: [],
          questionType: 'single',
          correctAnswer: [],
          maxPoints: 10,
          order: injectData.phases.length + 1
        }
      ]
    });
  };

  const removePhase = (index) => {
    const newPhases = injectData.phases.filter((_, i) => i !== index);
    // Renumber phases
    newPhases.forEach((phase, idx) => {
      phase.phaseNumber = idx + 1;
      phase.order = idx + 1;
    });
    setInjectData({ ...injectData, phases: newPhases });
  };

  const updateArtifact = (index, field, value) => {
    const newArtifacts = [...injectData.artifacts];
    newArtifacts[index][field] = value;
    setInjectData({ ...injectData, artifacts: newArtifacts });
  };

  const updateArtifactMetadata = (artifactIndex, field, value) => {
    const newArtifacts = [...injectData.artifacts];
    newArtifacts[artifactIndex].metadata[field] = value;
    setInjectData({ ...injectData, artifacts: newArtifacts });
  };

  const updatePhase = (phaseIndex, field, value) => {
    const newPhases = [...injectData.phases];
    newPhases[phaseIndex][field] = value;
    setInjectData({ ...injectData, phases: newPhases });
  };

  const addOption = (phaseIndex) => {
    const newPhases = [...injectData.phases];
    const optionId = String.fromCharCode(65 + newPhases[phaseIndex].options.length); // A, B, C, D...
    newPhases[phaseIndex].options.push({
      id: optionId,
      text: '',
      points: 0,
      magnitude: 'least_effective'
    });
    setInjectData({ ...injectData, phases: newPhases });
  };

  const removeOption = (phaseIndex, optionIndex) => {
    const newPhases = [...injectData.phases];
    const removedId = newPhases[phaseIndex].options[optionIndex].id;
    newPhases[phaseIndex].options = newPhases[phaseIndex].options.filter((_, i) => i !== optionIndex);
    // Re-assign IDs
    newPhases[phaseIndex].options.forEach((opt, idx) => {
      opt.id = String.fromCharCode(65 + idx);
    });
    // Remove from correctAnswer if it was selected
    newPhases[phaseIndex].correctAnswer = newPhases[phaseIndex].correctAnswer.filter(id => id !== removedId);
    setInjectData({ ...injectData, phases: newPhases });
  };

  const updateOption = (phaseIndex, optionIndex, field, value) => {
    const newPhases = [...injectData.phases];
    newPhases[phaseIndex].options[optionIndex][field] = value;
    setInjectData({ ...injectData, phases: newPhases });
  };

  const toggleCorrectAnswer = (phaseIndex, optionId) => {
    const newPhases = [...injectData.phases];
    const phase = newPhases[phaseIndex];

    if (phase.questionType === 'single') {
      // For single choice, replace the correct answer
      phase.correctAnswer = [optionId];
    } else {
      // For multiple choice, toggle
      if (phase.correctAnswer.includes(optionId)) {
        phase.correctAnswer = phase.correctAnswer.filter(id => id !== optionId);
      } else {
        phase.correctAnswer.push(optionId);
      }
    }
    setInjectData({ ...injectData, phases: newPhases });
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-2xl p-6 mb-6 border border-gray-700">
        <h2 className="text-3xl font-bold mb-6 text-white">Build Exercise: {currentExercise?.title}</h2>

        {/* Existing Injects List */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-white">Existing Injects</h3>
          {currentExercise?.injects && currentExercise.injects.length > 0 ? (
            <div className="space-y-3">
              {currentExercise.injects.map((inject, index) => (
                <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg text-white">{inject.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        Inject #{inject.injectNumber} • {inject.artifacts?.length || 0} artifacts • {inject.phases?.length || 0} phases
                      </p>
                      <div className="flex gap-3 mt-2">
                        {inject.isActive && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Active</span>
                        )}
                        {inject.responsesOpen && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Responses Open</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEditInject(inject)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                        title="Edit inject"
                      >
                        <FaEdit className="text-lg" />
                        <span className="text-sm font-medium">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(inject.injectNumber)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                        title="Delete inject"
                      >
                        <FaTrash className="text-lg" />
                        <span className="text-sm font-medium">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded border border-dashed border-gray-700">
              <p className="text-sm">No injects created yet. Add your first inject below.</p>
            </div>
          )}
        </div>

        <div className="mb-8 border-t border-gray-700 pt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-blue-400">
              {editMode ? 'Edit Inject' : 'Add New Inject'}
            </h3>
            {editMode && (
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
              >
                <FaTimes />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>
          {editMode && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 text-sm">
                You are editing Inject #{editingInjectNumber}. Make your changes below and click "Update Inject" to save.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Inject Title *
              </label>
              <input
                type="text"
                value={injectData.title}
                onChange={(e) => setInjectData({ ...injectData, title: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Suspicious IT-Originated Access to OT Environment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Narrative *
              </label>
              <textarea
                value={injectData.narrative}
                onChange={(e) => setInjectData({ ...injectData, narrative: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="8"
                placeholder="Enter the inject narrative scenario..."
              />
            </div>

            {/* Artifacts Section */}
            <div className="border-t border-gray-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-lg text-blue-300">Artifacts</h4>
                <button
                  onClick={addArtifact}
                  className="flex items-center text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  <FaPlus className="mr-2" /> Add Artifact
                </button>
              </div>

              {injectData.artifacts.map((artifact, index) => (
                <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="text-white font-medium">Artifact {index + 1}</h5>
                    <button
                      onClick={() => removeArtifact(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Artifact Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Active Directory Security Log"
                        value={artifact.name}
                        onChange={(e) => updateArtifact(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Type</label>
                      <select
                        value={artifact.type}
                        onChange={(e) => updateArtifact(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                      >
                        <option value="log">Log File</option>
                        <option value="alert">Alert</option>
                        <option value="network">Network Capture</option>
                        <option value="screenshot">Screenshot</option>
                        <option value="document">Document</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs text-gray-400 mb-1">Content</label>
                    <textarea
                      placeholder="Artifact content (logs, data, etc.)"
                      value={artifact.content}
                      onChange={(e) => updateArtifact(index, 'content', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm font-mono"
                      rows="4"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Timestamp</label>
                      <input
                        type="text"
                        placeholder="2025-12-03T09:02:18"
                        value={artifact.metadata.timestamp}
                        onChange={(e) => updateArtifactMetadata(index, 'timestamp', e.target.value)}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Source</label>
                      <input
                        type="text"
                        placeholder="AD-DC01"
                        value={artifact.metadata.source}
                        onChange={(e) => updateArtifactMetadata(index, 'source', e.target.value)}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Severity</label>
                      <select
                        value={artifact.metadata.severity}
                        onChange={(e) => updateArtifactMetadata(index, 'severity', e.target.value)}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Event ID</label>
                      <input
                        type="text"
                        placeholder="4624"
                        value={artifact.metadata.eventId}
                        onChange={(e) => updateArtifactMetadata(index, 'eventId', e.target.value)}
                        className="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {injectData.artifacts.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded border border-dashed border-gray-700">
                  <p className="text-sm">No artifacts added yet. Click "Add Artifact" to add evidence.</p>
                </div>
              )}
            </div>

            {/* Phases Section */}
            <div className="border-t border-gray-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-lg text-green-300">Phases & Questions</h4>
                <button
                  onClick={addPhase}
                  className="flex items-center text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  <FaPlus className="mr-2" /> Add Phase
                </button>
              </div>

              {injectData.phases.map((phase, phaseIndex) => (
                <div key={phaseIndex} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="text-white font-medium">Phase {phase.phaseNumber}</h5>
                    <button
                      onClick={() => removePhase(phaseIndex)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Phase Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Triage, Detection, Response"
                        value={phase.phaseName}
                        onChange={(e) => updatePhase(phaseIndex, 'phaseName', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Question Type</label>
                      <select
                        value={phase.questionType}
                        onChange={(e) => {
                          updatePhase(phaseIndex, 'questionType', e.target.value);
                          // Reset correctAnswer when changing type
                          if (e.target.value === 'single' && phase.correctAnswer.length > 1) {
                            updatePhase(phaseIndex, 'correctAnswer', [phase.correctAnswer[0]]);
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                      >
                        <option value="single">Single Choice</option>
                        <option value="multiple">Multiple Choice</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs text-gray-400 mb-1">Question</label>
                    <textarea
                      placeholder="Enter the question for this phase"
                      value={phase.question}
                      onChange={(e) => updatePhase(phaseIndex, 'question', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                      rows="2"
                    />
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-gray-400">Options</label>
                      <button
                        onClick={() => addOption(phaseIndex)}
                        className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                      >
                        <FaPlus className="inline mr-1" /> Add Option
                      </button>
                    </div>

                    {phase.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-start gap-2 mb-2 bg-gray-900/50 p-2 rounded border border-gray-700">
                        <div className="flex items-center pt-2">
                          <input
                            type={phase.questionType === 'single' ? 'radio' : 'checkbox'}
                            checked={phase.correctAnswer.includes(option.id)}
                            onChange={() => toggleCorrectAnswer(phaseIndex, option.id)}
                            className="w-4 h-4"
                            title="Mark as correct answer"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex gap-2 items-center mb-1">
                            <span className="text-white font-bold text-sm w-6">{option.id}.</span>
                            <input
                              type="text"
                              placeholder="Option text"
                              value={option.text}
                              onChange={(e) => updateOption(phaseIndex, optIndex, 'text', e.target.value)}
                              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Points"
                              value={option.points}
                              onChange={(e) => updateOption(phaseIndex, optIndex, 'points', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                              title="Points for this option"
                            />
                          </div>
                          <div className="flex gap-2 items-center">
                            <label className="text-xs text-gray-400 w-6"></label>
                            <select
                              value={option.magnitude || 'least_effective'}
                              onChange={(e) => updateOption(phaseIndex, optIndex, 'magnitude', e.target.value)}
                              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                              title="Magnitude level"
                            >
                              <option value="most_effective">Most Effective</option>
                              <option value="effective">Effective</option>
                              <option value="not_effective">Not Effective</option>
                              <option value="somewhat_effective">Somewhat Effective</option>
                              <option value="least_effective">Least Effective</option>
                            </select>
                            <div className="w-20"></div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeOption(phaseIndex, optIndex)}
                          className="text-red-400 hover:text-red-300 mt-1"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    ))}

                    {phase.options.length === 0 && (
                      <div className="text-center py-4 text-gray-500 bg-gray-900/30 rounded border border-dashed border-gray-700">
                        <p className="text-xs">No options added. Click "Add Option" to create choices.</p>
                      </div>
                    )}

                    {phase.correctAnswer.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                        <FaCheckCircle />
                        <span>Correct Answer(s): {phase.correctAnswer.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max Points</label>
                      <input
                        type="number"
                        value={phase.maxPoints}
                        onChange={(e) => updatePhase(phaseIndex, 'maxPoints', parseInt(e.target.value) || 10)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {injectData.phases.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded border border-dashed border-gray-700">
                  <p className="text-sm">No phases added yet. Click "Add Phase" to create questions.</p>
                </div>
              )}
            </div>

            <button
              onClick={editMode ? handleUpdateInject : handleAddInject}
              className={`flex items-center justify-center w-full ${
                editMode
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
              } text-white py-3 px-6 rounded-lg transition-all font-semibold text-lg shadow-lg`}
            >
              <FaSave className="mr-2" />
              {editMode ? 'Update Inject' : 'Save Inject'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <FaTrash className="text-red-500 text-2xl" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-white mb-2">Delete Inject</h3>
                <p className="text-gray-300">
                  Are you sure you want to delete Inject #{deleteInjectNumber}? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
              >
                Delete Inject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseBuilder;