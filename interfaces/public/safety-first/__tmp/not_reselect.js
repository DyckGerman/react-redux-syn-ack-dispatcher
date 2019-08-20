import { createSelectorCreator, createSelector } from 'reselect';
import {
    difference,
    differenceBy,
    isEqual,
    flip,
    negate,
    eq,
    lt,
    gt,
    identity,
    stubFalse,
    get,
    rest,
    every,
    compose,
} from 'lodash/fp';


/**
 * Make diff triggers idempotent again!
 */
export const bindToState = sel => {
    const cache = new WeakMap();

    return state => {
        if (!cache.has(state)) {
            const res = sel(state);
            cache.set(state, res);

            return res;
        } else {
            return cache.get(state);
        }
    };
};

export const shallowDiffTrigger = () => {
    var prev;

    return curr => {
        const res = curr !== prev;
        prev = curr;
        return res;
    };
};

const shiftTriggerMemoize = (func, cmp) => {
    var prev;
    var initialised = false;

    return curr => {
        if (curr !== prev) {
            const res = initialised ? func(cmp(prev, curr)) : false;
            prev = curr;
            initialised = true;
            return res;
        } else {
            return false;
        }
    };
};

const shiftTriggerMemoizeForSteppedCmp = (func, cmp) => {
    var prev;

    return curr => {
        if (curr !== prev) {
            const res = func(cmp(prev, curr));
            prev = curr;
            return res;
        } else {
            return false;
        }
    };
};

const latchMemoize = (func, initVal = null) => {
    var val = initVal;
    var prev;

    return (curr, release = stubFalse, lock = identity) => {
        if (val !== initVal) {
            if (release(prev)) {
                val = initVal;
                return val;
            }
        }

        if (curr !== prev) {
            if (lock(curr)) {
                val = func(curr);
                prev = curr;
            }
        }

        return val;
    };
};

export const ignorePendingState = () => {
    var prev;

    return curr => {
        if (isPending(curr)) {
            return prev;
        }

        prev = curr;
        return curr;
    };
};

export const createListExpandTriggerBy = (getter = identity) =>
    compose(
        bindToState,
        createSelectorCreator(shiftTriggerMemoize, (a, b) => differenceBy(getter, b, a))
    );

// (state -> val, postprocess) -> state -> bool
export const createListExpandTrigger = compose(
    bindToState,
    createSelectorCreator(shiftTriggerMemoize, flip(difference))
);
// (state -> val, postprocess) -> state -> bool
export const createListShrinkTrigger = compose(
    bindToState,
    createSelectorCreator(shiftTriggerMemoize, difference)
);

export const deepDiffTrigger = propName => ({ [propName]: curr }, { [propName]: prev }) =>
    !isEqual(curr, prev);

// (state -> val, postprocess) -> state -> bool
export const createDiffTrigger = compose(
    bindToState,
    createSelectorCreator(shiftTriggerMemoize, negate(eq))
);

// (state -> val, postprocess) -> state -> bool
export const createDiffAscTrigger = compose(
    bindToState,
    createSelectorCreator(shiftTriggerMemoize, lt)
);

// (state -> val, postprocess) -> state -> bool
export const createDiffDescTrigger = compose(
    bindToState,
    createSelectorCreator(shiftTriggerMemoize, gt)
);

// (state -> val, postprocess) -> state -> bool
export const createAscStepTrigger = compose(
    bindToState,
    createSelectorCreator(shiftTriggerMemoizeForSteppedCmp, (prev, curr) => !prev && !!curr)
);

export const createLatchSelector = createSelectorCreator(latchMemoize);
export const createLatchBoolSelector = createSelectorCreator(latchMemoize, false);

export const listRotateMemoize = (func, accSize) => {
    var res = [];

    return curr => {
        res = res.concat(func(curr));

        if (res.length > accSize) {
            res = res.slice(res.length - accSize);
        }

        return res;
    };
};

export const getRev = get('rev');

export const revSecure = sel => {
    var rev, revVal;

    return createSelector(
        [getRev, sel],
        (currRev, selVal) => {
            if (currRev !== rev) {
                revVal = selVal;
                rev = currRev;
            }

            return revVal;
        }
    );
};

export const revLookupSelector = (depth, def = null) => selector => {
    var history = [];

    return (state, lastKnownRev = null) => {
        const currRev = getRev(state);
        const requestedRev = lastKnownRev === null ? null : lastKnownRev + 1;
        const lastResolvedRev = history.length === 0 ? 0 : history[0][0];

        if (requestedRev === null || (requestedRev > lastResolvedRev && requestedRev === currRev)) {
            const newVal = selector(state);
            history.unshift([currRev, newVal]);
            history = history.slice(0, depth);

            return newVal;
        } else {
            const item = history.find(([r]) => r === requestedRev);

            return item ? item[1] : def;
        }
    };
};

export const revAwareConnect = f => {
    var rev;

    return state => {
        const res = f(state, rev);
        rev = getRev(state);
        return res;
    };
};

export const checkThemAll = rest(every(Boolean));
