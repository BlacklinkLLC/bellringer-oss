/**
 * Current period: big state heading, time range, progress bar and a
 * "next" card. This is the dashboard's hero.
 */

import { createElement, setText, toggleHidden } from "../../utils/dom.js";
import {
    formatClockMinutes,
    formatCountdown,
    formatDuration,
    formatRelativeDay,
    formatTimeRange
} from "../../utils/format.js";

export default {
    id: "current-period",
    name: "Current period",
    description: "What is happening right now, with progress and what's next.",
    icon: "Bell",
    defaultSize: "full",
    display: true,
    schema: {
        showProgress: { type: "boolean", label: "Show progress bar", default: true },
        showNext: { type: "boolean", label: "Show next period", default: true }
    },

    create() {
        const root = createElement("section", "hero");
        root.setAttribute("aria-label", "Current period");

        const top = createElement("div", "hero-top");
        top.appendChild(createElement("span", "eyebrow", "RIGHT NOW"));

        const title = createElement("h2", "current-period-title", "Loading…");
        const range = createElement("p", "current-range");
        range.setAttribute("aria-hidden", "true");

        const progressBlock = createElement("div", "progress-block");
        const bar = createElement("div", "progress-bar");
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        bar.setAttribute("aria-valuenow", "0");
        bar.setAttribute("aria-label", "Time remaining in the current period");
        const fill = createElement("div", "progress-fill");
        bar.appendChild(fill);
        const meta = createElement("div", "progress-meta");
        const elapsed = createElement("span");
        const percent = createElement("span");
        const remaining = createElement("span");
        meta.append(elapsed, percent, remaining);
        progressBlock.append(bar, meta);

        const next = createElement("div", "next-period");
        const nextName = createElement("strong");
        const nextStart = createElement("span", "next-start");
        const nextCountdown = createElement("span", "next-countdown");
        next.append(
            createElement("span", "next-label", "Next"),
            nextName,
            nextStart,
            nextCountdown
        );

        root.append(top, title, range, progressBlock, next);

        return {
            element: root,
            update({ config: school, snapshot, upcoming }, config) {
                const block = snapshot.currentBlock;
                setText(title, snapshot.stateLabel);

                if (block) {
                    setText(range, formatTimeRange(block.start, block.end));
                } else if (snapshot.nextBlock) {
                    setText(range, `Starts at ${formatClockMinutes(snapshot.nextBlock.start)}`);
                } else if (upcoming) {
                    const day = formatRelativeDay(upcoming.daysAhead, upcoming.dateKey);
                    const when = day === "Tomorrow" ? "tomorrow" : `on ${day}`;
                    setText(
                        range,
                        `School resumes ${when} at ${formatClockMinutes(upcoming.firstBlock.start)}`
                    );
                } else {
                    setText(range, "");
                }

                // Progress
                const progress = snapshot.progress;
                const showProgress =
                    config.showProgress && school.settings.showProgress && progress !== null;
                toggleHidden(progressBlock, !showProgress);
                if (showProgress) {
                    const pct = Math.max(0, Math.min(100, progress.percentage));
                    fill.style.width = `${pct}%`;
                    bar.setAttribute("aria-valuenow", String(Math.round(pct)));
                    setText(elapsed, `${formatDuration(progress.elapsedMinutes)} elapsed`);
                    setText(percent, `${Math.round(pct)}%`);
                    setText(remaining, `${formatDuration(progress.remainingMinutes)} left`);
                }

                // Next
                const showNext = config.showNext && school.settings.showNextPeriod;
                if (!showNext) {
                    toggleHidden(next, true);
                } else if (snapshot.nextBlock) {
                    const counting =
                        snapshot.stateKey === "in-passing" || snapshot.stateKey === "before-school";
                    toggleHidden(next, false);
                    setText(nextName, snapshot.nextBlock.name);
                    setText(nextStart, formatClockMinutes(snapshot.nextBlock.start));
                    toggleHidden(nextCountdown, !counting);
                    if (counting && snapshot.nextStartInSeconds !== null) {
                        setText(
                            nextCountdown,
                            `Starts in ${formatCountdown(snapshot.nextStartInSeconds)}`
                        );
                    }
                } else if (upcoming) {
                    toggleHidden(next, false);
                    setText(nextName, upcoming.firstBlock.name);
                    setText(
                        nextStart,
                        `${formatRelativeDay(upcoming.daysAhead, upcoming.dateKey)} at ` +
                            formatClockMinutes(upcoming.firstBlock.start)
                    );
                    toggleHidden(nextCountdown, true);
                } else {
                    toggleHidden(next, true);
                }
            }
        };
    }
};
