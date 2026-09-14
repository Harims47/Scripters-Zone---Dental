import { IOcrProvider, OcrResult } from './IOcrProvider';

/**
 * MockDeterministicOcrProvider
 * 
 * Provides deterministic OCR output for offline development, integration tests,
 * and staging runs where external Cloud Vision APIs are disabled.
 */
export class MockDeterministicOcrProvider implements IOcrProvider {
  private mockTextMap: Map<string, string> = new Map();

  constructor(customMap?: Record<string, string>) {
    if (customMap) {
      Object.entries(customMap).forEach(([k, v]) => this.mockTextMap.set(k, v));
    }
  }

  setMockText(keyOrFilename: string, text: string) {
    this.mockTextMap.set(keyOrFilename, text);
  }

  async extractText(imageBuffer: Buffer, mimeType?: string): Promise<OcrResult> {
    // If buffer contains embedded UTF-8 string (useful for testing)
    const rawString = imageBuffer.toString('utf-8');
    if (rawString.includes('Patient:') || rawString.includes('Pt:') || rawString.includes('Date:')) {
      const lines = rawString.split(/\r?\n/).map(l => ({ text: l, confidence: 0.95 }));
      return {
        rawText: rawString,
        confidence: 0.95,
        lines
      };
    }

    // Default simulated legacy card text
    const defaultText = 
      "Dr. Sharma Dental Clinic\n" +
      "Date: 14/06/2016\n" +
      "Pt: Ramesh Patel\n" +
      "Ph: 9876543210\n" +
      "Age: 42 Yrs   Sex: Male\n" +
      "C/O: Severe lower molar pain and sensitivity\n";

    const lines = defaultText.split(/\n/).map(text => ({ text, confidence: 0.92 }));

    return {
      rawText: defaultText,
      confidence: 0.92,
      lines
    };
  }
}
