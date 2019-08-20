/* TODO connect that stuff to project */

describe('createListExpandTrigger', () => {
    it('should recognize list growth', () => {
        const hasListGrown = createListExpandTrigger(state => state.list, notEmpty);
        hasListGrown({ list: [1] });
        expect(hasListGrown({ list: [1, 2] })).to.be(true);
    });

    it('should realize that list has not changed', () => {
        const hasListGrown = createListExpandTrigger(state => state.list, notEmpty);
        hasListGrown({ list: [1] });
        expect(hasListGrown({ list: [1] })).to.be(false);
    });

    it('should peerform deep equality check', () => {
        const hasListGrown = createListExpandTrigger(state => state.list, notEmpty);
        const state = { list: [1] };
        hasListGrown(state);
        expect(hasListGrown(state)).to.be(false);
    });

    it('should ignore list shrinking', () => {
        const hasListGrown = createListExpandTrigger(state => state.list, notEmpty);
        hasListGrown({ list: [1, 2] });
        expect(hasListGrown({ list: [1] })).to.be(false);
    });
});

describe('createListShrinkTrigger', () => {
    it('should recognize list shrinking', () => {
        const hasListShrinked = createListShrinkTrigger(state => state.list, notEmpty);
        hasListShrinked({ list: [1, 2] });

        expect(hasListShrinked({ list: [1] })).to.be(true);
    });

    it('should realize that input has not changed', () => {
        const basicState = { list: [1, 2] };
        const hasListShrinked = createListShrinkTrigger(state => state.list, notEmpty);
        expect(hasListShrinked(basicState)).to.be(false);
        expect(hasListShrinked(basicState)).to.be(false);
    });

    it('should realize that list has not changed', () => {
        const hasListShrinked = createListShrinkTrigger(state => state.list, notEmpty);
        hasListShrinked({ list: [1, 2] });
        expect(hasListShrinked({ list: [1, 2] })).to.be(false);
    });

    it('should ignore list growing', () => {
        const hasListShrinked = createListShrinkTrigger(state => state.list, notEmpty);
        hasListShrinked({ list: [1] });
        expect(hasListShrinked({ list: [1, 2] })).to.be(false);
    });

    it('doesn\'t perform deep equality check', () => {
        const hasListShrinked = createListShrinkTrigger(state => state.list, notEmpty);
        hasListShrinked({ list: [{ a: 1 }, { a: 2 }] });

        expect(hasListShrinked({ list: [{ a: 1 }, { a: 2 }] })).to.be(true);
    });
});

describe('detailed list diffs', () => {
    const hasListGrown = createListExpandTrigger(state => state.list, identity);

    hasListGrown({ list: [1] });

    it('should recognize list growth', () => {
        expect(hasListGrown({ list: [1, 2] })).to.eql([2]);
    });
});

describe('createDiffTrigger', () => {
    const state1 = {
        a: { b: true },
    },
        state2 = {
            a: { b: false },
        },
        state3 = {
            a: { b: false },
        };

    const selector = createDiffTrigger(get('a.b'), identity);

    selector(state1);

    it('should detect changes', () => {
        expect(selector(state2)).to.be(true);
    });

    it('should realize that value has not changed', () => {
        expect(selector(state3)).to.be(false);
    });

    it('should be idempotent, though', () => {
        const selector = createDiffTrigger(get('a.b'), identity);
        expect(selector(state1)).to.be(false);
        expect(selector(state1)).to.be(false);
        expect(selector(state1)).to.be(false);

        expect(selector(state2)).to.be(true);
        expect(selector(state2)).to.be(true);
        expect(selector(state2)).to.be(true);

        expect(selector(state3)).to.be(false);
        expect(selector(state3)).to.be(false);
        expect(selector(state3)).to.be(false);
    });
});

describe('createDiffAscTrigger', () => {
    const state1 = {
        a: { b: 0 },
    },
        state2 = {
            a: { b: 1 },
        },
        state3 = {
            a: { b: 0 },
        },
        state4 = {
            a: { b: 0 },
        };

    const selector = createDiffAscTrigger(get('a.b'), identity);

    selector(state1);

    it('should realize that state has not changed', () => {
        expect(selector(state1)).to.be(false);
    });

    it('should detect ascending changes', () => {
        expect(selector(state2)).to.be(true);
    });

    it('should ignore descending changes', () => {
        expect(selector(state3)).to.be(false);
    });

    it('should realize that value has not changed', () => {
        expect(selector(state4)).to.be(false);
    });
});

describe('createLatchBoolSelector', function () {
    it('should latch', function () {
        const latch = createLatchBoolSelector(identity, Boolean);

        expect(latch(null)).to.be.equal(false);
        expect(latch(true)).to.be.equal(true);
        expect(latch(true)).to.be.equal(true);
        expect(latch(true)).to.be.equal(true);
        expect(latch(null)).to.be.equal(true);
        expect(latch(1)).to.be.equal(true);
        expect(latch(false)).to.be.equal(true);
        expect(latch(false)).to.be.equal(true);
    });
});

describe('createLatchSelector', () => {
    it('should latch!', () => {
        const latch = createLatchSelector(identity, identity);

        expect(latch(null)).to.be.equal(null);
        expect(latch(1)).to.be.equal(1);
        expect(latch(null)).to.be.equal(1);
        expect(latch(2)).to.be.equal(2);
        expect(latch(3)).to.be.equal(3);
        expect(latch(null)).to.be.equal(3);
    });

    it('should reset in a case', () => {
        const latch = createLatchSelector([get('sig'), get('reset')], identity);

        expect(latch({ sig: null, reset: stubFalse })).to.be.equal(null);
        expect(latch({ sig: 1, reset: stubFalse })).to.be.equal(1);
        expect(latch({ sig: null, reset: eq(2) })).to.be.equal(1);
        expect(latch({ sig: null, reset: eq(1) })).to.be.equal(null);
    });
});

describe('tumblerMemoize', () => {
    let state = { a: 'test' };

    it('if switch from value to null should return true', () => {
        const tumbler = createSelectorCreator(tumblerMemoize, isEqual('test'))(get('a'), identity);

        expect(tumbler(state)).to.be.true;
    });

    it('if switch from null to value should return false', () => {
        state = null;

        const tumbler = createSelectorCreator(tumblerMemoize, isEqual('test'))(get('a'), identity);

        expect(tumbler(state)).to.be.false;
    });
});
