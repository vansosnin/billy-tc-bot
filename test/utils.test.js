const { expect } = require('chai');

const { stringifyLocator } = require('../src/utils');

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
});
