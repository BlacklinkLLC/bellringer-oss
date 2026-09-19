/**
 * Next period card.
 *
 * Shows the next upcoming block and its start time. During passing time and
 * before school a live "Starts in …" countdown is shown as well.
 */

import { qs, setText, toggleHidden } from "../utils/dom.js";
import { formatClockMinutes, formatCountdown } from "../utils/format.js";

export function renderNextPeriod({ config, snapshot }) {
    const wrap = qs("#next-period");

    if (!config.settings.showNextPeriod || !snapshot.nextBlock) {
        toggleHidden(wrap, true);
        return;
    }

    const next = snapshot.nextBlock;
    const countdown =
        snapshot.stateKey === "in-passing" ||
        snapshot.stateKey === "before-school";

    toggleHidden(wrap, false);
    setText(qs("#next-name"), next.name);
    setText(qs("#next-start"), formatClockMinutes(next.start));

    const countNode = qs("#next-countdown");
    toggleHidden(countNode, !countdown);

    if (countdown && snapshot.nextStartInSeconds !== null) {
        setText(
            countNode,
            `Starts in ${formatCountdown(snapshot.nextStartInSeconds)}`
        );
    }
}