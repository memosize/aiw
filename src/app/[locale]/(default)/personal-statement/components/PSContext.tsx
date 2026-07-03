"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface PSData {
  target: string;
  count: string;
  education: string;
  skill: string;
  research: string;
  workExperience: string;
  reason: string;
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

interface PSContextType {
  data: PSData;
  updateField: (field: keyof PSData, value: string) => void;
  updateData: (newData: Partial<PSData>) => void;
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
  getFormData: () => PSData;
}

const PSContext = createContext<PSContextType | undefined>(undefined);

const CACHE_KEY = 'ps-form-data';
const GENERATION_CACHE_KEY = 'ps-generation-state';

export function PSProvider({ children }: { children: ReactNode }) {
  const initialData: PSData = {
    target: '',
    count: '800',
    education: '',
    skill: '',
    research: '',
    workExperience: '',
    reason: ''
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

  const [data, setData] = useState<PSData>(initialData);
  const [generationState, setGenerationState] = useState<GenerationState>(initialGenerationState);

  const updateField = (field: keyof PSData, value: string) => {
    setData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateData = (newData: Partial<PSData>) => {
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

  const getFormData = (): PSData => {
    return {
      ...data
    };
  };

  const saveToCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(GENERATION_CACHE_KEY, JSON.stringify(generationState));
    }
  };

  const loadFromCache = () => {
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedGenState = localStorage.getItem(GENERATION_CACHE_KEY);

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData) as Partial<PSData>;
          setData({
            ...initialData,
            ...parsed
          });
        } catch (e) {
          console.error('Failed to parse cached data:', e);
        }
      }

      if (cachedGenState) {
        try {
          const parsed = JSON.parse(cachedGenState) as Partial<GenerationState>;
          setGenerationState({
            ...initialGenerationState,
            ...parsed,
            isGenerating: false
          });
        } catch (e) {
          console.error('Failed to parse cached generation state:', e);
        }
      }
    }
  };

  const clearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(GENERATION_CACHE_KEY);
      setData(initialData);
      setGenerationState(initialGenerationState);
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

  const value: PSContextType = {
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
    <PSContext.Provider value={value}>
      {children}
    </PSContext.Provider>
  );
}

export function usePS() {
  const context = useContext(PSContext);
  if (context === undefined) {
    throw new Error('usePS must be used within a PSProvider');
  }
  return context;
}
