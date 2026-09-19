/**
 * Progress bar for the current period.
 *
 * The math lives in the schedule engine; this component only formats and
 * renders the numbers it is given.
 */

import { qs, setText, toggleHidden } from "../utils/dom.js";
import { formatDuration } from "../utils/format.js";

export function renderProgress({ config, snapshot }) {
    const block = qs("#progress-block");
    const bar = qs("#progress-bar");
    const fill = qs("#progress-fill");
    const elapsedNode = qs("#progress-elapsed");
    const remainingNode = qs("#progress-remaining");
    const percentNode = qs("#progress-percent");
    const progress = snapshot.progress;

    const visible =
        config.settings.showProgress && progress !== null;

    if (!visible) {
        toggleHidden(block, true);
        if (bar) {
            bar.setAttribute("aria-valuenow", "0");
        }
        return;
    }

    toggleHidden(block, false);

    const percentage = Math.max(0, Math.min(100, progress.percentage));
    const rounded = Math.round(percentage);

    fill.style.width = `${percentage}%`;
    bar.setAttribute("aria-valuenow", String(rounded));

    setText(elapsedNode, `${formatDuration(progress.elapsedMinutes)} elapsed`);
    setText(remainingNode, `${formatDuration(progress.remainingMinutes)} left`);
    setText(percentNode, `${rounded}%`);
}