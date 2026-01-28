import React, { createContext, useState, useContext } from 'react';
import { exerciseAPI } from '../services/api';
import toast from 'react-hot-toast';

const ExerciseContext = createContext();

export const useExercise = () => useContext(ExerciseContext);

export const ExerciseProvider = ({ children }) => {
  const [currentExercise, setCurrentExercise] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [scores, setScores] = useState(null);

  const createExercise = async (exerciseData) => {
    try {
      const response = await exerciseAPI.createExercise(exerciseData);
      toast.success('Exercise created successfully!');
      return response.data.exercise;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create exercise');
      throw error;
    }
  };

  const getExercise = async (id) => {
    try {
      const response = await exerciseAPI.getExercise(id);
      setCurrentExercise(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch exercise:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch exercise');
      throw error;
    }
  };

  const addInject = async (exerciseId, injectData) => {
    try {
      const response = await exerciseAPI.addInject(exerciseId, injectData);
      toast.success('Inject added successfully!');
      
      // Refresh exercise data
      await getExercise(exerciseId);
      
      return response.data.inject;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add inject');
      throw error;
    }
  };

  const releaseInject = async (exerciseId, injectNumber) => {
    try {
      const response = await exerciseAPI.releaseInject(exerciseId, {
        injectNumber,
        releaseTime: new Date().toISOString()
      });
      toast.success(`Inject ${injectNumber} released!`);
      
      // Refresh exercise data
      await getExercise(exerciseId);
      
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to release inject');
      throw error;
    }
  };

  const toggleResponses = async (exerciseId, injectNumber, responsesOpen) => {
    try {
      const response = await exerciseAPI.toggleResponses(exerciseId, {
        injectNumber,
        responsesOpen
      });
      toast.success(`Responses ${responsesOpen ? 'opened' : 'closed'}`);

      // Refresh exercise data
      await getExercise(exerciseId);

      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to toggle responses');
      throw error;
    }
  };

  const togglePhaseProgression = async (exerciseId, injectNumber, phaseProgressionLocked) => {
    try {
      const response = await exerciseAPI.togglePhaseProgression(exerciseId, {
        injectNumber,
        phaseProgressionLocked
      });
      toast.success(`Phase progression ${phaseProgressionLocked ? 'locked' : 'unlocked'}`);

      // Refresh exercise data
      await getExercise(exerciseId);

      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to toggle phase progression');
      throw error;
    }
  };

  const fetchParticipants = async (exerciseId) => {
    try {
      const response = await exerciseAPI.getParticipants(exerciseId);
      setParticipants(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch participants');
      throw error;
    }
  };

  const fetchScores = async (exerciseId) => {
    try {
      const response = await exerciseAPI.getScores(exerciseId);
      setScores(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch scores:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch scores');
      throw error;
    }
  };

  const refreshExercise = async (id) => {
    return await getExercise(id);
  };

  const value = {
    currentExercise,
    participants,
    scores,
    createExercise,
    getExercise,
    refreshExercise,
    addInject,
    releaseInject,
    toggleResponses,
    togglePhaseProgression,
    fetchParticipants,
    fetchScores
  };

  return (
    <ExerciseContext.Provider value={value}>
      {children}
    </ExerciseContext.Provider>
  );
};