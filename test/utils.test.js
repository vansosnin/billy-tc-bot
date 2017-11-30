const { expect } = require('chai');

const { stringifyLocator, prepareTestsToSave } = require('../src/utils');

describe('utils', () => {
    describe('stringifyLocator', () => {
        it('should stringify flat locator object', () => {
            const locator = {
                id: 1,
                whatever: 'else'
            };
            const expected = 'id:1,whatever:else';

            expect(stringifyLocator(locator)).to.equal(expected);
        });
    });

    describe('prepareTestsToSave', () => {
        it('should convert build types', () => {
            const buildTypes = [
                { id: 'id1', status: 'status1' },
                { id: 'id2', status: 'status2' }
            ];

            const expected = {
                id1: 'status1',
                id2: 'status2'
            };

            const actual = prepareTestsToSave(buildTypes);

            expect(actual).to.deep.equal(expected);
        });
    });
});
