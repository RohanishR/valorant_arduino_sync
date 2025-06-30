import { kWindowNames } from '../../scripts/constants/window-names.js';
import { RunningGameService } from '../../scripts/services/running-game-service.js';
import { WindowsService } from '../../scripts/services/windows-service.js';
import { HotkeysService } from '../../scripts/services/hotkeys-service.js';
import { GepService } from '../../scripts/services/gep-service.js';
import { EventBus } from '../../scripts/services/event-bus.js';
import { GoogleAnalytics } from '../../scripts/services/google-analytics.js';
import { kGameClassIds, kGamesFeatures } from '../../scripts/constants/games-features.js';
import { kHotkeySecondScreen, kHotkeyToggle } from '../../scripts/constants/hotkeys-ids.js';

export class BackgroundController {
  constructor() {
    this.runningGameService = new RunningGameService();
    this.hotkeysService = new HotkeysService();
    this.owEventBus = new EventBus();
    this.owEventsStore = [];
    this.owInfoUpdatesStore = [];
    this.shutdownTimeout = null;
    this.hasMultipleMonitors = null;
    this.ga = new GoogleAnalytics();
  }

  async run() {
    // These objects will be available via calling
    // overwolf.windows.getMainWindow() in other windows
    window.owEventBus = this.owEventBus;
    window.owEventsStore = this.owEventsStore;
    window.owInfoUpdatesStore = this.owInfoUpdatesStore;

    this.hasMultipleMonitors = await BackgroundController._hasMultipleMonitors();

    // Register handlers to hotkey events
    this._registerHotkeys();

    await this._restoreLaunchWindow();

    // Switch between desktop/in-game windows when launching/closing game
    this.runningGameService.addGameRunningChangedListener(isRunning => {
      this._onRunningGameChanged(isRunning);
    });

    overwolf.extensions.onAppLaunchTriggered.addListener(e => {
      if (e && e.source !== 'gamelaunchevent') {
        this._restoreAppWindow();
      }
    });

    // Listen to changes in window states
    overwolf.windows.onStateChanged.addListener(() => {
      this._onWindowStateChanged();
    });

    this.ga.start();
    this.ga.ga('send', 'pageview');
  }

  /**
   * App was launched with game launch
   * @private
   */
  static _launchedWithGameEvent() {
    return location.href.includes('source=gamelaunchevent');
  }

  /**
   * This PC has multiple monitors
   * @private
   */
  static async _hasMultipleMonitors() {
    const monitors = await WindowsService.getMonitorsList();

    return (monitors.length > 1);
  }

  /**
   * Handle game opening/closing
   * @private
   */
  async _onRunningGameChanged(isGameRunning) {
    if (!isGameRunning) {
      // Open desktop window
      WindowsService.restore(kWindowNames.DESKTOP);
      // Close game windows
      WindowsService.close(kWindowNames.IN_GAME);
      WindowsService.close(kWindowNames.SECOND);
      return;
    }

    const gameInfo = await this.runningGameService.getRunningGameInfo();

    if (
      !gameInfo ||
      !gameInfo.isRunning ||
      !gameInfo.classId ||
      !kGameClassIds.includes(gameInfo.classId)
    ) {
      return;
    }

    // Clear the stored data when a new game starts
    this.owEventsStore.length = 0;
    this.owInfoUpdatesStore.length = 0;

    const gameFeatures = kGamesFeatures.get(gameInfo.classId);

   const features = [
  "kill", "kill_feed", "death",
  "match_info", "match", "match_end", "match_stats",
  "round", "round_start", "round_end", "spike_defused", "spike_detonated", "match_start", "player"
];


GepService.setRequiredFeatures(
  features,
  e => this._onGameEvents(e),
  e => this._onInfoUpdate(e)
).then(() => {
  console.log("✅ Features registered:", features);
}).catch(err => {
  console.error("❌ Failed to register features:", err);
});



    // Open in-game window
    await this._restoreGameWindow();

    // Close desktop window
    await WindowsService.close(kWindowNames.DESKTOP);
  }

  /**
   * Open the relevant window on app launch
   * @private
   */
  async _restoreLaunchWindow() {
    const gameInfo = await this.runningGameService.getRunningGameInfo();

    if (!gameInfo || !gameInfo.isRunning) {
      await WindowsService.restore(kWindowNames.DESKTOP);
      return;
    }

    if (!kGameClassIds.includes(gameInfo.classId)) {
      return;
    }

    const gameFeatures = kGamesFeatures.get(gameInfo.classId);

    if (gameFeatures && gameFeatures) {
      GepService.setRequiredFeatures(
        gameFeatures,
        e => this._onGameEvents(e),
        e => this._onInfoUpdate(e)
      );
    }

    // If app was not launched automatically, restore the a relevant game window
    if (!BackgroundController._launchedWithGameEvent()) {
      await this._restoreGameWindow();
    }
  }

  /**
   * Open the relevant window on user request
   * @private
   */
  async _restoreAppWindow() {
    const isGameRunning = await this.runningGameService.isGameRunning();

    if (isGameRunning) {
      await this._restoreGameWindow();
    } else {
      await WindowsService.restore(kWindowNames.DESKTOP);
    }
  }

  /**
   * Restore the relevant game window, in-game or on second screen,
   * depending on whether the user has a second screen
   * @private
   */
  _restoreGameWindow() {
    if (this.hasMultipleMonitors) {
      return WindowsService.restore(kWindowNames.SECOND);
    } else {
      return WindowsService.restore(kWindowNames.IN_GAME);
    }
  }

  /**
   * Listen to window state changes,
   * and close the app when all UI windows are closed
   * @private
   */
  async _onWindowStateChanged() {
    if (await this._canShutdown()) {
      this._startShutdownTimeout();
    } else {
      this._stopShutdownTimeout();
    }
  }

  /**
   * Check whether we can safely close the app
   * @private
   */
  async _canShutdown() {
    const isGameRunning = await this.runningGameService.isGameRunning();

    // Never shut down the app when a game is running,
    // so we won't miss any events
    if (isGameRunning) {
      return false;
    }

    const states = await WindowsService.getWindowsStates();

    // If all UI (non-background) windows are closed, we can close the app
    return Object.entries(states)
      .filter(([windowName]) => (windowName !== kWindowNames.BACKGROUND))
      .every(([windowName, windowState]) => (windowState === 'closed'));
  }

  /**
   * Start shutdown timeout, and close after 10 if possible
   * @private
   */
  _startShutdownTimeout() {
    this._stopShutdownTimeout();

    this.shutdownTimeout = setTimeout(async () => {
      if (await this._canShutdown()) {
        window.close(); // Close the whole app
      }
    }, 10000);
  }

  /**
   * Stop shutdown timeout
   * @private
   */
  _stopShutdownTimeout() {
    if (this.shutdownTimeout !== null) {
      clearTimeout(this.shutdownTimeout);
      this.shutdownTimeout = null;
    }
  }

  /**
   * Set custom hotkey behavior
   * @private
   */
  _registerHotkeys() {
    this.hotkeysService.setToggleHotkeyListener(kHotkeyToggle, () => {
      this._onHotkeyTogglePressed();
    });

    this.hotkeysService.setToggleHotkeyListener(kHotkeySecondScreen, () => {
      this._onHotkeySecondScreenPressed();
    });
  }

  /**
   * Handle toggle hotkey press
   * @private
   */
  async _onHotkeyTogglePressed() {
    const states = await WindowsService.getWindowsStates();

    if (WindowsService.windowStateIsOpen(states[kWindowNames.SECOND])) {
      WindowsService.close(kWindowNames.SECOND);
      return;
    }

    if (WindowsService.windowStateIsOpen(states[kWindowNames.IN_GAME])) {
      WindowsService.close(kWindowNames.IN_GAME);
    } else {
      WindowsService.restore(kWindowNames.IN_GAME);
    }
  }

  /**
   * Handle second screen hotkey press
   * @private
   */
  async _onHotkeySecondScreenPressed() {
    const states = await WindowsService.getWindowsStates();

    if (WindowsService.windowStateIsOpen(states[kWindowNames.SECOND])) {
      WindowsService.close(kWindowNames.SECOND);
      WindowsService.restore(kWindowNames.IN_GAME);
    } else {
      WindowsService.restore(kWindowNames.SECOND);
      WindowsService.close(kWindowNames.IN_GAME);
    }
  }

  /**
   * Pass events to windows that are listening to them
   * @private
   */
_onGameEvents(data) {
  data.events.forEach(event => {
    this.owEventsStore.push(event);
    this.owEventBus.trigger('event', event);

    const eventName = event.name;
    console.log("🔥 EVENT:", JSON.stringify(event, null, 2));


    // ✅ Send all relevant events to Python
    const validEvents = [
      "kill",
      "death",
      "matchStart",
      "round_start",
      "round_end",
      "match_end",
      "match_win",
      "match_lose",
      "spike_defused",
      "spike_detonated",
      "match_start",
    ];

    if (validEvents.includes(eventName)) {
    fetch(`http://localhost:5000/event?name=${eventName}&data=${encodeURIComponent(JSON.stringify(event.data))}`)
    .then(() => console.log("Sent to Python:", eventName))
    .catch(err => console.error("Failed to send:", err));
  }
    


    if (event.name === "match_start") {
      this._restoreGameWindow();
    }
  });
}


  /**
   * Pass info updates to windows that are listening to them
   * @private
   */
  _onInfoUpdate(infoUpdate) {
  this.owInfoUpdatesStore.push(infoUpdate);
  this.owEventBus.trigger('info', infoUpdate);

  const playerInfo = infoUpdate?.info?.player;
  if (playerInfo && playerInfo.health !== undefined) {
  fetch(`http://localhost:5000/event?name=health&data=${playerInfo.health}`)
    .then(() => console.log("📤 Sent to Python: health =", playerInfo.health));
  }


  const matchInfo = infoUpdate?.info?.match_info;
  if (!matchInfo) return;

  console.log("🔍 Info Update:", JSON.stringify(infoUpdate, null, 2));

  if (matchInfo.round_phase) {
    fetch(`http://localhost:5000/event?name=round_phase&data=${matchInfo.round_phase}`)
      .then(() => console.log("📤 Sent to Python: round_phase =", matchInfo.round_phase));
  }

  if (matchInfo.round_number) {
    fetch(`http://localhost:5000/event?name=round_number&data=${matchInfo.round_number}`)
      .then(() => console.log("📤 Sent to Python: round_number =", matchInfo.round_number));
  }

  if (matchInfo.score) {
    fetch(`http://localhost:5000/event?name=score&data=${matchInfo.score}`)
      .then(() => console.log("📤 Sent to Python: score =", matchInfo.score));
  }

  if (matchInfo.match_score) {
    fetch(`http://localhost:5000/event?name=match_score&data=${matchInfo.match_score}`)
      .then(() => console.log("📤 Sent to Python: match_score =", matchInfo.match_score));
  }

  if (matchInfo.round_report) {
    fetch(`http://localhost:5000/event?name=round_report&data=${encodeURIComponent(matchInfo.round_report)}`)
      .then(() => console.log("📤 Sent to Python: round_report"));
  }
}


}
