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
            .then(result => {
                let buildTypes = result.data.buildType;

                if (!buildTypes) {
                    return [];
                }

                if (config['tc-build-names']) {
                    buildTypes = buildTypes.filter(buildType => config['tc-build-names'].includes(buildType.name));
                }

                if (config['tc-build-types']) {
                    buildTypes = buildTypes.filter(buildType => config['tc-build-types'].includes(buildType.id));
                }

                return buildTypes.map(buildType => {
                    if (!buildType) {
                        return {};
                    }

                    const build = buildType.builds.build[0] || {};

                    return {
                        id: buildType.id,
                        name: buildType.name,
                        status: build.status,
                        webUrl: build.webUrl,
                        statusText: build.statusText
                    };
                });
            })
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
