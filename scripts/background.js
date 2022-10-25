chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.operation) {
        switch (request.operation) {
            case "save_settings":
                try {
                    let data = request.settings
                    console.log("Save settings: ", data);
                    chrome.storage.sync.set(data, () => {
                        console.log("Save saved: ", data);
                        notifySettingsChanged();
                    });
                } catch (e) {
                    console.log("Failed to save settings: ", e);
                }
                return true;
            case "get_settings":
                console.log("Get settings: ", request);
                try {
                    chrome.storage.sync.get(
                        ['profile', 'enabled'],
                        (result) => {
                            console.log("storage: ", result)
                            let settings = {
                                enabled: result.enabled || false,
                                profile: result.profile || "manual",
                            }
                            console.log("Sending response: ", settings);
                            sendResponse(settings);
                            console.log("Response sent: ", settings);
                        }
                    );
                } catch (e) {
                    console.log("Failed to get settings: ", e);
                }
                return true;
        }
    }
});

async function notifySettingsChanged() {
    try {
        console.log("notifySettingsChanged()");
        chrome.storage.sync.get(null, async (result) => {
            let settings = {
                profile: result.profile || "manual",
                enabled: result.enabled || false,
            }
            console.log("current settings:", settings);
            let message = {
                "operation": "settings",
                "settings": settings,
            }

            try {
                await chrome.tabs.query({}, async (tabs) => {
                    for (let i = 0; i < tabs.length; ++i) {
                        try {
                            await chrome.tabs.sendMessage(tabs[i].id, message);
                            console.log("Notified tab:", tabs[i].url);
                        } catch (e) {
                            console.log("Failed to notify tab: ", tabs[i].url, e);
                        }
                    }
                });
            } catch (e) {
                console.log("Failed to notify settings change", e);
            }
        });
    } catch (e) {
        console.log("Failed to get settings", e);
    }
}