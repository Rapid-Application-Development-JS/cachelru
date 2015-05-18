(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function () {
      return (root.CacheLRU = factory());
    });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = (root.CacheLRU = factory());
  } else {
    root.CacheLRU = factory();
  }
}(this, function () {
  'use strict';
  /**
   * Cache algorithm Least Recently Used
   * @class CacheLRU
   * @param {number=} size
   * @constructor
   */
  function CacheLRU(size) {
    /**
     * Minimum size of cache
     * @type {number}
     * @private
     */
    var _minCacheSize = 2;
    /**
     * Limit of items in cache
     * @type {number}
     * @private
     */
    var _cacheSize = _toNumber(size, _minCacheSize, _minCacheSize, Number.MAX_VALUE);
    /**
     * Current size of the cache
     * @type {number}
     * @private
     */
    var _currentSize = 0;
    /**
     * List of keys
     * @type {Object}
     * @private
     */
    var _keys = {};
    var scope = this;

    /**
     * Parses any value and returns a number
     * @param {*} value
     * @param {number=0} onFailedConversion
     * @param {number=0} minValue
     * @param {number=} maxValue
     * @private
     * @example
     * <code>
     *  _toNumber('2.5', 1, 1, 999); // → 2.5
     *  _toNumber('aBc', 0, 0, 999); // → 0
     *  _toNumber('365', 256, 256, 999); // → 256
     *  _toNumber('zYz', -1, 0, 999); // → -1
     * </code>
     */
    function _toNumber(value, onFailedConversion, minValue, maxValue) {
      value = parseFloat(value);
      if (!isFinite(value) || isNaN(value)) {
        return onFailedConversion;
      }
      value = parseFloat(value.toFixed(0));
      if (arguments.length < 4) {
        maxValue = Number.MAX_VALUE;
        if (arguments.length < 3) {
          minValue = 0;
          if (arguments.length < 2) {
            onFailedConversion = 0;
          }
        }
      }
      if (!isFinite(value)) {
        return onFailedConversion;
      }
      if (value > maxValue) {
        return maxValue;
      }
      if (value < minValue) {
        return minValue;
      }
      return value;
    }

    /**
     * Removes all entries
     * @public
     */
    scope.destroy = function () {
      scope.head = scope.tail = undefined;
      _currentSize = 0;
      _keys = {};
    };
    /**
     * Get recent use of cache by <key>.
     * Returns the value associated with <key> or <undefined> if not in cache.
     * @param {String} key
     * @param {boolean} returnEntry
     * @return {*}
     * @public
     */
    scope.get = function (key, returnEntry) {
      var entry = _keys[key];
      if (entry === undefined) {
        return;
      }
      if (entry === scope.tail) {
        if (returnEntry) {
          return entry;
        } else {
          return entry.value;
        }
      }
      if (entry.newer) {
        if (entry === scope.head) {
          scope.head = entry.newer;
        }
        entry.newer.older = entry.older;
      }
      if (entry.older) {
        entry.older.newer = entry.newer;
      }
      entry.newer = undefined;
      entry.older = scope.tail;
      if (scope.tail) {
        scope.tail.newer = entry;
      }
      scope.tail = entry;
      if (returnEntry) {
        return entry;
      } else {
        return entry.value;
      }
    };
    /**
     * Check if <key> is in the cache.
     * Returns the value associated with <key> or <undefined> if not in cache.
     * @param {String} key
     * @return {*}
     * @public
     */
    scope.isSet = function (key) {
      return _keys[key];
    };
    /**
     * Apply <iteratee> call for each entry.
     * If <descending> is a <true> start from new to the oldest value and vice versa.
     * @example
     * <code>
     *   iteratee.call(context, Object key, Object value, Class)
     * </code>
     * @public
     */
    scope.iterate = function (iteratee, context, descending) {
      var entry;
      if (typeof context !== 'object') {
        context = scope;
      }
      if (descending) {
        entry = scope.tail;
        while (entry) {
          iteratee.call(context, entry.key, entry.value, scope);
          entry = entry.older;
        }
      } else {
        entry = scope.head;
        while (entry) {
          iteratee.call(context, entry.key, entry.value, scope);
          entry = entry.newer;
        }
      }
    };
    /**
     * Return keys from cache
     * @return {Array}
     * @public
     */
    scope.keys = function () {
      return Object.keys(_keys).sort();
    };
    Object.defineProperty(scope, 'limit', {
      /**
       * Getter. Limit of items in cache.
       * @return {number}
       * @public
       */
      get: function () {
        return _cacheSize;
      },
      /**
       * Setter. Limit of items in cache.
       * @param {number} value
       * @public
       */
      set: function (value) {
        value = parseInt(value);
        if (isNaN(value) || !isFinite(value) || value < _minCacheSize) {
          value = _minCacheSize;
        }
        _cacheSize = value;
        if (_currentSize - value) {
          _.times(_currentSize - value, scope.shift.bind(scope));
        }
      }
    });
    /**
     * Put <value> into the cache associated with <key>.
     * Returns removed entry, if no such <undefined> is returned.
     * @param {String} key
     * @param {*} value
     * @return {*}
     * @public
     */
    scope.put = function (key, value) {
      var entry = {key: key, value: value};
      _keys[key] = entry;
      if (scope.tail) {
        scope.tail.newer = entry;
        entry.older = scope.tail;
      } else {
        scope.head = entry;
      }
      scope.tail = entry;
      if (_currentSize === _cacheSize) {
        return scope.shift();
      } else {
        _currentSize += 1;
        return null;
      }
    };
    /**
     * Remove entry by <key>.
     * Returns value in cache, if not found <undefined> is returned.
     * @param {String} key
     * @return {*}
     * @public
     */
    scope.remove = function (key) {
      var entry = _keys[key];
      if (!entry) {
        return;
      }
      delete _keys[entry.key];
      if (entry.newer && entry.older) {
        entry.older.newer = entry.newer;
        entry.newer.older = entry.older;
      } else if (entry.newer) {
        entry.newer.older = undefined;
        scope.head = entry.newer;
      } else if (entry.older) {
        entry.older.newer = undefined;
        scope.tail = entry.older;
      } else if (entry.older === undefined && entry.newer === undefined) {
        scope.head = scope.tail = undefined;
      }
      _currentSize--;
      return entry.value;
    };
    /**
     * Set value for <key>.
     * Returns removed entry, if no such <undefined> is returned.
     * @param {String} key
     * @param {*} value
     * @return {*}
     * @public
     */
    scope.set = function (key, value) {
      var oldvalue;
      var entry = scope.get(key, true);
      if (entry) {
        oldvalue = entry.value;
        entry.value = value;
      } else {
        oldvalue = scope.put(key, value);
        if (oldvalue) {
          oldvalue = oldvalue.value;
        }
      }
      return oldvalue;
    };
    /**
     * Remove oldest cache entry from the cache.
     * Returns removed entry, if no such <undefined> is returned.
     * @return {{key: String, value: *}}
     * @public
     */
    scope.shift = function () {
      var entry = scope.head;
      if (entry) {
        if (scope.head.newer) {
          scope.head = scope.head.newer;
          scope.head.older = undefined;
        } else {
          scope.head = undefined;
        }
        entry.newer = entry.older = undefined;
        delete _keys[entry.key];
      }
      return entry;
    };
  }

  return CacheLRU;
}));
