import decky_plugin
import json
import os

SETTINGS_FILE = os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")


def _load_settings() -> dict:
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    return {}


def _save_settings(data: dict):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f)


class Plugin:

    async def get_api_key(self) -> str:
        settings = _load_settings()
        return settings.get("api_key", "")

    async def set_api_key(self, api_key: str) -> bool:
        settings = _load_settings()
        settings["api_key"] = api_key.strip()
        _save_settings(settings)
        return True

    async def clear_api_key(self) -> bool:
        settings = _load_settings()
        settings.pop("api_key", None)
        _save_settings(settings)
        return True

    async def _main(self):
        decky_plugin.logger.info("GeminiAI plugin started")

    async def _unload(self):
        decky_plugin.logger.info("GeminiAI plugin unloaded")
