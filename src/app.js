let config = null;

async function loadConfig() {
    const response = await fetch("config.json");

    if (!response.ok) {
        throw new Error(
            `Failed to load config.json (${response.status})`
        );
    }

    config = await response.json();
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
}

function getCurrentMinutes() {
    const now = new Date();

    return (
        now.getHours() * 60 +
        now.getMinutes() +
        now.getSeconds() / 60
    );
}

function formatTime(time) {
    const [hours, minutes] = time.split(":").map(Number);

    const date = new Date();

    date.setHours(hours);
    date.setMinutes(minutes);

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}

function renderSchool() {
    document.title =
        `BellRinger Open | ${config.school.name}`;

    document.getElementById("school-name").textContent =
        config.school.name;
}

function renderAnnouncements() {
    const panel =
        document.getElementById("announcements-panel");

    const container =
        document.getElementById("announcements");

    if (!config.settings.showAnnouncements) {
        panel.hidden = true;
        return;
    }

    container.innerHTML = "";

    config.announcements.forEach(announcement => {
        const element = document.createElement("article");

        element.innerHTML = `
            <h4>${announcement.title}</h4>
            <p>${announcement.message}</p>
        `;

        container.appendChild(element);
    });
}

function updateClock() {
    const clock =
        document.getElementById("clock");

    if (!config.settings.showClock) {
        clock.hidden = true;
        return;
    }

    clock.textContent =
        new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit"
        });
}

function updateSchedule() {
    const schedule =
        config.schedule;

    const currentTime =
        getCurrentMinutes();

    const currentIndex =
        schedule.findIndex(period => {
            return (
                currentTime >= timeToMinutes(period.start) &&
                currentTime < timeToMinutes(period.end)
            );
        });

    const scheduleElement =
        document.getElementById("schedule");

    scheduleElement.innerHTML = "";

    schedule.forEach((period, index) => {

        const element =
            document.createElement("div");

        element.className = "period";

        if (index === currentIndex) {
            element.classList.add("active");
        }

        element.innerHTML = `
            <strong>${period.name}</strong>

            <span>
                ${formatTime(period.start)}
                -
                ${formatTime(period.end)}
            </span>
        `;

        scheduleElement.appendChild(element);
    });

    updateCurrentPeriod(
        schedule,
        currentIndex,
        currentTime
    );
}

function updateCurrentPeriod(
    schedule,
    currentIndex,
    currentTime
) {
    const name =
        document.getElementById("current-period");

    const time =
        document.getElementById("current-time");

    const progress =
        document.getElementById("progress");

    const progressText =
        document.getElementById("progress-text");

    if (currentIndex === -1) {

        name.textContent =
            currentTime < timeToMinutes(schedule[0].start)
                ? "School hasn't started"
                : "School day complete";

        time.textContent = "";

        progress.style.width = "0%";

        progressText.textContent = "0%";

        return;
    }

    const period =
        schedule[currentIndex];

    const start =
        timeToMinutes(period.start);

    const end =
        timeToMinutes(period.end);

    const percentage =
        ((currentTime - start) /
        (end - start)) * 100;

    name.textContent =
        period.name;

    time.textContent =
        `${formatTime(period.start)} - ${formatTime(period.end)}`;

    if (config.settings.showProgress) {

        progress.style.width =
            `${percentage}%`;

        progressText.textContent =
            `${Math.round(percentage)}%`;

    } else {

        progress.style.width = "0%";

        progressText.textContent = "";

    }
}

function update() {
    updateClock();
    updateSchedule();
}

async function start() {
    try {

        await loadConfig();

        renderSchool();
        renderAnnouncements();

        update();

        setInterval(update, 1000);

    } catch (error) {

        console.error(error);

        document.body.innerHTML = `
            <main>
                <section class="panel">
                    <h1>BellRinger failed to load</h1>
                    <p>
                        ${error.message}
                    </p>
                </section>
            </main>
        `;
    }
}

start();