// The guided tour's timing. The steps and their words live in src/content/tour.js.
// tourDuration: total seconds. tourStart(i): when step i begins. tourIndex(seconds): which step is
// showing at that moment (-1 once the tour is over).
import { tourSteps } from '../../content/tour.js';

export { tourSteps, tourDone, tourLanguages } from '../../content/tour.js';

export const tourDuration = tourSteps.reduce((total, step) => total + step.seconds, 0);
export const tourStart = (index) =>
  tourSteps.slice(0, index).reduce((total, step) => total + step.seconds, 0);
export function tourIndex(seconds) {
  let end = 0;
  return tourSteps.findIndex((step) => {
    end += step.seconds;
    return seconds < end;
  });
}
