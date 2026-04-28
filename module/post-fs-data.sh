MODPATH=${0%/*}
TS="/data/adb/modules/tricky_store"
# TEESimulator support: also detect TEESimulator as a valid backend
TEE="/data/adb/modules/tee_simulator"
TEE_ALT="/data/adb/modules/teesimulator"
CONFIG_DIR="/data/adb/tricky_store"

while [ -z "$(ls -A /data/adb/modules/)" ]; do
    sleep 1
done

# Self-uninstall ONLY if neither Tricky Store nor TEESimulator nor a config dir exist.
# This allows running standalone with TEESimulator (which uses /data/adb/tricky_store/ for its config).
if [ ! -d "$TS" ] && [ ! -d "$TEE" ] && [ ! -d "$TEE_ALT" ] && [ ! -d "$CONFIG_DIR" ]; then
    if [ -f "$MODPATH/action.sh" ]; then
        [ -d "/data/adb/modules/TA_utl" ] && rm -rf "/data/adb/modules/TA_utl"
        cp -rf "$MODPATH/common/temp" "/data/adb/modules/TA_utl"
        touch "/data/adb/modules/TA_utl/remove"
    else
        touch "$MODPATH/remove"
    fi
fi

# Honor TS/remove flag only when Tricky Store is the active backend (not when TEESimulator is)
if [ -d "$TS" ] && [ -f "$TS/remove" ] && [ ! -d "$TEE" ] && [ ! -d "$TEE_ALT" ]; then
    if [ -f "$MODPATH/action.sh" ]; then
        [ -d "/data/adb/modules/TA_utl" ] && rm -rf "/data/adb/modules/TA_utl"
        cp -rf "$MODPATH/common/temp" "/data/adb/modules/TA_utl"
        touch "/data/adb/modules/TA_utl/remove"
    else
        touch "$MODPATH/remove"
    fi
fi

[ -L "$TS/webroot" ] && rm -f "$TS/webroot"
[ -L "$TS/action.sh" ] && rm -f "$TS/action.sh"

# Ensure config dir exists for TEESimulator standalone mode
mkdir -p "$CONFIG_DIR"

# detect root manager
[ "$APATCH" = "true" ] && MANAGER="APATCH"
[ "$KSU" = "true" ] && MANAGER="KSU"
[ ! "$APATCH" = "true" ] && [ ! "$KSU" = "true" ] && MANAGER="MAGISK"
echo "MANAGER=$MANAGER" > "$MODPATH/common/manager.sh"
chmod 755 "$MODPATH/common/manager.sh" || true
