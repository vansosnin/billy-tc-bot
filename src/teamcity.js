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

    getTestsResults(branch, count = 1, running = false) {
        const buildLocator = this._stringifyLocator({
            branch,
            count,
            running,
            canceled: false
        });

        return this._axios
            .request({
                url: `buildTypes?locator=affectedProject:(id:${config['tc-project-id']})&fields=buildType(id,name,builds($locator(${buildLocator}),build(status,statusText,webUrl)))`,
            })
            .then(result => result.data.buildType.map(buildType => ({
                id: buildType.id,
                name: buildType.name,
                status: buildType.builds.build[0].status,
                webUrl: buildType.builds.build[0].webUrl,
                statusText: buildType.builds.build[0].statusText
            })))
            .catch(e => {
                console.log(e);
            });
    }

    _stringifyLocator(locator) {
        return Object.keys(locator)
            .reduce((result, key) => result + `${key}:${locator[key]},`, '')
            .slice(0, -1);
    }
}

module.exports = TeamCity;
