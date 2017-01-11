const axios = require('axios');
const config = require('../config.json');

class TeamCity {
    constructor(branch = 'release') {
        this._branch = encodeURIComponent(branch);

        this._axios = axios.create({
            baseURL: `${config['teamcity-url']}httpAuth/app/rest`,
            timeout: 20000,
            json: true,
            method: 'GET',
            auth: config.auth
        });
    }

    getLastUnitTest(running = false) {
        return this.getUnitTestResults(1, running)
            .then(result => {
                if (result.data.build && result.data.build[0]) {
                    return result.data.build[0];
                } else {
                    return null;
                }
            });
    }

    getUnitTestResults(count = 1, running = false) {
        const buildTypeLocator = {
            id: config["unit-tests-build-type"]
        };
        const buildLocator = {
            branch: this._branch,
            count,
            running
        };

        return this._axios
            .request({
                url: `buildTypes/${this._stringifyLocator(buildTypeLocator)}/builds?locator=${this._stringifyLocator(buildLocator)}`
            })
            .catch(e => {
                console.log(e);
            });
    }

    _stringifyLocator(locator) {
        return Object
            .keys(locator)
            .reduce((result, key) => result + `${key}:${locator[key]},`, '')
            .slice(0, -1);
    }
}

module.exports = TeamCity;
