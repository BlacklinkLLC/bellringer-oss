/**
 * Current period hero: big state heading + time range.
 */

import { qs, setText } from "../utils/dom.js";
import { formatClockMinutes, formatTimeRange } from "../utils/format.js";

export function renderCurrentPeriod({ snapshot }) {
    const heading = qs("#current-period");
    const range = qs("#current-range");
    const block = snapshot.currentBlock;

    setText(heading, snapshot.stateLabel);

    if (block) {
        setText(range, formatTimeRange(block.start, block.end));
    } else if (snapshot.nextBlock) {
        setText(
            range,
            `Starts at ${formatClockMinutes(snapshot.nextBlock.start)}`
        );
    } else {
        setText(range, "");
    }
}