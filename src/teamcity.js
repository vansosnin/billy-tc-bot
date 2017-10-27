const axios = require('axios');
const config = require('../config.json');

class TeamCity {
    constructor() {
        this._axios = axios.create({
            baseURL: `${config['teamcity-url']}httpAuth/app/rest`,
            timeout: 20000,
            json: true,
            method: 'GET',
            auth: config.auth,
        });
    }

    // todo: deprecated
    getLastUnitTest(branch, running = false) {
        return this.getUnitTestResults(branch, 1, running).then(result => {
            if (result.data.build && result.data.build[0]) {
                return result.data.build[0];
            } else {
                return null;
            }
        });
    }

    // todo: deprecated
    getUnitTestResults(branch, count = 1, running = false) {
        const buildTypeLocator = {
            id: config['unit-tests-build-type'],
        };
        const buildLocator = {
            branch,
            count,
            running,
        };

        return this._axios
            .request({
                url: `buildTypes/${this._stringifyLocator(
                    buildTypeLocator
                )}/builds?locator=${this._stringifyLocator(buildLocator)}`,
            })
            .catch(e => {
                console.log(e);
            });
    }

    getTestsResults(branch, count = 1, running = false) {
        const buildLocator = this._stringifyLocator({
            branch,
            count,
            running,
        });

        return this.testsResultsLoop(buildLocator);
    }

    testsResultsLoop(buildLocator, testIndex = 0, testsResults = []) {
        return new Promise((resolve, reject) => {
            const buildTypeLocator = this._stringifyLocator({
                id: config['tests-types'][testIndex].id,
            });

            this._axios
                .request({
                    url: `buildTypes/${buildTypeLocator}/builds?locator=${buildLocator}`,
                })
                .then(result => {
                    if (result.data.build && result.data.build[0]) {
                        return {
                            result: result.data.build[0],
                            title: config['tests-types'][testIndex].title,
                        };
                    } else {
                        throw new Error('Data was not received');
                    }
                })
                .catch(e => {
                    console.log(e);
                });
        }).then(result => {
            if (testIndex < config['tests-types'].length) {
                return this.testsResultsLoop(
                    buildLocator,
                    testIndex + 1,
                    testsResults.push(result)
                );
            }

            return testsResults;
        });
    }

    _stringifyLocator(locator) {
        return Object.keys(locator)
            .reduce((result, key) => result + `${key}:${locator[key]},`, '')
            .slice(0, -1);
    }
}

module.exports = TeamCity;
