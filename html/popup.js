let enabledCheckbox = $('#enabled')
let profileSelector = $('#profile')
profileSelector.on('change', function () {
    saveSettings({ "profile": this.value });
});

enabledCheckbox.on('change', function () {
    profileSelector.prop('disabled', !this.checked);
    saveSettings({ "enabled": this.checked });
});

// get settings
chrome.runtime.sendMessage(
    { "operation": "get_settings" },
    (response) => {
        console.log("Resp: ", response);
        if (response) {
            profileSelector.val(response.profile);
            profileSelector.prop('disabled', !response.enabled);
            enabledCheckbox.prop('checked', response.enabled);
        }
    }
)

function saveSettings(settings) {
    chrome.runtime.sendMessage(
        {
            "operation": "save_settings",
            "settings": settings,
        },
        (response) => {
            console.log("Save settings resp: ", response);
        }
    )
}