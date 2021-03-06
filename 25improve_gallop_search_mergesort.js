// Merge Improvement: gallop point search use special binary search
// - for each n=1,2,3,..., search in [2**(n-1), 2**n) range 

var MIN_GALLOP = 7;

// merge sort as interface
var mergeSort = function (array, first, last, lessThan) {
    var state = {
        lessThan: lessThan,
        lessThanEqual: function (a, b) {return !lessThan(b, a);},
    };
    return mergeSortImpl(array, first, last, state);
};

// merge sort
var mergeSortImpl = function (array, first, last, state) {
    if (last - first <= 1) return array;
    var mid = last + ((first - last) >> 1);
    mergeSortImpl(array, first, mid, state);
    mergeSortImpl(array, mid, last, state);
    mergeNeighbor(array, first, mid, last, state);
    return array;
};

// merge neighbors
var mergeNeighbor = function (array, first, connect, last, state) {
    var llength = connect - first;
    var rlength = last - connect;
    if (llength < rlength) {
        return mergeIntoLeft(array, first, connect, last, state);
    } else {
        return mergeIntoRight(array, first, connect, last, state);
    }
};

// merge with filling to smaller side
var mergeIntoLeft = function (array, first, connect, last, state) {
    // packed states of the function
    var m = {}; 
    // escape shorter buffer only
    m.right = array;
    m.rcur = connect; m.rlast = last;
    
    // find merge start point which is insert point for first of larger side 
    m.cur = binSearch(array, first, connect, m.right[m.rcur], state.lessThan);
    m.left = array.slice(m.cur, connect);
    m.lcur = 0; m.llast = connect - m.cur;

    // states for mode control
    m.galloping = false;
    m.gallopingOut = false;
    m.selectLeft = true;
    m.selectCount = 0;
    while (m.lcur < m.llast && m.rcur < m.rlast) {
        if (!m.galloping) {
            mergeLeftOnePairMode(array, state, m);
        } else {
            mergeLeftGallopingMode(array, state, m);
        }
    }
    
    // copy back to escaped side (the loop may be empty)
    while (m.lcur < m.llast) array[m.cur++] = m.left[m.lcur++];
    return array;
};

// one pair mode when filling to smaller side
var mergeLeftOnePairMode = function (array, state, m) {
    var lval = m.left[m.lcur];
    var rval = m.right[m.rcur];
    if (state.lessThanEqual(lval, rval)) { // for sort stable
        array[m.cur++] = lval; m.lcur++;
        modeControlInOnePairMode(m, !m.selectLeft);
    } else {
        array[m.cur++] = rval; m.rcur++;
        modeControlInOnePairMode(m, m.selectLeft);
    }
};

// mode control for one pair mode
var modeControlInOnePairMode = function (m, selectSwitched) {
    if (selectSwitched) {
        m.selectLeft = !m.selectLeft;
        m.selectCount = 0;
    }
    m.selectCount++;
    if (m.selectCount >= MIN_GALLOP) {
        m.galloping = true;
        m.selectCount = 0;
    }
};

// galloping mode when filling to smaller side
// - replace binarySearch to gallopSearch
var mergeLeftGallopingMode = function (array, state, m) {
    var lval = m.left[m.lcur];
    var rval = m.right[m.rcur];
    if (state.lessThanEqual(lval, rval)) {
        // left(shorter) side gallop includes right side first (rightmost)
        var end = gallopFirstSearch(
            m.left, m.lcur + 1, m.llast, rval, state.lessThan);
        modeControlInGallopingMode(m, end - m.lcur);
        while (m.lcur < end) array[m.cur++] = m.left[m.lcur++];
    } else {
        // right(longer) side gallop excludes left side first (leftmost)
        var end = gallopFirstSearch(
            m.right, m.rcur + 1, m.rlast, lval, state.lessThanEqual);
        modeControlInGallopingMode(m, end - m.rcur);
        while (m.rcur < end) array[m.cur++] = m.right[m.rcur++];
    }
};

// mode control for galloping mode
var modeControlInGallopingMode = function (m, gallopSize) {
    if (gallopSize < MIN_GALLOP) {
       if (m.gallopOut) { // exit galloping mode if gallop out at both sides 
           m.galloping = false;
           m.gallopOut = false;
       } else {
           m.gallopOut = true;
       }
    } else {
        m.gallopOut = false;
    }
};

// merge with filling to larger side
var mergeIntoRight = function (array, first, connect, last, state) {
    // packed states of the function
    var m = {};
    // escape shorter buffer only
    m.left = array
    m.lcur = connect; m.lfirst = first;
    
    // find merge start point which is insert point for first of larger side
    m.cur = binSearch(
        array, connect, last, m.left[m.lcur - 1], state.lessThanEqual);
    m.right = array.slice(connect, m.cur);
    m.rcur = m.cur - connect; m.rfirst = 0;
    
    // states for mode control
    m.galloping = false;
    m.gallopingOut = false;
    m.selectLeft = true;
    m.selectCount = 0;
    while (m.lfirst < m.lcur && m.rfirst < m.rcur) {
        if (!m.galloping) {
            mergeRightOnePairMode(array, state, m);
        } else {
            mergeRightGallopingMode(array, state, m);
        }
    }
    
    // copy back to escaped side (the loop may be empty)
    while (m.rfirst < m.rcur) array[--m.cur] = m.right[--m.rcur];
    return array;
};

// one pair mode when filling to larger side
var mergeRightOnePairMode = function (array, state, m) {
    var lval = m.left[m.lcur - 1];
    var rval = m.right[m.rcur - 1];
    if (state.lessThan(rval, lval)) { // (lval > rval) for sort stable
        array[--m.cur] = lval; --m.lcur;
        modeControlInOnePairMode(m, !m.selectLeft);
    } else {
        array[--m.cur] = rval; --m.rcur;
        modeControlInOnePairMode(m, m.selectLeft);
    }
};

// galloping mode when filling to larger side
// - replace binarySearch to gallopSearch
var mergeRightGallopingMode = function (array, state, m) {
    var lval = m.left[m.lcur - 1];
    var rval = m.right[m.rcur - 1];
    if (state.lessThan(rval, lval)) {
        // left(longer) side gallop excludes right side last (rightmost)
        var begin = gallopLastSearch(
            m.left, m.lfirst, m.lcur - 1, rval, state.lessThan);
        modeControlInGallopingMode(m, m.lcur - begin);
        while (begin < m.lcur) array[--m.cur] = m.left[--m.lcur];
    } else {
        // right(shorter) side gallop includes left side last (leftmost)
        var begin = gallopLastSearch(
            m.right, m.rfirst, m.rcur - 1, lval, state.lessThanEqual);
        modeControlInGallopingMode(m, m.rcur - begin);
        while (begin < m.rcur) array[--m.cur] = m.right[--m.rcur];
    }
};


// binsearch for gallop mode from first element side
// search to one of regions [0,1) [1,3),[3,7),[7,15),...
var gallopFirstSearch = function (array, first, last, value, lessThan) {
    var pre = 0;
    var offset = 1;
    while (first + offset < last) {
        if (lessThan(value, array[first + offset])) break;
        pre = offset;
        offset = (offset << 1) + 1;
    }
    var searchFirst = first + pre;
    var searchLast = (first + offset < last) ? first + offset : last;
    return binSearch(array, searchFirst, searchLast, value, lessThan);
};

// binsearch for gallop mode from last element side
// search to one of regions(from last) [-1,-0),[-3,-1),[-7,-3),[-15,-7),...
var gallopLastSearch = function (array, first, last, value, lessThan) {
    var pre = 0;
    var offset = 1;
    while (first < last - offset) {
        if (!lessThan(value, array[last - offset])) break;
        pre = offset;
        offset = (offset << 1) + 1;
    }
    var searchFirst = (first < last - offset) ? last - offset : first;
    var searchLast = last - pre;
    return binSearch(array, searchFirst, searchLast, value, lessThan);
};

// binary search
var binSearch = function (array, first, last, value, lessThan) {
    while (first < last) {
        var mid = last + ((first - last) >> 1);
        if (lessThan(value, array[mid])) { 
            last = mid;
        } else {
            first = mid + 1;
        }
    }
    return first;
};

var builtinLessThan = function (a, b) {
    return a < b;
};


// export interface for runner.js
var sort = this.sort = function (array) {
    var lessThan = arguments[1] || builtinLessThan;
    mergeSort(array, 0, array.length, lessThan);
    return array;
};

