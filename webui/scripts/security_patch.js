import { exec, spawn } from 'kernelsu-alt';
import { basePath, showPrompt } from './main.js';
import { getString } from './language.js';

let jamesFork = false;

const dialog = document.getElementById('security-patch-dialog');
const advancedToggleElement = document.querySelector('.advanced-toggle');
const advancedToggle = document.getElementById('advanced-mode');
const normalInputs = document.getElementById('normal-mode-inputs');
const advancedInputs = document.getElementById('advanced-mode-inputs');
const devconfigInputs = document.getElementById('devconfig-mode-inputs');
const allPatchInput = document.getElementById('all-patch');
const bootPatchInput = document.getElementById('boot-patch');
const systemPatchInput = document.getElementById('system-patch');
const vendorPatchInput = document.getElementById('vendor-patch');
const devconfigPatchInput = document.getElementById('devconfig-securityPatch');
const getButton = document.getElementById('get-patch');
const autoButton = document.getElementById('auto-config');
const saveButton = document.getElementById('save-patch');

// Configurable options in james' fork
const devconfigOption = [
    'securityPatch',
    'osVersion',
    'brand',
    'device',
    'product',
    'manufacturer',
    'model',
    'serial',
    'meid',
    'imei',
    'imei2'
];

/**
 * Save the security patch configuration to file
 * @param {string} mode - 'disable',
'manual'
 * @param {string} value - The security patch value to save, if mode is 'manual'.
 */
function handleSecurityPatch(mode, value = null) {
    if (mode === 'disable') {
        exec(`
            rm -f /data/adb/tricky_store/security_patch_auto_config || true
            rm -f /data/adb/tricky_store/security_patch.txt || true
            rm -f /data/adb/tricky_store/devconfig.toml || true
        `).then(({ errno }) => {
            showPrompt(getString('security_patch_value_empty'));
            return errno === 0;
        });
    } else if (mode === 'manual') {
        const configFile = jamesFork ? '/data/adb/tricky_store/devconfig.toml' : '/data/adb/tricky_store/security_patch.txt';
        exec(`
            ${jamesFork ? '' : 'rm -f /data/adb/tricky_store/security_patch_auto_config || true'}
            echo "${value}" > ${configFile}
            chmod 644 ${configFile}
        `).then(({ errno }) => {
            const result = errno === 0;
            showPrompt(getString(result ? 'security_patch_save_success' : 'security_patch_save_failed'), result);
            return result;
        });
    }
}

// Load current configuration
async function loadCurrentConfig() {
    let allValue, systemValue, bootValue, vendorValue;
    try {
        const { errno } = await exec('[ -f /data/adb/tricky_store/security_patch_auto_config ]');
        if (jamesFork) {
            const { stdout } = await exec('cat /data/adb/tricky_store/devconfig.toml');
            if (stdout.trim() !== '') {
                const lines = stdout.split('\n');
                for (const line of lines) {
                    for (const option of devconfigOption) {
                        if (line.trim().startsWith(`${option} =`)) {
                            const value = line.split('=')[1].trim().replace(/"/g, '');
                            document.getElementById(`devconfig-${option}`).value = value;
                        }
                        if (!stdout.includes(option)) {
                            document.getElementById(`devconfig-${option}`).value = '';
                        }
                    }
                }
            }
        } else if (errno === 0) {
            allValue = null;
            systemValue = null;
            bootValue = null;
            vendorValue = null;
        } else {
            // Read values from tricky_store if manual mode
            const { stdout } = await exec('cat /data/adb/tricky_store/security_patch.txt');
            if (stdout.trim() !== '') {
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.startsWith('all=')) {
                        allValue = line.split('=')[1] || null;
                        if (allValue !== null) allPatchInput.value = allValue;
                    } else {
                        allValue = null;
                    }
                    if (line.startsWith('system=')) {
                        systemValue = line.split('=')[1] || null;
                        if (systemValue !== null) systemPatchInput.value = systemValue;
                    } else {
                        systemValue = null;
                    }
                    if (line.startsWith('boot=')) {
                        bootValue = line.split('=')[1] || null;
                        if (bootValue !== null) bootPatchInput.value = bootValue;
                    } else {
                        bootValue = null;
                    }
                    if (line.startsWith('vendor=')) {
                        vendorValue = line.split('=')[1] || null;
                        if (vendorValue !== null) vendorPatchInput.value = vendorValue;
                    } else {
                        vendorValue = null;
                    }
                }
            }
            if (allValue === null && (bootValue || systemValue || vendorValue)) {
                checkAdvanced(true);
            }
        }
    } catch (error) {
        console.error('Failed to load security patch config:', error);
    }
}

// Function to check advanced mode
function checkAdvanced(shouldCheck) {
    if (jamesFork) return;
    if (shouldCheck) {
        advancedToggle.checked = true;
        normalInputs.classList.add('hidden');
        advancedInputs.classList.remove('hidden');
    } else {
        advancedToggle.checked = false;
        normalInputs.classList.remove('hidden');
        advancedInputs.classList.add('hidden');
    }
}

// Unified date formatting function
window.formatDate = function(input) {
    let value = input.value.replace(/-/g, '');
    let formatted = value.slice(0, 4);

    // Allow 'no' input
    if (value === 'no') {
        input.value = 'no';
        input.setSelectionRange(2, 2);
        return 'no';
    }

    if (value.startsWith('n')) {
        // Only allow 'o' after 'n'
        if (value.length > 1 && value[1] !== 'o') {
            value = 'n';
        }
        formatted = value.slice(0, 2);
        if (value.length > 2) {
            input.value = formatted;
            input.setSelectionRange(2, 2);
            return formatted;
        }
    } else {
        // Only allow numbers if not starting with 'n'
        const numbersOnly = value.replace(/\D/g, '');
        if (numbersOnly !== value) {
            input.value = numbersOnly;
            value = numbersOnly;
            formatted = numbersOnly.slice(0, 4);
        }
        
        // Add hyphens on 5th and 7th character
        if (value.length >= 4) {
            formatted += '-'+ value.slice(4, 6);
        }
        if (value.length >= 6) {
            formatted += '-'+ value.slice(6, 8);
        }
    }

    // Handle backspace/delete
    const lastChar = value.slice(-1);
    if (lastChar === '-' || (isNaN(lastChar) && !['n'].includes(lastChar))) {
        formatted = formatted.slice(0, -1);
    }

    // Update input value
    const startPos = input.selectionStart;
    input.value = formatted;
    const newLength = formatted.length;
    const shouldMoveCursor = (value.length === 4 || value.length === 6) && newLength > startPos;
    input.setSelectionRange(shouldMoveCursor ? newLength : startPos, shouldMoveCursor ? newLength : startPos);

    return formatted;
}

// Validate date format YYYY-MM-DD
function isValidDateFormat(date) {
    if (date === 'no') return true;
    const regex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
    return regex.test(date);
}

// Validate 6-digit format YYYYMM
function isValid6Digit(value) {
    if (value === 'prop') return true;
    const regex = /^\d{6}$/;
    return regex.test(value);
}

// Validate 8-digit format YYYYMMDD
function isValid8Digit(value) {
    const regex = /^\d{8}$/;
    return regex.test(value);
}

// Initialize event listeners
export function securityPatch() {
    exec(`grep -q "James" "/data/adb/modules/tricky_store/module.prop" && ! grep -q "beakthoven" "/data/adb/modules/tricky_store/module.prop"`)
        .then(({ errno }) => {
            if (errno === 0) {
                jamesFork = true;
                document.getElementById('security-patch').textContent = getString('menu_set_devconfig');
                advancedToggleElement.style.display = 'none';
                normalInputs.classList.add('hidden');
                devconfigInputs.classList.remove('hidden');
            }
        });
    document.getElementById("security-patch").addEventListener("click", () => {
        dialog.show();
        loadCurrentConfig();
    });

    // Toggle advanced mode
    advancedToggle.addEventListener('change', () => {
        normalInputs.classList.toggle('hidden');
        advancedInputs.classList.toggle('hidden');
    });

    // Auto config button
    autoButton.addEventListener('click', () => {
        // TEESimulator-compat fork: track whether the script ever emitted
        // a literal "not set" line. Upstream reacted to any partial stdout
        // chunk containing the substring, which produced a false-fail toast
        // even when the script later wrote security_patch.txt successfully
        // (race between stdout buffering and exit). We now rely solely on
        // exit code + post-run file verification.
        let sawNotSet = false;
        const output = spawn('sh', [`${basePath}/common/get_extra.sh`, '--security-patch']);
        output.stdout.on('data', (data) => {
            // Match the exact "not set" line emitted by get_extra.sh's else
            // branch, not any substring of obfuscated/i18n output.
            if (/(^|\n)not set\s*(\n|$)/.test(String(data))) {
                sawNotSet = true;
            }
        });
        output.on('exit', async (code) => {
            const reset = () => {
                allPatchInput.value = '';
                systemPatchInput.value = '';
                bootPatchInput.value = '';
                vendorPatchInput.value = '';
                checkAdvanced(false);
            };

            // Post-run verification: if the script wrote a non-empty
            // security_patch.txt or the spoof prop is now set, treat it as
            // success regardless of upstream exit-code quirks.
            let fileOk = false;
            try {
                const { errno: e1, stdout: s1 } = await exec(
                    'sh -c "[ -s /data/adb/tricky_store/security_patch.txt ] && cat /data/adb/tricky_store/security_patch.txt || true"'
                );
                if (e1 === 0 && s1 && s1.trim().length > 0) fileOk = true;
            } catch (_) { /* ignore */ }

            if ((code === 0 && !sawNotSet) || fileOk) {
                exec(`touch /data/adb/tricky_store/security_patch_auto_config`);
                reset();
                showPrompt(getString('security_patch_auto_success'));
            } else {
                showPrompt(getString('security_patch_auto_failed'), false);
            }
            dialog.close();
            loadCurrentConfig();
        });
    });

    // Save button
    saveButton.addEventListener('click', async () => {
        if (jamesFork) {
            const devconfig = new Map();
            for (const option of devconfigOption) {
                const input = document.getElementById(`devconfig-${option}`);
                if (input.value.trim() === '') continue;
                devconfig.set(option, input.value.trim());
            }

            if (devconfig.size === 0) {
                handleSecurityPatch('disable');
                dialog.close();
                return;
            }

            if (!devconfig.has('securityPatch')) {
                exec('rm -f /data/adb/tricky_store/security_patch_auto_config || true');
            }

            // Separate top-level and deviceProps
            const topLevelKeys = ['securityPatch', 'osVersion'];
            const topLevel = [];
            const deviceProps = [];

            for (const [key, value] of devconfig.entries()) {
                if (topLevelKeys.includes(key)) {
                    if (key === 'osVersion') {
                        topLevel.push(`${key} = ${value}`);
                    } else {
                        topLevel.push(`${key} = \"${value}\"`);
                    }
                } else {
                    deviceProps.push(`${key} = \"${value}\"`);
                }
            }

            let config = topLevel.join('\n');
            if (deviceProps.length > 0) {
                config += `\n[deviceProps]\n` + deviceProps.join('\n');
            }

            handleSecurityPatch('manual', config);
        } else if (!advancedToggle.checked) {
            // Normal mode validation
            const allValue = allPatchInput.value.trim();
            if (!allValue) {
                // Save empty value to disable auto config
                handleSecurityPatch('disable');
                dialog.close();
                return;
            }
            if (!isValid8Digit(allValue)) {
                showPrompt(getString('security_patch_invalid_all'), false);
                return;
            }
            const value = `all=${allValue}`;
            const result = handleSecurityPatch('manual', value);
            if (result) {
                // Reset inputs
                systemPatchInput.value = '';
                bootPatchInput.value = '';
                vendorPatchInput.value = '';
            }
        } else {
            // Advanced mode validation
            const bootValue = formatDate(bootPatchInput, 'boot');
            const systemValue = systemPatchInput.value.trim();
            const vendorValue = vendorPatchInput.value.trim();

            if (!bootValue && !systemValue && !vendorValue) {
                // Save empty values to disable auto config
                handleSecurityPatch('disable');
                dialog.close();
                return;
            }

            if (systemValue && !isValid6Digit(systemValue)) {
                showPrompt(getString('security_patch_invalid_system'), false);
                return;
            }

            if (bootValue && !isValidDateFormat(bootValue)) {
                showPrompt(getString('security_patch_invalid_boot'), false);
                return;
            }

            if (vendorValue && !isValidDateFormat(vendorValue)) {
                showPrompt(getString('security_patch_invalid_vendor'), false);
                return;
            }

            const config = [
                systemValue ? `system=${systemValue}` : '',
                bootValue ? `boot=${bootValue}` : '',
                vendorValue ? `vendor=${vendorValue}` : ''
            ].filter(Boolean).join('\n');
            const result = handleSecurityPatch('manual', config);
            if (result) {
                // Reset inputs
                allPatchInput.value = '';
            }
        }
        dialog.close();
        loadCurrentConfig();
    });

    // Get button
    getButton.addEventListener('click', async () => {
        showPrompt(getString('security_patch_fetching'));
        // TEESimulator-compat fork: upstream replaced PATH with a list that
        // included a literal ":$PATH" string (env objects are not shell-
        // expanded), so /system/bin was effectively dropped and every
        // grep/sed/cut/getprop/curl call in get_extra.sh failed silently.
        // We now set an explicit PATH that prepends the optional rooted /
        // termux locations and still resolves to the real Android system
        // binaries.
        const PATCH_PATH = [
            "/data/adb/ap/bin",
            "/data/adb/ksu/bin",
            "/data/adb/magisk",
            "/data/data/com.termux/files/usr/bin",
            "/sbin",
            "/system/bin",
            "/system/xbin",
            "/vendor/bin",
        ].join(":");
        const output = spawn('sh', [`${basePath}/common/get_extra.sh`, '--get-security-patch'],
                        { cwd: "/data/local/tmp", env: { PATH: PATCH_PATH }});
        let gotDate = false;
        output.stdout.on('data', (data) => {
            const raw = String(data).trim();
            // Only treat the response as success if the script actually
            // emitted a YYYY-MM-DD date. Filters out partial/empty chunks
            // and the upstream stderr "Connection failed" leaking past.
            const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
            if (!m) return;
            gotDate = true;
            const date = m[1];
            showPrompt(getString('security_patch_fetched'), true, 1000);
            checkAdvanced(true);
            allPatchInput.value = date.replace(/-/g, '');
            systemPatchInput.value = 'prop';
            bootPatchInput.value = date;
            vendorPatchInput.value = date;
            devconfigPatchInput.value = date;
        });
        output.stderr.on('data', (data) => {
            if (String(data).includes("failed")) {
                // Don't surface the connection-failed toast yet -- the
                // script may still recover from PIF on the next stdout
                // chunk. We'll only complain on exit if no date arrived.
                console.warn(String(data).trim());
            } else {
                console.error(data);
            }
        });
        output.on('exit', (code) => {
            if (!gotDate) {
                showPrompt(getString('security_patch_get_failed'), false);
            }
        });
    });
}