export function linearRegression(x: number[], y: number[]) {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, v, i) => acc + v * y[i], 0);
  const sumXX = x.reduce((acc, v) => acc + v * v, 0);

  const denom = n * sumXX - sumX * sumX;
  if (!denom) return { slope: 0, intercept: sumY / n };

  return {
    slope: (n * sumXY - sumX * sumY) / denom,
    intercept: (sumY - (sumX * (n * sumXY - sumX * sumY)) / denom) / n,
  };
}

export interface LinearForecast {
  slope: number;
  intercept: number;
  /** Residual standard error of the fit (σ). */
  sigma: number;
  /** Fitted value at x. */
  predict: (x: number) => number;
  /** ±1σ prediction half-width at x; grows with distance from the data centroid. */
  halfWidth: (x: number) => number;
}

/**
 * Linear regression with uncertainty, for chart projections.
 * `halfWidth(x)` is the ±1σ prediction interval of a *new* observation at x.
 */
export function linearRegressionForecast(x: number[], y: number[]): LinearForecast {
  const n = x.length;
  const { slope, intercept } = linearRegression(x, y);
  const predict = (v: number) => slope * v + intercept;

  if (n < 3) {
    return { slope, intercept, sigma: 0, predict, halfWidth: () => 0 };
  }

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const sxx = x.reduce((acc, v) => acc + (v - meanX) ** 2, 0);
  const residualSS = y.reduce((acc, v, i) => acc + (v - predict(x[i])) ** 2, 0);
  const sigma = Math.sqrt(residualSS / (n - 2));

  return {
    slope,
    intercept,
    sigma,
    predict,
    halfWidth: (v) => (sxx === 0 ? sigma : sigma * Math.sqrt(1 + 1 / n + (v - meanX) ** 2 / sxx)),
  };
}
