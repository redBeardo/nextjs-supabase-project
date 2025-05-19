interface SlideInfo {
  index: number;
  title: string;
  notes: string;
  thumbnailUrl?: string;
}

interface PresentationInfo {
  totalSlides: number;
  currentSlide: number;
  slides: SlideInfo[];
}

class OfficeBridge {
  private static instance: OfficeBridge;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): OfficeBridge {
    if (!OfficeBridge.instance) {
      OfficeBridge.instance = new OfficeBridge();
    }
    return OfficeBridge.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      if (!window.Office) {
        reject(new Error('Office.js is not loaded'));
        return;
      }

      window.Office.onReady((info: any) => {
        if (info.platform === 'Office') {
          this.isInitialized = true;
          resolve();
        } else {
          reject(new Error('Not running in Office environment'));
        }
      });
    });
  }

  async getPresentationInfo(): Promise<PresentationInfo> {
    if (!this.isInitialized) {
      throw new Error('OfficeBridge not initialized');
    }

    return new Promise((resolve, reject) => {
      window.Office.context.document.getSelectedDataAsync(
        window.Office.CoercionType.SlideRange,
        { valueFormat: 'unformatted' },
        (result: any) => {
          if (result.status === window.Office.AsyncResultStatus.Succeeded) {
            const slides = result.value.slides;
            const currentSlide = result.value.slideIndex;
            
            const slideInfos: SlideInfo[] = slides.map((slide: any, index: number) => ({
              index: index + 1,
              title: slide.title || `Slide ${index + 1}`,
              notes: slide.notes || '',
            }));

            resolve({
              totalSlides: slides.length,
              currentSlide: currentSlide,
              slides: slideInfos,
            });
          } else {
            reject(new Error('Failed to get presentation info'));
          }
        }
      );
    });
  }

  async goToSlide(slideIndex: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfficeBridge not initialized');
    }

    return new Promise((resolve, reject) => {
      window.Office.context.document.goToByIdAsync(
        `slide-${slideIndex}`,
        window.Office.GoToType.Slide,
        (result: any) => {
          if (result.status === window.Office.AsyncResultStatus.Succeeded) {
            resolve();
          } else {
            reject(new Error('Failed to navigate to slide'));
          }
        }
      );
    });
  }

  async getCurrentSlide(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('OfficeBridge not initialized');
    }

    return new Promise((resolve, reject) => {
      window.Office.context.document.getSelectedDataAsync(
        window.Office.CoercionType.SlideRange,
        { valueFormat: 'unformatted' },
        (result: any) => {
          if (result.status === window.Office.AsyncResultStatus.Succeeded) {
            resolve(result.value.slideIndex);
          } else {
            reject(new Error('Failed to get current slide'));
          }
        }
      );
    });
  }

  async startPresentation(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfficeBridge not initialized');
    }

    return new Promise((resolve, reject) => {
      window.Office.context.document.startPresentationAsync((result: any) => {
        if (result.status === window.Office.AsyncResultStatus.Succeeded) {
          resolve();
        } else {
          reject(new Error('Failed to start presentation'));
        }
      });
    });
  }

  async stopPresentation(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('OfficeBridge not initialized');
    }

    return new Promise((resolve, reject) => {
      window.Office.context.document.stopPresentationAsync((result: any) => {
        if (result.status === window.Office.AsyncResultStatus.Succeeded) {
          resolve();
        } else {
          reject(new Error('Failed to stop presentation'));
        }
      });
    });
  }
}

export const officeBridge = OfficeBridge.getInstance(); 