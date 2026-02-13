/**
 * The 52-Integer System Logic
 * Maps A-Z to 52 degrees (0-51 indices representing 360 degrees).
 * Step interval approx 6.923 degrees.
 * 'A' corresponds to index 0 and 1.
 * We use the first integer (d1) by default, which is index * 2.
 */

import { Point } from '../types';

// Default reduced by 50% (was 20)
export const DEFAULT_SEGMENT_LENGTH = 10;

export const getDegreeForChar = (char: string): number | null => {
  const code = char.toUpperCase().charCodeAt(0);
  
  // Check if A-Z
  if (code >= 65 && code <= 90) {
    const letterIndex = code - 65; // 0-25
    const degreeIndex = letterIndex * 2; // 0, 2, 4... 50
    
    // Calculate degree: (Index * 360) / 52
    return Math.round((degreeIndex * 360) / 52);
  }
  
  return null;
};

export const calculateNextPoint = (
  x: number, 
  y: number, 
  degree: number,
  length: number
): { x: number, y: number } => {
  const radians = (degree * Math.PI) / 180;
  return {
    x: x + length * Math.cos(radians),
    y: y - length * Math.sin(radians) // Minus for Y-up visual coordinate system
  };
};

export const generatePathData = (text: string, segmentLength: number = DEFAULT_SEGMENT_LENGTH) => {
  const calculatedPoints: Point[] = [];
  let currentX = 0;
  let currentY = 0;
  let currentAngle = 0; 

  // Start point
  calculatedPoints.push({ x: currentX, y: currentY, char: '', angle: 0, isSpace: false });

  let pathD = `M ${currentX} ${currentY}`;
  
  let min_x = 0;
  let max_x = 0;
  let min_y = 0;
  let max_y = 0;

  for (const char of text) {
    const isSpace = char === ' ';
    
    if (!isSpace) {
      const degree = getDegreeForChar(char);
      if (degree !== null) {
        currentAngle += degree;
      } else {
        continue; // Skip invalid chars
      }
    }

    const next = calculateNextPoint(currentX, currentY, currentAngle, segmentLength);
    
    if (isSpace) {
      pathD += ` M ${next.x} ${next.y}`;
    } else {
      pathD += ` L ${next.x} ${next.y}`;
    }

    currentX = next.x;
    currentY = next.y;

    calculatedPoints.push({
      x: currentX,
      y: currentY,
      char,
      angle: currentAngle,
      isSpace
    });

    min_x = Math.min(min_x, currentX);
    max_x = Math.max(max_x, currentX);
    min_y = Math.min(min_y, currentY);
    max_y = Math.max(max_y, currentY);
  }

  return {
    pathData: pathD,
    points: calculatedPoints,
    endPoint: { x: currentX, y: currentY },
    bounds: {
      minX: min_x,
      maxX: max_x,
      minY: min_y,
      maxY: max_y,
      width: max_x - min_x,
      height: max_y - min_y
    }
  };
};
