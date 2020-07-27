'use strict';

const Homey = require('homey');

// This function estimates the distance between a generic_beacon and Homey. It is based
// on the ratio of the generic_beacon signal strength(rssi) over the calibrated
// transmitter power.
function getDistance(calibratedPower, rssi) {
    const ratio = rssi / calibratedPower;

    if (ratio < 1.0) {
        return Math.pow(ratio, 10);
    }

    return (0.19) * Math.pow(ratio, 8);
}

class BeaconDevice extends Homey.Device {

    /**
     * on init the device
     */
    onInit() {
        Homey.app.log('Beacon device ' + this.getName() + ' is initiated...');
        this.changeDetected = 0;
    }

    /**
     *  Set detect
     */
    setDetect() {
        if (this.getCapabilityValue("detect") === false) {

            this.changeDetected++;
            Homey.app.log('generic_beacon:' + this.getName() + " changed detect inside: " + this.changeDetected);

            if (this.changeDetected >= Homey.ManagerSettings.get('verificationAmountInside')) {
                this.setCapabilityValue("detect", true);

                Homey.app.beaconInsideRange.trigger({
                    'device': this.getName(),
                    'beacon': this.getName()
                })
                    .then(function () {
                        Homey.app.log('Done trigger flow card beacon_inside_range');
                    })
                    .catch(function (error) {
                        Homey.app.log('Cannot trigger flow card beacon_inside_range: ' + error);
                    });

                Homey.app.deviceBeaconInsideRange.trigger(this, {
                    'beacon': this.getName()
                })
                    .then(function () {
                        Homey.app.log('Done trigger flow card device_beacon_inside_range');
                    })
                    .catch(function (error) {
                        Homey.app.log('Cannot trigger flow card device_beacon_inside_range: ' + error);
                    });

                Homey.app.beaconStateChanged.trigger({
                    'device': this.getName(),
                    'beacon': this.getName(),
                    'detected': true
                })
                    .then(function () {
                        Homey.app.log('Done trigger flow card beacon_state_changed');
                    })
                    .catch(function (error) {
                        Homey.app.log('Cannot trigger flow card beacon_state_changed: ' + error);
                    });

                Homey.app.deviceBeaconStateChanged.trigger(this, {
                    'beacon': this.getName(),
                    'detected': true
                })
                    .then(function () {
                        Homey.app.log('Done trigger flow card device_beacon_state_changed');
                    })
                    .catch(function (error) {
                        Homey.app.log('Cannot trigger flow card device_beacon_state_changed: ' + error);
                    });
            }
        } else {
            this.changeDetected = 0;
        }
    }

    /**
     *  Set undetected
     */
    setUndetect() {
        if (this.getCapabilityValue("detect") === true) {

            this.changeDetected++;
            Homey.app.log('generic_beacon:' + this.getName() + " changed detect outside: " + this.changeDetected);

            if (this.changeDetected >= Homey.ManagerSettings.get('verificationAmountOutside')) {
                this.setCapabilityValue("detect", false);

                Homey.app.beaconOutsideRange.trigger({
                    'device': this.getName(),
                    'beacon': this.getName()
                })
                    .then(function () {
                        Homey.app.log('Done trigger flow card beacon_outside_range');
                    })
                    .catch(function (error) {
                        Homey.app.log('Cannot trigger flow card beacon_outside_range: ' + error);
                    });

                Homey.app.deviceBeaconOutsideRange.trigger(this, {
                    'beacon': this.getName()
                })
                    .then(function () {
                        Homey.app.log('Done trigger flow card device_beacon_outside_range');
                    })
                    .catch(function (error) {
                        Homey.app.log('Cannot trigger flow card device_beacon_outside_range: ' + error);
                    });

                Homey.app.beaconStateChanged.trigger({
                    'device': this.getName(),
                    'beacon': this.getName(),
                    'detected': false
                })
                    .then(function () {
                        Homey.app.log('Done trigger flow card beacon_state_changed');
                    })
                    .catch(function (error) {
                        Homey.app.log('Cannot trigger flow card beacon_state_changed: ' + error);
                    });

                Homey.app.deviceBeaconStateChanged.trigger(this, {
                    'beacon': this.getName(),
                    'detected': false
                })
                    .then(function () {
                        Homey.app.log('Done trigger flow card device_beacon_state_changed');
                    })
                    .catch(function (error) {
                        Homey.app.log('Cannot trigger flow card device_beacon_state_changed: ' + error);
                    });
            }
        } else {
            this.changeDetected = 0;
        }
    }

    /**
     * Update capability values using data contained in generic_beacon advertisement.
     * NOTE: Homey does not allow yet to set Energy object during pairing
     * procedure (see https://apps.developer.athom.com/tutorial-Drivers-Pairing.html,
     * example, "/drivers/<driver_id>/driver.js").
     * In order to set the Energy object, an object that contains energy info
     * may have been previously saved into a (temporary) store whose Id is
     * "energy". If the "energy" store exists, this method saves its value into
     * the Energy object of the device and unset (removes) the "energy" store.
     */
    updateCapabilityValues(beacon) {
        if (this.hasCapability("signal_strength")) {
            if (this.getCapabilityValue("signal_strength") != beacon.rssi) {
                this.setCapabilityValue("signal_strength", beacon.rssi)
                    .catch(this.error);
            }
        }
        if (this.hasCapability("homey_distance")) {
            let newDistance = getDistance(beacon.calibratedPower, beacon.rssi);
            console.log('set distance: ' + beacon.name + "  = " + newDistance)
            if (this.getCapabilityValue("homey_distance") != newDistance) {
                this.setCapabilityValue("homey_distance", newDistance)
                    .catch(this.error);
            }
        }
        if (beacon.batteryLevel !== undefined) {
            if (this.hasCapability("measure_battery")) {
                this.setCapabilityValue("measure_battery", beacon.batteryLevel);
            }
        }
        let energyObj = this.getStoreValue("energy");
        if (energyObj) {
            this.unsetStoreValue("energy");
            this.setEnergy(energyObj);
        }
    }

    /**
     * Refresh properties (properties are: Homey settings, Homey stores, Homey
     * capabilities and Homey energy) using info contained in pairObject.
     * The method refesh capabilities as follows:
     * - update setting values;
     * - update store values;
     * - add and/or remove capabilities;
     * - update the energy object.
     * The method returns a boolean value that indicates whether at least a
     * property has been actually refreshed.
     */
    refreshProperties(pairObject) {
        let actuallyRefreshed = false;
        if (this.getSetting("address") != pairObject.settings.address) {
            this.setSettings({
                "address": pairObject.settings.address
            })
                .catch(this.error);
            actuallyRefreshed = true;
        }
        if (this.getSetting("advertised_name") != pairObject.settings.advertised_name) {
            this.setSettings({
                "advertised_name": pairObject.settings.advertised_name
            })
                .catch(this.error);
            actuallyRefreshed = true;
        }
        let newCalibratedPower = null;
        if (pairObject.store.calibrated_power_ !== undefined)
            newCalibratedPower = pairObject.store.calibrated_power_;
        if (this.getStoreValue("calibrated_power_") != newCalibratedPower) {
            this.setStoreValue("calibrated_power_", newCalibratedPower)
                .catch(this.error);
            actuallyRefreshed = true;
        }
        if (this.getSetting("calibrated_power") != pairObject.settings.calibrated_power) {
            this.setSettings({
                "calibrated_power": pairObject.settings.calibrated_power
            })
                .catch(this.error);
            actuallyRefreshed = true;
        }
        let newEnergy = {};
        if (pairObject.store.energy !== undefined) {
            newEnergy = pairObject.store.energy;
        }
        if (JSON.stringify(this.getEnergy()) !== JSON.stringify(newEnergy)) {
            this.setEnergy(newEnergy)
                .catch(this.error);
            actuallyRefreshed = true;
        }
        let currCaps = this.getCapabilities();
        let newCaps = pairObject.capabilities;
        let addedCaps = [];
        let removedCaps = [];
        let checkElems = [];
        checkElems.length = newCaps.length;
        for (let i = 0; i < newCaps.length; i++) {
            checkElems[i] = {
                cap: newCaps[i],
                isNew: true
            };
        }
        for (let currCap of currCaps) {
            let toBeRemoved = true;
            for (let i = 0; i < newCaps.length; i++) {
                if (currCap == newCaps[i] && checkElems[i].isNew) {
                    checkElems[i].isNew = false;
                    toBeRemoved = false;
                    break;
                }
            }
            if (toBeRemoved)
                removedCaps.push(currCap);
        }
        for (let checkElem of checkElems) {
            if (checkElem.isNew)
                addedCaps.push(checkElem.cap);
        }
        if (addedCaps.length > 0 || removedCaps.length > 0) {
            for (let removedCap of removedCaps) {
                this.removeCapability(removedCap)
                    .catch(this.error);
            }
            for (let addedCap of addedCaps) {
                this.addCapability(addedCap)
                    .catch(this.error);
            }
            actuallyRefreshed = true;
        }
        return actuallyRefreshed;
    }
}

module.exports = BeaconDevice;