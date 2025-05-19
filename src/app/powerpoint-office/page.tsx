'use client';

import { useState, useEffect } from 'react';
import OfficeJSInitializer from '@/components/OfficeJSInitializer';
import { debug } from '@/utils/debug';

declare global {
  namespace Office {
    interface AsyncResult<T> {
      status: AsyncResultStatus;
      value: T;
      error?: any;
    }

    enum AsyncResultStatus {
      Succeeded = 'succeeded',
      Failed = 'failed'
    }

    enum CoercionType {
      SlideRange = 'slideRange'
    }

    enum GoToType {
      Slide = 'slide'
    }

    interface Document {
      getSelectedDataAsync(coercionType: CoercionType, callback: (result: AsyncResult<any>) => void): void;
      goToByIdAsync(id: string, goToType: GoToType, callback: (result: AsyncResult<void>) => void): void;
    }

    interface Context {
      document: Document;
      host: string;
      version: string;
    }

    interface Office {
      context: Context;
      platform: string;
      onReady(callback: () => void): void;
    }
  }

  interface Window {
    Office: any;
  }
}

interface SlideInfo {
  id: string;
  title: string;
  notes: string;
}

interface PresentationData {
  slides: SlideInfo[];
}

export default function PowerPointOffice() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [presentationInfo, setPresentationInfo] = useState<PresentationData | null>(null);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const handleInitialized = () => {
    debug.log('Starting initialization');
    try {
      const presentation = window.Office.context.document;
      debug.log('Got presentation context');

      // Get presentation info
      presentation.getSelectedDataAsync(window.Office.CoercionType.SlideRange, (result: Office.AsyncResult<PresentationData>) => {
        if (result.status === window.Office.AsyncResultStatus.Succeeded) {
          debug.log('Successfully got presentation info', result.value);
          setPresentationInfo(result.value);
          setTotalSlides(result.value.slides.length);
        } else {
          debug.error('Failed to get presentation info', result.error);
          setError(new Error('Failed to get presentation info'));
        }
      });

      setIsInitialized(true);
      debug.log('Initialization complete');
    } catch (err) {
      debug.error('Error during initialization', err);
      setError(err instanceof Error ? err : new Error('Unknown error during initialization'));
    }
  };

  const handleError = (err: Error) => {
    debug.error('Office.js initialization error', err);
    setError(err);
  };

  const changeSlide = (direction: 'next' | 'prev') => {
    debug.log(`Changing slide: ${direction}`);
    try {
      const presentation = window.Office.context.document;
      if (direction === 'next' && currentSlide < totalSlides - 1) {
        presentation.goToByIdAsync(presentationInfo?.slides[currentSlide + 1].id, window.Office.GoToType.Slide, (result: Office.AsyncResult<void>) => {
          if (result.status === window.Office.AsyncResultStatus.Succeeded) {
            setCurrentSlide(prev => prev + 1);
            debug.log('Successfully moved to next slide');
          } else {
            debug.error('Failed to move to next slide', result.error);
          }
        });
      } else if (direction === 'prev' && currentSlide > 0) {
        presentation.goToByIdAsync(presentationInfo?.slides[currentSlide - 1].id, window.Office.GoToType.Slide, (result: Office.AsyncResult<void>) => {
          if (result.status === window.Office.AsyncResultStatus.Succeeded) {
            setCurrentSlide(prev => prev - 1);
            debug.log('Successfully moved to previous slide');
          } else {
            debug.error('Failed to move to previous slide', result.error);
          }
        });
      }
    } catch (err) {
      debug.error('Error changing slide', err);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="p-4 text-red-600">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!isInitialized) {
    return <OfficeJSInitializer onInitialized={handleInitialized} onError={handleError} />;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Presentation Timer</h1>
        <div className="text-4xl font-mono mb-4">{formatTime(timer)}</div>
        <button
          onClick={() => setIsTimerRunning(!isTimerRunning)}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          {isTimerRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => setTimer(0)}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Reset
        </button>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Slide Navigation</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => changeSlide('prev')}
            disabled={currentSlide === 0}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Slide {currentSlide + 1} of {totalSlides}
          </span>
          <button
            onClick={() => changeSlide('next')}
            disabled={currentSlide === totalSlides - 1}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {presentationInfo && (
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Current Slide</h2>
          <div className="border p-4 rounded">
            <p className="font-bold">{presentationInfo.slides[currentSlide]?.title || 'Untitled Slide'}</p>
            <p className="text-gray-600">{presentationInfo.slides[currentSlide]?.notes || 'No notes'}</p>
          </div>
        </div>
      )}
    </div>
  );
} 