const axios = require('axios');

const config = require('../config.json');
const { stringifyLocator } = require('./utils');

let instance = null;

const _buildTestResultModel = (buildType) => {
    if (!buildType) {
        return {};
    }

    const build = buildType.builds.build[0] || {};

    return {
        id: buildType.id,
        name: buildType.name,
        status: build.status,
        webUrl: build.webUrl,
        statusText: build.statusText,
        buildId: build.id
    };
};

class TeamCity {
    constructor() {
        this._axios = axios.create({
            baseURL: `${config['teamcity-url']}httpAuth/app/rest`,
            timeout: 20000,
            json: true,
            method: 'GET',
            auth: config.auth
        });
    }

    static instance() {
        if (!instance) {
            instance = new TeamCity();
        }

        return instance;
    }

    getTestsResults(branch, count = 1, running = false) {
        const buildLocator = stringifyLocator({
            branch,
            count,
            running,
            canceled: false
        });

        return this._axios
            .request({
                url: `buildTypes?locator=affectedProject:(id:${config['tc-project-id']})&fields=buildType(id,name,builds($locator(${buildLocator}),build(id,status,statusText,webUrl)))`
            })
            .then((result) => {
                let buildTypes = result.data.buildType;

                if (!buildTypes) {
                    return [];
                }

                if (config['tc-build-names']) {
                    buildTypes = buildTypes.filter((buildType) => config['tc-build-names'].includes(buildType.name));
                }

                if (config['tc-build-types']) {
                    buildTypes = buildTypes.filter((buildType) => config['tc-build-types'].includes(buildType.id));
                }

                if (config['tc-build-types-to-ignore']) {
                    buildTypes = buildTypes.filter((buildType) => !config['tc-build-types-to-ignore'].includes(buildType.id));
                }

                return buildTypes.map(_buildTestResultModel);
            })
            .catch((e) => {
                // eslint-disable-next-line
                console.log(e);
            });
    }
}

module.exports = TeamCity.instance();
