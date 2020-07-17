"use strict";

const BeaconDriver = require('../../lib/BeaconDriver.js');

class IBeaconDriver extends BeaconDriver {

    /**
     * @return string
     */
    getBleName() {
        return 'iBeacon';
    }

    /**
     * @return string
     */
    static getBeaconType() {
        return 'ibeacon'
    }
}

module.exports = IBeaconDriver;
