/*  Prototype JavaScript framework, version 1.6.1
 *  (c) 2005-2009 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {
  Version: '1.6.1',

  Browser: (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile.*Safari/.test(ua)
    }
  })(),

  BrowserFeatures: {
    XPath: !!document.evaluate,
    SelectorsAPI: !!document.querySelector,
    ElementExtensions: (function() {
      var constructor = window.Element || window.HTMLElement;
      return !!(constructor && constructor.prototype);
    })(),
    SpecificElementExtensions: (function() {
      if (typeof window.HTMLDivElement !== 'undefined')
        return true;

      var div = document.createElement('div');
      var form = document.createElement('form');
      var isSupported = false;

      if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
        isSupported = true;
      }

      div = form = null;

      return isSupported;
    })()
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


var Abstract = { };


var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

/* Based on Alex Arnell's inheritance implementation. */

var Class = (function() {
  function subclass() {};
  function create() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0; i < properties.length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;
    return klass;
  }

  function addMethods(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = Object.keys(source);

    if (!Object.keys({ toString: true }).length) {
      if (source.toString != Object.prototype.toString)
        properties.push("toString");
      if (source.valueOf != Object.prototype.valueOf)
        properties.push("valueOf");
    }

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames().first() == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments); };
        })(property).wrap(method);

        value.valueOf = method.valueOf.bind(method);
        value.toString = method.toString.bind(method);
      }
      this.prototype[property] = value;
    }

    return this;
  }

  return {
    create: create,
    Methods: {
      addMethods: addMethods
    }
  };
})();
(function() {

  var _toString = Object.prototype.toString;

  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }

  function inspect(object) {
    try {
      if (isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  }

  function toJSON(object) {
    var type = typeof object;
    switch (type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }

    if (object === null) return 'null';
    if (object.toJSON) return object.toJSON();
    if (isElement(object)) return;

    var results = [];
    for (var property in object) {
      var value = toJSON(object[property]);
      if (!isUndefined(value))
        results.push(property.toJSON() + ': ' + value);
    }

    return '{' + results.join(', ') + '}';
  }

  function toQueryString(object) {
    return $H(object).toQueryString();
  }

  function toHTML(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  }

  function keys(object) {
    var results = [];
    for (var property in object)
      results.push(property);
    return results;
  }

  function values(object) {
    var results = [];
    for (var property in object)
      results.push(object[property]);
    return results;
  }

  function clone(object) {
    return extend({ }, object);
  }

  function isElement(object) {
    return !!(object && object.nodeType == 1);
  }

  function isArray(object) {
    return _toString.call(object) == "[object Array]";
  }


  function isHash(object) {
    return object instanceof Hash;
  }

  function isFunction(object) {
    return typeof object === "function";
  }

  function isString(object) {
    return _toString.call(object) == "[object String]";
  }

  function isNumber(object) {
    return _toString.call(object) == "[object Number]";
  }

  function isUndefined(object) {
    return typeof object === "undefined";
  }

  extend(Object, {
    extend:        extend,
    inspect:       inspect,
    toJSON:        toJSON,
    toQueryString: toQueryString,
    toHTML:        toHTML,
    keys:          keys,
    values:        values,
    clone:         clone,
    isElement:     isElement,
    isArray:       isArray,
    isHash:        isHash,
    isFunction:    isFunction,
    isString:      isString,
    isNumber:      isNumber,
    isUndefined:   isUndefined
  });
})();
Object.extend(Function.prototype, (function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  function argumentNames() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  }

  function bind(context) {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = slice.call(arguments, 1);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(context, a);
    }
  }

  function bindAsEventListener(context) {
    var __method = this, args = slice.call(arguments, 1);
    return function(event) {
      var a = update([event || window.event], args);
      return __method.apply(context, a);
    }
  }

  function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(this, a);
    }
  }

  function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    timeout = timeout * 1000
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  }

  function defer() {
    var args = update([0.01], arguments);
    return this.delay.apply(this, args);
  }

  function wrap(wrapper) {
    var __method = this;
    return function() {
      var a = update([__method.bind(this)], arguments);
      return wrapper.apply(this, a);
    }
  }

  function methodize() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      var a = update([this], arguments);
      return __method.apply(null, a);
    };
  }

  return {
    argumentNames:       argumentNames,
    bind:                bind,
    bindAsEventListener: bindAsEventListener,
    curry:               curry,
    delay:               delay,
    defer:               defer,
    wrap:                wrap,
    methodize:           methodize
  }
})());


Date.prototype.toJSON = function() {
  return '"' + this.getUTCFullYear() + '-' +
    (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
    this.getUTCDate().toPaddedString(2) + 'T' +
    this.getUTCHours().toPaddedString(2) + ':' +
    this.getUTCMinutes().toPaddedString(2) + ':' +
    this.getUTCSeconds().toPaddedString(2) + 'Z"';
};


RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};
var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
        this.currentlyExecuting = false;
      } catch(e) {
        this.currentlyExecuting = false;
        throw e;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, (function() {

  function prepareReplacement(replacement) {
    if (Object.isFunction(replacement)) return replacement;
    var template = new Template(replacement);
    return function(match) { return template.evaluate(match) };
  }

  function gsub(pattern, replacement) {
    var result = '', source = this, match;
    replacement = prepareReplacement(replacement);

    if (Object.isString(pattern))
      pattern = RegExp.escape(pattern);

    if (!(pattern.length || pattern.source)) {
      replacement = replacement('');
      return replacement + source.split('').join(replacement) + replacement;
    }

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  }

  function sub(pattern, replacement, count) {
    replacement = prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  }

  function scan(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  }

  function truncate(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  }

  function strip() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function stripTags() {
    return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
  }

  function stripScripts() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  }

  function extractScripts() {
    var matchAll = new RegExp(Prototype.ScriptFragment, 'img');
    var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  }

  function evalScripts() {
    return this.extractScripts().map(function(script) { return eval(script) });
  }

  function escapeHTML() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function unescapeHTML() {
    return this.stripTags().replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  }


  function toQueryParams(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  }

  function toArray() {
    return this.split('');
  }

  function succ() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  }

  function times(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  }

  function camelize() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];

    var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++)
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

    return camelized;
  }

  function capitalize() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  }

  function underscore() {
    return this.replace(/::/g, '/')
               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
               .replace(/([a-z\d])([A-Z])/g, '$1_$2')
               .replace(/-/g, '_')
               .toLowerCase();
  }

  function dasherize() {
    return this.replace(/_/g, '-');
  }

  function inspect(useDoubleQuotes) {
    var escapedString = this.replace(/[\x00-\x1f\\]/g, function(character) {
      if (character in String.specialChar) {
        return String.specialChar[character];
      }
      return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  }

  function toJSON() {
    return this.inspect(true);
  }

  function unfilterJSON(filter) {
    return this.replace(filter || Prototype.JSONFilter, '$1');
  }

  function isJSON() {
    var str = this;
    if (str.blank()) return false;
    str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
  }

  function evalJSON(sanitize) {
    var json = this.unfilterJSON();
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  }

  function include(pattern) {
    return this.indexOf(pattern) > -1;
  }

  function startsWith(pattern) {
    return this.indexOf(pattern) === 0;
  }

  function endsWith(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  }

  function empty() {
    return this == '';
  }

  function blank() {
    return /^\s*$/.test(this);
  }

  function interpolate(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }

  return {
    gsub:           gsub,
    sub:            sub,
    scan:           scan,
    truncate:       truncate,
    strip:          String.prototype.trim ? String.prototype.trim : strip,
    stripTags:      stripTags,
    stripScripts:   stripScripts,
    extractScripts: extractScripts,
    evalScripts:    evalScripts,
    escapeHTML:     escapeHTML,
    unescapeHTML:   unescapeHTML,
    toQueryParams:  toQueryParams,
    parseQuery:     toQueryParams,
    toArray:        toArray,
    succ:           succ,
    times:          times,
    camelize:       camelize,
    capitalize:     capitalize,
    underscore:     underscore,
    dasherize:      dasherize,
    inspect:        inspect,
    toJSON:         toJSON,
    unfilterJSON:   unfilterJSON,
    isJSON:         isJSON,
    evalJSON:       evalJSON,
    include:        include,
    startsWith:     startsWith,
    endsWith:       endsWith,
    empty:          empty,
    blank:          blank,
    interpolate:    interpolate
  };
})());

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (object && Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return (match[1] + '');

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3];
      var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = (function() {
  function each(iterator, context) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator.call(context, value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  }

  function eachSlice(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  }

  function all(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index);
      if (!result) throw $break;
    });
    return result;
  }

  function any(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index))
        throw $break;
    });
    return result;
  }

  function collect(iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function detect(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  }

  function findAll(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function grep(filter, iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(RegExp.escape(filter));

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function include(object) {
    if (Object.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  }

  function inGroupsOf(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  }

  function inject(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index);
    });
    return memo;
  }

  function invoke(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  }

  function max(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  }

  function min(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  }

  function partition(iterator, context) {
    iterator = iterator || Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  }

  function pluck(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  }

  function reject(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function sortBy(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  }

  function toArray() {
    return this.map();
  }

  function zip() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  }

  function size() {
    return this.toArray().length;
  }

  function inspect() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }









  return {
    each:       each,
    eachSlice:  eachSlice,
    all:        all,
    every:      all,
    any:        any,
    some:       any,
    collect:    collect,
    map:        collect,
    detect:     detect,
    findAll:    findAll,
    select:     findAll,
    filter:     findAll,
    grep:       grep,
    include:    include,
    member:     include,
    inGroupsOf: inGroupsOf,
    inject:     inject,
    invoke:     invoke,
    max:        max,
    min:        min,
    partition:  partition,
    pluck:      pluck,
    reject:     reject,
    sortBy:     sortBy,
    toArray:    toArray,
    entries:    toArray,
    zip:        zip,
    size:       size,
    inspect:    inspect,
    find:       detect
  };
})();
function $A(iterable) {
  if (!iterable) return [];
  if ('toArray' in Object(iterable)) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}

function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

Array.from = $A;


(function() {
  var arrayProto = Array.prototype,
      slice = arrayProto.slice,
      _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

  function each(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  }
  if (!_each) _each = each;

  function clear() {
    this.length = 0;
    return this;
  }

  function first() {
    return this[0];
  }

  function last() {
    return this[this.length - 1];
  }

  function compact() {
    return this.select(function(value) {
      return value != null;
    });
  }

  function flatten() {
    return this.inject([], function(array, value) {
      if (Object.isArray(value))
        return array.concat(value.flatten());
      array.push(value);
      return array;
    });
  }

  function without() {
    var values = slice.call(arguments, 0);
    return this.select(function(value) {
      return !values.include(value);
    });
  }

  function reverse(inline) {
    return (inline !== false ? this : this.toArray())._reverse();
  }

  function uniq(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  }

  function intersect(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  }


  function clone() {
    return slice.call(this, 0);
  }

  function size() {
    return this.length;
  }

  function inspect() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  }

  function toJSON() {
    var results = [];
    this.each(function(object) {
      var value = Object.toJSON(object);
      if (!Object.isUndefined(value)) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  }

  function indexOf(item, i) {
    i || (i = 0);
    var length = this.length;
    if (i < 0) i = length + i;
    for (; i < length; i++)
      if (this[i] === item) return i;
    return -1;
  }

  function lastIndexOf(item, i) {
    i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
    var n = this.slice(0, i).reverse().indexOf(item);
    return (n < 0) ? n : i - n - 1;
  }

  function concat() {
    var array = slice.call(this, 0), item;
    for (var i = 0, length = arguments.length; i < length; i++) {
      item = arguments[i];
      if (Object.isArray(item) && !('callee' in item)) {
        for (var j = 0, arrayLength = item.length; j < arrayLength; j++)
          array.push(item[j]);
      } else {
        array.push(item);
      }
    }
    return array;
  }

  Object.extend(arrayProto, Enumerable);

  if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;

  Object.extend(arrayProto, {
    _each:     _each,
    clear:     clear,
    first:     first,
    last:      last,
    compact:   compact,
    flatten:   flatten,
    without:   without,
    reverse:   reverse,
    uniq:      uniq,
    intersect: intersect,
    clone:     clone,
    toArray:   clone,
    size:      size,
    inspect:   inspect,
    toJSON:    toJSON
  });

  var CONCAT_ARGUMENTS_BUGGY = (function() {
    return [].concat(arguments)[0][0] !== 1;
  })(1,2)

  if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;

  if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;
  if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf;
})();
function $H(object) {
  return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {
  function initialize(object) {
    this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
  }

  function _each(iterator) {
    for (var key in this._object) {
      var value = this._object[key], pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator(pair);
    }
  }

  function set(key, value) {
    return this._object[key] = value;
  }

  function get(key) {
    if (this._object[key] !== Object.prototype[key])
      return this._object[key];
  }

  function unset(key) {
    var value = this._object[key];
    delete this._object[key];
    return value;
  }

  function toObject() {
    return Object.clone(this._object);
  }

  function keys() {
    return this.pluck('key');
  }

  function values() {
    return this.pluck('value');
  }

  function index(value) {
    var match = this.detect(function(pair) {
      return pair.value === value;
    });
    return match && match.key;
  }

  function merge(object) {
    return this.clone().update(object);
  }

  function update(object) {
    return new Hash(object).inject(this, function(result, pair) {
      result.set(pair.key, pair.value);
      return result;
    });
  }

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }

  function toQueryString() {
    return this.inject([], function(results, pair) {
      var key = encodeURIComponent(pair.key), values = pair.value;

      if (values && typeof values == 'object') {
        if (Object.isArray(values))
          return results.concat(values.map(toQueryPair.curry(key)));
      } else results.push(toQueryPair(key, values));
      return results;
    }).join('&');
  }

  function inspect() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  }

  function toJSON() {
    return Object.toJSON(this.toObject());
  }

  function clone() {
    return new Hash(this);
  }

  return {
    initialize:             initialize,
    _each:                  _each,
    set:                    set,
    get:                    get,
    unset:                  unset,
    toObject:               toObject,
    toTemplateReplacements: toObject,
    keys:                   keys,
    values:                 values,
    index:                  index,
    merge:                  merge,
    update:                 update,
    toQueryString:          toQueryString,
    inspect:                inspect,
    toJSON:                 toJSON,
    clone:                  clone
  };
})());

Hash.from = $H;
Object.extend(Number.prototype, (function() {
  function toColorPart() {
    return this.toPaddedString(2, 16);
  }

  function succ() {
    return this + 1;
  }

  function times(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  }

  function toPaddedString(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  }

  function toJSON() {
    return isFinite(this) ? this.toString() : 'null';
  }

  function abs() {
    return Math.abs(this);
  }

  function round() {
    return Math.round(this);
  }

  function ceil() {
    return Math.ceil(this);
  }

  function floor() {
    return Math.floor(this);
  }

  return {
    toColorPart:    toColorPart,
    succ:           succ,
    times:          times,
    toPaddedString: toPaddedString,
    toJSON:         toJSON,
    abs:            abs,
    round:          round,
    ceil:           ceil,
    floor:          floor
  };
})());

function $R(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var ObjectRange = Class.create(Enumerable, (function() {
  function initialize(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  }

  function _each(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  }

  function include(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }

  return {
    initialize: initialize,
    _each:      _each,
    include:    include
  };
})());



var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isString(this.options.parameters))
      this.options.parameters = this.options.parameters.toQueryParams();
    else if (Object.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      params['_method'] = this.method;
      this.url = this.url + "?x-http-method-override=" + this.method.toUpperCase();
      this.method = 'post';
    }

    this.parameters = params;

    if (params = Object.toQueryString(params)) {
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300);
  },

  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null; }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];








Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if(readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,

  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});



function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!window.Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}


(function(global) {

  var SETATTRIBUTE_IGNORES_NAME = (function(){
    var elForm = document.createElement("form");
    var elInput = document.createElement("input");
    var root = document.documentElement;
    elInput.setAttribute("name", "test");
    elForm.appendChild(elInput);
    root.appendChild(elForm);
    var isBuggy = elForm.elements
      ? (typeof elForm.elements.test == "undefined")
      : null;
    root.removeChild(elForm);
    elForm = elInput = null;
    return isBuggy;
  })();

  var element = global.Element;
  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (SETATTRIBUTE_IGNORES_NAME && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  Object.extend(global.Element, element || { });
  if (element) global.Element.prototype = element.prototype;
})(this);

Element.cache = { };
Element.idCounter = 1;

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },


  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },

  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: (function(){

    var SELECT_ELEMENT_INNERHTML_BUGGY = (function(){
      var el = document.createElement("select"),
          isBuggy = true;
      el.innerHTML = "<option value=\"test\">test</option>";
      if (el.options && el.options[0]) {
        isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
      }
      el = null;
      return isBuggy;
    })();

    var TABLE_ELEMENT_INNERHTML_BUGGY = (function(){
      try {
        var el = document.createElement("table");
        if (el && el.tBodies) {
          el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
          var isBuggy = typeof el.tBodies[0] == "undefined";
          el = null;
          return isBuggy;
        }
      } catch (e) {
        return true;
      }
    })();

    var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
      var s = document.createElement("script"),
          isBuggy = false;
      try {
        s.appendChild(document.createTextNode(""));
        isBuggy = !s.firstChild ||
          s.firstChild && s.firstChild.nodeType !== 3;
      } catch (e) {
        isBuggy = true;
      }
      s = null;
      return isBuggy;
    })();

    function update(element, content) {
      element = $(element);

      if (content && content.toElement)
        content = content.toElement();

      if (Object.isElement(content))
        return element.update().insert(content);

      content = Object.toHTML(content);

      var tagName = element.tagName.toUpperCase();

      if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
        element.text = content;
        return element;
      }

      if (SELECT_ELEMENT_INNERHTML_BUGGY || TABLE_ELEMENT_INNERHTML_BUGGY) {
        if (tagName in Element._insertionTranslations.tags) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          Element._getContentFromAnonymousElement(tagName, content.stripScripts())
            .each(function(node) {
              element.appendChild(node)
            });
        }
        else {
          element.innerHTML = content.stripScripts();
        }
      }
      else {
        element.innerHTML = content.stripScripts();
      }

      content.evalScripts.bind(content).defer();
      return element;
    }

    return update;
  })(),

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, insert, tagName, childNodes;

    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }

      content = Object.toHTML(content);

      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());

      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
    return elements;
  },

  ancestors: function(element) {
    return Element.recursivelyCollect(element, 'parentNode');
  },

  descendants: function(element) {
    return Element.select(element, "*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return [];
  },

  previousSiblings: function(element) {
    return Element.recursivelyCollect(element, 'previousSibling');
  },

  nextSiblings: function(element) {
    return Element.recursivelyCollect(element, 'nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return Element.previousSiblings(element).reverse()
      .concat(Element.nextSiblings(element));
  },

  match: function(element, selector) {
    if (Object.isString(selector))
      selector = new Selector(selector);
    return selector.match($(element));
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = Element.ancestors(element);
    return Object.isNumber(expression) ? ancestors[expression] :
      Selector.findElement(ancestors, expression, index);
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return Element.firstDescendant(element);
    return Object.isNumber(expression) ? Element.descendants(element)[expression] :
      Element.select(element, expression)[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
    var previousSiblings = Element.previousSiblings(element);
    return Object.isNumber(expression) ? previousSiblings[expression] :
      Selector.findElement(previousSiblings, expression, index);
  },

  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
    var nextSiblings = Element.nextSiblings(element);
    return Object.isNumber(expression) ? nextSiblings[expression] :
      Selector.findElement(nextSiblings, expression, index);
  },


  select: function(element) {
    var args = Array.prototype.slice.call(arguments, 1);
    return Selector.findChildElements(element, args);
  },

  adjacent: function(element) {
    var args = Array.prototype.slice.call(arguments, 1);
    return Selector.findChildElements(element.parentNode, args).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = Element.readAttribute(element, 'id');
    if (id) return id;
    do { id = 'anonymous_element_' + Element.idCounter++ } while ($(id));
    Element.writeAttribute(element, 'id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return Element.getDimensions(element).height;
  },

  getWidth: function(element) {
    return Element.getDimensions(element).width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!Element.hasClassName(element, className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return Element[Element.hasClassName(element, className) ?
      'removeClassName' : 'addClassName'](element, className);
  },

  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;

    while (element = element.parentNode)
      if (element == ancestor) return true;

    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = Element.cumulativeOffset(element);
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  getDimensions: function(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    if (originalPosition != 'fixed') // Switching fixed to absolute causes issues in Safari
      els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      if (Prototype.Browser.Opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName.toUpperCase() == 'BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  absolutize: function(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') == 'absolute') return element;

    var offsets = Element.positionedOffset(element);
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;

    element._originalLeft   = left - parseFloat(element.style.left  || 0);
    element._originalTop    = top  - parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
    return element;
  },

  relativize: function(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') == 'relative') return element;

    element.style.position = 'relative';
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
    return element;
  },

  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);

    while ((element = element.parentNode) && element != document.body)
      if (Element.getStyle(element, 'position') != 'static')
        return $(element);

    return $(document.body);
  },

  viewportOffset: function(forElement) {
    var valueT = 0, valueL = 0;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') == 'absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!Prototype.Browser.Opera || (element.tagName && (element.tagName.toUpperCase() == 'BODY'))) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return Element._returnOffset(valueL, valueT);
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    source = $(source);
    var p = Element.viewportOffset(source);

    element = $(element);
    var delta = [0, 0];
    var parent = null;
    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = Element.getOffsetParent(element);
      delta = Element.viewportOffset(parent);
    }

    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,

  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};

if (Prototype.Browser.Opera) {
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(
    function(proceed, element, style) {
      switch (style) {
        case 'left': case 'top': case 'right': case 'bottom':
          if (proceed(element, 'position') === 'static') return null;
        case 'height': case 'width':
          if (!Element.visible(element)) return null;

          var dim = parseInt(proceed(element, style), 10);

          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';

          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];
          }
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);
          }) + 'px';
        default: return proceed(element, style);
      }
    }
  );

  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );
}

else if (Prototype.Browser.IE) {
  Element.Methods.getOffsetParent = Element.Methods.getOffsetParent.wrap(
    function(proceed, element) {
      element = $(element);
      try { element.offsetParent }
      catch(e) { return $(document.body) }
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);
      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    }
  );

  $w('positionedOffset viewportOffset').each(function(method) {
    Element.Methods[method] = Element.Methods[method].wrap(
      function(proceed, element) {
        element = $(element);
        try { element.offsetParent }
        catch(e) { return Element._returnOffset(0,0) }
        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);
        var offsetParent = element.getOffsetParent();
        if (offsetParent && offsetParent.getStyle('position') === 'fixed')
          offsetParent.setStyle({ zoom: 1 });
        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );
  });

  Element.Methods.cumulativeOffset = Element.Methods.cumulativeOffset.wrap(
    function(proceed, element) {
      try { element.offsetParent }
      catch(e) { return Element._returnOffset(0,0) }
      return proceed(element);
    }
  );

  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;

    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = (function(){

    var classProp = 'className';
    var forProp = 'for';

    var el = document.createElement('div');

    el.setAttribute(classProp, 'x');

    if (el.className !== 'x') {
      el.setAttribute('class', 'x');
      if (el.className === 'x') {
        classProp = 'class';
      }
    }
    el = null;

    el = document.createElement('label');
    el.setAttribute(forProp, 'x');
    if (el.htmlFor !== 'x') {
      el.setAttribute('htmlFor', 'x');
      if (el.htmlFor === 'x') {
        forProp = 'htmlFor';
      }
    }
    el = null;

    return {
      read: {
        names: {
          'class':      classProp,
          'className':  classProp,
          'for':        forProp,
          'htmlFor':    forProp
        },
        values: {
          _getAttr: function(element, attribute) {
            return element.getAttribute(attribute);
          },
          _getAttr2: function(element, attribute) {
            return element.getAttribute(attribute, 2);
          },
          _getAttrNode: function(element, attribute) {
            var node = element.getAttributeNode(attribute);
            return node ? node.value : "";
          },
          _getEv: (function(){

            var el = document.createElement('div');
            el.onclick = Prototype.emptyFunction;
            var value = el.getAttribute('onclick');
            var f;

            if (String(value).indexOf('{') > -1) {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                attribute = attribute.toString();
                attribute = attribute.split('{')[1];
                attribute = attribute.split('}')[0];
                return attribute.strip();
              };
            }
            else if (value === '') {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                return attribute.strip();
              };
            }
            el = null;
            return f;
          })(),
          _flag: function(element, attribute) {
            return $(element).hasAttribute(attribute) ? attribute : null;
          },
          style: function(element) {
            return element.style.cssText.toLowerCase();
          },
          title: function(element) {
            return element.title;
          }
        }
      }
    }
  })();

  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  Element._attributeTranslations.has = {};

  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });

  (function(v) {
    Object.extend(v, {
      href:        v._getAttr2,
      src:         v._getAttr2,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);

  if (Prototype.BrowserFeatures.ElementExtensions) {
    (function() {
      function _descendants(element) {
        var nodes = element.getElementsByTagName('*'), results = [];
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName !== "!") // Filter out comment nodes.
            results.push(node);
        return results;
      }

      Element.Methods.down = function(element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return element.firstDescendant();
        return Object.isNumber(expression) ? _descendants(element)[expression] :
          Element.select(element, expression)[index || 0];
      }
    })();
  }

}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if(element.tagName.toUpperCase() == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };

  Element.Methods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);

    return Element._returnOffset(valueL, valueT);
  };
}

if ('outerHTML' in document.documentElement) {
  Element.Methods.replace = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next();
      var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = new Element('div'), t = Element._insertionTranslations.tags[tagName];
  if (t) {
    div.innerHTML = t[0] + html + t[1];
    t[2].times(function() { div = div.firstChild });
  } else div.innerHTML = html;
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  var tags = Element._insertionTranslations.tags;
  Object.extend(tags, {
    THEAD: tags.TBODY,
    TFOOT: tags.TBODY,
    TH:    tags.TD
  });
})();

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

(function(div) {

  if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
    window.HTMLElement = { };
    window.HTMLElement.prototype = div['__proto__'];
    Prototype.BrowserFeatures.ElementExtensions = true;
  }

  div = null;

})(document.createElement('div'))

Element.extend = (function() {

  function checkDeficiency(tagName) {
    if (typeof window.Element != 'undefined') {
      var proto = window.Element.prototype;
      if (proto) {
        var id = '_' + (Math.random()+'').slice(2);
        var el = document.createElement(tagName);
        proto[id] = 'x';
        var isBuggy = (el[id] !== 'x');
        delete proto[id];
        el = null;
        return isBuggy;
      }
    }
    return false;
  }

  function extendElementWith(element, methods) {
    for (var property in methods) {
      var value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
  }

  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');

  if (Prototype.BrowserFeatures.SpecificElementExtensions) {
    if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
      return function(element) {
        if (element && typeof element._extendedByPrototype == 'undefined') {
          var t = element.tagName;
          if (t && (/^(?:object|applet|embed)$/i.test(t))) {
            extendElementWith(element, Element.Methods);
            extendElementWith(element, Element.Methods.Simulated);
            extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
          }
        }
        return element;
      }
    }
    return Prototype.K;
  }

  var Methods = { }, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || typeof element._extendedByPrototype != 'undefined' ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
        tagName = element.tagName.toUpperCase();

    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    extendElementWith(element, methods);

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

Element.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return Element.Methods.Simulated.hasAttribute(element, attribute);
};

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    var element = document.createElement(tagName);
    var proto = element['__proto__'] || element.constructor.prototype;
    element = null;
    return proto;
  }

  var elementPrototype = window.HTMLElement ? HTMLElement.prototype :
   Element.prototype;

  if (F.ElementExtensions) {
    copy(Element.Methods, elementPrototype);
    copy(Element.Methods.Simulated, elementPrototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};


document.viewport = {

  getDimensions: function() {
    return { width: this.getWidth(), height: this.getHeight() };
  },

  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop);
  }
};

(function(viewport) {
  var B = Prototype.Browser, doc = document, element, property = {};

  function getRootElement() {
    if (B.WebKit && !doc.evaluate)
      return document;

    if (B.Opera && window.parseFloat(window.opera.version()) < 9.5)
      return document.body;

    return document.documentElement;
  }

  function define(D) {
    if (!element) element = getRootElement();

    property[D] = 'client' + D;

    viewport['get' + D] = function() { return element[property[D]] };
    return viewport['get' + D]();
  }

  viewport.getWidth  = define.curry('Width');

  viewport.getHeight = define.curry('Height');
})(document.viewport);


Element.Storage = {
  UID: 1
};

Element.addMethods({
  getStorage: function(element) {
    if (!(element = $(element))) return;

    var uid;
    if (element === window) {
      uid = 0;
    } else {
      if (typeof element._prototypeUID === "undefined")
        element._prototypeUID = [Element.Storage.UID++];
      uid = element._prototypeUID[0];
    }

    if (!Element.Storage[uid])
      Element.Storage[uid] = $H();

    return Element.Storage[uid];
  },

  store: function(element, key, value) {
    if (!(element = $(element))) return;

    if (arguments.length === 2) {
      Element.getStorage(element).update(key);
    } else {
      Element.getStorage(element).set(key, value);
    }

    return element;
  },

  retrieve: function(element, key, defaultValue) {
    if (!(element = $(element))) return;
    var hash = Element.getStorage(element), value = hash.get(key);

    if (Object.isUndefined(value)) {
      hash.set(key, defaultValue);
      value = defaultValue;
    }

    return value;
  },

  clone: function(element, deep) {
    if (!(element = $(element))) return;
    var clone = element.cloneNode(deep);
    clone._prototypeUID = void 0;
    if (deep) {
      var descendants = Element.select(clone, '*'),
          i = descendants.length;
      while (i--) {
        descendants[i]._prototypeUID = void 0;
      }
    }
    return Element.extend(clone);
  }
});
/* Portions of the Selector class are derived from Jack Slocum's DomQuery,
 * part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
 * license.  Please see http://www.yui-ext.com/ for more information. */

var Selector = Class.create({
  initialize: function(expression) {
    this.expression = expression.strip();

    if (this.shouldUseSelectorsAPI()) {
      this.mode = 'selectorsAPI';
    } else if (this.shouldUseXPath()) {
      this.mode = 'xpath';
      this.compileXPathMatcher();
    } else {
      this.mode = "normal";
      this.compileMatcher();
    }

  },

  shouldUseXPath: (function() {

    var IS_DESCENDANT_SELECTOR_BUGGY = (function(){
      var isBuggy = false;
      if (document.evaluate && window.XPathResult) {
        var el = document.createElement('div');
        el.innerHTML = '<ul><li></li></ul><div><ul><li></li></ul></div>';

        var xpath = ".//*[local-name()='ul' or local-name()='UL']" +
          "//*[local-name()='li' or local-name()='LI']";

        var result = document.evaluate(xpath, el, null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        isBuggy = (result.snapshotLength !== 2);
        el = null;
      }
      return isBuggy;
    })();

    return function() {
      if (!Prototype.BrowserFeatures.XPath) return false;

      var e = this.expression;

      if (Prototype.Browser.WebKit &&
       (e.include("-of-type") || e.include(":empty")))
        return false;

      if ((/(\[[\w-]*?:|:checked)/).test(e))
        return false;

      if (IS_DESCENDANT_SELECTOR_BUGGY) return false;

      return true;
    }

  })(),

  shouldUseSelectorsAPI: function() {
    if (!Prototype.BrowserFeatures.SelectorsAPI) return false;

    if (Selector.CASE_INSENSITIVE_CLASS_NAMES) return false;

    if (!Selector._div) Selector._div = new Element('div');

    try {
      Selector._div.querySelector(this.expression);
    } catch(e) {
      return false;
    }

    return true;
  },

  compileMatcher: function() {
    var e = this.expression, ps = Selector.patterns, h = Selector.handlers,
        c = Selector.criteria, le, p, m, len = ps.length, name;

    if (Selector._cache[e]) {
      this.matcher = Selector._cache[e];
      return;
    }

    this.matcher = ["this.matcher = function(root) {",
                    "var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        p = ps[i].re;
        name = ps[i].name;
        if (m = e.match(p)) {
          this.matcher.push(Object.isFunction(c[name]) ? c[name](m) :
            new Template(c[name]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.matcher.push("return h.unique(n);\n}");
    eval(this.matcher.join('\n'));
    Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = Selector.patterns,
        x = Selector.xpath, le, m, len = ps.length, name;

    if (Selector._cache[e]) {
      this.xpath = Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        name = ps[i].name;
        if (m = e.match(ps[i].re)) {
          this.matcher.push(Object.isFunction(x[name]) ? x[name](m) :
            new Template(x[name]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || document;
    var e = this.expression, results;

    switch (this.mode) {
      case 'selectorsAPI':
        if (root !== document) {
          var oldId = root.id, id = $(root).identify();
          id = id.replace(/([\.:])/g, "\\$1");
          e = "#" + id + " " + e;
        }

        results = $A(root.querySelectorAll(e)).map(Element.extend);
        root.id = oldId;

        return results;
      case 'xpath':
        return document._getElementsByXPath(this.xpath, root);
      default:
       return this.matcher(root);
    }
  },

  match: function(element) {
    this.tokens = [];

    var e = this.expression, ps = Selector.patterns, as = Selector.assertions;
    var le, p, m, len = ps.length, name;

    while (e && le !== e && (/\S/).test(e)) {
      le = e;
      for (var i = 0; i<len; i++) {
        p = ps[i].re;
        name = ps[i].name;
        if (m = e.match(p)) {
          if (as[name]) {
            this.tokens.push([name, Object.clone(m)]);
            e = e.replace(m[0], '');
          } else {
            return this.findElements(document).include(element);
          }
        }
      }
    }

    var match = true, name, matches;
    for (var i = 0, token; token = this.tokens[i]; i++) {
      name = token[0], matches = token[1];
      if (!Selector.assertions[name](element, matches)) {
        match = false; break;
      }
    }

    return match;
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
});

if (Prototype.BrowserFeatures.SelectorsAPI &&
 document.compatMode === 'BackCompat') {
  Selector.CASE_INSENSITIVE_CLASS_NAMES = (function(){
    var div = document.createElement('div'),
     span = document.createElement('span');

    div.id = "prototype_test_id";
    span.className = 'Test';
    div.appendChild(span);
    var isIgnored = (div.querySelector('#prototype_test_id .test') !== null);
    div = span = null;
    return isIgnored;
  })();
}

Object.extend(Selector, {
  _cache: { },

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: function(m) {
      m[1] = m[1].toLowerCase();
      return new Template("[@#{1}]").evaluate(m);
    },
    attr: function(m) {
      m[1] = m[1].toLowerCase();
      m[3] = m[5] || m[6];
      return new Template(Selector.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = Selector.xpath.pseudos[m[1]];
      if (!h) return '';
      if (Object.isFunction(h)) return h(m);
      return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0)]",
      'checked':     "[@checked]",
      'disabled':    "[(@disabled) and (@type!='hidden')]",
      'enabled':     "[not(@disabled) and (@type!='hidden')]",
      'not': function(m) {
        var e = m[6], p = Selector.patterns,
            x = Selector.xpath, le, v, len = p.length, name;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i = 0; i<len; i++) {
            name = p[i].name
            if (m = e.match(p[i].re)) {
              v = Object.isFunction(x[name]) ? x[name](m) : new Template(x[name]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return Selector.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = Selector.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new Template(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);      c = false;',
    className:    'n = h.className(n, r, "#{1}", c);    c = false;',
    id:           'n = h.id(n, r, "#{1}", c);           c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}", c); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}", c); c = false;').evaluate(m);
    },
    pseudo: function(m) {
      if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
      return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: [
    { name: 'laterSibling', re: /^\s*~\s*/ },
    { name: 'child',        re: /^\s*>\s*/ },
    { name: 'adjacent',     re: /^\s*\+\s*/ },
    { name: 'descendant',   re: /^\s/ },

    { name: 'tagName',      re: /^\s*(\*|[\w\-]+)(\b|$)?/ },
    { name: 'id',           re: /^#([\w\-\*]+)(\b|$)/ },
    { name: 'className',    re: /^\.([\w\-\*]+)(\b|$)/ },
    { name: 'pseudo',       re: /^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|(?=\s|[:+~>]))/ },
    { name: 'attrPresence', re: /^\[((?:[\w-]+:)?[\w-]+)\]/ },
    { name: 'attr',         re: /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/ }
  ],

  assertions: {
    tagName: function(element, matches) {
      return matches[1].toUpperCase() == element.tagName.toUpperCase();
    },

    className: function(element, matches) {
      return Element.hasClassName(element, matches[1]);
    },

    id: function(element, matches) {
      return element.id === matches[1];
    },

    attrPresence: function(element, matches) {
      return Element.hasAttribute(element, matches[1]);
    },

    attr: function(element, matches) {
      var nodeValue = Element.readAttribute(element, matches[1]);
      return nodeValue && Selector.operators[matches[2]](nodeValue, matches[5] || matches[6]);
    }
  },

  handlers: {
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    mark: function(nodes) {
      var _true = Prototype.emptyFunction;
      for (var i = 0, node; node = nodes[i]; i++)
        node._countedByPrototype = _true;
      return nodes;
    },

    unmark: (function(){

      var PROPERTIES_ATTRIBUTES_MAP = (function(){
        var el = document.createElement('div'),
            isBuggy = false,
            propName = '_countedByPrototype',
            value = 'x'
        el[propName] = value;
        isBuggy = (el.getAttribute(propName) === value);
        el = null;
        return isBuggy;
      })();

      return PROPERTIES_ATTRIBUTES_MAP ?
        function(nodes) {
          for (var i = 0, node; node = nodes[i]; i++)
            node.removeAttribute('_countedByPrototype');
          return nodes;
        } :
        function(nodes) {
          for (var i = 0, node; node = nodes[i]; i++)
            node._countedByPrototype = void 0;
          return nodes;
        }
    })(),

    index: function(parentNode, reverse, ofType) {
      parentNode._countedByPrototype = Prototype.emptyFunction;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          var node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._countedByPrototype)) node.nodeIndex = j++;
      }
    },

    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (typeof (n = nodes[i])._countedByPrototype == 'undefined') {
          n._countedByPrototype = Prototype.emptyFunction;
          results.push(Element.extend(n));
        }
      return Selector.handlers.unmark(results);
    },

    descendant: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, Element.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    tagName: function(nodes, root, tagName, combinator) {
      var uTagName = tagName.toUpperCase();
      var results = [], h = Selector.handlers;
      if (nodes) {
        if (combinator) {
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() === uTagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = Selector.handlers;

      if (root == document) {
        if (!targetNode) return [];
        if (!nodes) return [targetNode];
      } else {
        if (!root.sourceIndex || root.sourceIndex < 1) {
          var nodes = root.getElementsByTagName('*');
          for (var j = 0, node; node = nodes[j]; j++) {
            if (node.id === id) return [node];
          }
        }
      }

      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Element.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Selector.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return Selector.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = Selector.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if (Element.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator, combinator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      if (nodes && combinator) nodes = this[combinator](nodes);
      var handler = Selector.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = Element.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return Selector.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = Selector.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = Selector.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._countedByPrototype) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = Selector.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (node.tagName == '!' || node.firstChild) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = Selector.handlers, selectorType, m;
      var exclusions = new Selector(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._countedByPrototype) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node.disabled && (!node.type || node.type !== 'hidden'))
          results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv == v || nv && nv.startsWith(v); },
    '$=': function(nv, v) { return nv == v || nv && nv.endsWith(v); },
    '*=': function(nv, v) { return nv == v || nv && nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + (nv || "").toUpperCase() +
     '-').include('-' + (v || "").toUpperCase() + '-'); }
  },

  split: function(expression) {
    var expressions = [];
    expression.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    return expressions;
  },

  matchElements: function(elements, expression) {
    var matches = $$(expression), h = Selector.handlers;
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._countedByPrototype) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if (Object.isNumber(expression)) {
      index = expression; expression = false;
    }
    return Selector.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    expressions = Selector.split(expressions.join(','));
    var results = [], h = Selector.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new Selector(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

if (Prototype.Browser.IE) {
  Object.extend(Selector.handlers, {
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        if (node.tagName !== "!") a.push(node);
      return a;
    }
  });
}

function $$() {
  return Selector.findChildElements(document, $A(arguments));
}

var Form = {
  reset: function(form) {
    form = $(form);
    form.reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit;

    var data = elements.inject({ }, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          if (key in result) {
            if (!Object.isArray(result[key])) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return options.hash ? data : Object.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    var elements = $(form).getElementsByTagName('*'),
        element,
        arr = [ ],
        serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      arr.push(element);
    }
    return arr.inject([], function(elements, child) {
      if (serializers[child.tagName.toLowerCase()])
        elements.push(Element.extend(child));
      return elements;
    })
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return /^(?:input|select|textarea)$/i.test(element.tagName);
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/


Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {

  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !(/^(?:button|reset|submit)$/i.test(element.type))))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element, value);
      default:
        return Form.Element.Serializers.textarea(element, value);
    }
  },

  inputSelector: function(element, value) {
    if (Object.isUndefined(value)) return element.checked ? element.value : null;
    else element.checked = !!value;
  },

  textarea: function(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  },

  select: function(element, value) {
    if (Object.isUndefined(value))
      return this[element.type == 'select-one' ?
        'selectOne' : 'selectMany'](element);
    else {
      var opt, currentValue, single = !Object.isArray(value);
      for (var i = 0, length = element.length; i < length; i++) {
        opt = element.options[i];
        currentValue = this.optionValue(opt);
        if (single) {
          if (currentValue == value) {
            opt.selected = true;
            return;
          }
        }
        else opt.selected = value.include(currentValue);
      }
    }
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
};

/*--------------------------------------------------------------------------*/


Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
(function() {

  var Event = {
    KEY_BACKSPACE: 8,
    KEY_TAB:       9,
    KEY_RETURN:   13,
    KEY_ESC:      27,
    KEY_LEFT:     37,
    KEY_UP:       38,
    KEY_RIGHT:    39,
    KEY_DOWN:     40,
    KEY_DELETE:   46,
    KEY_HOME:     36,
    KEY_END:      35,
    KEY_PAGEUP:   33,
    KEY_PAGEDOWN: 34,
    KEY_INSERT:   45,

    cache: {}
  };

  var docEl = document.documentElement;
  var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
    && 'onmouseleave' in docEl;

  var _isButton;
  if (Prototype.Browser.IE) {
    var buttonMap = { 0: 1, 1: 4, 2: 2 };
    _isButton = function(event, code) {
      return event.button === buttonMap[code];
    };
  } else if (Prototype.Browser.WebKit) {
    _isButton = function(event, code) {
      switch (code) {
        case 0: return event.which == 1 && !event.metaKey;
        case 1: return event.which == 1 && event.metaKey;
        default: return false;
      }
    };
  } else {
    _isButton = function(event, code) {
      return event.which ? (event.which === code + 1) : (event.button === code);
    };
  }

  function isLeftClick(event)   { return _isButton(event, 0) }

  function isMiddleClick(event) { return _isButton(event, 1) }

  function isRightClick(event)  { return _isButton(event, 2) }

  function element(event) {
    event = Event.extend(event);

    var node = event.target, type = event.type,
     currentTarget = event.currentTarget;

    if (currentTarget && currentTarget.tagName) {
      if (type === 'load' || type === 'error' ||
        (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
          && currentTarget.type === 'radio'))
            node = currentTarget;
    }

    if (node.nodeType == Node.TEXT_NODE)
      node = node.parentNode;

    return Element.extend(node);
  }

  function findElement(event, expression) {
    var element = Event.element(event);
    if (!expression) return element;
    var elements = [element].concat(element.ancestors());
    return Selector.findElement(elements, expression, 0);
  }

  function pointer(event) {
    return { x: pointerX(event), y: pointerY(event) };
  }

  function pointerX(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollLeft: 0 };

    return event.pageX || (event.clientX +
      (docElement.scrollLeft || body.scrollLeft) -
      (docElement.clientLeft || 0));
  }

  function pointerY(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollTop: 0 };

    return  event.pageY || (event.clientY +
       (docElement.scrollTop || body.scrollTop) -
       (docElement.clientTop || 0));
  }


  function stop(event) {
    Event.extend(event);
    event.preventDefault();
    event.stopPropagation();

    event.stopped = true;
  }

  Event.Methods = {
    isLeftClick: isLeftClick,
    isMiddleClick: isMiddleClick,
    isRightClick: isRightClick,

    element: element,
    findElement: findElement,

    pointer: pointer,
    pointerX: pointerX,
    pointerY: pointerY,

    stop: stop
  };


  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (Prototype.Browser.IE) {
    function _relatedTarget(event) {
      var element;
      switch (event.type) {
        case 'mouseover': element = event.fromElement; break;
        case 'mouseout':  element = event.toElement;   break;
        default: return null;
      }
      return Element.extend(element);
    }

    Object.extend(methods, {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return '[object Event]' }
    });

    Event.extend = function(event, element) {
      if (!event) return false;
      if (event._extendedByPrototype) return event;

      event._extendedByPrototype = Prototype.emptyFunction;
      var pointer = Event.pointer(event);

      Object.extend(event, {
        target: event.srcElement || element,
        relatedTarget: _relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });

      return Object.extend(event, methods);
    };
  } else {
    Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
    Object.extend(Event.prototype, methods);
    Event.extend = Prototype.K;
  }

  function _createResponder(element, eventName, handler) {
    var registry = Element.retrieve(element, 'prototype_event_registry');

    if (Object.isUndefined(registry)) {
      CACHE.push(element);
      registry = Element.retrieve(element, 'prototype_event_registry', $H());
    }

    var respondersForEvent = registry.get(eventName);
    if (Object.isUndefined(respondersForEvent)) {
      respondersForEvent = [];
      registry.set(eventName, respondersForEvent);
    }

    if (respondersForEvent.pluck('handler').include(handler)) return false;

    var responder;
    if (eventName.include(":")) {
      responder = function(event) {
        if (Object.isUndefined(event.eventName))
          return false;

        if (event.eventName !== eventName)
          return false;

        Event.extend(event, element);
        handler.call(element, event);
      };
    } else {
      if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED &&
       (eventName === "mouseenter" || eventName === "mouseleave")) {
        if (eventName === "mouseenter" || eventName === "mouseleave") {
          responder = function(event) {
            Event.extend(event, element);

            var parent = event.relatedTarget;
            while (parent && parent !== element) {
              try { parent = parent.parentNode; }
              catch(e) { parent = element; }
            }

            if (parent === element) return;

            handler.call(element, event);
          };
        }
      } else {
        responder = function(event) {
          Event.extend(event, element);
          handler.call(element, event);
        };
      }
    }

    responder.handler = handler;
    respondersForEvent.push(responder);
    return responder;
  }

  function _destroyCache() {
    for (var i = 0, length = CACHE.length; i < length; i++) {
      Event.stopObserving(CACHE[i]);
      CACHE[i] = null;
    }
  }

  var CACHE = [];

  if (Prototype.Browser.IE)
    window.attachEvent('onunload', _destroyCache);

  if (Prototype.Browser.WebKit)
    window.addEventListener('unload', Prototype.emptyFunction, false);


  var _getDOMEventName = Prototype.K;

  if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED) {
    _getDOMEventName = function(eventName) {
      var translations = { mouseenter: "mouseover", mouseleave: "mouseout" };
      return eventName in translations ? translations[eventName] : eventName;
    };
  }

  function observe(element, eventName, handler) {
    element = $(element);

    var responder = _createResponder(element, eventName, handler);

    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.addEventListener)
        element.addEventListener("dataavailable", responder, false);
      else {
        element.attachEvent("ondataavailable", responder);
        element.attachEvent("onfilterchange", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);

      if (element.addEventListener)
        element.addEventListener(actualEventName, responder, false);
      else
        element.attachEvent("on" + actualEventName, responder);
    }

    return element;
  }

  function stopObserving(element, eventName, handler) {
    element = $(element);

    var registry = Element.retrieve(element, 'prototype_event_registry');

    if (Object.isUndefined(registry)) return element;

    if (eventName && !handler) {
      var responders = registry.get(eventName);

      if (Object.isUndefined(responders)) return element;

      responders.each( function(r) {
        Element.stopObserving(element, eventName, r.handler);
      });
      return element;
    } else if (!eventName) {
      registry.each( function(pair) {
        var eventName = pair.key, responders = pair.value;

        responders.each( function(r) {
          Element.stopObserving(element, eventName, r.handler);
        });
      });
      return element;
    }

    var responders = registry.get(eventName);

    if (!responders) return;

    var responder = responders.find( function(r) { return r.handler === handler; });
    if (!responder) return element;

    var actualEventName = _getDOMEventName(eventName);

    if (eventName.include(':')) {
      if (element.removeEventListener)
        element.removeEventListener("dataavailable", responder, false);
      else {
        element.detachEvent("ondataavailable", responder);
        element.detachEvent("onfilterchange",  responder);
      }
    } else {
      if (element.removeEventListener)
        element.removeEventListener(actualEventName, responder, false);
      else
        element.detachEvent('on' + actualEventName, responder);
    }

    registry.set(eventName, responders.without(responder));

    return element;
  }

  function fire(element, eventName, memo, bubble) {
    element = $(element);

    if (Object.isUndefined(bubble))
      bubble = true;

    if (element == document && document.createEvent && !element.dispatchEvent)
      element = document.documentElement;

    var event;
    if (document.createEvent) {
      event = document.createEvent('HTMLEvents');
      event.initEvent('dataavailable', true, true);
    } else {
      event = document.createEventObject();
      event.eventType = bubble ? 'ondataavailable' : 'onfilterchange';
    }

    event.eventName = eventName;
    event.memo = memo || { };

    if (document.createEvent)
      element.dispatchEvent(event);
    else
      element.fireEvent(event.eventType, event);

    return Event.extend(event);
  }


  Object.extend(Event, Event.Methods);

  Object.extend(Event, {
    fire:          fire,
    observe:       observe,
    stopObserving: stopObserving
  });

  Element.addMethods({
    fire:          fire,

    observe:       observe,

    stopObserving: stopObserving
  });

  Object.extend(document, {
    fire:          fire.methodize(),

    observe:       observe.methodize(),

    stopObserving: stopObserving.methodize(),

    loaded:        false
  });

  if (window.Event) Object.extend(window.Event, Event);
  else window.Event = Event;
})();

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */

  var timer;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearTimeout(timer);
    document.loaded = true;
    document.fire('dom:loaded');
  }

  function checkReadyState() {
    if (document.readyState === 'complete') {
      document.stopObserving('readystatechange', checkReadyState);
      fireContentLoadedEvent();
    }
  }

  function pollDoScroll() {
    try { document.documentElement.doScroll('left'); }
    catch(e) {
      timer = pollDoScroll.defer();
      return;
    }
    fireContentLoadedEvent();
  }

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
  } else {
    document.observe('readystatechange', checkReadyState);
    if (window == top)
      timer = pollDoScroll.defer();
  }

  Event.observe(window, 'load', fireContentLoadedEvent);
})();

Element.addMethods();

/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

var Position = {
  includeScrollOffsets: false,

  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },


  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return $(parentElement || document.body).getElementsByClassName(className);
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/
Event.SpecialKeys = $H({
	'enter': Event.KEY_RETURN,
	'up': Event.KEY_UP,
	'down': Event.KEY_DOWN,
	'left': Event.KEY_LEFT,
	'right': Event.KEY_RIGHT,
	'esc': Event.KEY_ESC,
	'space': 32,
	'backspace': Event.KEY_BACKSPACE,
	'tab': Event.KEY_TAB,
	'delete': Event.KEY_DELETE
});

Event.prototype.key = function() {
	if (this.type.include('key')) {
		var code = this.which || this.keyCode;
		var key = Event.SpecialKeys.index(code);
		if (this.type == 'keydown'){
			var fKey = code - 111;
			if (fKey > 0 && fKey < 13) key = 'f' + fKey;
		}
		return key || String.fromCharCode(code).toLowerCase();
	}
};
DateFormat = Class.create();
Object.extend(DateFormat, {
	MONTH_NAMES: ['January','February','March','April','May','June','July','August','September','October','November','December','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
	DAY_NAMES: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
	LZ: function(x) {return(x<0||x>9?"":"0")+x},
	compareDates: function(date1,dateformat1,date2,dateformat2) {
		var d1=DateFormat.parseFormat(date1,dateformat1);
		var d2=DateFormat.parseFormat(date2,dateformat2);
		if (d1==0 || d2==0) return -1;
		else if (d1 > d2) return 1;
		return 0;
	},
	format: function(date,format) {
		format=format+"";
		var result="";
		var i_format=0;
		var c="";
		var token="";
		var y=date.getYear()+"";
		var M=date.getMonth()+1;
		var d=date.getDate();
		var E=date.getDay();
		var H=date.getHours();
		var m=date.getMinutes();
		var s=date.getSeconds();
		var yyyy,yy,MMM,MM,dd,hh,h,mm,ss,ampm,HH,H,KK,K,kk,k;
		// Convert real date parts into formatted versions
		var value=new Object();
		if (y.length < 4) {y=""+(y-0+1900);}
		value["y"]=""+y;
		value["yyyy"]=y;
		value["yy"]=y.substring(2,4);
		value["M"]=M;
		value["MM"]=DateFormat.LZ(M);
		value["MMM"]=DateFormat.MONTH_NAMES[M-1];
		value["NNN"]=DateFormat.MONTH_NAMES[M+11];
		value["d"]=d;
		value["dd"]=DateFormat.LZ(d);
		value["E"]=DateFormat.DAY_NAMES[E+7];
		value["EE"]=DateFormat.DAY_NAMES[E];
		value["H"]=H;
		value["HH"]=DateFormat.LZ(H);
		if (H==0){value["h"]=12;}
		else if (H>12){value["h"]=H-12;}
		else {value["h"]=H;}
		value["hh"]=DateFormat.LZ(value["h"]);
		if (H>11){value["K"]=H-12;} else {value["K"]=H;}
		value["k"]=H+1;
		value["KK"]=DateFormat.LZ(value["K"]);
		value["kk"]=DateFormat.LZ(value["k"]);
		if (H > 11) { value["a"]="PM"; }
		else { value["a"]="AM"; }
		value["m"]=m;
		value["mm"]=DateFormat.LZ(m);
		value["s"]=s;
		value["ss"]=DateFormat.LZ(s);
		while (i_format < format.length) {
			c=format.charAt(i_format);
			token="";
			while ((format.charAt(i_format)==c) && (i_format < format.length))
				token += format.charAt(i_format++);
			if (value[token] != null) result += value[token];
			else result += token;
		}
		return result;
	},
	_isInteger: function(val) {
		var digits="1234567890";
		for (var i=0; i < val.length; i++)
			if (digits.indexOf(val.charAt(i))==-1) return false;
		return true;
	},
	_getInt: function(str,i,minlength,maxlength) {
		for (var x=maxlength; x>=minlength; x--) {
			var token=str.substring(i,i+x);
			if (token.length < minlength) return null;
			if (DateFormat._isInteger(token)) return token;
		}
		return null;
	},
	parseFormat: function(val,format) {
		val=val+"";
		format=format+"";
		var i_val=0;
		var i_format=0;
		var c="";
		var token="";
		var token2="";
		var x,y;
		var now=new Date();
		var year=now.getYear();
		var month=now.getMonth()+1;
		var date=1;
		var hh=now.getHours();
		var mm=now.getMinutes();
		var ss=now.getSeconds();
		var ampm="";
		
		while (i_format < format.length) {
			// Get next token from format string
			c=format.charAt(i_format);
			token="";
			while ((format.charAt(i_format)==c) && (i_format < format.length))
				token += format.charAt(i_format++);
			// Extract contents of value based on format token
			if (token=="yyyy" || token=="yy" || token=="y") {
				if (token=="yyyy") x=4;y=4;
				if (token=="yy") x=2;y=2;
				if (token=="y") x=2;y=4;
				year=DateFormat._getInt(val,i_val,x,y);
				if (year==null) return 0;
				i_val += year.length;
				if (year.length==2) {
					if (year > 70) year=1900+(year-0);
					else year=2000+(year-0);
				}
			} else if (token=="MMM"||token=="NNN") {
				month=0;
				for (var i=0; i<DateFormat.MONTH_NAMES.length; i++) {
					var month_name=DateFormat.MONTH_NAMES[i];
					if (val.substring(i_val,i_val+month_name.length).toLowerCase()==month_name.toLowerCase()) {
						if (token=="MMM"||(token=="NNN"&&i>11)) {
							month=i+1;
							if (month>12) month -= 12;
							i_val += month_name.length;
							break;
						}
					}
				}
				if ((month < 1)||(month>12)) return 0;
			} else if (token=="EE"||token=="E") {
				for (var i=0; i<DateFormat.DAY_NAMES.length; i++) {
					var day_name=DateFormat.DAY_NAMES[i];
					if (val.substring(i_val,i_val+day_name.length).toLowerCase()==day_name.toLowerCase()) {
						i_val += day_name.length;
						break;
					}
				}
			} else if (token=="MM"||token=="M") {
				month=DateFormat._getInt(val,i_val,token.length,2);
				if(month==null||(month<1)||(month>12)) return 0;
				i_val+=month.length;
			} else if (token=="dd"||token=="d") {
				date=DateFormat._getInt(val,i_val,token.length,2);
				if(date==null||(date<1)||(date>31)) return 0;
				i_val+=date.length;
			} else if (token=="hh"||token=="h") {
				hh=DateFormat._getInt(val,i_val,token.length,2);
				if(hh==null||(hh<1)||(hh>12)) return 0;
				i_val+=hh.length;
			} else if (token=="HH"||token=="H") {
				hh=DateFormat._getInt(val,i_val,token.length,2);
				if(hh==null||(hh<0)||(hh>23)) return 0;
				i_val+=hh.length;
			} else if (token=="KK"||token=="K") {
				hh=DateFormat._getInt(val,i_val,token.length,2);
				if(hh==null||(hh<0)||(hh>11)) return 0;
				i_val+=hh.length;
			} else if (token=="kk"||token=="k") {
				hh=DateFormat._getInt(val,i_val,token.length,2);
				if(hh==null||(hh<1)||(hh>24)) return 0;
				i_val+=hh.length;hh--;
			} else if (token=="mm"||token=="m") {
				mm=DateFormat._getInt(val,i_val,token.length,2);
				if(mm==null||(mm<0)||(mm>59)) return 0;
				i_val+=mm.length;
			} else if (token=="ss"||token=="s") {
				ss=DateFormat._getInt(val,i_val,token.length,2);
				if(ss==null||(ss<0)||(ss>59)) return 0;
				i_val+=ss.length;
			} else if (token=="a") {
				if (val.substring(i_val,i_val+2).toLowerCase()=="am") ampm="AM";
				else if (val.substring(i_val,i_val+2).toLowerCase()=="pm") ampm="PM";
				else return 0;
				i_val+=2;
			} else {
				if (val.substring(i_val,i_val+token.length)!=token) return 0;
				else i_val+=token.length;
			}
		}
		// If there are any trailing characters left in the value, it doesn't match
		if (i_val != val.length) return 0;
		// Is date valid for month?
		if (month==2) {
			// Check for leap year
			if (((year%4==0)&&(year%100 != 0)) || (year%400==0)) { // leap year
				if (date > 29) return 0;
			} else if (date > 28) {
				return 0;
			}
		}
		if ((month==4)||(month==6)||(month==9)||(month==11))
			if (date > 30) return 0;
		// Correct hours value
		if (hh<12 && ampm=="PM") hh=hh-0+12;
		else if (hh>11 && ampm=="AM") hh-=12;
		var newdate=new Date(year,month-1,date,hh,mm,ss);
		return newdate;
	},
	parse: function(val, format) {
		if (format) {
			return DateFormat.parseFormat(val, format);
		} else {
			var preferEuro=(arguments.length==2)?arguments[1]:false;
			var generalFormats=new Array('y-M-d','MMM d, y','MMM d,y','y-MMM-d','d-MMM-y','MMM d');
			var monthFirst=new Array('M/d/y','M-d-y','M.d.y','MMM-d','M/d','M-d');
			var dateFirst =new Array('d/M/y','d-M-y','d.M.y','d-MMM','d/M','d-M');
			var checkList=[generalFormats,preferEuro?dateFirst:monthFirst,preferEuro?monthFirst:dateFirst];
			var d=null;
			for (var i=0; i<checkList.length; i++) {
				var l=checkList[i];
				for (var j=0; j<l.length; j++) {
					d=DateFormat.parseFormat(val,l[j]);
					if (d!=0) return new Date(d);
				}
			}
			return null;
		}
	}
});

DateFormat.prototype = {
	initialize: function(format) { this.format = format; },
	parse: function(value) { return DateFormat.parseFormat(value, this.format); },
	format: function(value) { return DateFormat.format(value, this.format); }
}

Date.prototype.format = function(format) {
	return DateFormat.format(this, format);
}
Hash.prototype.without = function() {
    var values = $A(arguments);
	var retHash = $H();
    this.each(function(entry) {
		if(!values.include(entry.key))
			retHash.set(entry.key, entry.value);
    });
	return retHash;
}

Element.insertAfter = function(insert, element) {
	if (element.nextSibling) element.parentNode.insertBefore(insert, element.nextSibling);
	else element.parentNode.appendChild(insert);
}

// Fix exceptions thrown thrown when removing an element with no parent
Element._remove = Element.remove;
Element.remove = function(element) {
	element = $(element);
	if (element.parentNode)
		return Element._remove(element);
}
/* ************************************************************************************* *\
 * The MIT License
 * Copyright (c) 2010 Luo Gelin - greenlaw110@gmail.com
 * Copyright (c) 2007 Fabio Zendhi Nagao - http://zend.lojcomm.com.br
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following
 * conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies
 * or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
\* ************************************************************************************* */

var pMask = Class.create({
    defNumberOptions: {
        groupSymbol: ',',
        groupDigits: 3,
        decSymbol: '.',
        decDigits: 2,
        stripMask: false,
        stripMaskOnSubmit: true
    },
    defOptions: {
        targetClass: "p-mask",
        maskEmptyChr: '_',

        validNumbers: "1234567890-.",
        validAlphas: "abcdefghijklmnopqrstuvwxyz",
        validAlphaNums: "abcdefghijklmnopqrstuvwxyz1234567890",
        
        errorClass: "p-mask-error",
        errorDisplayDuration: 1,

        onFocus: Prototype.emptyFunction,
        onBlur: Prototype.emptyFunction,
        onValid: Prototype.emptyFunction,
        onInvalid: Prototype.emptyFunction,
        onKeyDown: Prototype.emptyFunction
    },
    
    maskObject: function(obj) {
        obj = $(obj);
        if (!obj) return;
        if (obj.pMasked) return;
        obj.pMasked = true;
        /* try html5 data attribute first */
        var maskAtt = obj.getAttribute("data-pMask");
        if (maskAtt)
            obj.options = maskAtt.evalJSON();
        else
            obj.options = (obj.alt).evalJSON();
        if (!obj.options) return;
        if(obj.options.type && obj.options.type == "number") {
            //set default options
            obj.options = Object.extend(this.defNumberOptions, obj.options);
        }
        if (obj.options.stripMask == false) {
            obj.value = this._wearMask(obj, obj.value)
        }
        obj.observe("mousedown", function(event) {
            event.stop();
        });
        obj.observe("mouseup", function(event) {
            event.stop();
            this._onMouseUp(event, obj);
        }.bind(this));
        obj.observe("click", function(event) {
            event.stop();
        });
        obj.observe("keydown", function(event) {
            this._onKeyDown(event, obj);
            this.options.onKeyDown.defer(obj);
        }.bind(this));
        obj.observe("keypress", function(event) {
            this._onKeyPress(event, obj);
        }.bind(this));
        obj.observe("focus", function(event) {
            event.stop();
            this._onFocus(event, obj);
            this.options.onFocus.defer(obj);
        }.bind(this));
        obj.observe("blur", function(event) {
            event.stop();
            this._onBlur(event, obj);
            this.options.onBlur.defer(obj);
        }.bind(this));
    },

    initialize: function(options) {
        this.options = Object.extend(Object.extend({ }, this.defOptions), options || { });
        
        var clz = "." + this.options.targetClass;
        $$(clz).each(function(obj) {
            this.maskObject(obj);
        }.bind(this));
        
        var e = $$(clz).first();
        if (e) {
            var f = this._getObjForm(e);
            if (f && !f.pMasked) {
                f.observe('submit', function(){this._stripMaskOnSubmit();}.bind(this));
                f.pMasked = true;
            }
        }
    },

    _onMouseUp: function(event, obj) {
        if(obj.options.type == "fixed") {
            var p = this._getSelectionStart(obj);
            this._setSelection(obj, p, (p + 1));
        } else if(obj.options.type == "number") {
            this._setEnd(obj);
        }
    },

    _onKeyDown: function(event, obj) {
        if(event.keyCode == Event.KEY_RETURN) { // enter
            event.keyCode == Event.KEY_TAB;
            //TODO simulate TAB key
            //this._onKeyDown(event, obj);
            //obj.blur();
            //this._submitForm(obj);
        } else if(event.keyCode != Event.KEY_TAB) {
            event.stop();
            var chr = 0;
            if(obj.options.type == "fixed") {
                var p = this._getSelectionStart(obj);
                switch(event.keyCode) {
                    case Event.KEY_BACKSPACE: 
                        this._selectPrevious(obj);
                        break;
                    case Event.KEY_HOME: 
                        this._selectFirst(obj);
                        break;
                    case Event.KEY_END: 
                        this._selectLast(obj);
                        break;
                    case Event.KEY_LEFT:
                    case Event.KEY_UP:
                        this._selectPrevious(obj);
                        break;
                    case Event.KEY_RIGHT:
                    case Event.KEY_DOWN:
                        this._selectNext(obj);
                        break;
                    case Event.KEY_DELETE:
                        this._updSelection(obj, p, this.options.maskEmptyChr);
                        break;
                    default:
                        chr = this._chrFromEvent(event);
                        if(this._isViableInput(obj, p, chr)) {
                            if(event.shiftKey)
                                {this._updSelection(obj, p, chr.toUpperCase());}
                            else
                                {this._updSelection(obj, p, chr);}
                            this._onValid.bind(this).defer(event, obj);
                            this._selectNext(obj);
                        } else {
                            if (!this._isIrrelevantKeyCode(event.keyCode)) this._onInvalid.bind(this).defer(event, obj);
                        }
                        break;
                }
            } else if(obj.options.type == "number") {
                switch(event.keyCode) {
                    case Event.KEY_BACKSPACE: 
                    case Event.KEY_DELETE: 
                        this._popNumber(obj);
                        break;
                    default:
                        chr = this._chrFromEvent(event);
                        if(this.options.validNumbers.indexOf(chr) >= 0) {
                            this._pushNumber(obj, chr);
                            this._onValid.bind(this).defer(event, obj);
                        } else {
                            if (!this._isIrrelevantKeyCode(event.keyCode)) this._onInvalid.bind(this).defer(event, obj);
                        }
                        break;
                }
            }
        }
    },
    
    _isIrrelevantKeyCode: function(keyCode) {
        /* donot trigger warning for the following keys */
        // shift, ctrl, alt, left-win, right-win, win-menu, apple
        // see http://unixpapa.com/js/key.html
        return [16, 17, 18, 91, 92, 93, 224].indexOf(keyCode) != -1;
    },

    _onKeyPress: function(event, obj) {
        if((event.keyCode != Event.KEY_TAB)
            && !(event.shiftKey && event.keyCode == Event.KEY_TAB) 
            && (event.keyCode != Event.KEY_RETURN) 
            && !(event.ctrlKey && event.keyCode == 67) // ctrl + c
            && !(event.ctrlKey && event.keyCode == 86) // ctrl + v
            && !(event.ctrlKey && event.keyCode == 88) // ctrl + x
        ) {
            event.stop();
        }
    },

    _onFocus: function(event, obj) {
        if(obj.options.stripMask) obj.value = this._wearMask(obj, obj.value);
        if(obj.options.type == "fixed") 
            {this._selectFirst.bind(this, obj).defer();}
        else
            {this._setEnd.bind(this, obj).defer();}
    },

    _onBlur: function(event, obj) {
        if(obj.options.stripMask)
            obj.value = this._stripMask(obj);
    },
    
    _onInvalid: function(event, obj) {
        obj.addClassName(this.options.errorClass);
        this.options.onInvalid(event, obj);
        var f = function(obj){
            obj.removeClassName(this.options.errorClass);
        };
        var d = this.options.errorDisplayDuration;
        if (d > 0)
            f.bind(this).delay(d, obj);
    },
    
    _onValid: function(event, obj) {
        obj.removeClassName(this.options.errorClass);
        this.options.onValid(event, obj);
    },

    _selectAll: function(obj) {
        this._setSelection(obj, 0, obj.value.length);
    },

    _selectFirst: function(obj) {
        for(var i = 0, len = obj.options.mask.length; i < len; i++) {
            if(this._isInputPosition(obj, i)) {
                this._setSelection(obj, i, (i + 1));
                return;
            }
        }
    },

    _selectLast: function(obj) {
        for(var i = (obj.options.mask.length - 1); i >= 0; i--) {
            if(this._isInputPosition(obj, i)) {
                this._setSelection(obj, i, (i + 1));
                return;
            }
        }
    },

    _selectPrevious: function(obj, p) {
        if(!$(p))p = this._getSelectionStart(obj);
        if(p <= 0) {
            this._selectFirst(obj);
        } else {
            if(this._isInputPosition(obj, (p - 1))) {
                this._setSelection(obj, (p - 1), p);
            } else {
                this._selectPrevious(obj, (p - 1));
            }
        }
    },

    _selectNext: function(obj, p) {
        if(!$(p))p = this._getSelectionEnd(obj);
        if(p >= obj.options.mask.length) {
            this._selectLast(obj);
        } else {
            if(this._isInputPosition(obj, p)) {
                this._setSelection(obj, p, (p + 1));
            } else {
                this._selectNext(obj, (p + 1));
            }
        }
    },

    _setSelection: function(obj, a, b) {
        if(obj.setSelectionRange) {
            obj.focus();
            obj.setSelectionRange(a, b);
        } else if(obj.createTextRange) {
            var r = obj.createTextRange();
            r.collapse();
            r.moveStart("character", a);
            r.moveEnd("character", (b - a));
            r.select();
        }
    },

    _updSelection: function(obj, p, chr) {
        var value = obj.value;
        var output = "";
        output += value.substring(0, p);
        output += chr;
        output += value.substr(p + 1);
        obj.value = output;
        this._setSelection(obj, p, (p + 1));
    },

    _setEnd: function(obj) {
        var len = obj.value.length;
        this._setSelection(obj, len, len);
    },

    _getSelectionStart: function(obj) {
        var p = 0;
        if(obj.selectionStart) {
            if(Object.isNumber(obj.selectionStart)) p = obj.selectionStart;
        } else if(document.selection) {
            var r = document.selection.createRange().duplicate();
            r.moveEnd("character", obj.value.length);
            p = obj.value.lastIndexOf(r.text);
            if(r.text == "") p = obj.value.length;
        }
        return p;
    },

    _getSelectionEnd: function(obj) {
        var p = 0;
        if(obj.selectionEnd) {
            if(Object.isNumber(obj.selectionEnd))
                {p = obj.selectionEnd;}
        } else if(document.selection) {
            var r = document.selection.createRange().duplicate();
            r.moveStart("character", -obj.value.length);
            p = r.text.length;
        }
        return p;
    },

    _isInputPosition: function(obj, p) {
        var mask = obj.options.mask.toLowerCase();
        var chr = mask.charAt(p);
        if("9ax".indexOf(chr) >= 0)
            return true;
        return false;
    },

    _isViableInput: function(obj, p, chr) {
        var mask = obj.options.mask.toLowerCase();
        var chMask = mask.charAt(p);
        switch(chMask) {
            case '9':
                if(this.options.validNumbers.indexOf(chr) >= 0) return true;
                break;
            case 'a':
                if(this.options.validAlphas.indexOf(chr) >= 0) return true;
                break;
            case 'x':
                if(this.options.validAlphaNums.indexOf(chr) >= 0) return true;
                break;
            default:
                return false;
        }
    },

    _wearMask: function(obj, str) {
        if (!obj.options.mask) {
            if (obj.options.type == "number") {
                this._formatNumber(obj);
                return obj.value;
            } else {return str;}
        }
        var mask = obj.options.mask.toLowerCase();
        var output = "";
        for(var i = 0, u = 0, len = mask.length; i < len; i++) {
            switch(mask.charAt(i)) {
                case '9':
                    if(this.options.validNumbers.indexOf(str.charAt(u).toLowerCase()) >= 0) {
                        if(str.charAt(u) == "") {output += this.options.maskEmptyChr;}
                        else {output += str.charAt(u++);}
                    } else {
                        output += this.options.maskEmptyChr;
                    }
                    break;
                case 'a':
                    if(this.options.validAlphas.indexOf(str.charAt(u).toLowerCase()) >= 0) {
                        if(str.charAt(u) == "") {output += this.options.maskEmptyChr;}
                        else {output += str.charAt(u++);}
                    } else {
                        output += this.options.maskEmptyChr;
                    }
                    break;
                case 'x':
                    if(this.options.validAlphaNums.indexOf(str.charAt(u).toLowerCase()) >= 0) {
                        if(str.charAt(u) == "") {output += this.options.maskEmptyChr;}
                        else {output += str.charAt(u++);}
                    } else {
                        output += this.options.maskEmptyChr;
                    }
                    break;
                default:
                    output += mask.charAt(i);
                    break;
            }
        }
        return output;
    },

    _stripMask: function(obj) {
        var value = obj.value;
        if("" == value) return "";
        var output = "";
        if(obj.options.type == "fixed") {
            for(var i = 0, len = value.length; i < len; i++) {
                if((value.charAt(i) != this.options.maskEmptyChr) && (this._isInputPosition(obj, i)))
                    {output += value.charAt(i);}
            }
        } else if(obj.options.type == "number") {
            for(var i = 0, len = value.length; i < len; i++) {
                if(this.options.validNumbers.indexOf(value.charAt(i)) >= 0)
                    {output += value.charAt(i);}
            }
        }
        return output;
    },

    _chrFromEvent: function(event) {
        var chr = '';
        switch(event.keyCode) {
            case 48: case 96: // 0 and numpad 0
                chr = '0';
                break;
            case 49: case 97: // 1 and numpad 1
                chr = '1';
                break;
            case 50: case 98: // 2 and numpad 2
                chr = '2';
                break;
            case 51: case 99: // 3 and numpad 3
                chr = '3';
                break;
            case 52: case 100: // 4 and numpad 4
                chr = '4';
                break;
            case 53: case 101: // 5 and numpad 5
                chr = '5';
                break;
            case 54: case 102: // 6 and numpad 6
                chr = '6';
                break;
            case 55: case 103: // 7 and numpad 7
                chr = '7';
                break;
            case 56: case 104: // 8 and numpad 8
                chr = '8';
                break;
            case 57: case 105: // 9 and numpad 9
                chr = '9';
                break;
            case 189: case 109: // - and numpad -
                chr = '-';
                break;
            case 190: case 110: // . and numpad .
                chr = '.';
                break;
            default:
                chr = event.key(); // key pressed as a lowercase string //TODO
                break;
        }
        return chr;
    },

    _pushNumber: function(obj, chr) {
        var negative = (chr == '-');
        if (chr != '-' && chr != '.') obj.value = obj.value + chr;
        this._formatNumber(obj, negative);
    },

    _popNumber: function(obj) {
        obj.value = obj.value.substring(0, (obj.value.length - 1));
        this._formatNumber(obj);
    },

    _formatNumber: function(obj, negative) {
        
        var str2 = this._stripMask(obj);
        if (!str2.include('.') && obj.options.decDigits > 0) {
            str2 = str2 + '.' + '0'.times(obj.options.decDigits);
        }
        
        // additional processing for "."
        str2 = str2.sub('.', '');
        var str1 = "";
        // negative operation
        if (negative) {
            var isNeg = (str2.charAt(i) == '-')
            if (isNeg) {
                str2 = str2.sub('-', '');
            } else {
                str2 = '-' + str2;
            }
        }
        
        // stripLeadingZeros
        for(var i = 0, len = str2.length; i < len; i++) {
            if('0' != str2.charAt(i)) {
                str1 = str2.substr(i);
                break;
            }
        }

        // wearLeadingZeros
        str2 = str1;
        str1 = "";
        for(var len = str2.length, i = obj.options.decDigits; len <= i; len++) {
            str1 += "0";
        }
        str1 += str2;

        // decimalSymbol
        str2 = str1.substr(str1.length - obj.options.decDigits);
        str1 = str1.substring(0, (str1.length - obj.options.decDigits));

        // groupSymbols
        var re = new RegExp("(\\d+)(\\d{"+ obj.options.groupDigits +"})");
        while(re.test(str1)) {
            str1 = str1.replace(re, "$1"+ obj.options.groupSymbol +"$2");
        }

        // currencySymbol
        if (obj.options.currencySymbol) {
            str1 = obj.options.currencySymbol + str1;
        }

        obj.value = str1 + obj.options.decSymbol + str2;
    },

    _getObjForm: function(obj) {
        var n;
        for (; n = obj.tagName.toLowerCase(), n != 'body' && n != 'form'; obj = obj.up());
        return (obj.tagName.toLowerCase() == 'form') ? obj : null;
    },

    _stripMaskOnSubmit: function() {
        $$("." + this.options.targetClass).each(function(obj) {
            //alert(obj.tagName);
            if (obj.options.stripMaskOnSubmit && !obj.options.stripMask) {
                if (obj.value) {
                    obj.value = this._stripMask(obj);
                }
            }
        }.bind(this));
    },
    
    stripMask: function (obj) {
        obj = $(obj);
        if (!obj || !obj.value) return;
        obj.value = this._stripMask(obj);
    }

});
// LiveValidation 1.3 (prototype.js version)
// Copyright (c) 2007-2008 Alec Hill (www.livevalidation.com)
// LiveValidation is licensed under the terms of the MIT License

var LiveValidation = Class.create();

/*********************************************** LiveValidation class ***********************************/

/*** static ***/

Object.extend(LiveValidation, {
  
  VERSION: '1.3 prototype',
  
  /*** element types constants ***/
  TEXTAREA:  1,
  TEXT:         2,
  PASSWORD: 3,
  CHECKBOX:  4,
  SELECT:      5,
  FILE:          6,

  /**
   *	pass an array of LiveValidation objects and it will validate all of them
   *	
   *	@var validations {Array} - an array of LiveValidation objects
   *	@return {Bool} - true if all passed validation, false if any fail						
   */
  massValidate: function(validations){
    var returnValue = true;
    for(var i = 0, len = validations.length; i < len; ++i ){
      var valid = validations[i].validate();
      if(returnValue) returnValue = valid;
    }
    return returnValue;
  }

});

/*** prototype ***/

LiveValidation.prototype = {
    
  validClass: 'LV_valid',
  invalidClass: 'LV_invalid',
  messageClass: 'LV_validation_message',
  validFieldClass: 'LV_valid_field',
  invalidFieldClass: 'LV_invalid_field',
    
  /**
   *	constructor for LiveValidation - validates a form field in real-time based on validations you assign to it
   *	
   *	@var element {mixed} - either a dom element reference or the string id of the element to validate
   *	@var optionsObj {Object} - general options, see below for details
   *
   *	optionsObj properties:
   *							validMessage {String} 	- the message to show when the field passes validation
   *													  (DEFAULT: "Thankyou!")
   *							onValid {Function} 		- function to execute when field passes validation
   *													  (DEFAULT: function(){ this.insertMessage(this.createMessageSpan()s); this.addFieldClass(); } )	
   *							onInvalid {Function} 	- function to execute when field fails validation
   *													  (DEFAULT: function(){ this.insertMessage(this.createMessageSpan()); this.addFieldClass(); })
   *							insertAfterWhatNode {mixed} 	- reference or id of node to have the message inserted after 
   *													  (DEFAULT: the field that is being validated
   *              onlyOnBlur {Boolean} - whether you want it to validate as you type or only on blur
   *                            (DEFAULT: false)
   *              wait {Integer} - the time you want it to pause from the last keystroke before it validates (ms)
   *                            (DEFAULT: 0)
   *              onlyOnSubmit {Boolean} - whether should be validated only when the form it belongs to is submitted
   *                            (DEFAULT: false)
   */
  initialize: function(element, optionsObj){
    // set up special properties (ones that need some extra processing or can be overidden from optionsObj)
    if(!element) throw new Error("LiveValidation::initialize - No element reference or element id has been provided!");
    this.element = $(element);
    if(!this.element) throw new Error("LiveValidation::initialize - No element with reference or id of '" + element + "' exists!");
    // properties that could not be initialised above
    this.elementType = this.getElementType();
    this.validations = [];
    this.form = this.element.form;
    // overwrite the options defaults with passed in ones
    this.options = Object.extend({
      validMessage: '',
      onValid: function(){ this.insertMessage(this.createMessageSpan()); this.addFieldClass(); },
      onInvalid: function(){ this.insertMessage(this.createMessageSpan()); this.addFieldClass(); },
      insertAfterWhatNode: this.element,
      onlyOnBlur: false,
      wait: 0,
      onlyOnSubmit: false
    }, optionsObj || {});
	var node = this.options.insertAfterWhatNode || this.element;
    this.options.insertAfterWhatNode = $(node);
    Object.extend(this, this.options); // copy the options to the actual object
    // add to form if it has been provided
    if(this.form){
      this.formObj = LiveValidationForm.getInstance(this.form);
      this.formObj.addField(this);
    }
    // events
	// event callbacks are cached so they can be stopped being observed
	this.boundFocus = this.doOnFocus.bindAsEventListener(this);
    Event.observe(this.element, 'focus', this.boundFocus);
    if(!this.onlyOnSubmit){
      switch(this.elementType){
        case LiveValidation.CHECKBOX:
		  this.boundClick = this.validate.bindAsEventListener(this);
          Event.observe(this.element, 'click', this.boundClick);
          // let it run into the next to add a change event too
        case LiveValidation.SELECT:
        case LiveValidation.FILE:
		  this.boundChange = this.validate.bindAsEventListener(this);
          Event.observe(this.element, 'change', this.boundChange);
          break;
        default:
          if(!this.onlyOnBlur){
		  	this.boundKeyup = this.deferValidation.bindAsEventListener(this);
		  	Event.observe(this.element, 'keyup', this.boundKeyup);
		  }
          this.boundBlur = this.validate.bindAsEventListener(this);
		  Event.observe(this.element, 'blur', this.boundBlur);
      }
    }
  },
  
  /**
   *	destroys the instance's events and removes it from any LiveValidationForms
   */
  destroy: function(){
  	if(this.formObj){
		// remove the field from the LiveValidationForm
		this.formObj.removeField(this);
		// destroy the LiveValidationForm if no LiveValidation fields left in it
		this.formObj.destroy();
	}
    // remove events
    Event.stopObserving(this.element, 'focus', this.boundFocus);
    if(!this.onlyOnSubmit){
      switch(this.elementType){
        case LiveValidation.CHECKBOX:
          Event.stopObserving(this.element, 'click', this.boundClick);
          // let it run into the next to add a change event too
        case LiveValidation.SELECT:
        case LiveValidation.FILE:
          Event.stopObserving(this.element, 'change', this.boundChange);
          break;
        default:
          if(!this.onlyOnBlur) Event.stopObserving(this.element, 'keyup', this.boundKeyup);
          Event.stopObserving(this.element, 'blur', this.boundBlur);
      }
    }
    this.validations = [];
	this.removeMessageAndFieldClass();
  },
  
  /**
   *	adds a validation to perform to a LiveValidation object
   *
   *	@var validationFunction {Function} - validation function to be used (ie Validate.Presence )
   *	@var validationParamsObj {Object} - parameters for doing the validation, if wanted or necessary
   * @return {Object} - the LiveValidation object itself so that calls can be chained
   */
  add: function(validationFunction, validationParamsObj){
    this.validations.push( { type: validationFunction, params: validationParamsObj || {} } );
    return this;
  },
  
  /**
     *	removes a validation from a LiveValidation object - must have exactly the same arguments as used to add it 
     *
     *	@var validationFunction {Function} - validation function to be used (ie Validate.Presence )
     *	@var validationParamsObj {Object} - parameters for doing the validation, if wanted or necessary
     * @return {Object} - the LiveValidation object itself so that calls can be chained
     */
    remove: function(validationFunction, validationParamsObj){
	  this.validations = this.validations.reject(function(v){
	  	return (v.type == validationFunction && v.params == validationParamsObj);
	  });
	  return this;
    },
    
  /**
   * makes the validation wait the alotted time from the last keystroke 
   */
  deferValidation: function(e){
    if(this.wait >= 300) this.removeMessageAndFieldClass();
    if(this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(this.validate.bind(this), this.wait);
  },
    
  /**
   * sets the focused flag to false when field loses focus 
   */
  doOnBlur: function(){
    this.focused = false;
    this.validate();
  },
    
  /**
   * sets the focused flag to true when field gains focus and removes old message and field class 
   */
  doOnFocus: function(){
    this.focused = true;
    this.removeMessageAndFieldClass();
  },
		
  /**
   *	gets the type of element, to check whether it is compatible
   *
   *	@var validationFunction {Function} - validation function to be used (ie Validate.Presence )
   *	@var validationParamsObj {Object} - parameters for doing the validation, if wanted or necessary
   */
  getElementType: function(){
    switch(true){
      case (this.element.nodeName.toUpperCase() == 'TEXTAREA'):
        return LiveValidation.TEXTAREA;
      case (this.element.nodeName.toUpperCase() == 'INPUT' && this.element.type.toUpperCase() == 'TEXT'):
        return LiveValidation.TEXT;
      case (this.element.nodeName.toUpperCase() == 'INPUT' && this.element.type.toUpperCase() == 'PASSWORD'):
        return LiveValidation.PASSWORD;
      case (this.element.nodeName.toUpperCase() == 'INPUT' && this.element.type.toUpperCase() == 'CHECKBOX'):
        return LiveValidation.CHECKBOX;
      case (this.element.nodeName.toUpperCase() == 'INPUT' && this.element.type.toUpperCase() == 'FILE'):
        return LiveValidation.FILE;
      case (this.element.nodeName.toUpperCase() == 'SELECT'):
        return LiveValidation.SELECT;
      case (this.element.nodeName.toUpperCase() == 'INPUT'):
        throw new Error('LiveValidation::getElementType - Cannot use LiveValidation on an ' + this.element.type + ' input!');
      default:
        throw new Error('LiveValidation::getElementType - Element must be an input, select, or textarea!');
    }
  },
    
  /**
   *	loops through all the validations added to the LiveValidation object and checks them one by one
   *
   *	@var validationFunction {Function} - validation function to be used (ie Validate.Presence )
   *	@var validationParamsObj {Object} - parameters for doing the validation, if wanted or necessary
   * @return {Boolean} - whether the all the validations passed or if one failed
   */
  doValidations: function(){
    this.validationFailed = false;
    for(var i = 0, len = this.validations.length; i < len; ++i){
      var validation = this.validations[i];
      switch(validation.type){
        case Validate.Presence:
        case Validate.Confirmation:
        case Validate.Acceptance:
          this.displayMessageWhenEmpty = true;
          this.validationFailed = !this.validateElement(validation.type, validation.params); 
          break;
        default:
          this.validationFailed = !this.validateElement(validation.type, validation.params);
          break;
      }
      if(this.validationFailed) return false;	
    }
    this.message = this.validMessage;
    return true;
  },
    
  /**
   *	performs validation on the element and handles any error (validation or otherwise) it throws up
   *
   *	@var validationFunction {Function} - validation function to be used (ie Validate.Presence )
   *	@var validationParamsObj {Object} - parameters for doing the validation, if wanted or necessary
   * @return {Boolean} - whether the validation has passed or failed
   */
  validateElement: function(validationFunction, validationParamsObj){
    var value = (this.elementType == LiveValidation.SELECT) ? this.element.options[this.element.selectedIndex].value : this.element.value;     
    if(validationFunction == Validate.Acceptance){
      if(this.elementType != LiveValidation.CHECKBOX) throw new Error('LiveValidation::validateElement - Element to validate acceptance must be a checkbox!');
      value = this.element.checked;
    }
    var isValid = true;
    try{    
      validationFunction(value, validationParamsObj);
    } catch(error) {
      if(error instanceof Validate.Error){
        if( value !== '' || (value === '' && this.displayMessageWhenEmpty) ){
          this.validationFailed = true;
          this.message = error.message;
          isValid = false;
        }
      }else{
        throw error;
      }
    }finally{
      return isValid;
    }
  },
    
  /**
   *	makes it do the all the validations and fires off the onValid or onInvalid callbacks
   *
   * @return {Boolean} - whether the all the validations passed or if one failed
   */
  validate: function(){
  	if(!this.element.disabled){
		var isValid = this.doValidations();
		if(isValid){
			this.onValid();
			return true;
		}else {
			this.onInvalid();
			return false;
		}
	}else{
    return true;
  }
  },
  
  /**
   *  enables the field
   *
   *  @return {LiveValidation} - the LiveValidation object for chaining
   */
  enable: function(){
  	this.element.disabled = false;
	return this;
  },
  
  /**
   *  disables the field and removes any message and styles associated with the field
   *
   *  @return {LiveValidation} - the LiveValidation object for chaining
   */
  disable: function(){
  	this.element.disabled = true;
	this.removeMessageAndFieldClass();
	return this;
  },
    
  /** Message insertion methods ****************************
   * 
   * These are only used in the onValid and onInvalid callback functions and so if you overide the default callbacks,
   * you must either impliment your own functions to do whatever you want, or call some of these from them if you 
   * want to keep some of the functionality
   */
   
  /**
   *	makes a span containg the passed or failed message
   *
   * @return {HTMLSpanObject} - a span element with the message in it
   */
  createMessageSpan: function(){
    var span = document.createElement('span');
    var textNode = document.createTextNode(this.message);
    span.appendChild(textNode);
    return span;
  },
    
  /**
   *	inserts the element containing the message in place of the element that already exists (if it does)
   *
   * @var elementToIsert {HTMLElementObject} - an element node to insert
   */
  insertMessage: function(elementToInsert){
    this.removeMessage();
    var className = this.validationFailed ? this.invalidClass : this.validClass;
    if( (this.displayMessageWhenEmpty && (this.elementType == LiveValidation.CHECKBOX || this.element.value == '')) || this.element.value != '' ){
      $(elementToInsert).addClassName( this.messageClass + (' ' + className) );
      if( nxtSibling = this.insertAfterWhatNode.nextSibling){
        this.insertAfterWhatNode.parentNode.insertBefore(elementToInsert, nxtSibling);
      }else{
        this.insertAfterWhatNode.parentNode.appendChild(elementToInsert);
      }
    }
  },
    
  /**
   *	changes the class of the field based on whether it is valid or not
   */
  addFieldClass: function(){ 
    this.removeFieldClass();
    if(!this.validationFailed){
      if(this.displayMessageWhenEmpty || this.element.value != ''){
        if(!this.element.hasClassName(this.validFieldClass)) this.element.addClassName(this.validFieldClass);
      }
    }else{
      if(!this.element.hasClassName(this.invalidFieldClass)) this.element.addClassName(this.invalidFieldClass);
    }
  },
    
  /**
   *	removes the message element if it exists
   */
  removeMessage: function(){
    if( nxtEl = this.insertAfterWhatNode.next('.' + this.messageClass) ) nxtEl.remove();
  },
    
  /**
   *	removes the class that has been applied to the field to indicte if valid or not
   */
  removeFieldClass: function(){
    this.element.removeClassName(this.invalidFieldClass);
    this.element.removeClassName(this.validFieldClass);
  },
    
  /**
   *	removes the message and the field class
   */
  removeMessageAndFieldClass: function(){
    this.removeMessage();
    this.removeFieldClass();
  }
   
} // end of LiveValidation.prototype object

/*************************************** LiveValidationForm class ****************************************/

var LiveValidationForm = Class.create();

/*** static ***/

Object.extend(LiveValidationForm, {

	/**
	 * namespace to hold instances
	 */
	instances: {},
	
	/**
	   *	gets the instance of the LiveValidationForm if it has already been made or creates it if it doesnt exist
	   *	
	   *	@var element {HTMLFormElement} - a dom element reference to a form
	   */
	getInstance: function(element){
	  var rand = Math.random() * Math.random();
	  if(!element.id) element.id = 'formId_' + rand.toString().replace(/\./, '') + new Date().valueOf();
	  if(!LiveValidationForm.instances[element.id]) LiveValidationForm.instances[element.id] = new LiveValidationForm(element);
	  return LiveValidationForm.instances[element.id];
	}

});

/*** prototype ***/

LiveValidationForm.prototype = {
  
  /**
   *	constructor for LiveValidationForm - handles validation of LiveValidation fields belonging to this form on its submittal
   *	
   *	@var element {HTMLFormElement} - a dom element reference to the form to turn into a LiveValidationForm
   */
  initialize: function(element){
    this.element = $(element);
    this.fields = [];
    // need to capture onsubmit in this way rather than Event.observe because Rails helpers add events inline
	// and must ensure that the validation is run before any previous submit events 
	//(hence not using Event.observe, as inline events appear to be captured before prototype events)
	this.oldOnSubmit = this.element.onsubmit || function(){};
	this.element.onsubmit = function(e){
	  var ret = (LiveValidation.massValidate(this.fields)) ? this.oldOnSubmit.call(this.element, e) !== false : false;
	  if (!ret) Event.stop(e)
    }.bindAsEventListener(this);
  },
  
  /**
   *	adds a LiveValidation field to the forms fields array
   *	
   *	@var lvObj {LiveValidation} - a LiveValidation object
   */
  addField: function(lvObj){
    this.fields.push(lvObj);
  },
  
  /**
   *	removes a LiveValidation field from the forms fields array
   *	
   *	@var victim {LiveValidation} - a LiveValidation object
   */
  removeField: function(victim){
	this.fields = this.fields.without(victim);
  },
  
  /**
   *	destroy this instance and its events
   *
   * @var force {Boolean} - whether to force the detruction even if there are fields still associated
   */
  destroy: function(force){
  	// only destroy if has no fields and not being forced
  	if (this.fields.length != 0 && !force) return false;
	// remove events
	this.element.onsubmit = this.oldOnSubmit;
	// remove from the instances namespace
	LiveValidationForm.instances[this.element.id] = null;
	return true;
  }
   
}// end of LiveValidationForm prototype

/*************************************** Validate class ****************************************/
/**
 * This class contains all the methods needed for doing the actual validation itself
 *
 * All methods are static so that they can be used outside the context of a form field
 * as they could be useful for validating stuff anywhere you want really
 *
 * All of them will return true if the validation is successful, but will raise a ValidationError if
 * they fail, so that this can be caught and the message explaining the error can be accessed ( as just 
 * returning false would leave you a bit in the dark as to why it failed )
 *
 * Can use validation methods alone and wrap in a try..catch statement yourself if you want to access the failure
 * message and handle the error, or use the Validate::now method if you just want true or false
 */

var Validate = {

  /**
   *	validates that the field has been filled in
   *
   *	@var value {mixed} - value to be checked
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							failureMessage {String} - the message to show when the field fails validation 
   *													  (DEFAULT: "Can't be empty!")
   */
  Presence: function(value, paramsObj){
    var params = Object.extend({
      failureMessage: "Can't be empty!"
    }, paramsObj || {});
    if(value === '' || value === null || value === undefined) Validate.fail(params.failureMessage);
    return true;
  },
    
  /**
   *	validates that the value is numeric, does not fall within a given range of numbers
   *	
   *	@var value {mixed} - value to be checked
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							notANumberMessage {String} - the message to show when the validation fails when value is not a number
   *													  	  (DEFAULT: "Must be a number!")
   *							notAnIntegerMessage {String} - the message to show when the validation fails when value is not an integer
   *													  	  (DEFAULT: "Must be a number!")
   *							wrongNumberMessage {String} - the message to show when the validation fails when is param is used
   *													  	  (DEFAULT: "Must be {is}!")
   *							tooLowMessage {String} 		- the message to show when the validation fails when minimum param is used
   *													  	  (DEFAULT: "Must not be less than {minimum}!")
   *							tooHighMessage {String} 	- the message to show when the validation fails when maximum param is used
   *													  	  (DEFAULT: "Must not be more than {maximum}!")
   *							is {Int} 					- the value must be equal to this numeric value
   *							minimum {Int} 				- the minimum numeric allowed
   *							maximum {Int} 				- the maximum numeric allowed
   *                          onlyInteger {Boolean} - if true will only allow integers to be valid
   *                                                             (DEFAULT: false)
   *
   *  NB. can be checked if it is within a range by specifying both a minimum and a maximum
   *  NB. will evaluate numbers represented in scientific form (ie 2e10) correctly as numbers				
   */
  Numericality: function(value, paramsObj){
    var suppliedValue = value;
    var value = Number(value);
    var paramsObj = paramsObj || {};
    var params = { 
      notANumberMessage:  paramsObj.notANumberMessage || "Must be a number!",
      notAnIntegerMessage: paramsObj.notAnIntegerMessage || "Must be an integer!",
      wrongNumberMessage: paramsObj.wrongNumberMessage || "Must be " + paramsObj.is + "!",
      tooLowMessage:         paramsObj.tooLowMessage || "Must not be less than " + paramsObj.minimum + "!",
      tooHighMessage:        paramsObj.tooHighMessage || "Must not be more than " + paramsObj.maximum + "!", 
      is:                            ((paramsObj.is) || (paramsObj.is == 0)) ? paramsObj.is : null,
      minimum:                   ((paramsObj.minimum) || (paramsObj.minimum == 0)) ? paramsObj.minimum : null,
      maximum:                  ((paramsObj.maximum) || (paramsObj.maximum == 0)) ? paramsObj.maximum : null,
      onlyInteger:               paramsObj.onlyInteger || false
    };
    if (!isFinite(value))  Validate.fail(params.notANumberMessage);
    if (params.onlyInteger && ( ( /\.0+$|\.$/.test(String(suppliedValue)) )  || ( value != parseInt(value) ) ) ) Validate.fail(params.notAnIntegerMessage);
    switch(true){
      case (params.is !== null):
        if( value != Number(params.is) ) Validate.fail(params.wrongNumberMessage);
        break;
      case (params.minimum !== null && params.maximum !== null):
        Validate.Numericality(value, {tooLowMessage: params.tooLowMessage, minimum: params.minimum});
        Validate.Numericality(value, {tooHighMessage: params.tooHighMessage, maximum: params.maximum});
        break;
      case (params.minimum !== null):
        if( value < Number(params.minimum) ) Validate.fail(params.tooLowMessage);
        break;
      case (params.maximum !== null):
        if( value > Number(params.maximum) ) Validate.fail(params.tooHighMessage);
        break;
    }
    return true;
  },
    
  /**
   *	validates against a RegExp pattern
   *	
   *	@var value {mixed} - value to be checked
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							failureMessage {String} - the message to show when the field fails validation
   *													  (DEFAULT: "Not valid!")
   *							pattern {RegExp} 		- the regular expression pattern
   *													  (DEFAULT: /./)
   *             negate {Boolean} - if set to true, will validate true if the pattern is not matched
   *                           (DEFAULT: false)
   *
   *  NB. will return true for an empty string, to allow for non-required, empty fields to validate.
   *		If you do not want this to be the case then you must either add a LiveValidation.PRESENCE validation
   *		or build it into the regular expression pattern
   */
  Format: function(value, paramsObj){
    var value = String(value);
    var params = Object.extend({ 
      failureMessage: "Not valid!",
      pattern:           /./ ,
      negate:            false
    }, paramsObj || {});
    if(!params.negate && !params.pattern.test(value)) Validate.fail(params.failureMessage); // normal
    if(params.negate && params.pattern.test(value)) Validate.fail(params.failureMessage); // negated
    return true;
  },
    
  /**
   *	validates that the field contains a valid email address
   *	
   *	@var value {mixed} - value to be checked
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							failureMessage {String} - the message to show when the field fails validation
   *													  (DEFAULT: "Must be a number!" or "Must be an integer!")
   */
  Email: function(value, paramsObj){
    var params = Object.extend({ 
      failureMessage: "Must be a valid email address!"
    }, paramsObj || {});
    Validate.Format(value, { failureMessage: params.failureMessage, pattern: /^([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})$/i } );
    return true;
  },
    
  /**
   *	validates the length of the value
   *	
   *	@var value {mixed} - value to be checked
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							 wrongLengthMessage {String} - the message to show when the fails when is param is used
   *													  	  (DEFAULT: "Must be {is} characters long!")
   *							tooShortMessage {String} 	- the message to show when the fails when minimum param is used
   *													  	  (DEFAULT: "Must not be less than {minimum} characters long!")
   *							tooLongMessage {String} 	- the message to show when the fails when maximum param is used
   *													  	  (DEFAULT: "Must not be more than {maximum} characters long!")
   *							is {Int} 					- the length must be this long 
   *							minimum {Int} 				- the minimum length allowed
   *							maximum {Int} 				- the maximum length allowed
   *
   *  NB. can be checked if it is within a range by specifying both a minimum and a maximum				
   */
  Length: function(value, paramsObj){
    var value = String(value);
    var paramsObj = paramsObj || {};
    var params = { 
      wrongLengthMessage: paramsObj.wrongLengthMessage || "Must be " + paramsObj.is + " characters long!",
      tooShortMessage:      paramsObj.tooShortMessage || "Must not be less than " + paramsObj.minimum + " characters long!",
      tooLongMessage:       paramsObj.tooLongMessage || "Must not be more than " + paramsObj.maximum + " characters long!",
      is:                           ((paramsObj.is) || (paramsObj.is == 0)) ? paramsObj.is : null,
      minimum:                  ((paramsObj.minimum) || (paramsObj.minimum == 0)) ? paramsObj.minimum : null,
      maximum:                 ((paramsObj.maximum) || (paramsObj.maximum == 0)) ? paramsObj.maximum : null
    }
    switch(true){
      case (params.is !== null):
        if( value.length != Number(params.is) ) Validate.fail(params.wrongLengthMessage);
        break;
      case (params.minimum !== null && params.maximum !== null):
        Validate.Length(value, {tooShortMessage: params.tooShortMessage, minimum: params.minimum});
        Validate.Length(value, {tooLongMessage: params.tooLongMessage, maximum: params.maximum});
        break;
      case (params.minimum !== null):
        if( value.length < Number(params.minimum) ) Validate.fail(params.tooShortMessage);
        break;
      case (params.maximum !== null):
        if( value.length > Number(params.maximum) ) Validate.fail(params.tooLongMessage);
        break;
      default:
        throw new Error("Validate::Length - Length(s) to validate against must be provided!");
    }
    return true;
  },
    
  /**
   *	validates that the value falls within a given set of values
   *	
   *	@var value {mixed} - value to be checked
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							failureMessage {String} - the message to show when the field fails validation
   *													  (DEFAULT: "Must be included in the list!")
   *							within {Array} 			- an array of values that the value should fall in 
   *													  (DEFAULT: [])	
   *							allowNull {Bool} 		- if true, and a null value is passed in, validates as true
   *													  (DEFAULT: false)
   *             partialMatch {Bool} 	- if true, will not only validate against the whole value to check but also if it is a substring of the value 
   *													  (DEFAULT: false)
   *             caseSensitive {Bool} - if false will compare strings case insensitively
   *                          (DEFAULT: true)
   *             negate {Bool} - if true, will validate that the value is not within the given set of values
   *													  (DEFAULT: false)			
   */
  Inclusion: function(value, paramsObj){
    var params = Object.extend({
    failureMessage: "Must be included in the list!",
      within:           [],
      allowNull:        false,
      partialMatch:   false,
      caseSensitive: true,
      negate:          false
    }, paramsObj || {});
    if(params.allowNull && value == null) return true;
    if(!params.allowNull && value == null) Validate.fail(params.failureMessage);
    //if case insensitive, make all strings in the array lowercase, and the value too
    if(!params.caseSensitive){ 
      var lowerWithin = [];
      params.within.each( function(item){
        if(typeof item == 'string') item = item.toLowerCase();
        lowerWithin.push(item);
      });
      params.within = lowerWithin;
      if(typeof value == 'string') value = value.toLowerCase();
    }
    var found = (params.within.indexOf(value) == -1) ? false : true;
    if(params.partialMatch){
      found = false;
      params.within.each( function(arrayVal){
        if(value.indexOf(arrayVal) != -1 ) found = true;
      }); 
    }
    if( (!params.negate && !found) || (params.negate && found) ) Validate.fail(params.failureMessage);
    return true;
  },
    
  /**
   *	validates that the value does not fall within a given set of values (shortcut for using Validate.Inclusion with exclusion: true)
   *	
   *	@var value {mixed} - value to be checked
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							failureMessage {String} - the message to show when the field fails validation
   *													  (DEFAULT: "Must not be included in the list!")
   *							within {Array} 			- an array of values that the value should not fall in 
   *													  (DEFAULT: [])
   *							allowNull {Bool} 		- if true, and a null value is passed in, validates as true
   *													  (DEFAULT: false)
   *             partialMatch {Bool} 	- if true, will not only validate against the whole value to check but also if it is a substring of the value 
   *													  (DEFAULT: false)
   *             caseSensitive {Bool} - if false will compare strings case insensitively
   *                          (DEFAULT: true)					
   */
  Exclusion: function(value, paramsObj){
    var params = Object.extend({
      failureMessage: "Must not be included in the list!",
      within:             [],
      allowNull:          false,
      partialMatch:     false,
      caseSensitive:   true
    }, paramsObj || {});
    params.negate = true;// set outside of params so cannot be overridden
    Validate.Inclusion(value, params);
    return true;
  },
    
  /**
   *	validates that the value matches that in another field
   *	
   *	@var value {mixed} - value to be checked
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							failureMessage {String} - the message to show when the field fails validation
   *													  (DEFAULT: "Does not match!")
   *							match {String} 			- id of the field that this one should match						
   */
  Confirmation: function(value, paramsObj){
    if(!paramsObj.match) throw new Error("Validate::Confirmation - Error validating confirmation: Id of element to match must be provided!");
    var params = Object.extend({
      failureMessage: "Does not match!",
      match:            null
    }, paramsObj || {});
    params.match = $(paramsObj.match);
    if(!params.match) throw new Error("Validate::Confirmation - There is no reference with name of, or element with id of '" + params.match + "'!");
    if(value != params.match.value) Validate.fail(params.failureMessage);
    return true;
  },
    
  /**
   *	validates that the value is true (for use primarily in detemining if a checkbox has been checked)
   *	
   *	@var value {mixed} - value to be checked if true or not (usually a boolean from the checked value of a checkbox)
   *	@var paramsObj {Object} - parameters for this particular validation, see below for details
   *
   *	paramsObj properties:
   *							failureMessage {String} - the message to show when the field fails validation 
   *													  (DEFAULT: "Must be accepted!")
   */
  Acceptance: function(value, paramsObj){
    var params = Object.extend({
      failureMessage: "Must be accepted!"
    }, paramsObj || {});
    if(!value) Validate.fail(params.failureMessage);
    return true;
  },
  
   /**
     *	validates against a custom function that returns true or false (or throws a Validate.Error) when passed the value
     *	
     *	@var value {mixed} - value to be checked
     *	@var paramsObj {Object} - parameters for this particular validation, see below for details
     *
     *	paramsObj properties:
     *							failureMessage {String} - the message to show when the field fails validation
     *													  (DEFAULT: "Not valid!")
     *							against {Function} 			- a function that will take the value and object of arguments and return true or false 
     *													  (DEFAULT: function(){ return true; })
     *							args {Object} 		- an object of named arguments that will be passed to the custom function so are accessible through this object within it 
     *													  (DEFAULT: {})
     */
  Custom: function(value, paramsObj){
    var params = Object.extend({
	  against: function(){ return true; },
	  args: {},
      failureMessage: "Not valid!"
    }, paramsObj || {});
    if(!params.against(value, params.args)) Validate.fail(params.failureMessage);
    return true;
  },
    
  /**
   *	validates whatever it is you pass in, and handles the validation error for you so it gives a nice true or false reply
   *
   *	@var validationFunction {Function} - validation function to be used (ie Validate.Presence )
   *	@var value {mixed} - value to be checked 
   *	@var validationParamsObj {Object} - parameters for doing the validation, if wanted or necessary
   */
  now: function(validationFunction, value, validationParamsObj){
    if(!validationFunction) throw new Error("Validate::now - Validation function must be provided!");
    var isValid = true;
    try{    
      validationFunction(value, validationParamsObj || {});
    } catch(error) {
      if(error instanceof Validate.Error){
        isValid =  false;
      }else{
        throw error;
      }
    }finally{ 
      return isValid 
    }
  },
  
    
  Error: function(errorMessage){
    this.message = errorMessage;
    this.name = 'ValidationError';
  },
    
  fail: function(errorMessage){
    throw new Validate.Error(errorMessage);
  }

} // end of Validate object
/*
 * Control.DatePicker
 * 
 * Transforms an ordinary input textbox into an interactive date picker.
 * When the textbox is clicked (or the down arrow is pressed), a calendar
 * appears that the user can browse through and select a date.
 *
 * Features:
 *  - Allows user to specify a date format
 *  - Easy to localize
 *  - Customizable by CSS
 *
 * Written and maintained by Jeremy Jongsma (jeremy@jongsma.org)
 */
if (window.Control == undefined) Control = {};

Control.DatePicker = Class.create();
Control.DatePicker.activePicker = null;
Control.DatePicker.prototype = {
	onFocus: function(e) {
		this.element.stopObserving('focus', this.handleFocus);
		this.show();
		e.stop();
	},
	initialize: function(element, options) {
		this.element = $(element);
		this.i18n = new Control.DatePicker.i18n(options && options.locale ? options.locale : 'en_US');
		options = this.i18n.inheritOptions(options);
		options = Object.extend({
						datePicker: true,
						timePicker: false
					}, options || {});

		this.handlers = { onClick: options.onClick,
				onHover: options.onHover,
				onSelect: options.onSelect };

		this.options = Object.extend(options || {}, {
				onClick: this.pickerClicked.bind(this),
				onHover: this.dateHover.bind(this),
				onSelect: this.datePicked.bind(this)
			});

		if (this.options.timePicker && this.options.datePicker)
			this.options.currentFormat = this.options.dateTimeFormat;
		else if (this.options.timePicker)
			this.options.currentFormat = this.options.timeFormat;
		else
			this.options.currentFormat = this.options.dateFormat;
//		this.options.currentFormat = this.options.timePicker ? this.options.dateTimeFormat : this.options.dateFormat;
		this.options.date = DateFormat.parseFormat(this.element.value, this.options.currentFormat);

		// Lazy load to avoid excessive CPU usage with lots of controls on one page
		this.datepicker = null;

		this.originalValue = null;
		this.hideTimeout = null;

		if (this.options.icon) {
			this.element.style.background = 'url('+this.options.icon+') right center no-repeat #FFF';
			// Prevent text writing over icon
			this.element.style.paddingRight = '20px';
		}
		this.element.style.cursor = 'pointer';
		this.handleFocus = this.onFocus.bindAsEventListener(this);
		this.element.observe('focus', this.handleFocus);

		//Event.observe(this.element, 'click', this.togglePicker.bindAsEventListener(this));
		Event.observe(this.element, 'click', this.handleFocus);
		
		this.hidePickerListener = this.delayedHide.bindAsEventListener(this);
		Event.observe(this.element, 'keydown', this.keyHandler.bindAsEventListener(this));
		Event.observe(document, 'keydown', this.docKeyHandler.bindAsEventListener(this));

		this.pickerActive = false;
	},
	tr: function(str) {
		return this.i18n.tr(str);
	},
	delayedHide: function(e) {
		this.hideTimeout = setTimeout(this.hide.bind(this), 100);
	},
	pickerClicked: function() {
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.handlers.onClick)
			this.handlers.onClick();
	},
	datePicked: function(date) {
		this.element.value = DateFormat.format(date, this.options.currentFormat);
		this.element.focus();
		this.hide();
		if (this.handlers.onSelect)
			this.handlers.onSelect(date);
		if (this.element.onchange)
			this.element.onchange();
	},
	dateHover: function(date) {
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.pickerActive) {
			this.element.value = DateFormat.format(date, this.options.currentFormat);
			if (this.handlers.onHover)
				this.handlers.onHover(date);
		}
	},
	togglePicker: function(e) {
		if (this.pickerActive) {
			this.element.value = this.originalValue;
			this.hide();
		} else {
			this.show();
		}
		Event.stop(e);
		return false;
	},
	docKeyHandler: function(e) {
		if (e.keyCode == Event.KEY_ESC)
			if (this.pickerActive) {
				this.element.value = this.originalValue;
				this.hide();
			}

	},
	keyHandler: function(e) {
		switch (e.keyCode) {
			case Event.KEY_ESC:
				if (this.pickerActive)
					this.element.value = this.originalValue;
			case Event.KEY_TAB:
				this.hide();
				return;
			case Event.KEY_DOWN:	
				if (!this.pickerActive) {
					this.show();
					Event.stop(e);
				}
		}
		if (this.pickerActive)
			return false;
	},
	hide: function() {
		if(this.pickerActive && !this.element.disabled) {
			this.datepicker.releaseKeys();
			Element.remove(this.datepicker.element);
			Event.stopObserving(document, 'click', this.hidePickerListener, true);
			this.pickerActive = false;
			Control.DatePicker.activePicker = null;
		}
		this.element.observe('focus', this.handleFocus);
	},
	scrollOffset: function(element) {
		var valueT = 0, valueL = 0;
		do {
			if (element.tagName == 'BODY') break;
			valueT += element.scrollTop  || 0;
			valueL += element.scrollLeft || 0;
			element = element.parentNode;
		} while (element);
		return Element._returnOffset(valueL, valueT);
	},
	show: function () {
		if (!this.pickerActive) {
			if (Control.DatePicker.activePicker)
				Control.DatePicker.activePicker.hide();
			this.element.focus();
			if (!this.datepicker)
				this.datepicker = new Control.DatePickerPanel(this.options);
			this.originalValue = this.element.value;

			// Find real page position
			/*
			var pos = this.element.cumulativeOffset();
			if (!/MSIE 8/.test(navigator.userAgent)) {
				// IE seems to account for scrollTop in offsetTop already
				var scroll = this.scrollOffset(this.element);
				pos[0] -= scroll[0] + document.body.scrollTop;
				pos[1] -= scroll[1] + document.body.scrollLeft;
			}
			*/
			var pos = Position.positionedOffset(this.element);
			var dim = Element.getDimensions(this.element);
			var pickerTop = /MSIE/.test(navigator.userAgent) ? (pos[1] + dim.height) + 'px' : (pos[1] + dim.height - 1) + 'px';
			this.datepicker.element.style.position = 'absolute';
			this.datepicker.element.style.top = pickerTop;
			this.datepicker.element.style.left = pos[0] + 'px';
			this.datepicker.element.style.zIndex = '99';
			this.datepicker.selectDate(DateFormat.parseFormat(this.element.value, this.options.currentFormat));
			this.datepicker.captureKeys();

			this.element.parentNode.appendChild(this.datepicker.element);
			Event.observe(document, 'click', this.hidePickerListener, true);
			this.pickerActive = true;
			Control.DatePicker.activePicker = this;
			this.pickerClicked();
		}
	}
};

Control.DatePicker.i18n = Class.create();
Object.extend(Control.DatePicker.i18n, {
	baseLocales: {
		'us': {
			dateTimeFormat: 'MM-dd-yyyy HH:mm',
			dateFormat: 'MM-dd-yyyy',
			firstWeekDay: 0,
			weekend: [0,6],
			timeFormat: 'HH:mm'
		},
		'eu': {
			dateTimeFormat: 'dd-MM-yyyy HH:mm',
			dateFormat: 'dd-MM-yyyy',
			firstWeekDay: 1,
			weekend: [0,6],
			timeFormat: 'HH:mm'
		},
		'iso8601': {
			dateTimeFormat: 'yyyy-MM-dd HH:mm',
			dateFormat: 'yyyy-MM-dd',
			firstWeekDay: 1,
			weekend: [0,6],
			timeFormat: 'HH:mm'
		}
	},
	createLocale: function(base, lang) {
		return Object.extend(Object.clone(Control.DatePicker.i18n.baseLocales[base]), {'language': lang});
	}
});
Control.DatePicker.i18n.prototype = {
	initialize: function(code) {
		var lang = code.charAt(2) == '_' ? code.substring(0,2) : code;
		var locale = (Control.DatePicker.Locale[code] || Control.DatePicker.Locale[lang]);
		this.opts = Object.clone(locale || {});
		var language = locale ? Control.DatePicker.Language[locale.language] : null;
		if (language) Object.extend(this.opts, language);
	},
	opts: null,
	inheritOptions: function(options) {
		if (!this.opts) this.setLocale('en_US');
		return Object.extend(this.opts, options || {});
	},
	tr: function(str) {
		return this.opts && this.opts.strings ? this.opts.strings[str] || str : str;
	}
};

Control.DatePicker.Locale = {};
with (Control.DatePicker) {
	// Full locale definitions not needed if countries use the language default format
	// Datepicker will fallback to the language default; i.e. 'es_AR' will use 'es'
	Locale['es'] = i18n.createLocale('eu', 'es');
	Locale['en'] = i18n.createLocale('us', 'en');
	Locale['en_GB'] = i18n.createLocale('eu', 'en');
	Locale['en_AU'] = Locale['en_GB'];
	Locale['de'] = i18n.createLocale('eu', 'de');
	Locale['es_iso8601'] = i18n.createLocale('iso8601', 'es');
	Locale['en_iso8601'] = i18n.createLocale('iso8601', 'en');
	Locale['de_iso8601'] = i18n.createLocale('iso8601', 'de');
}

Control.DatePicker.Language = {
	'es': {
		months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Augosto', 'Septiembre', 'Octubre', 'Novimbre', 'Diciembre'],
		days: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
		strings: {
			'Now': 'Ahora',
			'Today': 'Hoy',
			'Time': 'Hora',
			'Exact minutes': 'Minuto exacto',
			'Select Date and Time': 'Selecciona Dia y Hora',
			'Select Time': 'Selecciona Hora',
			'Open calendar': 'Abre calendario'
		}
	},
	'de': { 
		months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'], 
		days: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], 
		strings: { 
			'Now': 'Jetzt', 
			'Today': 'Heute', 
			'Time': 'Zeit', 
			'Exact minutes': 'Exakte minuten', 
			'Select Date and Time': 'Zeit und Datum Auswählen',
			'Select Time': 'Zeit Auswählen',
			'Open calendar': 'Kalender öffnen'
		}
	}	
};

Control.DatePickerPanel = Class.create();
Object.extend(Control.DatePickerPanel.prototype, {
	initialize: function(options) {
		this.i18n = new Control.DatePicker.i18n(options && options.locale ? options.locale : 'en_US');
		options = this.i18n.inheritOptions(options);
		this.options = Object.extend({
						className: 'datepickerControl',
						closeOnToday: true,
						selectToday: true,
						showOnFocus: false,
						datePicker: true,
						timePicker: false,
						use24hrs: false,
						firstWeekDay: 0,
						weekend: [0,6],
						months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
						days: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
					}, options || {});
		// Make sure first weekday is in the correct range
		with (this.options)
			if (isNaN(firstWeekDay*1)) firstWeekDay = 0;
			else firstWeekDay = firstWeekDay % 7;

		this.keysCaptured = false;
		this.calendarCont = null;
		this.currentDate = this.options.date ? this.options.date : new Date();
		this.dayOfWeek = 0;
		this.minInterval = 5;

		this.selectedDay = null;
		this.selectedHour = null;
		this.selectedMinute = null;
		this.selectedAmPm = null;

		this.currentDays = [];
		this.hourCells = [];
		this.minuteCells = [];
		this.otherMinutes = null;
		this.amCell = null;
		this.pmCell = null;

		this.element = this.createPicker();
		this.selectDate(this.currentDate);
	},
	createPicker: function() {
		var elt = document.createElement('div');
		elt.style.position = 'absolute';
		elt.className = this.options.className;
		this.calendarCont = this.drawCalendar(elt, this.currentDate);

		Event.observe(elt, 'click', this.clickHandler.bindAsEventListener(this));
		Event.observe(elt, 'dblclick', this.dblClickHandler.bindAsEventListener(this));
		this.documentKeyListener = this.keyHandler.bindAsEventListener(this);
		if (this.options.captureKeys)
			this.captureKeys();
		
		return elt;
	},
	tr: function(str) {
		return this.i18n.tr(str);
	},
	captureKeys: function() {
		Event.observe(document, 'keydown', this.documentKeyListener, true);
		this.keysCaptured = true;
	},
	releaseKeys: function() {
		Event.stopObserving(document, 'keydown', this.documentKeyListener, true);
		this.keysCaptured = false;
	},
	setDate: function(date) {
		if (date) {
			// Clear container
			while (this.element.firstChild)
				this.element.removeChild(this.element.firstChild);
			this.calendarCont = this.drawCalendar(this.element, date);
		}
	},
	drawCalendar: function(container, date) {
		var calCont = container;
		if (!this.options.datePicker) {
			var calTable =  document.createElement('table');
			calTable.cellSpacing = 0;
			calTable.cellPadding = 0;
			calTable.border = 0;
		} else {
			var calTable = this.createCalendar(date);
		}

		var rowwidth = this.options.use24hrs ? 6 : 7;
		if (this.options.timePicker) {
			var timeTable;
			if (this.options.timePickerAdjacent && this.options.datePicker) {
				var rows = 0;

				var adjTable = document.createElement('table');
				adjTable.cellSpacing = 0;
				adjTable.cellPadding = 0;
				adjTable.border = 0;
				
				row = adjTable.insertRow(0);

				cell = row.insertCell(0);
				cell.vAlign = 'top';
				cell.appendChild(calTable);
				calCont = cell;

				cell = row.insertCell(1);
				cell.style.width = '5px';

				cell = row.insertCell(2);
				cell.vAlign = 'top';
				timeTable = document.createElement('table');
				timeTable.cellSpacing = 0;
				timeTable.cellPadding = 0;
				timeTable.border = 0;
				cell.appendChild(timeTable);

				container.appendChild(adjTable);

				row = timeTable.insertRow(rows++);
				row.className = 'monthLabel';
				cell = row.insertCell(0);
				cell.colSpan = rowwidth;
				cell.innerHTML = this.tr('Time');

				row = timeTable.insertRow(rows++);
				cell = row.insertCell(0);
				cell.colSpan = rowwidth;
				cell.style.height = '1px';

			} else {
				container.appendChild(calTable);
				timeTable = calTable;
				var rows = calTable.rows.length;

				if (this.options.datePicker) {
					row = timeTable.insertRow(rows++);
					cell = row.insertCell(0);
					cell.colSpan = rowwidth;

					var hr = document.createElement('hr');
					Element.setStyle(hr, {'color': 'gray', 'backgroundColor': 'gray', 'height': '1px', 'border': '0', 'marginTop': '3px', 'marginBottom': '3px', 'padding': '0'});
					cell.appendChild(hr);
				}
			}

			var hourrows = this.options.use24hrs ? 4 : 2;
			for (var j = 0; j < hourrows; ++j) {
				row = timeTable.insertRow(rows++);
				for (var i = 0; i < 6; ++i){
					cell = row.insertCell(i);
					cell.className = 'hour';
					cell.width = '14%';
					cell.innerHTML = (j*6)+i+(this.options.use24hrs?0:1);
					cell.onclick = this.hourClickedListener((j*6)+i+(this.options.use24hrs?0:1));
					this.hourCells[(j*6)+i] = cell;
				}
				if (!this.options.use24hrs) {
					cell = row.insertCell(i);
					cell.className = 'ampm';
					cell.width = '14%';
					if (j) {
						cell.innerHTML = this.tr('PM');
						cell.onclick = this.pmClickedListener();
						this.pmCell = cell;
					} else {
						cell.innerHTML = this.tr('AM');
						cell.onclick = this.amClickedListener();
						this.amCell = cell;
					}
				}
			}

			row = timeTable.insertRow(rows++);
			cell = row.insertCell(0);
			cell.colSpan = 6;

			var hr = document.createElement('hr');
			Element.setStyle(hr, {'color': '#CCCCCC', 'backgroundColor': '#CCCCCC', 'height': '1px', 'border': '0', 'marginTop': '2px', 'marginBottom': '2px', 'padding': '0'});
			cell.appendChild(hr);
			cell = row.insertCell(1);

			for (var j = 0; j < (10/this.minInterval); ++j) {
				row = timeTable.insertRow(rows++);
				for (var i = 0; i < 6; ++i){
					cell = row.insertCell(i);
					cell.className = 'minute';
					cell.width = '14%';
					var minval = ((j*6+i)*this.minInterval);
					if (minval < 10) minval = '0'+minval;
					cell.innerHTML = ':'+minval;
					cell.onclick = this.minuteClickedListener(minval);
					this.minuteCells[(j*6)+i] = cell;
				}
				if (!this.options.use24hrs) {
					cell = row.insertCell(i);
					cell.width = '14%';
				}
			}

			row = timeTable.insertRow(rows++);
			cell = row.insertCell(0);
			cell.style.textAlign = 'right';
			cell.colSpan = 5;
			cell.innerHTML = '<i>'+this.tr('Exact minutes')+':</i>';

			cell = row.insertCell(1);
			cell.className = 'otherminute';
			var otherInput = document.createElement('input');
			otherInput.type = 'text';
			otherInput.maxLength = 2;
			otherInput.style.width = '2em';
			var inputTimeout = null;
			otherInput.onkeyup = function(e) {
						if (!isNaN(otherInput.value)) {
							inputTimeout = setTimeout(function() {
									this.currentDate.setMinutes(otherInput.value);
									this.dateChanged(this.currentDate);
								}.bind(this), 500);
						}
					}.bindAsEventListener(this);
			otherInput.onkeydown = function(e) {
						if (e.keyCode == Event.KEY_RETURN)
							if (this.options.onSelect) this.options.onSelect(this.currentDate);
						if (inputTimeout)
							clearTimeout(inputTimeout)
					}.bindAsEventListener(this);
			// Remove event key capture to allow use of arrow keys
			otherInput.onclick = otherInput.select;
			otherInput.onfocus = this.releaseKeys.bindAsEventListener(this);
			otherInput.onblur = this.captureKeys.bindAsEventListener(this);
			this.otherMinutes = otherInput;
			cell.appendChild(otherInput);
			// Padding cell
			if (!this.options.use24hrs)
				cell = row.insertCell(2);

			row = timeTable.insertRow(rows++);
			cell = row.insertCell(0);
			cell.colSpan = rowwidth;

			hr = document.createElement('hr');
			Element.setStyle(hr, {'color': 'gray', 'backgroundColor': 'gray', 'height': '1px', 'border': '0', 'marginTop': '3px', 'marginBottom': '3px', 'padding': '0'});
			cell.appendChild(hr);

			row = timeTable.insertRow(rows++);
			cell = row.insertCell(0);
			cell.colSpan = rowwidth;

			selectButton = document.createElement('input');
			selectButton.type = 'button';
			if (this.options.datePicker)
				selectButton.value = this.tr('Select Date and Time');
			else
				selectButton.value = this.tr('Select Time');
			selectButton.onclick = function(e) {
						this.options.onSelect && this.options.onSelect(this.currentDate);
					}.bindAsEventListener(this);
			cell.appendChild(selectButton);

		} else {
			calCont.appendChild(calTable);
		}

		return calCont;

	},
	createCalendar: function(date) {
		this.currentDate = date;
		this.currentDays = [];

		var today = new Date();
		var previousYear = new Date(date.getFullYear() - 1, date.getMonth(), 1)
		var previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
		var nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)
		var nextYear = new Date(date.getFullYear() + 1, date.getMonth(), 1)

		var row;
		var cell;
		var rows = 0;

		var calTable = document.createElement('table');
		calTable.cellSpacing = 0;
		calTable.cellPadding = 0;
		calTable.border = 0;

		row = calTable.insertRow(rows++);
		row.className = 'monthLabel';
		cell = row.insertCell(0);
		cell.colSpan = 7;
		cell.innerHTML = this.monthName(date.getMonth()) + ' ' + date.getFullYear();

		row = calTable.insertRow(rows++);
		row.className = 'navigation';

		cell = row.insertCell(0);
		cell.className = 'navbutton';
		cell.title = this.monthName(previousYear.getMonth()) + ' ' + previousYear.getFullYear();
		cell.onclick = this.movePreviousYearListener();
		cell.innerHTML = '&lt;&lt;';

		cell = row.insertCell(1);
		cell.className = 'navbutton';
		cell.title = this.monthName(previousMonth.getMonth()) + ' ' + previousMonth.getFullYear();
		cell.onclick = this.movePreviousMonthListener();
		cell.innerHTML = '&lt;';

		cell = row.insertCell(2);
		cell.colSpan = 3;
		cell.className = 'navbutton';
		cell.title = today.getDate() + ' ' + this.monthName(today.getMonth()) + ' ' + today.getFullYear();
		cell.onclick = this.dateClickedListener(today, true);
		if (this.options.timePicker)
			cell.innerHTML = this.tr('Now');
		else
			cell.innerHTML = this.tr('Today');

		cell = row.insertCell(3);
		cell.className = 'navbutton';
		cell.title = this.monthName(nextMonth.getMonth()) + ' ' + nextMonth.getFullYear();
		cell.onclick = this.moveNextMonthListener();
		cell.innerHTML = '&gt;';

		cell = row.insertCell(4);
		cell.className = 'navbutton';
		cell.title = this.monthName(nextYear.getMonth()) + ' ' + nextYear.getFullYear();
		cell.onclick = this.moveNextYearListener();
		cell.innerHTML = '&gt;&gt;';

		row = calTable.insertRow(rows++);
		row.className = 'dayLabel';
		for (var i = 0; i < 7; ++i){
			cell = row.insertCell(i);
			cell.width = '14%';
			cell.innerHTML = this.dayName((this.options.firstWeekDay + i) % 7);
		}
		
		row = null;
		var workDate = new Date(date.getFullYear(), date.getMonth(), 1);
		var day = workDate.getDay();
		var j = 0;

		// Pad with previous month
		if (day != this.options.firstWeekDay) {
			row = calTable.insertRow(rows++);
			row.className = 'calendarRow';
			workDate.setDate(workDate.getDate() - ((day - this.options.firstWeekDay + 7) % 7));
			day = workDate.getDay();
			while (workDate.getMonth() != date.getMonth()) {
				cell = row.insertCell(row.cells.length);
				this.assignDayClasses(cell, 'dayothermonth', workDate);
				cell.innerHTML = workDate.getDate();
				cell.onclick = this.dateClickedListener(workDate);
				workDate.setDate(workDate.getDate() + 1);
				day = workDate.getDay();
			}
		}

		// Display days
		while (workDate.getMonth() == date.getMonth()) {
			if (day == this.options.firstWeekDay) {
				row = calTable.insertRow(rows++);
				row.className = 'calendarRow';
			}
			cell = row.insertCell(row.cells.length);
			this.assignDayClasses(cell, 'day', workDate);
			cell.innerHTML = workDate.getDate();
			cell.onclick = this.dateClickedListener(workDate);
			this.currentDays[workDate.getDate()] = cell;
			workDate.setDate(workDate.getDate() + 1);
			day = workDate.getDay();
		}

		// Pad with next month
		if (day != this.options.firstWeekDay)
			do {
				cell = row.insertCell(row.cells.length);
				this.assignDayClasses(cell, 'dayothermonth', workDate);
				cell.innerHTML = workDate.getDate();
				var thisDate = new Date(workDate.getTime());
				cell.onclick = this.dateClickedListener(workDate);
				workDate.setDate(workDate.getDate() + 1);
				day = workDate.getDay();
			} while (workDate.getDay() != this.options.firstWeekDay);

		return calTable;
	},
	movePreviousMonthListener: function() {
		return function(e) {
				var prevMonth = new Date(
						this.currentDate.getFullYear(),
						this.currentDate.getMonth() - 1,
						this.currentDate.getDate(),
						this.currentDate.getHours(),
						this.currentDate.getMinutes());
				if (prevMonth.getMonth() != (this.currentDate.getMonth() + 11) % 12) prevMonth.setDate(0);
				this.selectDate(prevMonth);
			}.bindAsEventListener(this);
	},
	moveNextMonthListener: function() {
		return function(e) {
				var nextMonth = new Date(
						this.currentDate.getFullYear(),
						this.currentDate.getMonth() + 1,
						this.currentDate.getDate(),
						this.currentDate.getHours(),
						this.currentDate.getMinutes());
				if (nextMonth.getMonth() != (this.currentDate.getMonth() + 1) % 12) nextMonth.setDate(0);
				this.selectDate(nextMonth);
			}.bindAsEventListener(this);
	},
	moveNextYearListener: function() {
		return function(e) {
				var nextYear = new Date(
						this.currentDate.getFullYear() + 1,
						this.currentDate.getMonth(),
						this.currentDate.getDate(),
						this.currentDate.getHours(),
						this.currentDate.getMinutes());
				if (nextYear.getMonth() != this.currentDate.getMonth()) nextYear.setDate(0);
				this.selectDate(nextYear);
			}.bindAsEventListener(this);
	},
	movePreviousYearListener: function() {
		return function(e) {
				var prevYear = new Date(
						this.currentDate.getFullYear() - 1,
						this.currentDate.getMonth(),
						this.currentDate.getDate(),
						this.currentDate.getHours(),
						this.currentDate.getMinutes());
				if (prevYear.getMonth() != this.currentDate.getMonth()) prevYear.setDate(0);
				this.selectDate(prevYear);
			}.bindAsEventListener(this);
	},
	dateClickedListener: function(date, timeOverride) {
		var dateCopy = new Date(date.getTime());
		return function(e) {
				if (!timeOverride) {
					dateCopy.setHours(this.currentDate.getHours());
					dateCopy.setMinutes(this.currentDate.getMinutes());
				}
				this.dateClicked(dateCopy);
			}.bindAsEventListener(this);
	},
	hourClickedListener: function(hour) {
		return function(e) {
				this.hourClicked(hour);
			}.bindAsEventListener(this);
	},
	minuteClickedListener: function(minutes) {
		return function(e) {
				this.currentDate.setMinutes(minutes);
				this.dateClicked(this.currentDate);
			}.bindAsEventListener(this);
	},
	amClickedListener: function() {
		return function(e) {
				if (this.selectedAmPm == this.pmCell) {
					this.currentDate.setHours(this.currentDate.getHours()-12);
					this.dateClicked(this.currentDate);
				}
			}.bindAsEventListener(this);
	},
	pmClickedListener: function() {
		return function(e) {
				if (this.selectedAmPm == this.amCell) {
					this.currentDate.setHours(this.currentDate.getHours()+12);
					this.dateClicked(this.currentDate);
				}
			}.bindAsEventListener(this);
	},
	assignDayClasses: function(cell, baseClass, date) {
		var today = new Date();
		Element.addClassName(cell, baseClass);
		if (date.getFullYear() == today.getFullYear() && date.getMonth() == today.getMonth() && date.getDate() == today.getDate())
			Element.addClassName(cell, 'today');
		if (this.options.weekend.include(date.getDay()))
			Element.addClassName(cell, 'weekend');
	},
	monthName: function(month) {
		return this.options.months[month];
	},
	dayName: function(day) {
		return this.options.days[day];
	},
	dblClickHandler: function(e) {
		if(this.options.onSelect)
			this.options.onSelect(this.currentDate);
		Event.stop(e);
	},
	clickHandler: function(e) {
		if(this.options.onClick)
			this.options.onClick();
		Event.stop(e);
	},
	hoverHandler: function(e) {
		if(this.options.onHover)
			this.options.onHover(date);
	},
	keyHandler: function(e) {
		var days = 0;
		switch (e.keyCode){
			case Event.KEY_RETURN:
				if (this.options.onSelect) this.options.onSelect(this.currentDate);
				break;
			case Event.KEY_LEFT:
				days = -1;
				break;
			case Event.KEY_UP:
				days = -7;
				break;
			case Event.KEY_RIGHT:
				days = 1;
				break;
			case Event.KEY_DOWN:
				days = 7;
				break;
			case 33: // PgUp
				var lastMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, this.currentDate.getDate());
				days = -this.getDaysOfMonth(lastMonth);
				break;
			case 34: // PgDn
				days = this.getDaysOfMonth(this.currentDate);
				break;
			case 13: // enter-key (forms without submit buttons)
				this.dateClicked(this.currentDate);
				break;
			default:
				return;
		}
		if (days != 0) {
			var moveDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate() + days);
			moveDate.setHours(this.currentDate.getHours());
			moveDate.setMinutes(this.currentDate.getMinutes());
			this.selectDate(moveDate);
		}
		Event.stop(e);
		return false;
	},
	getDaysOfMonth: function(date) {
		var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
		return lastDay.getDate();
	},
	getNextMonth: function(month, year, increment) {
		if (p_Month == 11) return [0, year + 1];
		else return [month + 1, year];
	},
	getPrevMonth: function(month, year, increment) {
		if (p_Month == 0) return [11, year - 1];
		else return [month - 1, year];
	},
	dateClicked: function(date) {
		if (date) {
			if (!this.options.timePicker && this.options.onSelect)
				this.options.onSelect(date);
			this.selectDate(date);
		}
	},
	dateChanged: function(date) {
		if (date) {
			if ((!this.options.timePicker || !this.options.datePicker) && this.options.onHover)
				this.options.onHover(date);
			this.selectDate(date);
		}
	},
	hourClicked: function(hour) {
		if (!this.options.use24hrs) {
			if (hour == 12) {
				if (this.selectedAmPm == this.amCell)
					hour = 0;
			} else if (this.selectedAmPm == this.pmCell) {
				hour += 12;
			}
		}
		this.currentDate.setHours(hour);
		this.dateClicked(this.currentDate);
	},
	selectDate: function(date) {
		if (date) {
			if (this.options.datePicker) {
				if (date.getMonth() != this.currentDate.getMonth()
					|| date.getFullYear() != this.currentDate.getFullYear())
					this.setDate(date);
				else
					this.currentDate = date;
				
				if (date.getDate() < this.currentDays.length) {
					if (this.selectedDay)
						Element.removeClassName(this.selectedDay, 'current');
					this.selectedDay = this.currentDays[date.getDate()];
					Element.addClassName(this.selectedDay, 'current');
				}
			}

			if (this.options.timePicker) {
				var hours = date.getHours();
				if (this.selectedHour)
					Element.removeClassName(this.selectedHour, 'current');
				if (this.options.use24hrs)
					this.selectedHour = this.hourCells[hours];
				else
					this.selectedHour = this.hourCells[hours % 12 ? (hours % 12) - 1 : 11];
				Element.addClassName(this.selectedHour, 'current');

				if (this.selectedAmPm)
					Element.removeClassName(this.selectedAmPm, 'current');
				this.selectedAmPm = (hours < 12 ? this.amCell : this.pmCell);
				Element.addClassName(this.selectedAmPm, 'current');

				var minutes = date.getMinutes();
				if (this.selectedMinute)
					Element.removeClassName(this.selectedMinute, 'current');
				Element.removeClassName(this.otherMinutes, 'current');
				if (minutes % this.minInterval == 0) {
					this.otherMinutes.value = '';
					this.selectedMinute = this.minuteCells[minutes / this.minInterval];
					Element.addClassName(this.selectedMinute, 'current');
				} else {
					this.otherMinutes.value = minutes;
					Element.addClassName(this.otherMinutes, 'current');
				}
			}

			if (this.options.onHover)
				this.options.onHover(date);
		}
	}
});
