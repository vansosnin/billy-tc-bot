const Db = require('../db');
const TeamCity = require('../teamcity');

class Blame {
    constructor(messenger) {
        this._messenger = messenger;
    }

    updateCount(chatId, count) {
        return Db.setLastChangesCount(chatId, parseInt(count, 10));
    }

    async enhanceBuildTypes(builds, chat) {
        const { lastChangesCount } = chat;

        if (!lastChangesCount) {
            return builds;
        }

        const enhancedBuilds = [];

        for (const build of builds) {
            if (!build.buildId) {
                enhancedBuilds.push({
                    name: build.name
                });
                continue;
            }

            // eslint-disable-next-line no-await-in-loop
            const changes = await TeamCity.getLastCommits(build.buildId);

            enhancedBuilds.push({
                ...build,
                changes: changes.slice(0, lastChangesCount)
            });
        }

        return enhancedBuilds;
    }
}

module.exports = Blame;
