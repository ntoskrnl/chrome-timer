class Timer {

    initialized = false;

    timerState = {
        intervalId: 0,
        dots: true,
        seconds: 0
    }

    $body = $('\
        <div id="jira-timer" style="position: fixed; bottom: 10px; right: 10px; width: 280px; height: 112px; margin: 0; padding: 0; z-index: 100">\
            <canvas width=280 height=112></canvas>\
        </div>\
    ');

    detectionStrategy = new ClickDetectionStrategy();

    renderer;

    constructor(detectionProfile) {
        this.setDetectionProfile(detectionProfile);
        this.$body.mouseenter(() => {
            if (this.timerState.intervalId) {
                // timer is running
                this.$body.css("opacity", "0.3");
            } else {
                this.$body.css("opacity", "1.0");
            }
        }).mouseleave(() => {
            this.$body.css("opacity", "1.0");
        });
    }

    init() {
        if (this.initialized) return

        if ($('#jira-timer').length) {
            this.initialized = true;
            return;
        }

        $('body').append(this.$body);

        let ctx = this.$body.find('canvas').get(0).getContext("2d");
        this.renderer = new TimeRenderer(ctx);
        this.renderer.render(0, true);

        this.initialized = true

        this.detectionStrategy.init(this);
    }

    destroy() {
        if (!this.initialized) return;
        this.reset();
        this.$body.remove();
        this.renderer = undefined;
        this.initialized = false;
    }

    start() {
        if (this.timerState.intervalId) return
        this.timerState.seconds = Date.now();
        this.timerState.dots = false;
        this.timerState.intervalId = setInterval(() => {
            let secondsDiff = Math.floor((Date.now() - this.timerState.seconds) / 1000);
            this.renderer.render(secondsDiff, this.timerState.dots);
            this.timerState.dots = !this.timerState.dots;
        }, 500);
    }


    reset() {
        this.timerState.dots = true;
        if (this.timerState.intervalId) {
            clearInterval(this.timerState.intervalId);
            this.timerState.intervalId = 0;
        }
        this.timerState.seconds = Date.now();
        this.renderer.render(0, this.timerState.dots);
    }

    setDetectionProfile(detectionProfile) {
        if (this.detectionStrategy.name === detectionProfile) return;
        this.detectionStrategy.dispose();

        switch (detectionProfile) {
            case 'manual':
                this.detectionStrategy = new ClickDetectionStrategy();
                break;
            case "jira-swim-lanes":
                this.detectionStrategy = new JiraSwimlanesDetectionStrategy();
                break;
            case "jira-assignee-quick-filter":
                this.detectionStrategy = new JiraAssigneeQuickFilterDetectionStrategy();
                break;
            default:
                this.detectionStrategy = new ClickDetectionStrategy();
                break;
        }
        if (this.initialized) {
            this.detectionStrategy.init(this);
        }
    }
}

class ClickDetectionStrategy {
    name = "manual";

    initialized = false;
    running = false;

    init(timer) {
        if (this.initialized) return;
        timer.$body.on('click', () => {
            this.detect(timer);
        });
        this.initialized = true
    }

    dispose() {
        this.initialized = false;
        this.running = false;
    }

    detect(timer) {
        if (!this.initialized) return;
        this.running = !this.running;
        if (this.running) {
            timer.start();
        } else {
            timer.reset();
        }
    }
}

class JiraAssigneeQuickFilterDetectionStrategy {
    name = "jira-assignee-quick-filter";

    initialized = false;

    init(timer) {
        if (this.initialized) return;

        this.buttons = $('#js-work-quickfilters a[title^="assign"]');
        this.buttons.on('click', () => {
            setTimeout(() => { this.detect(timer); }, 500);
        })
        this.initialized = true
    }

    dispose() {
        this.initialized = false;
        this.running = false;
    }

    detect(timer) {
        if (!this.initialized) return;
        let active = this.buttons.filter('[class="active"]');
        if (active.length === 1) {
            timer.start();
        } else {
            timer.reset();
        }
    }
}

class JiraSwimlanesDetectionStrategy {
    name = "jira-swim-lanes";

    initialized = false;

    init(timer) {
        if (this.initialized) return;

        let swimlanes = $('#ghx-pool.ghx-has-swimlanes .ghx-swimlane');
        swimlanes.on('click', () => {
            console.log("Swimlane clicked: ", this);
            setTimeout(() => { this.detect(timer); }, 500);
        })
        this.initialized = true
    }

    dispose() {
        this.initialized = false;
    }

    detect(timer) {
        if (!this.initialized) return;
        let swimlanes = $('#ghx-pool.ghx-has-swimlanes .ghx-swimlane');
        let active = swimlanes.not('[class*="ghx-closed"]');
        if (active.length === 1) {
            timer.start();
        } else {
            timer.reset();
        }
    }
}

class TimeRenderer {

    ctx;

    x = 1;
    y = 1;
    w = 8;
    scale = 7;
    space = 1;

    segments = {
        a: [[2, 0], [6, 0], [7, 1], [6, 2], [2, 2], [1, 1]],
        b: [[8, 2], [8, 6], [7, 7], [6, 6], [6, 2], [7, 1]],
        c: [[8, 8], [8, 12], [7, 13], [6, 12], [6, 8], [7, 7]],
        d: [[6, 14], [2, 14], [1, 13], [2, 12], [6, 12], [7, 13]],
        e: [[0, 12], [0, 8], [1, 7], [2, 8], [2, 12], [1, 13]],
        f: [[0, 6], [0, 2], [1, 1], [2, 2], [2, 6], [1, 7]],
        g: [[2, 6], [6, 6], [7, 7], [6, 8], [2, 8], [1, 7]],
    };
    digits = [
        ['a', 'b', 'c', 'd', 'e', 'f'], // 0
        ['b', 'c'], // 1
        ['a', 'b', 'd', 'e', 'g'], // 2
        ['a', 'b', 'c', 'd', 'g'], // 3
        ['b', 'c', 'f', 'g'], // 4
        ['a', 'c', 'd', 'f', 'g'], // 5
        ['a', 'c', 'd', 'e', 'f', 'g'], // 6
        ['a', 'b', 'c'], // 7
        ['a', 'b', 'c', 'd', 'e', 'f', 'g'], // 8
        ['a', 'b', 'c', 'd', 'f', 'g'], // 9
    ];

    constructor(ctx) {
        this.ctx = ctx;
    }

    render(seconds, dots) {
        this.clear();
        this.drawTime(seconds, dots, this.x, this.y);
    }

    clear() {
        let W = (4 * this.w + 6 * this.space + this.space * 2) * this.scale,
            H = (14 + this.space * 2) * this.scale;
        this.ctx.fillStyle = "#f0f0f0";
        this.ctx.fillRect(0, 0, W, H);

        this.ctx.strokeStyle = "#f0f0f0";
        this.ctx.fillStyle = "#e01010";
    }

    drawTime(seconds, dots, startX, startY) {
        let x = startX;
        let y = startY;
        let timeLimit = 30 * 60;
        if (seconds > timeLimit) {
            seconds %= timeLimit;
        }

        let min = Math.floor(seconds / 60);
        let sec = seconds % 60;

        this.drawDigit(Math.floor(min / 10), x, y);
        x += this.w + this.space;
        this.drawDigit(min % 10, x, y);
        x += this.w + this.space;
        if (dots) this.drawDots(x, y);
        x += this.space * 2 + this.space;
        this.drawDigit(Math.floor(sec / 10), x, y);
        x += this.w + this.space;
        this.drawDigit(sec % 10, x, y);
    }

    drawDots(x, y) {
        this.drawArea([[0, 4], [2, 4], [2, 6], [0, 6]], x, y);
        this.drawArea([[0, 8], [2, 8], [2, 10], [0, 10]], x, y);
    }

    drawDigit(digit, x, y) {
        for (let i = 0, sig; i < this.digits[digit].length; i++) {
            let segment = this.digits[digit][i];
            this.drawSegment(segment, x, y)
        }
    }

    drawSegment(segment, x, y) {
        this.drawArea(this.segments[segment], x, y);
    }

    drawArea(coords, x, y) {
        this.ctx.beginPath();
        for (let i = 0; i < coords.length; i++) {
            if (i === 0) {
                this.ctx.moveTo(
                    (x + coords[i][0]) * this.scale,
                    (y + coords[i][1]) * this.scale
                );
            }
            this.ctx.lineTo(
                (x + coords[i][0]) * this.scale,
                (y + coords[i][1]) * this.scale
            );
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fill();
    }

}

setTimeout(() => {
    initialize();
}, 1000);

function initialize() {
    let timer = new Timer();

    // get settings
    chrome.runtime.sendMessage(
        { "operation": "get_settings" },
        (response) => {
            console.log("Resp: ", response);
            if (response) {
                timer.setDetectionProfile(response.profile);
                if (response.enabled) {
                    timer.init();
                } else {
                    timer.destroy();
                }
            }
        }
    )

    listenToSettingChanges();
}

function listenToSettingChanges() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Event: ", request);
        if (request.operation) {
            if (request.operation === "settings") {
                let profile = request.settings.profile;
                timer.setDetectionProfile(profile);
                if (request.settings.enabled) {
                    timer.init();
                } else {
                    timer.destroy();
                }
            }
        }
    });
}


