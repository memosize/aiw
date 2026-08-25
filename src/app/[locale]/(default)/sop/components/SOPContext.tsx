"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface SOPData {
  target: string;
  count: string;
  education: string;
  skill: string;
  research: string;
  workExperience: string;
  plan: string;
}

export interface GenerationState {
  isGenerating: boolean;
  generatedContent: string;
  lastGeneratedAt: number | null;
  error: string | null;
  workflowRunId: string | null;
  taskId: string | null;
  workflowStatus: 'running' | 'succeeded' | 'failed' | 'stopped' | null;
  languagePreference: 'English' | 'Chinese';
}

interface SOPContextType {
  data: SOPData;
  updateField: (field: keyof SOPData, value: string) => void;
  updateData: (newData: Partial<SOPData>) => void;
  generationState: GenerationState;
  setGenerationLoading: (loading: boolean) => void;
  setGenerationError: (error: string | null) => void;
  updateGeneratedContent: (content: string) => void;
  setWorkflowIds: (workflowRunId: string, taskId: string) => void;
  setWorkflowStatus: (status: GenerationState['workflowStatus']) => void;
  setLanguagePreference: (lang: 'English' | 'Chinese') => void;
  canGenerate: () => boolean;
  saveToCache: () => void;
  loadFromCache: () => void;
  clearCache: () => void;
  getFormData: () => SOPData;
}

const SOPContext = createContext<SOPContextType | undefined>(undefined);

const CACHE_KEY = 'sop-form-data';
const GENERATION_CACHE_KEY = 'sop-generation-state';

export function SOPProvider({ children }: { children: ReactNode }) {
  const initialData: SOPData = {
    target: '',
    count: '600',
    education: '',
    skill: '',
    research: '',
    workExperience: '',
    plan: ''
  };

  const initialGenerationState: GenerationState = {
    isGenerating: false,
    generatedContent: '',
    lastGeneratedAt: null,
    error: null,
    workflowRunId: null,
    taskId: null,
    workflowStatus: null,
    languagePreference: 'English'
  };

  const [data, setData] = useState<SOPData>(initialData);
  const [generationState, setGenerationState] = useState<GenerationState>(initialGenerationState);

  const updateField = (field: keyof SOPData, value: string) => {
    setData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateData = (newData: Partial<SOPData>) => {
    setData((prev) => ({
      ...prev,
      ...newData
    }));
  };

  const setGenerationLoading = (loading: boolean) => {
    setGenerationState((prev) => ({
      ...prev,
      isGenerating: loading,
      error: loading ? null : prev.error
    }));
  };

  const setGenerationError = (error: string | null) => {
    setGenerationState((prev) => ({
      ...prev,
      error
    }));
  };

  const updateGeneratedContent = (content: string) => {
    setGenerationState((prev) => ({
      ...prev,
      generatedContent: content,
      lastGeneratedAt: Date.now()
    }));
  };

  const setWorkflowIds = (workflowRunId: string, taskId: string) => {
    setGenerationState((prev) => ({
      ...prev,
      workflowRunId,
      taskId,
      workflowStatus: 'running'
    }));
  };

  const setWorkflowStatus = (status: GenerationState['workflowStatus']) => {
    setGenerationState((prev) => ({
      ...prev,
      workflowStatus: status
    }));
  };

  const setLanguagePreference = (lang: 'English' | 'Chinese') => {
    setGenerationState((prev) => ({
      ...prev,
      languagePreference: lang
    }));
  };

  const canGenerate = (): boolean => {
    return !!(data.target && data.education);
  };

  const getFormData = (): SOPData => {
    return {
      ...data
    };
  };

  const saveToCache = () => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(GENERATION_CACHE_KEY, JSON.stringify(generationState));
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  };

  const loadFromCache = () => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedGeneration = localStorage.getItem(GENERATION_CACHE_KEY);

      if (cachedData) {
        const parsed = JSON.parse(cachedData) as Partial<SOPData>;
        setData({
          ...initialData,
          ...parsed
        });
      }

      if (cachedGeneration) {
        const parsed = JSON.parse(cachedGeneration) as Partial<GenerationState>;
        setGenerationState({
          ...initialGenerationState,
          ...parsed,
          isGenerating: false
        });
      }
    } catch (error) {
      console.error('Failed to load from cache:', error);
    }
  };

  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(GENERATION_CACHE_KEY);
      setData(initialData);
      setGenerationState(initialGenerationState);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToCache();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [data, generationState]);

  useEffect(() => {
    loadFromCache();
  }, []);

  const value: SOPContextType = {
    data,
    updateField,
    updateData,
    generationState,
    setGenerationLoading,
    setGenerationError,
    updateGeneratedContent,
    setWorkflowIds,
    setWorkflowStatus,
    setLanguagePreference,
    canGenerate,
    saveToCache,
    loadFromCache,
    clearCache,
    getFormData
  };

  return (
    <SOPContext.Provider value={value}>
      {children}
    </SOPContext.Provider>
  );
}

export function useSOP() {
  const context = useContext(SOPContext);
  if (context === undefined) {
    throw new Error('useSOP must be used within a SOPProvider');
  }
  return context;
}
