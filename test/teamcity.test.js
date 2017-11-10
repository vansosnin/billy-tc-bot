const TeamCity = require('../src/teamcity.js');
const { expect } = require('chai');

describe('TeamCity', () => {
    describe('stringifyLocator', () => {
        const tc = new TeamCity();

        it('should stringify flat locator object', () => {
            const locator = {
                id: 1,
                whatever: 'else'
            };
            const expected = 'id:1,whatever:else';

            expect(tc._stringifyLocator(locator)).to.equal(expected);
        });
    });
});
